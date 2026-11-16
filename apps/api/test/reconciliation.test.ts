import { beforeEach, describe, expect, test } from 'bun:test';
import { BusinessRuleError } from '../src/core/errors';
import { FixedClock } from '../src/infrastructure/clock';
import { FakePaymentGateway } from '../src/infrastructure/payments/stripe-gateway';
import { BankTransferCheckout } from '../src/modules/payments/checkout/bank-transfer-checkout';
import { CheckoutStrategyRegistry } from '../src/modules/payments/checkout/checkout-strategy';
import { CheckoutService } from '../src/modules/payments/checkout.service';
import { EnrollmentLifecycle } from '../src/modules/payments/enrollment-lifecycle';
import { EnrollmentStateMachine } from '../src/modules/payments/enrollment-state';
import { FinanceAdminService } from '../src/modules/payments/finance-admin.service';
import { PriceCalculator } from '../src/modules/payments/price-calculator';
import { ReferenceGenerator } from '../src/modules/payments/reference-generator';
import { ReconciliationService, type PlanApprover } from '../src/modules/reconciliation/reconciliation.service';
import { OPEN_SEAT_STATUSES, type OpenTransfer } from '../src/modules/reconciliation/statement-matcher';
import { InMemoryReconciliationRepository, RecordingAuditLog } from './fakes/in-memory-reconciliation';
import { InMemoryPaymentsRepository, RecordingBroadcaster, RecordingNotifier } from './fakes/in-memory';

const T0 = new Date('2026-11-02T10:00:00Z');
let clock: FixedClock;
let payments: InMemoryPaymentsRepository;
let notifier: RecordingNotifier;
let checkout: CheckoutService;
let recon: InMemoryReconciliationRepository;
let audit: RecordingAuditLog;
let service: ReconciliationService;
let plans: OpenTransfer[];
let planCalls: { id: string; input: unknown; opts: unknown }[];

const planApprover: PlanApprover = {
  reviewTransfer: async (id, input, _admin, opts) => {
    planCalls.push({ id, input, opts });
    const p = plans.find((x) => x.id === id)!;
    if (input.receivedFils !== p.totalFils) throw new BusinessRuleError('Received amount does not match the payment total', 'AMOUNT_MISMATCH');
    p.status = 'PAID';
    return {} as never;
  },
};

function setup() {
  clock = new FixedClock(T0);
  payments = new InMemoryPaymentsRepository(() => clock.now());
  notifier = new RecordingNotifier();
  for (const u of ['sara', 'omar']) payments.addUser(u);
  payments.batches.set('b08', {
    id: 'b08', code: 'B08', status: 'ENROLLING', capacity: 10, waitlistEnabled: true, priceFils: 88_000, timezone: 'Asia/Dubai',
    teacherId: 'lina', courseId: 'pdf', courseTitle: 'Product Design Foundations', firstSessionAt: new Date('2026-12-01T14:00:00Z'),
  });
  payments.bankAccounts.push({ id: 'enbd', bankName: 'Emirates NBD', accountName: 'Co', iban: 'AE000000000000000000001', swift: 'EBILAEAD', branch: null, instructions: null, currency: 'AED', active: true, sortOrder: 0 });
  const machine = new EnrollmentStateMachine();
  const lifecycle = new EnrollmentLifecycle(payments, machine, notifier, new RecordingBroadcaster(), clock, 'http://web.test');
  let n = 0;
  checkout = new CheckoutService(
    payments,
    new CheckoutStrategyRegistry([new BankTransferCheckout(payments, notifier, 48)]),
    new PriceCalculator(5), { rateFor: async () => 1 }, machine, lifecycle, new ReferenceGenerator(() => (++n % 9) / 10), notifier,
  );
  const finance = new FinanceAdminService(payments, lifecycle, new FakePaymentGateway(), { reverseForRefund: async () => {} }, notifier, 48);
  plans = [{ kind: 'PLAN', id: 'p1', reference: 'AZ-REC-20001', totalFils: 52_395, status: 'AWAITING_RECEIPT', userName: 'Maya Haddad', createdAt: T0 }];
  planCalls = [];
  recon = new InMemoryReconciliationRepository(async () => [
    ...payments.orders
      .filter((o) => o.method === 'BANK_TRANSFER' && (OPEN_SEAT_STATUSES as readonly string[]).includes(o.status))
      .map((o): OpenTransfer => ({ kind: 'SEAT', id: o.id, reference: o.reference, totalFils: o.totalFils, status: o.status, userName: o.userId, createdAt: o.createdAt })),
    ...plans.filter((p) => p.status.startsWith('AWAITING')),
  ]);
  recon.accounts.set('enbd', { id: 'enbd', bankName: 'Emirates NBD', statementMapping: null });
  audit = new RecordingAuditLog();
  service = new ReconciliationService(recon, finance, planApprover, audit, clock);
}

async function bankOrder(user: string) {
  const res = await checkout.checkout(user, { batchId: 'b08', method: 'BANK_TRANSFER', displayCurrency: 'AED' });
  if (res.waitlisted) throw new Error('unexpected waitlist');
  return res.order;
}

const csv = (rows: string[]) => ['Transaction Date,Description,Debit,Credit', ...rows].join('\n');
const enrollmentOf = (user: string) => payments.enrollments.find((e) => e.userId === user)?.status;

describe('bank statement reconciliation', () => {
  beforeEach(setup);

  test('import proposes matches; re-importing the same file adds nothing', async () => {
    const a = await bankOrder('sara');
    const file = csv([`03/11/2026,"TRF SARA REF ${a.reference}",,924.00`, '03/11/2026,"TRF REF AZ-REC-20001",,523.95', '03/11/2026,UNKNOWN PAYER,,10.00', '03/11/2026,FEES,5.00,']);
    const first = await service.import({ bankAccountId: 'enbd', fileName: 'nov.csv', csv: file }, 'nour');
    expect(first).toMatchObject({ creditCount: 3, newCount: 3, duplicateCount: 0, skippedCount: 1 });
    expect(first.lines.map((l) => [l.match, l.transfer?.id ?? null])).toEqual([
      ['EXACT', a.id],
      ['EXACT', 'p1'],
      ['UNMATCHED', null],
    ]);
    // The detected mapping is remembered for this bank.
    expect(recon.accounts.get('enbd')!.statementMapping).toMatchObject({ date: 'Transaction Date', credit: 'Credit' });

    const again = await service.import({ bankAccountId: 'enbd', fileName: 'nov.csv', csv: file }, 'nour');
    expect(again).toMatchObject({ creditCount: 3, newCount: 0, duplicateCount: 3 });
    expect(again.lines).toHaveLength(0);
    expect(recon.lines).toHaveLength(3);
  });

  test('bulk confirm of exact matches pays the seat without an uploaded receipt and approves the plan', async () => {
    const a = await bankOrder('sara');
    expect(a.status).toBe('AWAITING_RECEIPT');
    const imp = await service.import({ bankAccountId: 'enbd', fileName: 'nov.csv', csv: csv([`03/11/2026,${a.reference},,924.00`, '03/11/2026,AZ-REC-20001,,523.95']) }, 'nour');
    const res = await service.confirmExact(imp.id, 'nour');
    expect(res).toMatchObject({ confirmed: 2, failed: 0 });

    const order = (await payments.findOrder(a.id))!;
    expect(order).toMatchObject({ status: 'PAID', receivedFils: 92_400, verifiedById: 'nour' });
    expect(enrollmentOf('sara')).toBe('ACTIVE');
    expect(notifier.types()).toContain('ENROLLED');
    expect(planCalls).toEqual([{ id: 'p1', input: expect.objectContaining({ approve: true, receivedFils: 52_395 }), opts: { fromBankStatement: true } }]);

    const view = await service.view(imp.id);
    expect(view.lines.map((l) => [l.status, l.outcome])).toEqual([
      ['CONFIRMED', 'PAID'],
      ['CONFIRMED', 'PAID'],
    ]);
    expect(view.openCount).toBe(0);
    expect(audit.entries.filter((e) => e.action === 'BANK_LINE_CONFIRMED').map((e) => [e.entityType, e.entityId, e.actorId])).toEqual([
      ['Order', a.id, 'nour'],
      ['SubscriptionPayment', 'p1', 'nour'],
    ]);
  });

  test('amount differs: confirming records what arrived and the order waits for the difference', async () => {
    const a = await bankOrder('sara');
    const imp = await service.import({ bankAccountId: 'enbd', fileName: 'x.csv', csv: csv([`03/11/2026,${a.reference},,900.00`]) }, 'nour');
    expect(imp.lines[0]!.match).toBe('AMOUNT_DIFFERS');
    expect((await service.confirmExact(imp.id, 'nour')).confirmed).toBe(0); // bulk takes exact matches only
    const r = await service.confirm(imp.lines[0]!.id, 'nour');
    expect(r).toEqual({ lineId: imp.lines[0]!.id, ok: true, outcome: 'AMOUNT_MISMATCH' });
    expect((await payments.findOrder(a.id))!).toMatchObject({ status: 'AMOUNT_MISMATCH', receivedFils: 90_000 });
    expect(enrollmentOf('sara')).toBe('VERIFYING');
    expect(notifier.types()).toContain('TRANSFER_AMOUNT_MISMATCH');
    expect(audit.entries.at(-1)).toMatchObject({ action: 'BANK_LINE_CONFIRMED', data: expect.objectContaining({ outcome: 'AMOUNT_MISMATCH' }) });
  });

  test('a failed approval leaves the line open; a plan amount mismatch changes nothing', async () => {
    const imp = await service.import({ bankAccountId: 'enbd', fileName: 'x.csv', csv: csv(['03/11/2026,AZ-REC-20001,,500.00']) }, 'nour');
    await expect(service.confirm(imp.lines[0]!.id, 'nour')).rejects.toMatchObject({ code: 'AMOUNT_MISMATCH' });
    expect(recon.lines[0]).toMatchObject({ status: 'OPEN', subscriptionPaymentId: null });
    expect(audit.entries.some((e) => e.action === 'BANK_LINE_CONFIRMED')).toBe(false);
  });

  test('not found: the admin picks the transfer from the suggestions, or ignores the line', async () => {
    const a = await bankOrder('sara');
    const imp = await service.import({ bankAccountId: 'enbd', fileName: 'x.csv', csv: csv(['03/11/2026,TRANSFER FROM SARA,,924.00', '03/11/2026,SALARY REFUND,,1.00']) }, 'nour');
    const [weak, none] = imp.lines;
    expect(weak!.match).toBe('SUGGESTED');
    expect(weak!.suggestions[0]).toMatchObject({ id: a.id, reference: a.reference });
    await expect(service.confirm(weak!.id, 'nour')).rejects.toMatchObject({ code: 'NO_MATCH' });
    expect(await service.confirm(weak!.id, 'nour', { kind: 'SEAT', id: a.id })).toMatchObject({ ok: true, outcome: 'PAID' });

    await service.ignore(none!.id, 'nour');
    expect(recon.lines[1]).toMatchObject({ status: 'IGNORED', decidedById: 'nour' });
    expect(audit.entries.at(-1)).toMatchObject({ action: 'BANK_LINE_IGNORED', entityId: none!.id });
    await expect(service.confirm(none!.id, 'nour')).rejects.toMatchObject({ code: 'LINE_DECIDED' });
  });

  test('a seat already paid is not paid twice by a second line', async () => {
    const a = await bankOrder('sara');
    const imp = await service.import({ bankAccountId: 'enbd', fileName: 'x.csv', csv: csv([`03/11/2026,${a.reference},,924.00`, `04/11/2026,again ${a.reference},,924.00`]) }, 'nour');
    expect(imp.lines.map((l) => l.match)).toEqual(['EXACT', 'DUPLICATE']);
    await service.confirmExact(imp.id, 'nour');
    await expect(service.confirm(imp.lines[1]!.id, 'nour', { kind: 'SEAT', id: a.id })).rejects.toMatchObject({ code: 'ORDER_NOT_REVIEWABLE' });
    expect(recon.lines[1]!.status).toBe('OPEN');
  });

  test('without a bank statement, an order still waiting for its receipt cannot be approved', async () => {
    const a = await bankOrder('omar');
    const finance = new FinanceAdminService(payments, new EnrollmentLifecycle(payments, new EnrollmentStateMachine(), notifier, new RecordingBroadcaster(), clock, 'x'), new FakePaymentGateway(), { reverseForRefund: async () => {} }, notifier, 48);
    await expect(finance.review(a.id, { decision: 'APPROVE', receivedAed: 924 }, 'nour')).rejects.toMatchObject({ code: 'ORDER_NOT_REVIEWABLE' });
    await expect(finance.review(a.id, { decision: 'REJECT', reason: 'nope' }, 'nour', { fromBankStatement: true })).rejects.toMatchObject({ code: 'ORDER_NOT_REVIEWABLE' });
  });
});

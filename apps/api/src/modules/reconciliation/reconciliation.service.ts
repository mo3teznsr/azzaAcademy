import type { StatementImportInput, StatementMapping, StatementMatchKind } from '@azza/shared';
import { AppError, BusinessRuleError, NotFoundError } from '../../core/errors';
import type { Clock } from '../../core/ports';
import type { AuditLog } from '../audit/audit-log';
import type { FinanceAdminService } from '../payments/finance-admin.service';
import type { SubscriptionService } from '../subscriptions/subscription.service';
import type { ReconciliationRepository, StatementLineRow } from './reconciliation.repository';
import { parseStatement, previewStatement } from './statement-csv';
import { lineHash, matchStatementLines, withOccurrences, type LineMatch, type OpenTransfer, type TransferRef } from './statement-matcher';

/** The transfer a decided line settled. */
const decidedRef = (l: StatementLineRow): TransferRef | null =>
  l.orderId ? { kind: 'SEAT', id: l.orderId } : l.subscriptionPaymentId ? { kind: 'PLAN', id: l.subscriptionPaymentId } : null;

export type SeatApprover = Pick<FinanceAdminService, 'review'>;
export type PlanApprover = Pick<SubscriptionService, 'reviewTransfer'>;

export interface ConfirmResult {
  lineId: string;
  ok: boolean;
  /** PAID, or AMOUNT_MISMATCH when the seat order now waits for the difference (the student was told). */
  outcome?: string;
  error?: { code: string; message: string };
}

/**
 * Bank statement reconciliation: imports a statement CSV, proposes the transfer each credit settles, and confirms through
 * the same approval paths as a hand review (enrollment, notices, earnings and invoices unchanged). Every decision is audited.
 */
export class ReconciliationService {
  constructor(
    private readonly repo: ReconciliationRepository,
    private readonly seats: SeatApprover,
    private readonly plans: PlanApprover,
    private readonly audit: AuditLog,
    private readonly clock: Clock,
  ) {}

  private async account(id: string) {
    const account = await this.repo.bankAccount(id);
    if (!account) throw new NotFoundError('BankAccount', id);
    return account;
  }

  async preview(input: { bankAccountId: string; csv: string }) {
    const account = await this.account(input.bankAccountId);
    return previewStatement(input.csv, account.statementMapping);
  }

  async saveMapping(bankAccountId: string, mapping: StatementMapping) {
    await this.account(bankAccountId);
    await this.repo.saveMapping(bankAccountId, mapping);
    return { bankAccountId, mapping };
  }

  async import(input: StatementImportInput, adminId: string) {
    const account = await this.account(input.bankAccountId);
    const parsed = parseStatement(input.csv, input.mapping ?? account.statementMapping);
    // The mapping that worked is remembered for this bank's next statement.
    if (input.mapping || !account.statementMapping) await this.repo.saveMapping(account.id, parsed.mapping);

    const hashed = withOccurrences(parsed.lines).map((l) => ({ ...l, lineHash: lineHash(account.id, l.postedOn, l.amountFils, l.description, l.occurrence) }));
    const known = await this.repo.knownHashes(hashed.map((l) => l.lineHash));
    const fresh = hashed.filter((l) => !known.has(l.lineHash));
    const imp = await this.repo.createImport(
      {
        bankAccountId: account.id,
        fileName: input.fileName,
        importedById: adminId,
        creditCount: parsed.lines.length,
        newCount: fresh.length,
        duplicateCount: parsed.lines.length - fresh.length,
        skippedCount: parsed.skipped,
      },
      fresh.map(({ lineHash, row, postedOn, amountFils, description }) => ({ lineHash, row, postedOn, amountFils, description })),
    );
    await this.audit.record({
      actorId: adminId,
      action: 'BANK_STATEMENT_IMPORTED',
      entityType: 'BankStatementImport',
      entityId: imp.id,
      data: { bankAccountId: account.id, fileName: input.fileName, credits: imp.creditCount, new: imp.newCount, duplicates: imp.duplicateCount },
    });
    return this.view(imp.id);
  }

  listImports() {
    return this.repo.listImports(50);
  }

  /** Proposals are worked out on every read, so a transfer paid meanwhile is no longer offered. */
  private async proposals(lines: StatementLineRow[]) {
    const open = lines.filter((l) => l.status === 'OPEN');
    const transfers = open.length ? await this.repo.openTransfers() : [];
    const matches = new Map(matchStatementLines(open.map((l) => ({ id: l.id, postedOn: l.postedOn, amountFils: l.amountFils, description: l.description })), transfers).map((m) => [m.lineId, m]));
    return { matches, transfers };
  }

  async view(importId: string) {
    const imp = await this.repo.findImport(importId);
    if (!imp) throw new NotFoundError('BankStatementImport', importId);
    const lines = await this.repo.linesOf(importId);
    const { matches, transfers } = await this.proposals(lines);
    const decidedRefs = lines.map(decidedRef).filter((r): r is TransferRef => r !== null);
    const known = new Map<string, OpenTransfer>([...transfers, ...(await this.repo.describeTransfers(decidedRefs))].map((t) => [`${t.kind}:${t.id}`, t]));
    const show = (ref: TransferRef | null) => (ref ? (known.get(`${ref.kind}:${ref.id}`) ?? null) : null);

    return {
      ...imp,
      lines: lines.map((l) => {
        const m: LineMatch | undefined = matches.get(l.id);
        const decided = decidedRef(l);
        return {
          id: l.id,
          row: l.row,
          postedOn: l.postedOn,
          amountFils: l.amountFils,
          description: l.description,
          status: l.status,
          outcome: l.outcome,
          decidedAt: l.decidedAt,
          match: (m?.kind ?? null) as StatementMatchKind | null,
          transfer: show(decided ?? m?.transfer ?? null),
          suggestions: (m?.suggestions ?? []).flatMap((s) => {
            const t = show(s);
            return t ? [{ ...t, score: s.score }] : [];
          }),
        };
      }),
    };
  }

  /** The transfer to settle: the admin's pick, else the proposed match (exact or amount differs). */
  private async targetFor(line: StatementLineRow, picked?: TransferRef): Promise<TransferRef> {
    if (picked) return picked;
    const { matches } = await this.proposals([line]);
    const m = matches.get(line.id);
    if (!m?.transfer || (m.kind !== 'EXACT' && m.kind !== 'AMOUNT_DIFFERS')) throw new BusinessRuleError('Pick the transfer this line pays for', 'NO_MATCH');
    return m.transfer;
  }

  async confirm(lineId: string, adminId: string, picked?: TransferRef): Promise<ConfirmResult> {
    const line = await this.repo.line(lineId);
    if (!line) throw new NotFoundError('BankStatementLine', lineId);
    if (line.status !== 'OPEN') throw new BusinessRuleError(`Line is ${line.status}`, 'LINE_DECIDED');
    const target = await this.targetFor(line, picked);
    const now = this.clock.now();
    // Claim the line first so two admins (or a double click) can't settle two transfers with one credit.
    const claimed = await this.repo.decideLine(line.id, {
      status: 'CONFIRMED',
      decidedById: adminId,
      decidedAt: now,
      orderId: target.kind === 'SEAT' ? target.id : null,
      subscriptionPaymentId: target.kind === 'PLAN' ? target.id : null,
    });
    if (!claimed) throw new BusinessRuleError('Someone else decided this line', 'LINE_DECIDED');

    let outcome = 'PAID';
    try {
      if (target.kind === 'SEAT') {
        try {
          await this.seats.review(target.id, { decision: 'APPROVE', receivedAed: line.amountFils / 100 }, adminId, { fromBankStatement: true });
        } catch (e) {
          // The order now records what arrived and waits for the difference; the line did its job.
          if (!(e instanceof AppError && e.code === 'AMOUNT_MISMATCH')) throw e;
          outcome = 'AMOUNT_MISMATCH';
        }
      } else {
        const note = `Bank statement ${line.postedOn.toISOString().slice(0, 10)}: ${line.description}`.slice(0, 500);
        await this.plans.reviewTransfer(target.id, { approve: true, receivedFils: line.amountFils, note }, adminId, { fromBankStatement: true });
      }
    } catch (e) {
      await this.repo.decideLine(line.id, { status: 'OPEN', decidedById: null, decidedAt: null, orderId: null, subscriptionPaymentId: null }, 'CONFIRMED');
      throw e;
    }
    await this.repo.decideLine(line.id, { outcome }, 'CONFIRMED');
    await this.audit.record({
      actorId: adminId,
      action: 'BANK_LINE_CONFIRMED',
      entityType: target.kind === 'SEAT' ? 'Order' : 'SubscriptionPayment',
      entityId: target.id,
      data: { lineId: line.id, importId: line.importId, postedOn: line.postedOn.toISOString().slice(0, 10), amountFils: line.amountFils, description: line.description, outcome },
    });
    return { lineId: line.id, ok: true, outcome };
  }

  /** One click for every exact match of an import; each line succeeds or fails on its own. */
  async confirmExact(importId: string, adminId: string) {
    const view = await this.view(importId);
    const results: ConfirmResult[] = [];
    for (const l of view.lines) {
      if (l.status !== 'OPEN' || l.match !== 'EXACT' || !l.transfer) continue;
      try {
        results.push(await this.confirm(l.id, adminId, { kind: l.transfer.kind, id: l.transfer.id }));
      } catch (e) {
        const err = e instanceof AppError ? { code: e.code, message: e.message } : { code: 'ERROR', message: String(e) };
        results.push({ lineId: l.id, ok: false, error: err });
      }
    }
    return { confirmed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
  }

  async ignore(lineId: string, adminId: string) {
    const line = await this.repo.line(lineId);
    if (!line) throw new NotFoundError('BankStatementLine', lineId);
    const ignored = await this.repo.decideLine(line.id, { status: 'IGNORED', decidedById: adminId, decidedAt: this.clock.now() });
    if (!ignored) throw new BusinessRuleError(`Line is ${line.status}`, 'LINE_DECIDED');
    await this.audit.record({
      actorId: adminId,
      action: 'BANK_LINE_IGNORED',
      entityType: 'BankStatementLine',
      entityId: line.id,
      data: { importId: line.importId, amountFils: line.amountFils, description: line.description },
    });
    return { lineId: line.id, ok: true };
  }
}

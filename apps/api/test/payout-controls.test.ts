import { describe, expect, test } from 'bun:test';
import type { AuditEntry, AuditLog, AuditRecord } from '../src/modules/audit/audit-log';
import { approvalBlocked } from '../src/modules/payouts/payout-approval';
import { EarningsCalculator } from '../src/modules/payouts/earnings-calculator';
import { PayoutService } from '../src/modules/payouts/payout.service';

describe('second admin rule', () => {
  test('with several admins, whoever created or adjusted a run cannot approve it', () => {
    expect(approvalBlocked(2, ['nour'], 'nour')).toBe(true);
    expect(approvalBlocked(2, ['nour'], 'sami')).toBe(false);
    expect(approvalBlocked(1, ['nour'], 'nour')).toBe(false); // a lone admin can still pay teachers
  });
});

class MemAudit implements AuditLog {
  entries: AuditRecord[] = [];
  async record(e: AuditEntry) {
    this.entries.push({ ...e, id: `a${this.entries.length}`, createdAt: new Date(), actorName: null, data: e.data ?? {} });
  }
  async forEntity(type: string, id: string) {
    return this.entries.filter((e) => e.entityType === type && e.entityId === id);
  }
}

function setup(admins: number) {
  const run = { id: 'r1', status: 'DRAFT', createdById: 'nour', periodStart: new Date('2026-11-01'), periodEnd: new Date('2026-11-15'), payouts: [] as unknown[] };
  const settled: Array<{ ref: string; refs: Record<string, string> }> = [];
  const repo = {
    findRun: async () => ({ ...run, payouts: run.payouts }),
    runEarningsByCourse: async () => [],
    activeAdminCount: async () => admins,
    updateRun: async (_id: string, data: { status: string }) => Object.assign(run, data),
    settleRun: async (_id: string, ref: string, _at: Date, refs: Record<string, string>) => {
      settled.push({ ref, refs });
      run.status = 'PAID';
      return [];
    },
  };
  const audit = new MemAudit();
  const service = new PayoutService(repo as never, new EarningsCalculator(), { cuts: async () => ({ liveCutPercent: 70, recordedCutPercent: 60 }) }, { notify: async () => {} } as never, { now: () => new Date('2026-11-16') }, { earningHoldDays: 14, minPayoutFils: 0 }, audit);
  return { run, service, audit, settled };
}

describe('payout runs', () => {
  test('the creator is refused when another admin exists; someone else approves, and it is logged', async () => {
    const { service, audit } = setup(2);
    await expect(service.approve('r1', 'nour')).rejects.toMatchObject({ code: 'SECOND_ADMIN_REQUIRED' });
    const out = await service.approve('r1', 'sami');
    expect(out.status).toBe('APPROVED');
    expect(audit.entries.at(-1)).toMatchObject({ actorId: 'sami', action: 'PAYOUT_RUN_APPROVED', data: { secondPerson: true, activeAdmins: 2 } });
  });

  test('an admin who adjusted the run cannot approve it either', async () => {
    const { service, audit } = setup(3);
    await audit.record({ actorId: 'sami', action: 'PAYOUT_ADJUSTED', entityType: 'PayoutRun', entityId: 'r1' });
    await expect(service.approve('r1', 'sami')).rejects.toMatchObject({ code: 'SECOND_ADMIN_REQUIRED' });
    expect((await service.approve('r1', 'huda')).status).toBe('APPROVED');
  });

  test('a lone admin can approve their own run; the log says no second person checked it', async () => {
    const { service, audit } = setup(1);
    await service.approve('r1', 'nour');
    expect(audit.entries.at(-1)!.data).toMatchObject({ secondPerson: false, activeAdmins: 1 });
  });

  test('exports and payments are logged; per-teacher references must belong to the run', async () => {
    const { run, service, audit, settled } = setup(2);
    run.status = 'APPROVED';
    run.payouts = [{ id: 'p1', amountFils: 100, adjustmentsFils: 0, status: 'READY', teacher: { name: 'Lina' } }];
    await service.exportCsv('r1', 'nour');
    await expect(service.markPaid('r1', 'BATCH-REF', 'nour', { nope: 'X-1' })).rejects.toMatchObject({ code: 'UNKNOWN_PAYOUT' });
    await service.markPaid('r1', 'BATCH-REF', 'nour', { p1: 'ENBD-77' });
    expect(settled).toEqual([{ ref: 'BATCH-REF', refs: { p1: 'ENBD-77' } }]);
    expect(audit.entries.map((e) => e.action)).toEqual(['PAYOUT_RUN_EXPORTED', 'PAYOUT_RUN_PAID']);
  });
});

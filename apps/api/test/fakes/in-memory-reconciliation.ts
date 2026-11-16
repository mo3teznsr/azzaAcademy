import type { StatementMapping } from '@azza/shared';
import type { AuditEntry, AuditLog, AuditRecord } from '../../src/modules/audit/audit-log';
import type {
  LineDecision,
  NewStatementImport,
  NewStatementLine,
  ReconciliationRepository,
  StatementBankAccount,
  StatementImportRow,
  StatementLineRow,
} from '../../src/modules/reconciliation/reconciliation.repository';
import type { OpenTransfer, TransferRef } from '../../src/modules/reconciliation/statement-matcher';

/** Statement storage in memory; transfers come from a callback so tests can back them with other fakes. */
export class InMemoryReconciliationRepository implements ReconciliationRepository {
  accounts = new Map<string, StatementBankAccount>();
  imports: Omit<StatementImportRow, 'openCount' | 'bankName'>[] = [];
  lines: StatementLineRow[] = [];
  private n = 0;

  constructor(private readonly transfers: () => Promise<OpenTransfer[]>) {}

  async bankAccount(id: string) {
    return this.accounts.get(id) ?? null;
  }
  async saveMapping(id: string, mapping: StatementMapping) {
    this.accounts.set(id, { ...this.accounts.get(id)!, statementMapping: mapping });
  }
  async knownHashes(hashes: string[]) {
    return new Set(this.lines.filter((l) => hashes.includes(l.lineHash)).map((l) => l.lineHash));
  }
  async createImport(data: NewStatementImport, lines: NewStatementLine[]) {
    const id = `imp${++this.n}`;
    this.imports.push({ ...data, id, createdAt: new Date() });
    for (const l of lines) {
      if (this.lines.some((x) => x.lineHash === l.lineHash)) continue;
      this.lines.push({ ...l, id: `line${++this.n}`, importId: id, bankAccountId: data.bankAccountId, status: 'OPEN', outcome: null, orderId: null, subscriptionPaymentId: null, decidedById: null, decidedAt: null });
    }
    return (await this.findImport(id))!;
  }
  private row(i: Omit<StatementImportRow, 'openCount' | 'bankName'>): StatementImportRow {
    return { ...i, bankName: this.accounts.get(i.bankAccountId)?.bankName ?? '', openCount: this.lines.filter((l) => l.importId === i.id && l.status === 'OPEN').length };
  }
  async listImports(take: number) {
    return this.imports.slice(-take).reverse().map((i) => this.row(i));
  }
  async findImport(id: string) {
    const i = this.imports.find((x) => x.id === id);
    return i ? this.row(i) : null;
  }
  async linesOf(importId: string) {
    return this.lines.filter((l) => l.importId === importId);
  }
  async line(id: string) {
    return this.lines.find((l) => l.id === id) ?? null;
  }
  async decideLine(id: string, patch: LineDecision, from = 'OPEN') {
    const i = this.lines.findIndex((l) => l.id === id);
    if (i < 0 || this.lines[i]!.status !== from) return null;
    this.lines[i] = { ...this.lines[i]!, ...patch };
    return this.lines[i]!;
  }
  openTransfers() {
    return this.transfers();
  }
  async describeTransfers(refs: TransferRef[]) {
    const all = await this.transfers();
    return all.filter((t) => refs.some((r) => r.kind === t.kind && r.id === t.id));
  }
}

export class RecordingAuditLog implements AuditLog {
  entries: AuditEntry[] = [];
  async record(e: AuditEntry) {
    this.entries.push(e);
  }
  async forEntity(entityType: string, entityId: string): Promise<AuditRecord[]> {
    return this.entries
      .filter((e) => e.entityType === entityType && e.entityId === entityId)
      .map((e, i) => ({ ...e, id: String(i), createdAt: new Date(0), actorName: null }));
  }
}

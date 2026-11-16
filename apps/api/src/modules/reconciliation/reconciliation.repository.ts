import type { StatementLineStatus, StatementMapping } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import { OPEN_PLAN_STATUSES, OPEN_SEAT_STATUSES, type OpenTransfer, type TransferRef } from './statement-matcher';

export interface StatementBankAccount {
  id: string;
  bankName: string;
  statementMapping: StatementMapping | null;
}

export interface StatementImportRow {
  id: string;
  bankAccountId: string;
  bankName: string;
  fileName: string;
  importedById: string | null;
  creditCount: number;
  newCount: number;
  duplicateCount: number;
  skippedCount: number;
  createdAt: Date;
  openCount: number;
}

export interface StatementLineRow {
  id: string;
  importId: string;
  bankAccountId: string;
  lineHash: string;
  row: number;
  postedOn: Date;
  amountFils: number;
  description: string;
  status: StatementLineStatus;
  outcome: string | null;
  orderId: string | null;
  subscriptionPaymentId: string | null;
  decidedById: string | null;
  decidedAt: Date | null;
}

export type NewStatementLine = Pick<StatementLineRow, 'lineHash' | 'row' | 'postedOn' | 'amountFils' | 'description'>;
export type NewStatementImport = Omit<StatementImportRow, 'id' | 'bankName' | 'createdAt' | 'openCount'>;
export type LineDecision = Partial<Pick<StatementLineRow, 'status' | 'outcome' | 'orderId' | 'subscriptionPaymentId' | 'decidedById' | 'decidedAt'>>;

export interface ReconciliationRepository {
  bankAccount(id: string): Promise<StatementBankAccount | null>;
  saveMapping(bankAccountId: string, mapping: StatementMapping): Promise<void>;
  /** Which of these line hashes are already stored. */
  knownHashes(hashes: string[]): Promise<Set<string>>;
  /** Stores the import and its new lines (a hash stored meanwhile is skipped). */
  createImport(data: NewStatementImport, lines: NewStatementLine[]): Promise<StatementImportRow>;
  listImports(take: number): Promise<StatementImportRow[]>;
  findImport(id: string): Promise<StatementImportRow | null>;
  linesOf(importId: string): Promise<StatementLineRow[]>;
  line(id: string): Promise<StatementLineRow | null>;
  /** Applies the decision only while the line is still `from`; null when someone else decided it first. */
  decideLine(id: string, patch: LineDecision, from?: StatementLineStatus): Promise<StatementLineRow | null>;
  /** Seat orders and plan payments that a bank line can still settle. */
  openTransfers(): Promise<OpenTransfer[]>;
  /** Display details of these transfers, whatever their status. */
  describeTransfers(refs: TransferRef[]): Promise<OpenTransfer[]>;
}

const transferSelect = { id: true, reference: true, totalFils: true, status: true, createdAt: true, user: { select: { name: true } } } as const;
const toTransfer =
  (kind: 'SEAT' | 'PLAN') =>
  (r: { id: string; reference: string; totalFils: number; status: string; createdAt: Date; user: { name: string } }): OpenTransfer => ({
    kind,
    id: r.id,
    reference: r.reference,
    totalFils: r.totalFils,
    status: r.status,
    createdAt: r.createdAt,
    userName: r.user.name,
  });

export class PrismaReconciliationRepository implements ReconciliationRepository {
  constructor(private readonly db: Db) {}

  async bankAccount(id: string) {
    const a = await this.db.bankAccount.findUnique({ where: { id }, select: { id: true, bankName: true, statementMapping: true } });
    return a ? { ...a, statementMapping: (a.statementMapping ?? null) as StatementMapping | null } : null;
  }

  async saveMapping(bankAccountId: string, mapping: StatementMapping) {
    await this.db.bankAccount.update({ where: { id: bankAccountId }, data: { statementMapping: mapping as object } });
  }

  async knownHashes(hashes: string[]) {
    if (!hashes.length) return new Set<string>();
    const rows = await this.db.bankStatementLine.findMany({ where: { lineHash: { in: hashes } }, select: { lineHash: true } });
    return new Set(rows.map((r) => r.lineHash));
  }

  async createImport(data: NewStatementImport, lines: NewStatementLine[]) {
    const created = await this.db.$transaction(async (tx) => {
      const imp = await tx.bankStatementImport.create({ data });
      await tx.bankStatementLine.createMany({
        data: lines.map((l) => ({ ...l, importId: imp.id, bankAccountId: data.bankAccountId })),
        skipDuplicates: true,
      });
      return imp;
    });
    return (await this.findImport(created.id))!;
  }

  private async withCounts(rows: (Omit<StatementImportRow, 'bankName' | 'openCount'> & { bankAccount: { bankName: string } })[]): Promise<StatementImportRow[]> {
    if (!rows.length) return [];
    const open = await this.db.bankStatementLine.groupBy({ by: ['importId'], where: { importId: { in: rows.map((r) => r.id) }, status: 'OPEN' }, _count: true });
    const openBy = new Map(open.map((o) => [o.importId, o._count]));
    return rows.map(({ bankAccount, ...r }) => ({ ...r, bankName: bankAccount.bankName, openCount: openBy.get(r.id) ?? 0 }));
  }

  private importRows(where: { id?: string }, take?: number) {
    return this.db.bankStatementImport.findMany({ where, orderBy: { createdAt: 'desc' }, take, include: { bankAccount: { select: { bankName: true } } } });
  }

  async listImports(take: number) {
    return this.withCounts(await this.importRows({}, take));
  }

  async findImport(id: string) {
    return (await this.withCounts(await this.importRows({ id })))[0] ?? null;
  }

  async linesOf(importId: string) {
    return (await this.db.bankStatementLine.findMany({ where: { importId }, orderBy: { row: 'asc' } })) as StatementLineRow[];
  }

  async line(id: string) {
    return (await this.db.bankStatementLine.findUnique({ where: { id } })) as StatementLineRow | null;
  }

  async decideLine(id: string, patch: LineDecision, from: StatementLineStatus = 'OPEN') {
    const claimed = await this.db.bankStatementLine.updateMany({ where: { id, status: from }, data: patch });
    return claimed.count === 1 ? this.line(id) : null;
  }

  async openTransfers() {
    const [seats, plans] = await Promise.all([
      this.db.order.findMany({ where: { method: 'BANK_TRANSFER', status: { in: [...OPEN_SEAT_STATUSES] } }, select: transferSelect }),
      this.db.subscriptionPayment.findMany({ where: { status: { in: [...OPEN_PLAN_STATUSES] } }, select: transferSelect }),
    ]);
    return [...seats.map(toTransfer('SEAT')), ...plans.map(toTransfer('PLAN'))];
  }

  async describeTransfers(refs: TransferRef[]) {
    const ids = (kind: 'SEAT' | 'PLAN') => [...new Set(refs.filter((r) => r.kind === kind).map((r) => r.id))];
    const [seats, plans] = await Promise.all([
      ids('SEAT').length ? this.db.order.findMany({ where: { id: { in: ids('SEAT') } }, select: transferSelect }) : [],
      ids('PLAN').length ? this.db.subscriptionPayment.findMany({ where: { id: { in: ids('PLAN') } }, select: transferSelect }) : [],
    ]);
    return [...seats.map(toTransfer('SEAT')), ...plans.map(toTransfer('PLAN'))];
  }
}

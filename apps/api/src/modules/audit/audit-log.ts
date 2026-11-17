import type { Db } from '../../infrastructure/db';

/** One recorded admin action on money or sensitive data. */
export interface AuditEntry {
  actorId: string | null;
  /** e.g. PAYOUT_RUN_CREATED, PAYOUT_ADJUSTED, PAYOUT_RUN_APPROVED, PAYOUT_RUN_EXPORTED, PAYOUT_RUN_PAID, BANK_DETAILS_VERIFIED */
  action: string;
  entityType: string;
  entityId: string;
  data?: Record<string, unknown>;
}

export interface AuditRecord extends AuditEntry {
  id: string;
  createdAt: Date;
  actorName: string | null;
}

/** Append-only log of who did what to money. Never edited or deleted by the app. */
export interface AuditLog {
  record(entry: AuditEntry): Promise<void>;
  forEntity(entityType: string, entityId: string): Promise<AuditRecord[]>;
}

/** For tests and scripts that don't keep a log. */
export const noAuditLog: AuditLog = {
  record: async () => {},
  forEntity: async () => [],
};

export class PrismaAuditLog implements AuditLog {
  constructor(private readonly db: Db) {}

  async record(e: AuditEntry) {
    await this.db.auditLog.create({
      data: { actorId: e.actorId, action: e.action, entityType: e.entityType, entityId: e.entityId, data: (e.data ?? {}) as object },
    });
  }

  async forEntity(entityType: string, entityId: string) {
    const rows = await this.db.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'asc' },
      include: { actor: { select: { name: true } } },
    });
    return rows.map(({ actor, data, ...r }) => ({ ...r, data: (data ?? {}) as Record<string, unknown>, actorName: actor?.name ?? null }));
  }
}

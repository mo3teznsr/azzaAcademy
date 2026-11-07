import type { Db } from '../../infrastructure/db';
import type {
  ConversationBatch,
  ConversationRecord,
  ConversationRepository,
  LastMessage,
  MessageRecord,
  UserRef,
} from './conversation.service';

const batchSelect = { id: true, code: true, status: true, teacherId: true, course: { select: { titleEn: true, titleAr: true } } };
const senderInclude = { sender: { select: { id: true, name: true, image: true, role: true } } };

type BatchRow = { id: string; code: string; status: ConversationBatch['status']; teacherId: string; course: { titleEn: string; titleAr: string | null } };
const toBatch = (b: BatchRow): ConversationBatch => ({
  id: b.id,
  code: b.code,
  status: b.status,
  teacherId: b.teacherId,
  courseTitle: b.course.titleEn,
  courseTitleAr: b.course.titleAr,
});

export class PrismaConversationRepository implements ConversationRepository {
  constructor(private readonly db: Db) {}

  async batch(batchId: string) {
    const b = await this.db.batch.findUnique({ where: { id: batchId }, select: batchSelect });
    return b ? toBatch(b) : null;
  }

  async batches(ids: string[]) {
    return (await this.db.batch.findMany({ where: { id: { in: ids } }, select: batchSelect })).map(toBatch);
  }

  async enrollmentStatus(userId: string, batchId: string) {
    const row = await this.db.enrollment.findUnique({ where: { userId_batchId: { userId, batchId } }, select: { status: true } });
    return row?.status ?? null;
  }

  async activeStudentIds(batchId: string) {
    return (await this.db.enrollment.findMany({ where: { batchId, status: 'ACTIVE' }, select: { userId: true } })).map((e) => e.userId);
  }

  async studentBatchIds(userId: string) {
    return (await this.db.enrollment.findMany({ where: { userId, status: 'ACTIVE' }, select: { batchId: true } })).map((e) => e.batchId);
  }

  async teacherBatchIds(userId: string) {
    const rows = await this.db.batch.findMany({ where: { teacherId: userId, status: { notIn: ['DRAFT', 'PENDING_REVIEW'] } }, select: { id: true } });
    return rows.map((b) => b.id);
  }

  /** Nulls are distinct in the unique index, so find-or-create runs under a per-batch advisory lock. */
  ensureClassConversation(batchId: string) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`conversation:class:${batchId}`}))`;
      const found = await tx.conversation.findFirst({ where: { batchId, type: 'CLASS' }, orderBy: { createdAt: 'asc' } });
      return found ?? tx.conversation.create({ data: { batchId, type: 'CLASS' } });
    });
  }

  classConversations(batchIds: string[]) {
    return this.db.conversation.findMany({ where: { batchId: { in: batchIds }, type: 'CLASS' }, distinct: ['batchId'], orderBy: { createdAt: 'asc' } });
  }

  ensureDirectConversation(batchId: string, studentId: string) {
    return this.db.conversation.upsert({
      where: { batchId_type_studentId: { batchId, type: 'DIRECT', studentId } },
      create: { batchId, type: 'DIRECT', studentId },
      update: {},
    });
  }

  directConversations(batchIds: string[], studentId?: string) {
    return this.db.conversation.findMany({ where: { batchId: { in: batchIds }, type: 'DIRECT', ...(studentId && { studentId }) } });
  }

  findConversation(id: string): Promise<ConversationRecord | null> {
    return this.db.conversation.findUnique({ where: { id } });
  }

  users(ids: string[]): Promise<UserRef[]> {
    return this.db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, image: true, role: true } });
  }

  async lastMessages(conversationIds: string[]) {
    const out = new Map<string, LastMessage>();
    if (!conversationIds.length) return out;
    const rows = await this.db.$queryRaw<Array<{ conversationId: string; body: string; createdAt: Date; senderName: string }>>`
      SELECT DISTINCT ON (m."conversationId") m."conversationId", m."body", m."createdAt", u."name" AS "senderName"
      FROM "Message" m JOIN "user" u ON u."id" = m."senderId"
      WHERE m."conversationId" = ANY(${conversationIds}) AND m."deletedAt" IS NULL
      ORDER BY m."conversationId", m."createdAt" DESC`;
    for (const r of rows) out.set(r.conversationId, { body: r.body, senderName: r.senderName, createdAt: r.createdAt });
    return out;
  }

  async unreadCounts(userId: string, conversationIds: string[]) {
    const out = new Map<string, number>();
    if (!conversationIds.length) return out;
    const rows = await this.db.$queryRaw<Array<{ conversationId: string; unread: bigint }>>`
      SELECT m."conversationId", COUNT(*) AS "unread"
      FROM "Message" m
      LEFT JOIN "ConversationRead" r ON r."conversationId" = m."conversationId" AND r."userId" = ${userId}
      WHERE m."conversationId" = ANY(${conversationIds}) AND m."senderId" <> ${userId} AND m."deletedAt" IS NULL
        AND (r."lastReadAt" IS NULL OR m."createdAt" > r."lastReadAt")
      GROUP BY m."conversationId"`;
    for (const r of rows) out.set(r.conversationId, Number(r.unread));
    return out;
  }

  messages(conversationId: string, before: Date | null, take: number) {
    return this.db.message.findMany({
      where: { conversationId, ...(before && { createdAt: { lt: before } }) },
      include: senderInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
    }) as Promise<MessageRecord[]>;
  }

  async createMessage(conversationId: string, senderId: string, body: string, at: Date) {
    const [message] = await this.db.$transaction([
      this.db.message.create({ data: { conversationId, senderId, body, createdAt: at }, include: senderInclude }),
      this.db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: at } }),
    ]);
    return message as MessageRecord;
  }

  findMessage(id: string) {
    return this.db.message.findUnique({ where: { id }, include: senderInclude }) as Promise<MessageRecord | null>;
  }

  async softDeleteMessage(id: string, byId: string, at: Date) {
    await this.db.message.update({ where: { id }, data: { deletedAt: at, deletedById: byId } });
  }

  async markRead(conversationId: string, userId: string, at: Date) {
    await this.db.conversationRead.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      create: { conversationId, userId, lastReadAt: at },
      update: { lastReadAt: at },
    });
  }
}

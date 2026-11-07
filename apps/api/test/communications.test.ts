import { beforeEach, describe, expect, test } from 'bun:test';
import {
  SOCKET_EVENTS,
  updateSupportTicketInput,
  type AnnouncementAudience,
  type BatchStatus,
  type EnrollmentStatus,
  type Role,
  type SupportStatus,
} from '@azza/shared';
import type { AppError } from '../src/core/errors';
import { BatchAccessPolicy, type BatchAccessRepository } from '../src/modules/batches/batch-access';
import {
  AnnouncementService,
  type AnnouncementFeedFilter,
  type AnnouncementRecord,
  type AnnouncementRepository,
  type NewAnnouncement,
} from '../src/modules/announcements/announcement.service';
import {
  ConversationService,
  NOTIFY_COLLAPSE_MS,
  type ConversationBatch,
  type ConversationRecord,
  type ConversationRepository,
  type LastMessage,
  type MessageRecord,
  type UserRef,
} from '../src/modules/conversations/conversation.service';
import { Collapser, SlidingWindowLimiter } from '../src/modules/conversations/throttles';
import {
  SupportService,
  type SupportMessageRecord,
  type SupportRepository,
  type TicketListFilter,
  type TicketRecord,
} from '../src/modules/support/support.service';
import { RecordingBroadcaster, RecordingNotifier } from './fakes/in-memory';

const codeOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e.code);
const statusOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e.status);

// ───────── shared world ─────────
// b1 (RUNNING): teacher lina; sara + mariam ACTIVE, nadia VERIFYING.
// b2 (COMPLETED): teacher omar; sara ACTIVE.

const admin = { id: 'nour', role: 'ADMIN' as const };
const lina = { id: 'lina', role: 'TEACHER' as const };
const omar = { id: 'omar', role: 'TEACHER' as const };
const sara = { id: 'sara', role: 'STUDENT' as const };
const mariam = { id: 'mariam', role: 'STUDENT' as const };
const nadia = { id: 'nadia', role: 'STUDENT' as const };
const allUsers: Array<{ id: string; role: Role }> = [admin, lina, omar, sara, mariam, nadia];

class World {
  batches: ConversationBatch[] = [
    { id: 'b1', code: 'B1', status: 'RUNNING', teacherId: 'lina', courseTitle: 'Arabic 101', courseTitleAr: 'عربي ١٠١' },
    { id: 'b2', code: 'B2', status: 'COMPLETED', teacherId: 'omar', courseTitle: 'Maths', courseTitleAr: null },
  ];
  enrollments: Array<{ userId: string; batchId: string; status: EnrollmentStatus }> = [
    { userId: 'sara', batchId: 'b1', status: 'ACTIVE' },
    { userId: 'mariam', batchId: 'b1', status: 'ACTIVE' },
    { userId: 'nadia', batchId: 'b1', status: 'VERIFYING' },
    { userId: 'sara', batchId: 'b2', status: 'ACTIVE' },
  ];
  batch(id: string) {
    return this.batches.find((b) => b.id === id) ?? null;
  }
  status(userId: string, batchId: string) {
    return this.enrollments.find((e) => e.userId === userId && e.batchId === batchId)?.status ?? null;
  }
  active(batchId: string) {
    return this.enrollments.filter((e) => e.batchId === batchId && e.status === 'ACTIVE').map((e) => e.userId);
  }
  setBatchStatus(id: string, status: BatchStatus) {
    this.batch(id)!.status = status;
  }
  user(id: string): UserRef {
    const u = allUsers.find((x) => x.id === id)!;
    return { id: u.id, name: u.id.toUpperCase(), image: null, role: u.role };
  }
  accessRepo(): BatchAccessRepository {
    return {
      teacherOf: async (id) => this.batch(id)?.teacherId ?? null,
      enrollmentStatus: async (u, b) => this.status(u, b),
    };
  }
}

class TestClock {
  t = new Date('2026-11-07T10:00:00Z').getTime();
  now() {
    return new Date(this.t);
  }
  advance(ms: number) {
    this.t += ms;
  }
}

// ───────── announcements ─────────

class InMemoryAnnouncementRepository implements AnnouncementRepository {
  rows: AnnouncementRecord[] = [];
  private seq = 0;
  constructor(private readonly world: World) {}
  private hydrate(a: AnnouncementRecord) {
    const b = a.batchId ? this.world.batch(a.batchId) : null;
    const u = this.world.user(a.authorId);
    return { ...a, author: { id: u.id, name: u.name, image: null }, batch: b ? { id: b.id, code: b.code, course: { titleEn: b.courseTitle, titleAr: b.courseTitleAr } } : null };
  }
  private sorted(rows: AnnouncementRecord[]) {
    return [...rows].sort((a, b) => Number(b.pinned) - Number(a.pinned) || +b.createdAt - +a.createdAt);
  }
  async find(id: string) {
    return this.rows.find((r) => r.id === id) ?? null;
  }
  async create(data: NewAnnouncement) {
    const now = new Date(Date.UTC(2026, 10, 7, 0, 0, ++this.seq));
    const a = this.hydrate({ ...data, id: `a${this.seq}`, createdAt: now, updatedAt: now } as AnnouncementRecord);
    this.rows.push(a);
    return a;
  }
  async update(id: string, data: Partial<AnnouncementRecord>) {
    const a = this.rows.find((r) => r.id === id)!;
    Object.assign(a, data);
    return a;
  }
  async delete(id: string) {
    this.rows = this.rows.filter((r) => r.id !== id);
  }
  async listForBatch(batchId: string, skip: number, take: number) {
    const all = this.sorted(this.rows.filter((r) => r.batchId === batchId));
    return { items: all.slice(skip, skip + take), total: all.length };
  }
  async feed(f: AnnouncementFeedFilter, skip: number, take: number) {
    const all = this.sorted(this.rows.filter((r) => (r.scope === 'PLATFORM' ? f.audiences.includes(r.audience) : f.batchIds.includes(r.batchId!))));
    return { items: all.slice(skip, skip + take), total: all.length };
  }
  async memberBatchIds(user: { id: string; role: Role }) {
    if (user.role === 'TEACHER') return this.world.batches.filter((b) => b.teacherId === user.id).map((b) => b.id);
    return this.world.enrollments.filter((e) => e.userId === user.id && e.status === 'ACTIVE').map((e) => e.batchId);
  }
  async classMemberIds(batchId: string) {
    return [this.world.batch(batchId)!.teacherId, ...this.world.active(batchId)];
  }
  async audienceUserIds(audience: AnnouncementAudience) {
    const roles: Role[] = audience === 'ALL' ? ['STUDENT', 'TEACHER', 'ADMIN'] : audience === 'STUDENTS' ? ['STUDENT'] : ['TEACHER'];
    return allUsers.filter((u) => roles.includes(u.role)).map((u) => u.id);
  }
}

describe('announcements', () => {
  let world: World;
  let repo: InMemoryAnnouncementRepository;
  let notifier: RecordingNotifier;
  let service: AnnouncementService;
  beforeEach(() => {
    world = new World();
    repo = new InMemoryAnnouncementRepository(world);
    notifier = new RecordingNotifier();
    service = new AnnouncementService(repo, new BatchAccessPolicy(world.accessRepo()), notifier, 'https://azza.test');
  });

  test('the batch teacher and admins post; students and outsiders cannot', async () => {
    const input = { title: 'Homework', body: 'Read chapter 2', pinned: false, notify: false };
    expect((await service.postToBatch('b1', input, lina)).scope).toBe('BATCH');
    expect((await service.postToBatch('b1', input, admin)).batch?.courseTitle).toBe('Arabic 101');
    expect(await codeOf(service.postToBatch('b1', input, sara))).toBe('FORBIDDEN');
    expect(await codeOf(service.postToBatch('b1', input, omar))).toBe('NOT_CLASS_MEMBER');
    expect(await codeOf(service.postToBatch('nope', input, lina))).toBe('NOT_FOUND');
  });

  test('class announcements are read by class members only', async () => {
    await service.postToBatch('b1', { title: 'Hi', body: 'x', pinned: false, notify: false }, lina);
    expect((await service.listForBatch('b1', sara, 1, 20)).total).toBe(1);
    expect((await service.listForBatch('b1', admin, 1, 20)).total).toBe(1);
    expect(await codeOf(service.listForBatch('b1', nadia, 1, 20))).toBe('NOT_CLASS_MEMBER'); // not ACTIVE
    expect(await statusOf(service.listForBatch('b1', omar, 1, 20))).toBe(403);
  });

  test('a class announcement fans out to the teacher and ACTIVE students (not the author), in-app/realtime/push, no email', async () => {
    await service.postToBatch('b1', { title: 'Quiz Friday', body: 'Bring a pen', pinned: true, notify: true }, admin);
    expect(notifier.sent).toHaveLength(1);
    const { userIds, notice } = notifier.sent[0]!;
    expect(userIds.sort()).toEqual(['lina', 'mariam', 'sara']);
    expect(notice.type).toBe('ANNOUNCEMENT');
    expect(notice.data).toEqual({ announcementId: 'a1', batchId: 'b1' });
    expect(notice.email).toBeUndefined();

    await service.postToBatch('b1', { title: 'Quiet', body: 'x', pinned: false, notify: true }, lina);
    expect(notifier.sent[1]!.userIds.sort()).toEqual(['mariam', 'sara']); // author excluded
  });

  test('notify: false sends nothing', async () => {
    await service.postToBatch('b1', { title: 'x', body: 'y', pinned: false, notify: false }, lina);
    await service.postToPlatform({ title: 'x', body: 'y', pinned: false, notify: false, audience: 'ALL' }, admin);
    expect(notifier.sent).toHaveLength(0);
  });

  test('platform announcements: admin only, fan out by audience, and email', async () => {
    expect(await codeOf(service.postToPlatform({ title: 'x', body: 'y', pinned: false, notify: true, audience: 'ALL' }, lina))).toBe('FORBIDDEN');
    await service.postToPlatform({ title: 'New term', body: 'Line 1\n<b>2</b>', pinned: false, notify: true, audience: 'STUDENTS' }, admin);
    const { userIds, notice } = notifier.sent[0]!;
    expect(userIds.sort()).toEqual(['mariam', 'nadia', 'sara']);
    expect(notice.data).toEqual({ announcementId: 'a1' });
    const email = notice.email!({ id: 'sara', name: 'Sara', email: 's@t', locale: 'en', timezone: 'Asia/Dubai' })!;
    expect(email.subject).toBe('New term');
    expect(email.html).toContain('&lt;b&gt;2&lt;/b&gt;'); // escaped
    expect(email.html).toContain('https://azza.test/announcements');

    await service.postToPlatform({ title: 'All', body: 'y', pinned: false, notify: true, audience: 'ALL' }, admin);
    expect(notifier.sent[1]!.userIds).not.toContain('nour'); // author excluded
    expect(notifier.sent[1]!.userIds).toHaveLength(allUsers.length - 1);
  });

  test('my feed: platform for my role plus my classes, pinned first then newest', async () => {
    await service.postToPlatform({ title: 'teachers', body: 'x', pinned: false, notify: false, audience: 'TEACHERS' }, admin);
    await service.postToPlatform({ title: 'everyone', body: 'x', pinned: false, notify: false, audience: 'ALL' }, admin);
    await service.postToBatch('b1', { title: 'b1 pinned', body: 'x', pinned: true, notify: false }, lina);
    await service.postToBatch('b2', { title: 'b2', body: 'x', pinned: false, notify: false }, omar);
    await service.postToBatch('b1', { title: 'b1 latest', body: 'x', pinned: false, notify: false }, lina);

    expect((await service.mine(sara, 1, 20)).items.map((i) => i.title)).toEqual(['b1 pinned', 'b1 latest', 'b2', 'everyone']);
    expect((await service.mine(mariam, 1, 20)).items.map((i) => i.title)).toEqual(['b1 pinned', 'b1 latest', 'everyone']);
    expect((await service.mine(omar, 1, 20)).items.map((i) => i.title)).toEqual(['b2', 'everyone', 'teachers']);
    expect((await service.mine(admin, 1, 20)).items.map((i) => i.title)).toEqual(['everyone', 'teachers']);
    expect((await service.mine(sara, 2, 3)).items.map((i) => i.title)).toEqual(['everyone']);
  });

  test('edit and delete: the author or an admin', async () => {
    const a = await service.postToBatch('b1', { title: 'x', body: 'y', pinned: false, notify: false }, lina);
    expect((await service.update(a.id, { pinned: true, audience: 'TEACHERS' }, lina)).pinned).toBe(true);
    expect(repo.rows[0]!.audience).toBe('ALL'); // audience ignored for BATCH
    expect(await codeOf(service.update(a.id, { title: 'z' }, sara))).toBe('FORBIDDEN');
    expect(await codeOf(service.remove(a.id, omar))).toBe('FORBIDDEN');
    expect(await service.remove(a.id, admin)).toEqual({ ok: true });
    expect(await codeOf(service.remove(a.id, admin))).toBe('NOT_FOUND');
  });
});

// ───────── chat ─────────

class InMemoryConversationRepository implements ConversationRepository {
  conversations: ConversationRecord[] = [];
  messagesRows: MessageRecord[] = [];
  reads = new Map<string, Date>();
  private seq = 0;
  constructor(private readonly world: World) {}
  async batch(id: string) {
    return this.world.batch(id);
  }
  async batches(ids: string[]) {
    return this.world.batches.filter((b) => ids.includes(b.id));
  }
  async enrollmentStatus(u: string, b: string) {
    return this.world.status(u, b);
  }
  async activeStudentIds(b: string) {
    return this.world.active(b);
  }
  async studentBatchIds(u: string) {
    return this.world.enrollments.filter((e) => e.userId === u && e.status === 'ACTIVE').map((e) => e.batchId);
  }
  async teacherBatchIds(u: string) {
    return this.world.batches.filter((b) => b.teacherId === u).map((b) => b.id);
  }
  async ensureClassConversation(batchId: string) {
    const found = this.conversations.find((c) => c.batchId === batchId && c.type === 'CLASS');
    if (found) return found;
    const c: ConversationRecord = { id: `c${++this.seq}`, type: 'CLASS', batchId, studentId: null, createdAt: new Date(this.seq * 1000), lastMessageAt: null };
    this.conversations.push(c);
    return c;
  }
  async classConversations(batchIds: string[]) {
    return this.conversations.filter((c) => c.type === 'CLASS' && batchIds.includes(c.batchId));
  }
  async ensureDirectConversation(batchId: string, studentId: string) {
    const found = this.conversations.find((c) => c.batchId === batchId && c.type === 'DIRECT' && c.studentId === studentId);
    if (found) return found;
    const c: ConversationRecord = { id: `c${++this.seq}`, type: 'DIRECT', batchId, studentId, createdAt: new Date(this.seq * 1000), lastMessageAt: null };
    this.conversations.push(c);
    return c;
  }
  async directConversations(batchIds: string[], studentId?: string) {
    return this.conversations.filter((c) => c.type === 'DIRECT' && batchIds.includes(c.batchId) && (!studentId || c.studentId === studentId));
  }
  async findConversation(id: string) {
    return this.conversations.find((c) => c.id === id) ?? null;
  }
  async users(ids: string[]) {
    return ids.map((id) => this.world.user(id));
  }
  async lastMessages(ids: string[]) {
    const out = new Map<string, LastMessage>();
    for (const m of this.messagesRows) {
      if (!ids.includes(m.conversationId) || m.deletedAt) continue;
      const prev = out.get(m.conversationId);
      if (!prev || m.createdAt >= prev.createdAt) out.set(m.conversationId, { body: m.body, senderName: m.sender.name, createdAt: m.createdAt });
    }
    return out;
  }
  async unreadCounts(userId: string, ids: string[]) {
    const out = new Map<string, number>();
    for (const m of this.messagesRows) {
      if (!ids.includes(m.conversationId) || m.deletedAt || m.senderId === userId) continue;
      const read = this.reads.get(`${m.conversationId}:${userId}`);
      if (!read || m.createdAt > read) out.set(m.conversationId, (out.get(m.conversationId) ?? 0) + 1);
    }
    return out;
  }
  async messages(conversationId: string, before: Date | null, take: number) {
    return this.messagesRows
      .filter((m) => m.conversationId === conversationId && (!before || m.createdAt < before))
      .sort((a, b) => +b.createdAt - +a.createdAt)
      .slice(0, take);
  }
  async createMessage(conversationId: string, senderId: string, body: string, at: Date) {
    const m: MessageRecord = { id: `m${++this.seq}`, conversationId, senderId, body, createdAt: at, deletedAt: null, sender: this.world.user(senderId) };
    this.messagesRows.push(m);
    this.conversations.find((c) => c.id === conversationId)!.lastMessageAt = at;
    return m;
  }
  async findMessage(id: string) {
    return this.messagesRows.find((m) => m.id === id) ?? null;
  }
  async softDeleteMessage(id: string, _by: string, at: Date) {
    this.messagesRows.find((m) => m.id === id)!.deletedAt = at;
  }
  async markRead(conversationId: string, userId: string, at: Date) {
    this.reads.set(`${conversationId}:${userId}`, at);
  }
}

describe('chat', () => {
  let world: World;
  let repo: InMemoryConversationRepository;
  let notifier: RecordingNotifier;
  let realtime: RecordingBroadcaster;
  let clock: TestClock;
  let service: ConversationService;
  beforeEach(() => {
    world = new World();
    repo = new InMemoryConversationRepository(world);
    notifier = new RecordingNotifier();
    realtime = new RecordingBroadcaster();
    clock = new TestClock();
    service = new ConversationService(repo, realtime, notifier, clock);
  });
  /** Sends with a little time in between so ordering is stable and the rate limit isn't the subject. */
  const say = async (conversationId: string, body: string, who: { id: string; role: Role }) => {
    clock.advance(1000);
    return service.send(conversationId, body, who);
  };

  describe('access', () => {
    test('class chat: members and admins only', async () => {
      const cls = await service.classConversation('b1', sara);
      expect((await service.classConversation('b1', lina)).id).toBe(cls.id);
      expect((await service.classConversation('b1', admin)).id).toBe(cls.id); // one CLASS conversation per batch
      expect(await codeOf(service.classConversation('b1', nadia))).toBe('NOT_CLASS_MEMBER');
      expect(await codeOf(service.classConversation('b1', omar))).toBe('NOT_CLASS_MEMBER');
      expect(await codeOf(service.messages(cls.id, omar, null, 50))).toBe('NOT_CLASS_MEMBER');
      expect(await codeOf(service.send(cls.id, 'hi', nadia))).toBe('NOT_CLASS_MEMBER');
      expect(await codeOf(service.classConversation('nope', sara))).toBe('NOT_FOUND');
      expect((await say(cls.id, 'hello all', admin)).body).toBe('hello all'); // admins post in CLASS chats
    });

    test('a student who is no longer ACTIVE loses access', async () => {
      const cls = await service.classConversation('b1', sara);
      const dm = await service.openDirect('b1', sara);
      world.enrollments.find((e) => e.userId === 'sara' && e.batchId === 'b1')!.status = 'REFUNDED';
      expect(await codeOf(service.messages(cls.id, sara, null, 50))).toBe('NOT_CLASS_MEMBER');
      expect(await codeOf(service.messages(dm.id, sara, null, 50))).toBe('NOT_CLASS_MEMBER');
      expect((await service.mine(sara)).items.every((i) => i.batch.id !== 'b1')).toBe(true);
    });

    test('an ended class is read-only', async () => {
      const cls = await service.classConversation('b1', sara);
      const m = await say(cls.id, 'before the end', sara);
      world.setBatchStatus('b1', 'COMPLETED');
      expect(await codeOf(service.send(cls.id, 'after', sara))).toBe('CHAT_CLOSED');
      expect(await codeOf(service.send(cls.id, 'after', lina))).toBe('CHAT_CLOSED');
      expect(await codeOf(service.deleteMessage(m.id, sara))).toBe('CHAT_CLOSED');
      expect((await service.messages(cls.id, sara, null, 50)).items).toHaveLength(1); // still readable
      expect(await service.markRead(cls.id, sara)).toEqual({ ok: true });
      expect((await service.classConversation('b1', sara)).closed).toBe(true);
      world.setBatchStatus('b1', 'CANCELLED');
      expect(await codeOf(service.send(cls.id, 'after', admin))).toBe('CHAT_CLOSED');
    });

    test('a private chat is only between an ACTIVE student and their own teacher', async () => {
      const dm = await service.openDirect('b1', sara);
      expect(dm.type).toBe('DIRECT');
      expect(dm.counterpart).toMatchObject({ id: 'lina', role: 'TEACHER' });
      expect((await service.openDirect('b1', sara)).id).toBe(dm.id); // reopened, not duplicated

      expect(await codeOf(service.openDirect('b1', lina))).toBe('DM_NOT_ALLOWED'); // teachers don't open DMs
      expect(await codeOf(service.openDirect('b1', admin))).toBe('DM_NOT_ALLOWED');
      expect(await codeOf(service.openDirect('b1', nadia))).toBe('NOT_CLASS_MEMBER'); // not ACTIVE
      expect(await codeOf(service.openDirect('b2', mariam))).toBe('NOT_CLASS_MEMBER'); // not in that batch

      await say(dm.id, 'hi teacher', sara);
      expect((await say(dm.id, 'hi sara', lina)).sender.id).toBe('lina');
      expect(await codeOf(service.messages(dm.id, omar, null, 50))).toBe('NOT_CLASS_MEMBER'); // another teacher
      expect((await service.messages(dm.id, admin, null, 50)).items).toHaveLength(2); // admin reads
      expect(await codeOf(service.send(dm.id, 'admin here', admin))).toBe('DM_NOT_ALLOWED'); // read only
    });

    test('no student-to-student private messages', async () => {
      const dm = await service.openDirect('b1', sara);
      expect(await codeOf(service.messages(dm.id, mariam, null, 50))).toBe('DM_NOT_ALLOWED');
      expect(await codeOf(service.send(dm.id, 'psst', mariam))).toBe('DM_NOT_ALLOWED');
      // Mariam's own DM is with Lina, never with Sara.
      expect((await service.openDirect('b1', mariam)).counterpart?.id).toBe('lina');
    });
  });

  test('messages: newest last, paged with before/hasMore, deleted ones blanked', async () => {
    const cls = await service.classConversation('b1', sara);
    const sent = [];
    for (const body of ['one', 'two', 'three', 'four']) sent.push(await say(cls.id, body, sara));
    const page1 = await service.messages(cls.id, lina, null, 2);
    expect(page1.items.map((m) => m.body)).toEqual(['three', 'four']);
    expect(page1.hasMore).toBe(true);
    const page2 = await service.messages(cls.id, lina, new Date(page1.items[0]!.createdAt), 2);
    expect(page2.items.map((m) => m.body)).toEqual(['one', 'two']);
    expect(page2.hasMore).toBe(false);

    await service.deleteMessage(sent[1]!.id, sara);
    const after = await service.messages(cls.id, lina, null, 50);
    expect(after.items[1]).toMatchObject({ id: sent[1]!.id, body: '', deleted: true });
  });

  test('sending broadcasts conversation:message to every member except the sender', async () => {
    const cls = await service.classConversation('b1', sara);
    const m = await say(cls.id, 'hello', sara);
    const events = realtime.events.filter((e) => e.event === SOCKET_EVENTS.CONVERSATION_MESSAGE);
    expect(events.map((e) => e.to).sort()).toEqual(['user:lina', 'user:mariam']);
    expect(events[0]!.payload).toEqual({ conversationId: cls.id, message: m });

    const dm = await service.openDirect('b1', mariam);
    realtime.events.length = 0;
    await say(dm.id, 'question', mariam);
    expect(realtime.events.map((e) => e.to)).toEqual(['user:lina']);
  });

  describe('notifications', () => {
    test('CLASS chat: only teacher posts notify', async () => {
      const cls = await service.classConversation('b1', sara);
      await say(cls.id, 'student chatter', sara);
      await say(cls.id, 'admin note', admin);
      expect(notifier.sent).toHaveLength(0);
      await say(cls.id, 'Class moved to 6pm', lina);
      expect(notifier.sent).toHaveLength(1);
      expect(notifier.sent[0]!.userIds.sort()).toEqual(['mariam', 'sara']);
      expect(notifier.sent[0]!.notice).toMatchObject({ type: 'CHAT_MESSAGE', data: { conversationId: cls.id } });
    });

    test('DIRECT chat notifies the other side', async () => {
      const dm = await service.openDirect('b1', sara);
      await say(dm.id, 'hi', sara);
      expect(notifier.sent[0]!.userIds).toEqual(['lina']);
      await say(dm.id, 'hello', lina);
      expect(notifier.sent[1]!.userIds).toEqual(['sara']);
    });

    test('collapsed: at most one per conversation per recipient per 10 minutes', async () => {
      const dm = await service.openDirect('b1', sara);
      await say(dm.id, 'a', sara);
      await say(dm.id, 'b', sara);
      await say(dm.id, 'c', sara);
      expect(notifier.sent).toHaveLength(1);
      clock.advance(NOTIFY_COLLAPSE_MS);
      await say(dm.id, 'd', sara);
      expect(notifier.sent).toHaveLength(2);

      // Collapse is per conversation: Lina posting in the class chat still notifies Sara.
      const cls = await service.classConversation('b1', sara);
      await say(dm.id, 'reply', lina);
      await say(cls.id, 'class note', lina);
      expect(notifier.sent.slice(2).map((s) => s.userIds.sort())).toEqual([['sara'], ['mariam', 'sara']]);
    });
  });

  test('unread counts: others’ messages since my last read, excluding deleted; sending marks read', async () => {
    const cls = await service.classConversation('b1', sara);
    await say(cls.id, 'one', lina);
    const two = await say(cls.id, 'two', mariam);
    await say(cls.id, 'mine', sara);
    expect((await service.classConversation('b1', sara)).unread).toBe(0); // sending marked it read
    expect((await service.classConversation('b1', lina)).unread).toBe(2);

    await service.markRead(cls.id, lina);
    await say(cls.id, 'three', mariam);
    expect((await service.classConversation('b1', lina)).unread).toBe(1);
    await service.deleteMessage(two.id, lina);
    expect((await service.classConversation('b1', sara)).unread).toBe(1); // "three" only

    const dm = await service.openDirect('b1', sara);
    await say(dm.id, 'private', lina);
    const mine = await service.mine(sara);
    expect(mine.unreadTotal).toBe(2);
    expect(mine.items.find((i) => i.id === dm.id)).toMatchObject({ unread: 1, lastMessage: { body: 'private', senderName: 'LINA' } });
  });

  test('my conversations: class chats created lazily; teachers see their batches’ DMs; admins see none', async () => {
    expect(repo.conversations).toHaveLength(0);
    const sarasList = await service.mine(sara);
    expect(sarasList.items.map((i) => [i.type, i.batch.id, i.closed]).sort()).toEqual([
      ['CLASS', 'b1', false],
      ['CLASS', 'b2', true],
    ]);
    await service.openDirect('b1', sara);
    await service.openDirect('b1', mariam);
    const linas = await service.mine(lina);
    expect(linas.items.filter((i) => i.type === 'DIRECT').map((i) => i.counterpart?.id).sort()).toEqual(['mariam', 'sara']);
    expect((await service.mine(sara)).items.filter((i) => i.type === 'DIRECT')).toHaveLength(1); // only her own
    expect((await service.mine(admin)).items).toEqual([]);
    expect(repo.conversations.filter((c) => c.type === 'CLASS')).toHaveLength(2); // never duplicated
  });

  describe('deleting', () => {
    test('class chat: the sender, the batch teacher or an admin', async () => {
      const cls = await service.classConversation('b1', sara);
      const a = await say(cls.id, 'a', sara);
      const b = await say(cls.id, 'b', sara);
      const c = await say(cls.id, 'c', lina);
      expect(await codeOf(service.deleteMessage(a.id, mariam))).toBe('FORBIDDEN');
      expect(await codeOf(service.deleteMessage(c.id, sara))).toBe('FORBIDDEN');
      expect(await service.deleteMessage(a.id, sara)).toEqual({ ok: true });
      expect(await service.deleteMessage(b.id, lina)).toEqual({ ok: true });
      expect(await service.deleteMessage(c.id, admin)).toEqual({ ok: true });
      expect(await codeOf(service.deleteMessage('nope', admin))).toBe('NOT_FOUND');
      const deleted = realtime.events.filter((e) => e.event === SOCKET_EVENTS.CONVERSATION_MESSAGE_DELETED);
      expect(deleted.filter((e) => (e.payload as { messageId: string }).messageId === a.id).map((e) => e.to).sort()).toEqual(['user:lina', 'user:mariam']);
    });

    test('private chat: the sender or an admin (not the teacher)', async () => {
      const dm = await service.openDirect('b1', sara);
      const m = await say(dm.id, 'oops', sara);
      const t = await say(dm.id, 'reply', lina);
      expect(await codeOf(service.deleteMessage(m.id, lina))).toBe('FORBIDDEN');
      expect(await service.deleteMessage(t.id, lina)).toEqual({ ok: true });
      expect(await service.deleteMessage(m.id, admin)).toEqual({ ok: true });
    });
  });

  test('rate limit: 20 messages a minute per user per conversation', async () => {
    const cls = await service.classConversation('b1', sara);
    const dm = await service.openDirect('b1', sara);
    for (let i = 0; i < 20; i++) await service.send(cls.id, `m${i}`, sara);
    expect(await codeOf(service.send(cls.id, 'one too many', sara))).toBe('RATE_LIMITED');
    expect(await statusOf(service.send(cls.id, 'one too many', sara))).toBe(429);
    expect((await service.send(dm.id, 'other conversation', sara)).body).toBe('other conversation');
    expect((await service.send(cls.id, 'other user', mariam)).body).toBe('other user');
    clock.advance(60_001);
    expect((await service.send(cls.id, 'a minute later', sara)).body).toBe('a minute later');
  });

  test('throttle primitives', () => {
    const limiter = new SlidingWindowLimiter(2, 1000);
    expect([limiter.tryHit('k', 0), limiter.tryHit('k', 500), limiter.tryHit('k', 900), limiter.tryHit('k', 1001)]).toEqual([true, true, false, true]);
    const collapse = new Collapser(1000);
    expect([collapse.shouldFire('k', 0), collapse.shouldFire('k', 999), collapse.shouldFire('j', 999), collapse.shouldFire('k', 1000)]).toEqual([true, false, true, true]);
  });
});

// ───────── support ─────────

class InMemorySupportRepository implements SupportRepository {
  tickets: TicketRecord[] = [];
  messageRows: SupportMessageRecord[] = [];
  orders = new Map([['o1', 'sara']]);
  private seq = 0;
  async orderOwner(id: string) {
    return this.orders.get(id) ?? null;
  }
  async batchExists(id: string) {
    return id === 'b1';
  }
  async isAdmin(id: string) {
    return id === 'nour';
  }
  async create(data: Pick<TicketRecord, 'userId' | 'subject' | 'category' | 'orderId' | 'batchId'>, body: string, at: Date) {
    const t: TicketRecord = {
      ...data,
      id: `t${++this.seq}`,
      status: 'OPEN',
      assigneeId: null,
      createdAt: at,
      updatedAt: at,
      lastMessageAt: at,
      user: { id: data.userId, name: data.userId.toUpperCase(), email: `${data.userId}@test` },
    };
    this.tickets.push(t);
    this.messageRows.push({ id: `sm${++this.seq}`, ticketId: t.id, authorId: data.userId, body, fromStaff: false, createdAt: at, author: { id: data.userId, name: data.userId, image: null } });
    return t;
  }
  async find(id: string) {
    return this.tickets.find((t) => t.id === id) ?? null;
  }
  async list(f: TicketListFilter, skip: number, take: number) {
    const all = this.tickets
      .filter((t) => (!f.userId || t.userId === f.userId) && (!f.status || t.status === f.status) && (!f.category || t.category === f.category))
      .sort((a, b) => +b.lastMessageAt - +a.lastMessageAt)
      .map((t) => ({ ...t, lastFromStaff: this.messageRows.filter((m) => m.ticketId === t.id).at(-1)?.fromStaff ?? null }));
    return { items: all.slice(skip, skip + take), total: all.length };
  }
  async messages(ticketId: string) {
    return this.messageRows.filter((m) => m.ticketId === ticketId);
  }
  async addMessage(ticketId: string, msg: { authorId: string; body: string; fromStaff: boolean }, status: SupportStatus, at: Date) {
    const m = { id: `sm${++this.seq}`, ticketId, ...msg, createdAt: at, author: { id: msg.authorId, name: msg.authorId, image: null } };
    this.messageRows.push(m);
    Object.assign(this.tickets.find((t) => t.id === ticketId)!, { status, lastMessageAt: at });
    return m;
  }
  async update(id: string, data: { status?: SupportStatus; assigneeId?: string | null }) {
    const t = this.tickets.find((x) => x.id === id)!;
    if (data.status !== undefined) t.status = data.status;
    if (data.assigneeId !== undefined) t.assigneeId = data.assigneeId;
    return t;
  }
  async orderSummary(id: string) {
    return { id, reference: 'AZ-1', status: 'PAID', totalFils: 100, createdAt: new Date(0) };
  }
  async batchSummary(id: string) {
    return { id, code: 'B1', courseTitle: 'Arabic 101', courseTitleAr: null };
  }
}

describe('support', () => {
  let repo: InMemorySupportRepository;
  let notifier: RecordingNotifier;
  let clock: TestClock;
  let service: SupportService;
  beforeEach(() => {
    repo = new InMemorySupportRepository();
    notifier = new RecordingNotifier();
    clock = new TestClock();
    service = new SupportService(repo, notifier, clock, 'https://azza.test');
  });
  const open = (who = sara, extra: { orderId?: string; batchId?: string } = {}) =>
    service.open({ subject: 'Card charged twice', category: 'PAYMENT', body: 'Please check', ...extra }, who);

  test('opening a ticket stores the first message, links the order and notifies admins by email and in-app', async () => {
    const t = await open(sara, { orderId: 'o1', batchId: 'b1' });
    expect(t).toMatchObject({ status: 'OPEN', order: { reference: 'AZ-1' }, batch: { code: 'B1' } });
    expect(t.messages).toHaveLength(1);
    expect(notifier.sent[0]!.userIds).toEqual(['role:ADMIN']);
    expect(notifier.sent[0]!.notice).toMatchObject({ type: 'SUPPORT_TICKET', data: { ticketId: t.id } });
    expect(notifier.sent[0]!.notice.email).toBeDefined();
    expect(await codeOf(open(mariam, { orderId: 'o1' }))).toBe('NOT_FOUND'); // someone else's order
    expect(await codeOf(open(sara, { batchId: 'nope' }))).toBe('NOT_FOUND');
  });

  test('read and reply: the owner or an admin', async () => {
    const t = await open();
    expect((await service.get(t.id, admin)).id).toBe(t.id);
    expect(await codeOf(service.get(t.id, mariam))).toBe('FORBIDDEN');
    expect(await codeOf(service.reply(t.id, 'me too', lina))).toBe('FORBIDDEN');
  });

  test('a staff reply → AWAITING_USER and notifies the owner (SUPPORT_REPLY, all channels)', async () => {
    const t = await open();
    clock.advance(1000);
    const after = await service.reply(t.id, 'We are on it', admin);
    expect(after.status).toBe('AWAITING_USER');
    expect(after.messages.at(-1)).toMatchObject({ body: 'We are on it', fromStaff: true });
    const last = notifier.sent.at(-1)!;
    expect(last.userIds).toEqual(['sara']);
    expect(last.notice).toMatchObject({ type: 'SUPPORT_REPLY', data: { ticketId: t.id } });
    const email = last.notice.email!({ id: 'sara', name: 'Sara', email: 's@t', locale: 'en', timezone: 'Asia/Dubai' })!;
    expect(email.html).toContain('https://azza.test/support/');
  });

  test('an owner reply → OPEN (also reopening RESOLVED) and notifies admins', async () => {
    const t = await open();
    await service.reply(t.id, 'Any news?', admin);
    expect((await service.reply(t.id, 'Here is a screenshot', sara)).status).toBe('OPEN');
    expect(notifier.sent.at(-1)!.userIds).toEqual(['role:ADMIN']);
    await service.update(t.id, { status: 'RESOLVED' }, sara);
    expect((await service.reply(t.id, 'It happened again', sara)).status).toBe('OPEN');
  });

  test('status changes: admins set anything; the owner can only mark RESOLVED', async () => {
    const t = await open();
    expect((await service.update(t.id, { status: 'RESOLVED' }, sara)).status).toBe('RESOLVED');
    expect(await codeOf(service.update(t.id, { status: 'OPEN' }, sara))).toBe('FORBIDDEN');
    expect(await codeOf(service.update(t.id, { status: 'AWAITING_USER' }, sara))).toBe('FORBIDDEN');
    expect(await codeOf(service.update(t.id, { assigneeId: 'nour' }, sara))).toBe('FORBIDDEN');
    expect(await codeOf(service.update(t.id, { status: 'RESOLVED' }, mariam))).toBe('FORBIDDEN');

    expect((await service.update(t.id, { status: 'AWAITING_USER', assigneeId: 'nour' }, admin))).toMatchObject({ status: 'AWAITING_USER', assigneeId: 'nour' });
    expect((await service.update(t.id, { assigneeId: null }, admin)).assigneeId).toBeNull();
    expect(await codeOf(service.update(t.id, { assigneeId: 'lina' }, admin))).toBe('INVALID_ASSIGNEE');
    expect(updateSupportTicketInput.safeParse({}).success).toBe(false);
  });

  test('listing: owners see their own, admins see all, newest activity first, filters and unreadForMe', async () => {
    const a = await open(sara);
    clock.advance(1000);
    const b = await open(mariam);
    clock.advance(1000);
    await service.reply(a.id, 'Looking into it', admin);

    const saras = await service.list({ page: 1, pageSize: 20 }, sara);
    expect(saras.items.map((i) => i.id)).toEqual([a.id]);
    expect(saras.items[0]!.unreadForMe).toBe(true); // staff spoke last

    const all = await service.list({ page: 1, pageSize: 20 }, admin);
    expect(all.items.map((i) => i.id)).toEqual([a.id, b.id]);
    expect(all.items.map((i) => i.unreadForMe)).toEqual([false, true]);
    expect((await service.list({ status: 'OPEN', page: 1, pageSize: 20 }, admin)).items.map((i) => i.id)).toEqual([b.id]);
    expect((await service.list({ category: 'ACCOUNT', page: 1, pageSize: 20 }, admin)).total).toBe(0);
  });
});

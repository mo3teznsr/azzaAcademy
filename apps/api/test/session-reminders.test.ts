import { describe, expect, test } from 'bun:test';
import { FixedClock } from '../src/infrastructure/clock';
import { emailsIn } from '../src/modules/notifications/email-templates';
import { localizedText, type Recipient } from '../src/modules/notifications/notification.types';
import {
  dueReminder,
  remindedPatch,
  SessionReminderService,
  type EndedSession,
  type RemindersSent,
  type SessionReminderRepository,
  type UpcomingSession,
} from '../src/modules/sessions/session-reminders';
import { RecordingNotifier } from './fakes/in-memory';

const MIN = 60_000;
const NOW = new Date('2026-11-20T08:00:00Z');
const at = (ms: number) => new Date(NOW.getTime() + ms);
const NONE: RemindersSent = { dayAt: null, hourAt: null, soonAt: null };

describe('which reminder is due', () => {
  test('the closest window the session is in, once', () => {
    expect(dueReminder(at(20 * 60 * MIN), NOW, NONE)).toBe('DAY');
    expect(dueReminder(at(45 * MIN), NOW, NONE)).toBe('HOUR');
    expect(dueReminder(at(8 * MIN), NOW, NONE)).toBe('SOON');
    expect(dueReminder(at(25 * 60 * MIN), NOW, NONE)).toBeNull();
    expect(dueReminder(at(-1 * MIN), NOW, NONE)).toBeNull();
  });

  test('a closer reminder already sent covers the wider ones', () => {
    expect(dueReminder(at(20 * 60 * MIN), NOW, { ...NONE, hourAt: NOW })).toBeNull();
    expect(dueReminder(at(45 * MIN), NOW, { ...NONE, dayAt: NOW })).toBe('HOUR');
    expect(dueReminder(at(45 * MIN), NOW, { ...NONE, soonAt: NOW })).toBeNull();
    expect(dueReminder(at(8 * MIN), NOW, { dayAt: NOW, hourAt: NOW, soonAt: null })).toBe('SOON');
  });

  test('sending one marks it and every wider one', () => {
    expect(remindedPatch('SOON', NOW)).toEqual({ dayAt: NOW, hourAt: NOW, soonAt: NOW });
    expect(remindedPatch('HOUR', NOW)).toEqual({ dayAt: NOW, hourAt: NOW });
    expect(remindedPatch('DAY', NOW)).toEqual({ dayAt: NOW });
  });
});

class MemReminders implements SessionReminderRepository {
  upcomingRows: UpcomingSession[] = [];
  ended: Array<EndedSession & { notifiedAt?: Date }> = [];
  students: Record<string, string[]> = { b1: ['sara', 'omar'] };
  async upcoming() { return this.upcomingRows.map((r) => ({ ...r })); }
  async markReminded(id: string, patch: Partial<RemindersSent>) {
    const row = this.upcomingRows.find((r) => r.id === id)!;
    Object.assign(row, patch);
  }
  async endedAwaitingMissedNotice() { return this.ended.filter((e) => !e.notifiedAt); }
  async markMissedNotified(id: string, when: Date) { this.ended.find((e) => e.id === id)!.notifiedAt = when; }
  async activeStudentIds(batchId: string) { return this.students[batchId] ?? []; }
}

const session = (startsAt: Date): UpcomingSession => ({
  id: 's1', title: 'Grids and type', startsAt, batchId: 'b1', batchCode: 'B08', timezone: 'Asia/Dubai',
  courseEn: 'Product Design', courseAr: 'تصميم المنتجات', ...NONE,
});

function build() {
  const clock = new FixedClock(NOW);
  const repo = new MemReminders();
  const notifier = new RecordingNotifier();
  return { clock, repo, notifier, service: new SessionReminderService(repo, notifier, clock, 'https://azza.test') };
}

const sara = (locale: string): Recipient => ({ id: 'sara', name: 'Sara', email: 's@x', locale, timezone: 'Asia/Dubai' });

describe('live class reminders', () => {
  test('a day ahead: one bilingual notice with an email, never repeated', async () => {
    const { repo, notifier, service } = build();
    repo.upcomingRows.push(session(at(20 * 60 * MIN)));
    expect(await service.run()).toEqual({ reminders: 1, missed: 0 });
    expect(await service.run()).toEqual({ reminders: 0, missed: 0 });
    expect(notifier.sent).toHaveLength(1);
    const { userIds, notice } = notifier.sent[0]!;
    expect(userIds).toEqual(['sara', 'omar']);
    expect(notice).toMatchObject({ type: 'SESSION_STARTING', title: 'Tomorrow: Product Design', data: { sessionId: 's1', reminder: 'DAY' } });
    expect(localizedText(notice, sara('ar')).title).toBe('غدًا: تصميم المنتجات');
    expect(notice.email?.(sara('ar'))?.subject).toBe('غدًا: تصميم المنتجات');
    expect(notice.email?.(sara('en'))?.html).toContain('https://azza.test/live/s1');
  });

  test('the hour and ten-minute reminders follow, without email', async () => {
    const { clock, repo, notifier, service } = build();
    repo.upcomingRows.push(session(at(20 * 60 * MIN)));
    await service.run();
    clock.set(at(19 * 60 * MIN + 5 * MIN)); // 55 minutes before
    await service.run();
    clock.set(at(19 * 60 * MIN + 52 * MIN)); // 8 minutes before
    await service.run();
    expect(notifier.sent.map((s) => s.notice.data?.reminder)).toEqual(['DAY', 'HOUR', 'SOON']);
    expect(notifier.sent[1]!.notice.email).toBeUndefined();
  });

  test('a class with no students is marked and stays quiet', async () => {
    const { repo, notifier, service } = build();
    repo.students = {};
    repo.upcomingRows.push(session(at(30 * MIN)));
    expect(await service.run()).toEqual({ reminders: 0, missed: 0 });
    expect(repo.upcomingRows[0]!.hourAt).toEqual(NOW);
    expect(notifier.sent).toHaveLength(0);
  });

  test('students who missed a class are pointed to the recording, once', async () => {
    const { repo, notifier, service } = build();
    repo.ended.push({ id: 's0', title: 'Kick-off', batchId: 'b1', courseEn: 'Product Design', courseAr: 'تصميم المنتجات', attendeeIds: ['sara'] });
    expect(await service.run()).toEqual({ reminders: 0, missed: 1 });
    expect(await service.run()).toEqual({ reminders: 0, missed: 0 });
    expect(notifier.sent[0]).toMatchObject({ userIds: ['omar'], notice: { type: 'SESSION_MISSED', data: { sessionId: 's0' } } });
    expect(localizedText(notifier.sent[0]!.notice, sara('ar')).title).toBe('فاتتك حصة Kick-off');
  });
});

describe('emails in the reader\'s language', () => {
  test('Arabic readers get right-to-left Arabic emails; others get English', () => {
    const ar = emailsIn('ar').refunded('سارة', 'AED 924.00', 'AZ-B08-1');
    expect(ar.subject).toBe('تم الاسترداد · AZ-B08-1');
    expect(ar.html).toContain('dir="rtl"');
    expect(ar.html).toContain('<bdi dir="ltr">AED 924.00</bdi>');
    const en = emailsIn('en').refunded('Sara', 'AED 924.00', 'AZ-B08-1');
    expect(en.subject).toBe('Refund issued · AZ-B08-1');
    expect(en.html).toContain('dir="ltr"');
    expect(emailsIn(null).refunded('Sara', 'x', 'r').subject).toBe('Refund issued · r');
  });

  test('a notice without Arabic text falls back to English', () => {
    expect(localizedText({ type: 'X', title: 'Hi', body: 'There' }, { locale: 'ar' })).toEqual({ title: 'Hi', body: 'There' });
  });
});

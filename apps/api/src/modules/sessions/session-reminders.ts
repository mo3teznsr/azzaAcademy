import type { Clock } from '../../core/ports';
import { formatInZone } from '../../core/time';
import { reminderEmails } from '../notifications/email-templates';
import type { Notifier } from '../notifications/notification.types';
import type { Db } from '../../infrastructure/db';

const MIN = 60_000;
const HOUR = 60 * MIN;

/** Reminders before a live session, closest last: a session first seen 30 minutes ahead gets only the one-hour reminder. */
export type ReminderKind = 'DAY' | 'HOUR' | 'SOON';
const WINDOWS: Record<ReminderKind, number> = { DAY: 24 * HOUR, HOUR: HOUR, SOON: 10 * MIN };

export interface RemindersSent {
  dayAt: Date | null;
  hourAt: Date | null;
  soonAt: Date | null;
}

/**
 * Pure: the reminder due now for a session starting at `startsAt`, or null. Only the closest window the session is in
 * counts, and a reminder for a closer window already sent covers the wider ones (no "tomorrow" after "in 10 minutes").
 */
export function dueReminder(startsAt: Date, now: Date, sent: RemindersSent): ReminderKind | null {
  const left = startsAt.getTime() - now.getTime();
  if (left <= 0) return null;
  if (left <= WINDOWS.SOON) return sent.soonAt ? null : 'SOON';
  if (left <= WINDOWS.HOUR) return sent.hourAt || sent.soonAt ? null : 'HOUR';
  if (left <= WINDOWS.DAY) return sent.dayAt || sent.hourAt || sent.soonAt ? null : 'DAY';
  return null;
}

/** The columns a reminder marks as sent: its own and every wider one. */
export function remindedPatch(kind: ReminderKind, now: Date): Partial<RemindersSent> {
  if (kind === 'SOON') return { dayAt: now, hourAt: now, soonAt: now };
  if (kind === 'HOUR') return { dayAt: now, hourAt: now };
  return { dayAt: now };
}

export interface UpcomingSession extends RemindersSent {
  id: string;
  title: string;
  startsAt: Date;
  batchId: string;
  batchCode: string;
  timezone: string;
  courseEn: string;
  courseAr: string;
}

export interface EndedSession {
  id: string;
  title: string;
  batchId: string;
  courseEn: string;
  courseAr: string;
  /** Students who were in the room. */
  attendeeIds: string[];
}

export interface SessionReminderRepository {
  /** SCHEDULED sessions starting within the next 24 hours that still have a reminder to send. */
  upcoming(now: Date): Promise<UpcomingSession[]>;
  markReminded(sessionId: string, patch: Partial<RemindersSent>): Promise<void>;
  /** ENDED sessions that ended between 48 hours and 30 minutes ago (time for the recording) and whose absentees were not told yet. */
  endedAwaitingMissedNotice(now: Date): Promise<EndedSession[]>;
  markMissedNotified(sessionId: string, at: Date): Promise<void>;
  activeStudentIds(batchId: string): Promise<string[]>;
}

/**
 * Background job. Students hear about each live session 24 hours, 1 hour and 10 minutes before it starts (attendance is
 * what earns certificates), and students who missed one are pointed to its recording. Columns on the session remember
 * what was sent, so reruns send nothing new.
 */
export class SessionReminderService {
  constructor(
    private readonly repo: SessionReminderRepository,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
    private readonly webUrl: string,
  ) {}

  async run() {
    const now = this.clock.now();
    let reminders = 0;
    for (const s of await this.repo.upcoming(now)) {
      const kind = dueReminder(s.startsAt, now, s);
      if (!kind) continue;
      // Marked first: a failed delivery is not retried, but a reminder is never sent twice.
      await this.repo.markReminded(s.id, remindedPatch(kind, now));
      const students = await this.repo.activeStudentIds(s.batchId);
      if (!students.length) continue;
      await this.notifier.notify(students, this.reminderNotice(s, kind), {
        channels: kind === 'DAY' ? ['in-app', 'push', 'email'] : kind === 'HOUR' ? ['in-app', 'push'] : ['push', 'realtime'],
      });
      reminders++;
    }

    let missed = 0;
    for (const s of await this.repo.endedAwaitingMissedNotice(now)) {
      await this.repo.markMissedNotified(s.id, now);
      const present = new Set(s.attendeeIds);
      const absent = (await this.repo.activeStudentIds(s.batchId)).filter((id) => !present.has(id));
      if (!absent.length) continue;
      await this.notifier.notify(
        absent,
        {
          type: 'SESSION_MISSED',
          title: `You missed ${s.title}`,
          body: `${s.courseEn}: watch the recording to catch up before the next class.`,
          ar: { title: `فاتتك حصة ${s.title}`, body: `${s.courseAr}: شاهد التسجيل لتلحق بالصف قبل الحصة القادمة.` },
          data: { sessionId: s.id, batchId: s.batchId },
        },
        { channels: ['in-app', 'push'] },
      );
      missed += absent.length;
    }
    return { reminders, missed };
  }

  private reminderNotice(s: UpcomingSession, kind: ReminderKind) {
    const url = `${this.webUrl}/live/${s.id}`;
    const whenEn = formatInZone(s.startsAt, s.timezone, 'en');
    const whenAr = formatInZone(s.startsAt, s.timezone, 'ar');
    const text = {
      DAY: {
        en: { title: `Tomorrow: ${s.courseEn}`, body: `${s.title} starts ${whenEn}.` },
        ar: { title: `غدًا: ${s.courseAr}`, body: `تبدأ حصة ${s.title} ${whenAr}.` },
      },
      HOUR: {
        en: { title: `${s.courseEn} starts in 1 hour`, body: `${s.title} · ${s.batchCode}. Be ready to join on time.` },
        ar: { title: `${s.courseAr} تبدأ بعد ساعة`, body: `${s.title} · ${s.batchCode}. كن جاهزًا للانضمام في الموعد.` },
      },
      SOON: {
        en: { title: `${s.courseEn} starts in 10 minutes`, body: `${s.title}: tap to open the lobby.` },
        ar: { title: `${s.courseAr} تبدأ بعد ١٠ دقائق`, body: `${s.title}: اضغط لتفتح غرفة الانتظار.` },
      },
    }[kind];
    return {
      type: 'SESSION_STARTING',
      ...text.en,
      ar: text.ar,
      data: { sessionId: s.id, batchId: s.batchId, reminder: kind },
      email: kind === 'DAY'
        ? (r: { name: string; locale: string; timezone: string }) =>
            reminderEmails.sessionTomorrow(r.locale, r.name, r.locale.startsWith('ar') ? s.courseAr : s.courseEn, s.title, formatInZone(s.startsAt, r.timezone, r.locale), url)
        : undefined,
    };
  }
}

export class PrismaSessionReminderRepository implements SessionReminderRepository {
  constructor(private readonly db: Db) {}

  async upcoming(now: Date) {
    const rows = await this.db.liveSession.findMany({
      where: {
        status: 'SCHEDULED',
        startsAt: { gt: now, lte: new Date(now.getTime() + WINDOWS.DAY) },
        OR: [{ reminderDayAt: null }, { reminderHourAt: null }, { reminderSoonAt: null }],
      },
      select: {
        id: true, title: true, startsAt: true, batchId: true, reminderDayAt: true, reminderHourAt: true, reminderSoonAt: true,
        batch: { select: { code: true, timezone: true, course: { select: { titleEn: true, titleAr: true } } } },
      },
      orderBy: { startsAt: 'asc' },
      take: 500,
    });
    return rows.map((r) => ({
      id: r.id, title: r.title, startsAt: r.startsAt, batchId: r.batchId, batchCode: r.batch.code, timezone: r.batch.timezone,
      courseEn: r.batch.course.titleEn, courseAr: r.batch.course.titleAr ?? r.batch.course.titleEn,
      dayAt: r.reminderDayAt, hourAt: r.reminderHourAt, soonAt: r.reminderSoonAt,
    }));
  }

  async markReminded(sessionId: string, patch: Partial<RemindersSent>) {
    await this.db.liveSession.update({
      where: { id: sessionId },
      data: {
        ...(patch.dayAt && { reminderDayAt: patch.dayAt }),
        ...(patch.hourAt && { reminderHourAt: patch.hourAt }),
        ...(patch.soonAt && { reminderSoonAt: patch.soonAt }),
      },
    });
  }

  async endedAwaitingMissedNotice(now: Date) {
    const rows = await this.db.liveSession.findMany({
      where: { status: 'ENDED', missedNoticeAt: null, endedAt: { gte: new Date(now.getTime() - 48 * HOUR), lte: new Date(now.getTime() - 30 * MIN) } },
      select: {
        id: true, title: true, batchId: true,
        batch: { select: { course: { select: { titleEn: true, titleAr: true } } } },
        attendance: { where: { seconds: { gt: 0 } }, select: { userId: true } },
      },
      take: 200,
    });
    return rows.map((r) => ({
      id: r.id, title: r.title, batchId: r.batchId, courseEn: r.batch.course.titleEn, courseAr: r.batch.course.titleAr ?? r.batch.course.titleEn,
      attendeeIds: r.attendance.map((a) => a.userId),
    }));
  }

  async markMissedNotified(sessionId: string, at: Date) {
    await this.db.liveSession.update({ where: { id: sessionId }, data: { missedNoticeAt: at } });
  }

  async activeStudentIds(batchId: string) {
    const rows = await this.db.enrollment.findMany({ where: { batchId, status: 'ACTIVE' }, select: { userId: true } });
    return rows.map((r) => r.userId);
  }
}

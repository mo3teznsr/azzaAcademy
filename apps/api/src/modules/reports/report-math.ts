import { addDays } from '../../core/time';

// Pure arithmetic behind `GET /admin/reports`: ranges, rates and per-teacher rollups. No I/O, no clock.

/** Longest range one report may cover. */
export const MAX_REPORT_DAYS = 366;
/** A session counts as started on time up to this many minutes after `startsAt`. */
export const ON_TIME_GRACE_MIN = 5;

export interface DayRange {
  /** Inclusive local days, YYYY-MM-DD. */
  from: string;
  to: string;
  days: number;
}

const dayNumber = (d: string) => Date.parse(`${d}T00:00:00Z`) / 86_400_000;

/**
 * `?from&to` (inclusive local days) → the range and the previous range of equal length that ends the day before.
 * Defaults: `to` = today, `from` = 29 days before `to` (30 days). `null` when from > to or the range is too long.
 */
export function resolveReportRange(q: { from?: string; to?: string }, today: string): { range: DayRange; previous: DayRange } | null {
  const to = q.to ?? (q.from && q.from > today ? q.from : today);
  const from = q.from ?? addDays(to, -29);
  const days = dayNumber(to) - dayNumber(from) + 1;
  if (days < 1 || days > MAX_REPORT_DAYS) return null;
  const prevTo = addDays(from, -1);
  return { range: { from, to, days }, previous: { from: addDays(prevTo, -(days - 1)), to: prevTo, days } };
}

/** num / den rounded to 4 decimals; 0 when there is nothing to divide by. */
export const rate = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 10_000) / 10_000 : 0);

/** Held seats over capacity, summed across batches (a 10-seat batch weighs less than a 30-seat one). */
export const fillRate = (batches: { capacity: number; seatsHeld: number }[]) =>
  rate(
    batches.reduce((s, b) => s + Math.min(b.seatsHeld, b.capacity), 0),
    batches.reduce((s, b) => s + b.capacity, 0),
  );

export interface SessionTurnout {
  sessionId: string;
  attended: number;
  expected: number;
}

/**
 * Per session: how many of the batch's ACTIVE students attended (`attendedByUser` = session ids per student,
 * see `attendanceByUser`). Students no longer ACTIVE are left out of both sides.
 */
export function sessionTurnout(
  sessions: { id: string; batchId: string }[],
  activeByBatch: Map<string, string[]>,
  attendedByUser: Map<string, Set<string>>,
): SessionTurnout[] {
  return sessions.map((s) => {
    const students = activeByBatch.get(s.batchId) ?? [];
    return { sessionId: s.id, attended: students.filter((u) => attendedByUser.get(u)?.has(s.id)).length, expected: students.length };
  });
}

/** Seats attended over seats expected across sessions (busy sessions weigh more). */
export const attendanceRate = (turnout: { attended: number; expected: number }[]) =>
  rate(
    turnout.reduce((s, t) => s + t.attended, 0),
    turnout.reduce((s, t) => s + t.expected, 0),
  );

export const startedOnTime = (s: { startsAt: Date; startedAt: Date | null }, graceMin = ON_TIME_GRACE_MIN) =>
  !!s.startedAt && s.startedAt.getTime() <= s.startsAt.getTime() + graceMin * 60_000;

export interface TeacherSessionRow {
  teacherId: string;
  teacherName: string;
  startsAt: Date;
  startedAt: Date | null;
  attended: number;
  expected: number;
}

/** Ended sessions grouped by who taught them. `avgAttendance` is the mean of per-session rates. Most sessions first. */
export function teacherRollup(rows: TeacherSessionRow[]) {
  const by = new Map<string, TeacherSessionRow[]>();
  for (const r of rows) by.set(r.teacherId, [...(by.get(r.teacherId) ?? []), r]);
  return [...by.values()]
    .map((list) => ({
      id: list[0]!.teacherId,
      name: list[0]!.teacherName,
      sessionsRun: list.length,
      avgAttendance: rate(
        list.reduce((s, r) => s + rate(r.attended, r.expected), 0),
        list.length,
      ),
      onTimeStartRate: rate(list.filter((r) => startedOnTime(r)).length, list.length),
    }))
    .sort((a, b) => b.sessionsRun - a.sessionsRun || a.name.localeCompare(b.name));
}

/** Gross paid revenue per course, biggest first. */
export function revenueByCourse(orders: { courseId: string; title: string; totalFils: number }[]) {
  const by = new Map<string, { courseId: string; title: string; revenueFils: number }>();
  for (const o of orders) {
    const row = by.get(o.courseId) ?? { courseId: o.courseId, title: o.title, revenueFils: 0 };
    row.revenueFils += o.totalFils;
    by.set(o.courseId, row);
  }
  return [...by.values()].sort((a, b) => b.revenueFils - a.revenueFils || a.title.localeCompare(b.title));
}

/** The RUNNING batch with the most held seats (ties → lower code), or null. */
export function busiestRunningBatch<T extends { status: string; seatsHeld: number; code: string }>(batches: T[]): T | null {
  return (
    batches
      .filter((b) => b.status === 'RUNNING')
      .sort((a, b) => b.seatsHeld - a.seatsHeld || a.code.localeCompare(b.code))[0] ?? null
  );
}

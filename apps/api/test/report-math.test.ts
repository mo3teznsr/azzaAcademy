import { describe, expect, test } from 'bun:test';
import {
  attendanceRate,
  busiestRunningBatch,
  fillRate,
  rate,
  resolveReportRange,
  revenueByCourse,
  sessionTurnout,
  startedOnTime,
  teacherRollup,
} from '../src/modules/reports/report-math';
import { scheduleSummary } from '../src/modules/teachers/schedule-summary';

describe('resolveReportRange', () => {
  test('default: the last 30 days, previous = the 30 days before', () => {
    expect(resolveReportRange({}, '2026-11-03')).toEqual({
      range: { from: '2026-10-05', to: '2026-11-03', days: 30 },
      previous: { from: '2026-09-05', to: '2026-10-04', days: 30 },
    });
  });

  test('explicit range across a month end; previous has equal length', () => {
    expect(resolveReportRange({ from: '2026-10-25', to: '2026-11-03' }, '2026-11-03')).toEqual({
      range: { from: '2026-10-25', to: '2026-11-03', days: 10 },
      previous: { from: '2026-10-15', to: '2026-10-24', days: 10 },
    });
  });

  test('single day', () => {
    expect(resolveReportRange({ from: '2026-03-01', to: '2026-03-01' }, '2026-11-03')!.previous).toEqual({ from: '2026-02-28', to: '2026-02-28', days: 1 });
  });

  test('only `to` → 30 days ending there; only `from` → up to today', () => {
    expect(resolveReportRange({ to: '2026-10-31' }, '2026-11-03')!.range).toEqual({ from: '2026-10-02', to: '2026-10-31', days: 30 });
    expect(resolveReportRange({ from: '2026-11-01' }, '2026-11-03')!.range).toEqual({ from: '2026-11-01', to: '2026-11-03', days: 3 });
  });

  test('from > to or too long → null', () => {
    expect(resolveReportRange({ from: '2026-11-04', to: '2026-11-03' }, '2026-11-03')).toBeNull();
    expect(resolveReportRange({ from: '2025-01-01', to: '2026-11-03' }, '2026-11-03')).toBeNull();
  });
});

describe('rates', () => {
  test('rate rounds to 4 decimals and is 0 without a denominator', () => {
    expect(rate(1, 3)).toBe(0.3333);
    expect(rate(2, 2)).toBe(1);
    expect(rate(5, 0)).toBe(0);
  });

  test('fill rate weighs batches by capacity and caps overbooked ones', () => {
    expect(fillRate([{ capacity: 24, seatsHeld: 24 }, { capacity: 16, seatsHeld: 4 }])).toBe(0.7);
    expect(fillRate([{ capacity: 10, seatsHeld: 12 }])).toBe(1);
    expect(fillRate([])).toBe(0);
  });

  test('attendance rate = attended seats / expected seats', () => {
    expect(attendanceRate([{ attended: 20, expected: 24 }, { attended: 2, expected: 4 }])).toBe(0.7857);
    expect(attendanceRate([])).toBe(0);
  });
});

describe('sessionTurnout', () => {
  test('counts only ACTIVE students of the session’s batch', () => {
    const turnout = sessionTurnout(
      [
        { id: 's1', batchId: 'b1' },
        { id: 's2', batchId: 'b2' },
      ],
      new Map([
        ['b1', ['sara', 'omar', 'lina']],
        ['b2', []],
      ]),
      new Map([
        ['sara', new Set(['s1'])],
        ['omar', new Set(['s1'])],
        ['gone', new Set(['s1'])], // not ACTIVE any more
      ]),
    );
    expect(turnout).toEqual([
      { sessionId: 's1', attended: 2, expected: 3 },
      { sessionId: 's2', attended: 0, expected: 0 },
    ]);
  });
});

describe('teacherRollup', () => {
  const t0 = new Date('2026-11-10T15:00:00Z');
  const plus = (min: number) => new Date(t0.getTime() + min * 60_000);
  const row = (teacherId: string, startedMin: number | null, attended: number, expected: number) => ({
    teacherId,
    teacherName: teacherId === 'lina' ? 'Lina Haddad' : 'Omar Saleh',
    startsAt: t0,
    startedAt: startedMin === null ? null : plus(startedMin),
    attended,
    expected,
  });

  test('on time = started ≤ 5 min after the scheduled start', () => {
    expect(startedOnTime({ startsAt: t0, startedAt: plus(-10) })).toBe(true);
    expect(startedOnTime({ startsAt: t0, startedAt: plus(5) })).toBe(true);
    expect(startedOnTime({ startsAt: t0, startedAt: plus(6) })).toBe(false);
    expect(startedOnTime({ startsAt: t0, startedAt: null })).toBe(false);
  });

  test('sessions, mean per-session attendance and on-time rate per teacher, busiest first', () => {
    expect(teacherRollup([row('omar', 0, 4, 4), row('lina', 2, 20, 24), row('lina', 9, 12, 24), row('lina', 0, 0, 0)])).toEqual([
      { id: 'lina', name: 'Lina Haddad', sessionsRun: 3, avgAttendance: 0.4444, onTimeStartRate: 0.6667 },
      { id: 'omar', name: 'Omar Saleh', sessionsRun: 1, avgAttendance: 1, onTimeStartRate: 1 },
    ]);
  });
});

describe('revenueByCourse & busiestRunningBatch', () => {
  test('sums per course, biggest first', () => {
    expect(
      revenueByCourse([
        { courseId: 'pdf', title: 'Product Design', totalFils: 92_400 },
        { courseId: 'ar', title: 'Arabic', totalFils: 68_250 },
        { courseId: 'pdf', title: 'Product Design', totalFils: 92_400 },
      ]),
    ).toEqual([
      { courseId: 'pdf', title: 'Product Design', revenueFils: 184_800 },
      { courseId: 'ar', title: 'Arabic', revenueFils: 68_250 },
    ]);
  });

  test('picks the RUNNING batch with most held seats', () => {
    const b = busiestRunningBatch([
      { code: 'B01', status: 'ENROLLING', seatsHeld: 30 },
      { code: 'B07', status: 'RUNNING', seatsHeld: 24 },
      { code: 'B03', status: 'RUNNING', seatsHeld: 24 },
      { code: 'B02', status: 'RUNNING', seatsHeld: 10 },
    ]);
    expect(b?.code).toBe('B03');
    expect(busiestRunningBatch([{ code: 'B01', status: 'COMPLETED', seatsHeld: 9 }])).toBeNull();
  });
});

describe('scheduleSummary', () => {
  test('weekdays Monday-first, time and session count', () => {
    expect(scheduleSummary({ weekdays: [4, 2], startTime: '19:00', sessionCount: 12 })).toBe('Tue & Thu · 19:00 · 12 sessions');
    expect(scheduleSummary({ weekdays: [0, 6], startTime: '10:00', sessionCount: 12 })).toBe('Sat & Sun · 10:00 · 12 sessions');
    expect(scheduleSummary({ weekdays: [1, 3, 5], startTime: '18:00', sessionCount: 1 })).toBe('Mon, Wed & Fri · 18:00 · 1 session');
    expect(scheduleSummary({ weekdays: [6], startTime: '11:00', sessionCount: 6 })).toBe('Sat · 11:00 · 6 sessions');
    expect(scheduleSummary(null)).toBeNull();
  });
});

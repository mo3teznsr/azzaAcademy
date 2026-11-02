import { describe, expect, test } from 'bun:test';
import { ScheduleGenerator } from '../src/modules/batches/schedule-generator';

const gen = new ScheduleGenerator();

describe('ScheduleGenerator', () => {
  test('B07: Tue & Thu 19:00 Dubai, 12 sessions from Nov 10 2026 ends Dec 17', () => {
    const plan = gen.generate(
      { weekdays: [2, 4], startTime: '19:00', durationMin: 90, sessionCount: 12, startsOn: '2026-11-10', skipDates: [] },
      'Asia/Dubai',
    );
    expect(plan.sessions).toHaveLength(12);
    expect(plan.sessions[0]!.startsAt.toISOString()).toBe('2026-11-10T15:00:00.000Z');
    expect(plan.sessions[0]!.endsAt.toISOString()).toBe('2026-11-10T16:30:00.000Z');
    expect(plan.sessions[4]!.localDate).toBe('2026-11-24');
    expect(plan.endsOn).toBe('2026-12-17');
  });

  test('skips holidays and still produces the full count', () => {
    const plan = gen.generate(
      { weekdays: [2, 4], startTime: '19:00', durationMin: 90, sessionCount: 4, startsOn: '2026-12-01', skipDates: ['2026-12-01', '2026-12-03'] },
      'Asia/Dubai',
    );
    expect(plan.skipped).toEqual(['2026-12-01', '2026-12-03']);
    expect(plan.sessions.map((s) => s.localDate)).toEqual(['2026-12-08', '2026-12-10', '2026-12-15', '2026-12-17']);
  });

  test('handles DST zones (London, last Sunday of March)', () => {
    const plan = gen.generate(
      { weekdays: [0], startTime: '10:00', durationMin: 60, sessionCount: 2, startsOn: '2027-03-21', skipDates: [] },
      'Europe/London',
    );
    expect(plan.sessions[0]!.startsAt.toISOString()).toBe('2027-03-21T10:00:00.000Z');
    expect(plan.sessions[1]!.startsAt.toISOString()).toBe('2027-03-28T09:00:00.000Z');
  });
});

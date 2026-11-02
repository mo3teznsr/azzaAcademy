import type { ScheduleRuleInput } from '@azza/shared';
import { addDays, addMinutes, weekdayOf, zonedToUtc } from '../../core/time';

export interface PlannedSession {
  number: number;
  localDate: string;
  startsAt: Date;
  endsAt: Date;
}

export interface SchedulePlan {
  sessions: PlannedSession[];
  skipped: string[];
  endsOn: string;
}

/** Pure: turns a recurrence rule into concrete session instants. No I/O, trivially testable. */
export class ScheduleGenerator {
  private static readonly MAX_SCAN_DAYS = 3 * 366;

  generate(rule: ScheduleRuleInput, timeZone: string): SchedulePlan {
    const weekdays = new Set(rule.weekdays);
    const skip = new Set(rule.skipDates);
    const sessions: PlannedSession[] = [];
    const skipped: string[] = [];

    let day = rule.startsOn;
    for (let i = 0; i < ScheduleGenerator.MAX_SCAN_DAYS && sessions.length < rule.sessionCount; i++, day = addDays(day, 1)) {
      if (!weekdays.has(weekdayOf(day))) continue;
      if (skip.has(day)) {
        skipped.push(day);
        continue;
      }
      const startsAt = zonedToUtc(day, rule.startTime, timeZone);
      sessions.push({ number: sessions.length + 1, localDate: day, startsAt, endsAt: addMinutes(startsAt, rule.durationMin) });
    }

    return { sessions, skipped, endsOn: sessions.at(-1)?.localDate ?? rule.startsOn };
  }
}

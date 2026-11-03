import type { ReportQuery } from '@azza/shared';
import { BusinessRuleError } from '../../core/errors';
import type { Clock } from '../../core/ports';
import { addDays, zonedToUtc } from '../../core/time';
import { certificateProgress } from '../certificates/certificate-eligibility';
import { attendanceByUser } from '../sessions/attended-sessions';
import {
  attendanceRate,
  busiestRunningBatch,
  fillRate,
  MAX_REPORT_DAYS,
  rate,
  resolveReportRange,
  revenueByCourse,
  sessionTurnout,
  teacherRollup,
  type DayRange,
} from './report-math';
import type { ReportRepository } from './report.repository';

/** Reports use the platform's home timezone, like the admin dashboard. */
const HOME_TZ = 'Asia/Dubai';
const localDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: HOME_TZ }).format(d);
/** Inclusive local days → [from, to) instants. */
const bounds = (r: DayRange) => ({ from: zonedToUtc(r.from, '00:00', HOME_TZ), to: zonedToUtc(addDays(r.to, 1), '00:00', HOME_TZ) });

export class ReportService {
  constructor(
    private readonly repo: ReportRepository,
    private readonly clock: Clock,
  ) {}

  /** `GET /admin/reports?from&to` */
  async report(q: ReportQuery) {
    const resolved = resolveReportRange(q, localDay(this.clock.now()));
    if (!resolved) throw new BusinessRuleError(`Pick a range of 1–${MAX_REPORT_DAYS} days with from ≤ to`, 'INVALID_RANGE');
    const { range, previous } = resolved;
    const cur = bounds(range);

    const [kpis, prevKpis, batchRows, running, sessions] = await Promise.all([
      this.kpis(cur.from, cur.to),
      this.kpis(bounds(previous).from, bounds(previous).to),
      this.repo.batchesActiveIn(cur.from, cur.to),
      this.repo.runningBatches(),
      this.repo.endedSessions(cur.from, cur.to),
    ]);
    const seats = await this.repo.seatCounts([...new Set([...batchRows, ...running].map((b) => b.id))]);
    const withSeats = <T extends { id: string }>(b: T) => ({ ...b, ...seats.get(b.id)! });

    // per-teacher rollup over the range's ended sessions
    const turnout = await this.turnout(sessions);
    const teachers = teacherRollup(
      sessions.map((s, i) => {
        const who = s.host ?? s.batch.teacher;
        return { teacherId: who.id, teacherName: who.name, startsAt: s.startsAt, startedAt: s.startedAt, ...turnout[i]! };
      }),
    );

    // attendance per session for the busiest running batch (whole batch so far, not only the range)
    const busiest = busiestRunningBatch(running.map(withSeats));
    const busiestSessions = busiest ? await this.repo.endedSessions(null, null, busiest.id) : [];
    const busiestTurnout = await this.turnout(busiestSessions);

    return {
      range: { from: range.from, to: range.to, days: range.days, timezone: HOME_TZ },
      previousRange: { from: previous.from, to: previous.to, days: previous.days },
      kpis: kpis.kpis,
      previous: prevKpis.kpis,
      revenueByCourse: kpis.revenueByCourse,
      batches: batchRows.map(withSeats).map((b) => ({
        id: b.id,
        code: b.code,
        courseId: b.course.id,
        courseTitle: b.course.titleEn,
        teacherId: b.teacher.id,
        teacherName: b.teacher.name,
        capacity: b.capacity,
        seatsHeld: b.seatsHeld,
        status: b.status,
        waitlistCount: b.waitlistCount,
      })),
      attendanceBatch: busiest && { id: busiest.id, code: busiest.code, courseTitle: busiest.course.titleEn },
      attendanceBySession: busiestSessions.map((s, i) => ({ number: s.number, rate: rate(busiestTurnout[i]!.attended, busiestTurnout[i]!.expected) })),
      teachers,
    };
  }

  private async kpis(from: Date, to: Date) {
    const [orders, refundsFils, active, sessions, finished] = await Promise.all([
      this.repo.paidOrders(from, to),
      this.repo.refundedFils(from, to),
      this.repo.batchesActiveIn(from, to),
      this.repo.endedSessions(from, to),
      this.repo.finishedBatches(from, to),
    ]);
    const seats = await this.repo.seatCounts(active.map((b) => b.id));
    const turnout = await this.turnout(sessions);

    // completion: ACTIVE students of batches that ended in the range who met the certificate rule
    const over = finished.filter((b) => certificateProgress({ enrollmentStatus: 'ACTIVE', batchStatus: b.status, sessions: b.sessions, attendedSessionIds: new Set() }).finished);
    const students = await this.repo.activeStudents(over.map((b) => b.id));
    const { joins, marks } = await this.repo.attendance(over.flatMap((b) => b.sessions.map((s) => s.id)));
    const attended = attendanceByUser(joins, marks);
    const outcomes = over.flatMap((b) =>
      (students.get(b.id) ?? []).map(
        (userId) =>
          certificateProgress({ enrollmentStatus: 'ACTIVE', batchStatus: b.status, sessions: b.sessions, attendedSessionIds: attended.get(userId) ?? new Set() }).eligible,
      ),
    );

    const lines = orders.map((o) => ({ courseId: o.enrollment.batch.course.id, title: o.enrollment.batch.course.titleEn, totalFils: o.totalFils }));
    return {
      kpis: {
        revenueFils: lines.reduce((s, o) => s + o.totalFils, 0),
        newEnrollments: orders.length,
        fillRate: fillRate(active.map((b) => ({ capacity: b.capacity, seatsHeld: seats.get(b.id)!.seatsHeld }))),
        attendanceRate: attendanceRate(turnout),
        completionRate: rate(outcomes.filter(Boolean).length, outcomes.length),
        refundsFils,
      },
      revenueByCourse: revenueByCourse(lines),
    };
  }

  /** Attended / expected (ACTIVE students) per session, in the order given. */
  private async turnout(sessions: { id: string; batchId: string }[]) {
    if (!sessions.length) return [];
    const [students, { joins, marks }] = await Promise.all([
      this.repo.activeStudents([...new Set(sessions.map((s) => s.batchId))]),
      this.repo.attendance(sessions.map((s) => s.id)),
    ]);
    return sessionTurnout(sessions, students, attendanceByUser(joins, marks));
  }
}

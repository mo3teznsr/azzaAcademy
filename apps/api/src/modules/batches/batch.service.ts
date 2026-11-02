import {
  aedToFils,
  type BatchStatus,
  type CreateBatchInput,
  type PreviewScheduleInput,
  type Role,
  type UpdateBatchInput,
} from '@azza/shared';
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from '../../core/errors';
import type { Clock } from '../../core/ports';
import { addDays, zonedToUtc } from '../../core/time';
import type { CourseRepository } from '../courses/course.repository';
import type { Notifier } from '../notifications/notification.types';
import type { BatchAccessPolicy } from './batch-access';
import type { BatchFilter, BatchRepository } from './batch.repository';
import type { PlannedSession, ScheduleGenerator } from './schedule-generator';

export interface ScheduleConflict {
  sessionNumber: number;
  localDate: string;
  withBatch: string;
}

/** Allowed status moves. Anything else is rejected (keeps the lifecycle explicit). */
const TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  DRAFT: ['ENROLLING', 'CANCELLED'],
  ENROLLING: ['FULL', 'RUNNING', 'CANCELLED', 'DRAFT'],
  FULL: ['ENROLLING', 'RUNNING', 'CANCELLED'],
  RUNNING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export class BatchService {
  constructor(
    private readonly batches: BatchRepository,
    private readonly courses: CourseRepository,
    private readonly generator: ScheduleGenerator,
    private readonly access: BatchAccessPolicy,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
  ) {}

  list(filter: BatchFilter, viewer: { id: string; role: Role } | null) {
    if (viewer?.role === 'TEACHER') return this.batches.list({ ...filter, teacherId: viewer.id });
    if (viewer?.role === 'ADMIN') return this.batches.list(filter);
    // public / students: only batches people can see in the catalog
    return this.batches.list({ ...filter, status: undefined, statuses: ['ENROLLING', 'FULL', 'RUNNING'] });
  }

  async get(id: string, viewer: { id: string; role: Role } | null) {
    const batch = await this.batches.findById(id);
    if (!batch) throw new NotFoundError('Batch', id);
    if (batch.status === 'DRAFT' && viewer?.role !== 'ADMIN' && viewer?.id !== batch.teacherId) throw new NotFoundError('Batch', id);
    const seatsTaken = await this.batches.activeEnrollmentCount(id);
    return { ...batch, seatsTaken, seatsLeft: Math.max(0, batch.capacity - seatsTaken) };
  }

  async preview(input: PreviewScheduleInput) {
    const plan = this.generator.generate(input, input.timezone);
    const conflicts = input.teacherId ? await this.findConflicts(input.teacherId, plan.sessions) : [];
    return { ...plan, conflicts };
  }

  async create(input: CreateBatchInput) {
    const course = await this.courses.findById(input.courseId);
    if (!course) throw new NotFoundError('Course', input.courseId);
    if (await this.batches.existsCode(input.courseId, input.code)) throw new ConflictError(`${input.code} already exists for this course`);

    const plan = this.generator.generate(input.schedule, input.timezone);
    if (plan.sessions.length < input.schedule.sessionCount) {
      throw new BusinessRuleError('Could not fit every session in the schedule window', 'SCHEDULE_INCOMPLETE');
    }
    const conflicts = await this.findConflicts(input.teacherId, plan.sessions);
    if (conflicts.length) throw new ConflictError('Teacher is double-booked', { conflicts });

    const titles = input.sessionTitles ?? course.modules.map((m) => m.titleEn);
    const first = plan.sessions[0]!;
    const last = plan.sessions.at(-1)!;

    return this.batches.create({
      courseId: input.courseId,
      code: input.code,
      teacherId: input.teacherId,
      capacity: input.capacity,
      language: input.language,
      timezone: input.timezone,
      priceFils: input.priceAed ? aedToFils(input.priceAed) : undefined,
      waitlistEnabled: input.waitlistEnabled,
      minStudents: input.minStudents,
      enrollmentOpensOn: input.enrollmentOpensOn ? new Date(input.enrollmentOpensOn) : undefined,
      enrollmentClosesOn: input.enrollmentClosesOn ? new Date(input.enrollmentClosesOn) : undefined,
      startsOn: first.startsAt,
      endsOn: last.endsAt,
      rule: {
        weekdays: input.schedule.weekdays,
        startTime: input.schedule.startTime,
        durationMin: input.schedule.durationMin,
        sessionCount: input.schedule.sessionCount,
        skipDates: input.schedule.skipDates,
      },
      sessions: plan.sessions.map((s, i) => ({ ...s, title: titles[i] ?? `Session ${s.number}` })),
    });
  }

  async update(id: string, input: UpdateBatchInput, actor: { id: string; role: Role }) {
    const batch = await this.batches.findById(id);
    if (!batch) throw new NotFoundError('Batch', id);
    if (actor.role !== 'ADMIN') throw new ForbiddenError();

    if (input.status && input.status !== batch.status && !TRANSITIONS[batch.status].includes(input.status)) {
      throw new BusinessRuleError(`Cannot move a batch from ${batch.status} to ${input.status}`, 'INVALID_TRANSITION');
    }
    if (input.capacity !== undefined && input.capacity < (await this.batches.activeEnrollmentCount(id))) {
      throw new BusinessRuleError('Capacity is below the number of enrolled students', 'CAPACITY_TOO_LOW');
    }
    const { priceAed, enrollmentOpensOn, enrollmentClosesOn, ...rest } = input;
    return this.batches.update(id, {
      ...rest,
      ...(priceAed !== undefined && { priceFils: aedToFils(priceAed) }),
      ...(enrollmentOpensOn && { enrollmentOpensOn: new Date(enrollmentOpensOn) }),
      ...(enrollmentClosesOn && { enrollmentClosesOn: new Date(enrollmentClosesOn) }),
    });
  }

  /** TEACHER (own batch) / ADMIN: active students with attendance over delivered sessions. */
  async roster(id: string, viewer: { id: string; role: Role }) {
    await this.access.require(id, viewer, ['admin', 'teacher']);
    const { enrollments, endedSessions, attendance, marks } = await this.batches.roster(id);
    const items = enrollments.map((e) => {
      const mine = attendance.filter((a) => a.userId === e.userId);
      // Teacher/admin corrections (AttendanceMark) win over the join log.
      const attended = new Set(mine.map((a) => a.sessionId));
      for (const m of marks.filter((m) => m.userId === e.userId)) {
        if (m.mark === 'ABSENT') attended.delete(m.sessionId);
        else attended.add(m.sessionId);
      }
      return {
        enrollmentId: e.id,
        enrolledAt: e.createdAt,
        user: e.user,
        sessionsAttended: attended.size,
        attendedSessionIds: [...attended],
        secondsAttended: mine.reduce((s, a) => s + (a._sum.seconds ?? 0), 0),
        attendancePercent: endedSessions ? Math.round((attended.size / endedSessions) * 100) : null,
      };
    });
    const avg = items.length && endedSessions ? Math.round(items.reduce((s, i) => s + (i.attendancePercent ?? 0), 0) / items.length) : null;
    return { batchId: id, endedSessions, averageAttendancePercent: avg, items };
  }

  async enrollments(id: string) {
    if (!(await this.batches.findById(id))) throw new NotFoundError('Batch', id);
    return { items: await this.batches.enrollments(id) };
  }

  /** ADMIN: move every SCHEDULED session from `fromSessionNumber` on by N calendar days (keeps local wall-clock time). */
  async shift(id: string, input: { fromSessionNumber: number; days: number }) {
    const batch = await this.batches.findById(id);
    if (!batch) throw new NotFoundError('Batch', id);
    if (input.days === 0) throw new BusinessRuleError('Shift by at least one day', 'ZERO_SHIFT');
    const sessions = await this.batches.scheduledFrom(id, input.fromSessionNumber);
    if (!sessions.length) throw new BusinessRuleError('No scheduled sessions from that number', 'NOTHING_TO_SHIFT');

    const tz = batch.timezone;
    const parts = (d: Date) => {
      const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
      const get = (t: string) => f.find((p) => p.type === t)?.value ?? '00';
      return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
    };
    const moves = sessions.map((s) => {
      const local = parts(s.startsAt);
      const startsAt = zonedToUtc(addDays(local.date, input.days), local.time, tz);
      return { id: s.id, number: s.number, startsAt, endsAt: new Date(startsAt.getTime() + (s.endsAt.getTime() - s.startsAt.getTime())), movedFrom: s.startsAt };
    });
    if (moves[0]!.startsAt <= this.clock.now()) throw new BusinessRuleError('Sessions cannot be moved into the past', 'START_IN_PAST');

    const busy = await this.batches.teacherBusy(batch.teacherId, moves[0]!.startsAt, moves.at(-1)!.endsAt, id);
    const conflicts = moves.flatMap((m) => {
      const clash = busy.find((b) => b.startsAt < m.endsAt && b.endsAt > m.startsAt);
      return clash ? [{ sessionNumber: m.number, startsAt: m.startsAt, withBatch: clash.batchCode }] : [];
    });
    if (conflicts.length) throw new ConflictError('Teacher is double-booked after the shift', { conflicts });

    const updated = await this.batches.applyShift(id, moves, `Shifted ${input.days > 0 ? '+' : ''}${input.days} days`);
    const course = batch.course.titleEn;
    await this.notifier.notify([...(await this.batches.activeStudentIds(id)), batch.teacherId], {
      type: 'BATCH_SHIFTED',
      title: `Schedule changed · ${course} ${batch.code}`,
      body: `${moves.length} session(s) from S${String(input.fromSessionNumber).padStart(2, '0')} moved by ${input.days} day(s)`,
      data: { batchId: id },
    });
    return updated;
  }

  private async findConflicts(teacherId: string, sessions: PlannedSession[]): Promise<ScheduleConflict[]> {
    if (!sessions.length) return [];
    const busy = await this.batches.teacherBusy(teacherId, sessions[0]!.startsAt, sessions.at(-1)!.endsAt);
    return sessions.flatMap((s) => {
      const clash = busy.find((b) => b.startsAt < s.endsAt && b.endsAt > s.startsAt);
      return clash ? [{ sessionNumber: s.number, localDate: s.localDate, withBatch: clash.batchCode }] : [];
    });
  }
}

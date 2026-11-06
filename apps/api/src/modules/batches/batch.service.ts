import {
  aedToFils,
  type BatchStatus,
  type CreateBatchInput,
  type PreviewScheduleInput,
  type ReviewDecisionInput,
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

/** What students and visitors can see in the catalog. */
const PUBLIC_STATUSES: BatchStatus[] = ['ENROLLING', 'FULL', 'RUNNING'];

/** Allowed status moves. Anything else is rejected (keeps the lifecycle explicit). */
const TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  DRAFT: ['PENDING_REVIEW', 'ENROLLING', 'CANCELLED'],
  PENDING_REVIEW: ['ENROLLING', 'DRAFT', 'CANCELLED'],
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
    // A teacher's own workspace lists their batches; on a course page they see what students see, plus their own.
    if (viewer?.role === 'TEACHER' && filter.courseId && filter.teacherId !== viewer.id) {
      return this.batches.list({ ...filter, teacherId: undefined, status: undefined, visibleTo: { teacherId: viewer.id, statuses: PUBLIC_STATUSES } });
    }
    if (viewer?.role === 'TEACHER') return this.batches.list({ ...filter, teacherId: viewer.id });
    if (viewer?.role === 'ADMIN') return this.batches.list(filter);
    // public / students: only batches people can see in the catalog
    return this.batches.list({ ...filter, status: undefined, statuses: PUBLIC_STATUSES });
  }

  async get(id: string, viewer: { id: string; role: Role } | null) {
    const batch = await this.batches.findById(id);
    if (!batch) throw new NotFoundError('Batch', id);
    if ((batch.status === 'DRAFT' || batch.status === 'PENDING_REVIEW') && viewer?.role !== 'ADMIN' && viewer?.id !== batch.teacherId) throw new NotFoundError('Batch', id);
    const seatsTaken = await this.batches.activeEnrollmentCount(id);
    return { ...batch, seatsTaken, seatsLeft: Math.max(0, batch.capacity - seatsTaken) };
  }

  /** A teacher always previews against their own calendar. */
  async preview(input: PreviewScheduleInput, actor: { id: string; role: Role }) {
    const teacherId = actor.role === 'TEACHER' ? actor.id : input.teacherId;
    const plan = this.generator.generate(input, input.timezone);
    const conflicts = teacherId ? await this.findConflicts(teacherId, plan.sessions) : [];
    return { ...plan, conflicts };
  }

  /** ADMIN picks the teacher; a TEACHER proposes a DRAFT batch for themselves on a published course or one they proposed. */
  async create(input: CreateBatchInput, actor: { id: string; role: Role }) {
    const course = await this.courses.findById(input.courseId);
    if (!course) throw new NotFoundError('Course', input.courseId);
    const teacherId = actor.role === 'TEACHER' ? actor.id : input.teacherId;
    if (!teacherId) throw new BusinessRuleError('Pick a teacher for this batch', 'TEACHER_REQUIRED');
    if (actor.role === 'TEACHER' && course.status !== 'PUBLISHED' && course.createdById !== actor.id) throw new NotFoundError('Course', input.courseId);
    if (course.status === 'ARCHIVED') throw new BusinessRuleError('This course is archived', 'COURSE_ARCHIVED');
    if (await this.batches.existsCode(input.courseId, input.code)) throw new ConflictError(`${input.code} already exists for this course`);

    const plan = this.generator.generate(input.schedule, input.timezone);
    if (plan.sessions.length < input.schedule.sessionCount) {
      throw new BusinessRuleError('Could not fit every session in the schedule window', 'SCHEDULE_INCOMPLETE');
    }
    const conflicts = await this.findConflicts(teacherId, plan.sessions);
    if (conflicts.length) throw new ConflictError('Teacher is double-booked', { conflicts });

    const titles = input.sessionTitles ?? course.modules.map((m) => m.titleEn);
    const first = plan.sessions[0]!;
    const last = plan.sessions.at(-1)!;

    return this.batches.create({
      courseId: input.courseId,
      code: input.code,
      teacherId,
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
    if (actor.role !== 'ADMIN') {
      this.assertTeacherCanEdit(batch, actor);
      if (input.status || input.teacherId) throw new ForbiddenError('Submit the batch for review instead');
    }

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

  /** TEACHER: send their DRAFT batch to the admins. */
  async submit(id: string, actor: { id: string; role: Role }) {
    const batch = await this.batches.findById(id);
    if (!batch) throw new NotFoundError('Batch', id);
    this.assertTeacherCanEdit(batch, actor);
    if (batch.status !== 'DRAFT') throw new BusinessRuleError('This batch is already waiting for review', 'ALREADY_SUBMITTED');
    const updated = await this.batches.update(id, { status: 'PENDING_REVIEW', submittedAt: this.clock.now(), reviewNote: null });
    await this.notifier.notifyRole('ADMIN', {
      type: 'BATCH_SUBMITTED',
      title: 'Batch waiting for review',
      body: `${batch.course.titleEn} ${batch.code} was proposed by ${batch.teacher.name}`,
      data: { batchId: id },
    });
    return updated;
  }

  /** ADMIN: approve (→ ENROLLING, course must be published) or send back with a note (→ DRAFT). */
  async review(id: string, decision: ReviewDecisionInput) {
    const batch = await this.batches.findById(id);
    if (!batch) throw new NotFoundError('Batch', id);
    if (batch.status !== 'PENDING_REVIEW') throw new BusinessRuleError('This batch is not waiting for review', 'NOT_PENDING_REVIEW');
    if (decision.approve) {
      const course = await this.courses.findById(batch.courseId);
      if (course?.status !== 'PUBLISHED') throw new BusinessRuleError('Approve the course before its batches', 'COURSE_NOT_PUBLISHED');
    }
    const updated = await this.batches.update(
      id,
      decision.approve ? { status: 'ENROLLING', reviewNote: null } : { status: 'DRAFT', reviewNote: decision.note ?? null },
    );
    await this.notifier.notify([batch.teacherId], {
      type: decision.approve ? 'BATCH_APPROVED' : 'BATCH_CHANGES_REQUESTED',
      title: decision.approve ? 'Your batch is open for enrollment' : 'Your batch needs changes',
      body: decision.approve ? `${batch.course.titleEn} ${batch.code}` : `${batch.course.titleEn} ${batch.code}: ${decision.note}`,
      data: { batchId: id },
    });
    return updated;
  }

  private assertTeacherCanEdit(batch: { teacherId: string; status: BatchStatus }, actor: { id: string; role: Role }) {
    if (actor.role !== 'TEACHER' || batch.teacherId !== actor.id) throw new ForbiddenError();
    if (batch.status !== 'DRAFT' && batch.status !== 'PENDING_REVIEW') {
      throw new BusinessRuleError('Approved batches are changed by an admin', 'BATCH_LOCKED');
    }
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

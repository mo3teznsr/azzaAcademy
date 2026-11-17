import type { EnrollmentStatus, OrganizationInput, OrganizationMemberInput, SeatAssignInput, SeatPackInput } from '@azza/shared';
import type { UserProvisioner } from '../../auth/user-provisioner';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '../../core/errors';
import type { Clock } from '../../core/ports';
import type { AuditLog } from '../audit/audit-log';
import type { Notifier } from '../notifications/notification.types';
import type { EnrollmentRecord } from '../payments/payments.repository';
import { attendanceByUser } from '../sessions/attended-sessions';
import { orgReportCsv, orgReportRow, orgReportSummary } from './org-report';
import type { AssignmentRecord, OrganizationRepository, SeatPackRecord } from './organization.repository';
import { assignRefusal, cancellationCreditFils, packAmounts, packRefusal, revokeRefusal, seatPackReference, unusedSeats } from './seat-pack-policy';

/** The slice of EnrollmentLifecycle seat packs use: seats without checkout, cancellation, fullness and the waitlist. */
export interface SeatLifecycle {
  grant(userId: string, batchId: string): Promise<EnrollmentRecord>;
  move(enrollment: EnrollmentRecord, to: EnrollmentStatus): Promise<EnrollmentRecord>;
  syncFullness(batchId: string): Promise<void>;
  release(batchId: string): Promise<unknown>;
}

/** Who is acting: a platform admin, or an organization manager limited to their organization. */
export type Actor = { id: string; as: 'ADMIN' } | { id: string; as: 'MANAGER'; organizationId: string };

const REFUSALS: Record<string, string> = {
  BATCH_NOT_OPEN: 'This class is not open for seats',
  CAPACITY_EXCEEDED: 'The class does not have that many seats left',
  PACK_CANCELLED: 'This seat pack was cancelled',
  NO_SEATS_LEFT: 'Every seat of this pack is taken',
  ALREADY_ASSIGNED: 'This learner already has a seat from this pack',
  ALREADY_ENROLLED: 'This learner already has a seat in this class',
  ACCESS_ENDED: 'Access for this pack has ended',
  NOT_ACTIVE: 'This seat was already revoked',
  CLASS_STARTED: 'The class has started, so the seat can no longer be taken back',
  LEARNING_STARTED: 'The learner has started the course, so the seat can no longer be taken back',
};
const refuse = (code: string, details?: unknown) => new BusinessRuleError(REFUSALS[code] ?? code, code, details);

/**
 * Companies and schools: organizations and their members, seat packs (corporate orders invoiced to the organization) and
 * the named learners on their seats. A live seat is an ACTIVE enrollment made through the enrollment lifecycle (so
 * capacity, the "you're enrolled" email, attendance and certificates work as for a paid seat); a recorded seat is an
 * ORGANIZATION subscription that ends with the pack. Every change is written to the audit log.
 */
export class OrganizationService {
  constructor(
    private readonly repo: OrganizationRepository,
    private readonly seats: { heldSeats(batchId: string): Promise<number> },
    private readonly lifecycle: SeatLifecycle,
    private readonly provisioner: UserProvisioner,
    private readonly audit: AuditLog,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
    private readonly vatPercent: () => Promise<number>,
  ) {}

  // ───────── organizations ─────────

  list(q: string | undefined, skip: number, take: number) {
    return this.repo.listOrganizations(q, skip, take);
  }

  async create(input: OrganizationInput, actorId: string) {
    const org = await this.repo.createOrganization(input);
    await this.audit.record({ actorId, action: 'ORGANIZATION_CREATED', entityType: 'Organization', entityId: org.id, data: { name: org.name, trn: org.trn } });
    return org;
  }

  async update(id: string, input: OrganizationInput, actorId: string) {
    const before = await this.mustOrg(id);
    const org = await this.repo.updateOrganization(id, input);
    await this.audit.record({ actorId, action: 'ORGANIZATION_UPDATED', entityType: 'Organization', entityId: id, data: { before: { legalName: before.legalName, trn: before.trn }, after: { legalName: org.legalName, trn: org.trn } } });
    return org;
  }

  /** The organization with its members and packs (admins, or its managers). */
  async detail(id: string, actor: Actor) {
    this.assertOrg(actor, id);
    const [organization, members, packs] = await Promise.all([this.mustOrg(id), this.repo.members(id), this.repo.packsOf(id)]);
    return { organization, members, packs: packs.map(packView) };
  }

  /** `GET /org/mine` — organizations the user manages. */
  managedBy(userId: string) {
    return this.repo.managedBy(userId);
  }

  /** Throws unless the user manages the organization. */
  async managerActor(userId: string, organizationId: string): Promise<Actor> {
    const m = await this.repo.findMember(organizationId, userId);
    if (!m || m.role !== 'MANAGER') throw new ForbiddenError('You do not manage this organization');
    return { id: userId, as: 'MANAGER', organizationId };
  }

  async addMember(organizationId: string, input: OrganizationMemberInput, actorId: string) {
    await this.mustOrg(organizationId);
    const user = await this.findOrInvite(input.email, input.name);
    const member = await this.repo.upsertMember(organizationId, user.id, input.role);
    await this.audit.record({ actorId, action: 'ORGANIZATION_MEMBER_ADDED', entityType: 'Organization', entityId: organizationId, data: { userId: user.id, email: user.email, role: input.role } });
    return member;
  }

  async removeMember(organizationId: string, userId: string, actorId: string) {
    await this.mustOrg(organizationId);
    await this.repo.removeMember(organizationId, userId);
    await this.audit.record({ actorId, action: 'ORGANIZATION_MEMBER_REMOVED', entityType: 'Organization', entityId: organizationId, data: { userId } });
    return { ok: true };
  }

  // ───────── seat packs ─────────

  /** Records a corporate deal. Live packs must fit in the class; their seats are held from now on. */
  async createPack(organizationId: string, input: SeatPackInput, actorId: string) {
    await this.mustOrg(organizationId);
    const now = this.clock.now();
    if (input.batchId) {
      const batch = await this.repo.findBatch(input.batchId);
      if (!batch) throw new NotFoundError('Batch', input.batchId);
      const refusal = packRefusal(batch, await this.seats.heldSeats(batch.id), input.seats);
      if (refusal) throw refuse(refusal, { capacity: batch.capacity });
    } else {
      const course = await this.repo.findCourse(input.courseId!);
      if (!course) throw new NotFoundError('Course', input.courseId);
      if (course.type !== 'RECORDED') throw new BusinessRuleError('Pick a recorded course, or a class for a live course', 'NOT_RECORDED');
      if (!input.accessEndsAt || input.accessEndsAt.getTime() <= now.getTime()) throw new BusinessRuleError('Access must end in the future', 'INVALID_ACCESS_END');
    }
    const money = packAmounts(input.seats, input.unitPriceFils, input.discountFils, await this.vatPercent());
    const pack = await this.repo.createPack({
      reference: await this.newReference(),
      organizationId,
      batchId: input.batchId ?? null,
      courseId: input.batchId ? null : input.courseId!,
      seats: input.seats,
      unitPriceFils: input.unitPriceFils,
      ...money,
      status: input.paid ? 'PAID' : 'INVOICED',
      paymentReference: input.paid ? (input.paymentReference ?? null) : null,
      paidAt: input.paid ? now : null,
      invoicedAt: now,
      accessEndsAt: input.batchId ? null : (input.accessEndsAt ?? null),
      note: input.note ?? null,
      createdById: actorId,
    });
    if (pack.batchId) await this.lifecycle.syncFullness(pack.batchId);
    await this.audit.record({
      actorId,
      action: 'SEAT_PACK_CREATED',
      entityType: 'SeatPack',
      entityId: pack.id,
      data: { organizationId, reference: pack.reference, batchId: pack.batchId, courseId: pack.courseId, seats: pack.seats, totalFils: pack.totalFils, status: pack.status },
    });
    return packView(pack);
  }

  /** The pack with its assignments and history. */
  async pack(packId: string, actor: Actor) {
    const pack = await this.mustPack(packId, actor);
    const [assignments, history] = await Promise.all([this.repo.assignments(packId), actor.as === 'ADMIN' ? this.audit.forEntity('SeatPack', packId) : Promise.resolve([])]);
    return { ...packView(pack), assignments, history };
  }

  /** The bank transfer for an invoiced pack arrived. */
  async markPaid(packId: string, paymentReference: string, actorId: string) {
    const pack = await this.mustPack(packId, { id: actorId, as: 'ADMIN' });
    if (pack.status !== 'INVOICED') throw new BusinessRuleError('Only an invoiced pack can be marked paid', 'NOT_INVOICED', { status: pack.status });
    const paid = await this.repo.updatePack(packId, { status: 'PAID', paymentReference, paidAt: this.clock.now() });
    await this.audit.record({ actorId, action: 'SEAT_PACK_PAID', entityType: 'SeatPack', entityId: packId, data: { paymentReference, totalFils: pack.totalFils } });
    return packView(paid);
  }

  /**
   * Calls the deal off: unused seats go back to the class (and its waitlist) and are credited (a credit note follows
   * from `refundedFils`). Learners already on a seat keep it.
   */
  async cancelPack(packId: string, actorId: string) {
    const pack = await this.mustPack(packId, { id: actorId, as: 'ADMIN' });
    if (pack.status === 'CANCELLED') throw new BusinessRuleError('This pack is already cancelled', 'ALREADY_CANCELLED');
    const credit = cancellationCreditFils(pack);
    const cancelled = await this.repo.updatePack(packId, { status: 'CANCELLED', cancelledAt: this.clock.now(), refundedFils: pack.refundedFils + credit });
    if (pack.batchId) await this.lifecycle.release(pack.batchId);
    await this.audit.record({ actorId, action: 'SEAT_PACK_CANCELLED', entityType: 'SeatPack', entityId: packId, data: { unusedSeats: unusedSeats(pack), creditFils: credit } });
    return packView(cancelled);
  }

  // ───────── seats ─────────

  /** Puts a named learner on a seat (inviting them when they have no account) and enrolls them, without checkout. */
  async assign(packId: string, input: SeatAssignInput, actor: Actor) {
    const pack = await this.mustPack(packId, actor);
    const user = await this.findOrInvite(input.email, input.name);
    const now = this.clock.now();
    const batch = pack.batchId ? await this.repo.findBatch(pack.batchId) : null;
    const existing = batch ? await this.enrollmentStatus(user.id, batch.id) : null;
    const refusal = assignRefusal({
      packStatus: pack.status,
      seats: pack.seats,
      used: pack.used,
      alreadyAssigned: !!(await this.repo.findActiveAssignment(packId, user.id)),
      batchStatus: batch?.status ?? null,
      existing,
      accessEndsAt: pack.accessEndsAt,
      now,
    });
    if (refusal) throw refuse(refusal);
    if (!batch && (await this.repo.hasLivePlan(user.id, pack.courseId!, now))) {
      throw new BusinessRuleError('This learner can already watch this course', 'ALREADY_HAS_ACCESS');
    }

    const claim = await this.repo.claimSeat(packId, user.id, actor.id);
    if (!claim) throw refuse('NO_SEATS_LEFT');
    try {
      if (batch) {
        const enrollment = await this.lifecycle.grant(user.id, batch.id);
        await this.repo.linkAssignment(claim.id, { enrollmentId: enrollment.id });
      } else {
        const subscriptionId = await this.repo.createSeatSubscription(user.id, pack.courseId!, pack.accessEndsAt!);
        await this.repo.linkAssignment(claim.id, { subscriptionId });
        await this.notifier.notify([user.id], {
          type: 'SEAT_ASSIGNED',
          title: `You have access · ${pack.title}`,
          body: 'Your organization gave you a seat on this course',
          ar: { title: `لديك وصول · ${pack.title}`, body: 'منحتك مؤسستك مقعدًا في هذه الدورة' },
          data: { courseId: pack.courseId! },
        });
      }
    } catch (e) {
      await this.repo.dropClaim(claim.id);
      throw e;
    }
    if (!(await this.repo.findMember(pack.organizationId, user.id))) await this.repo.upsertMember(pack.organizationId, user.id, 'LEARNER');
    await this.audit.record({
      actorId: actor.id,
      action: 'SEAT_ASSIGNED',
      entityType: 'SeatPack',
      entityId: packId,
      data: { assignmentId: claim.id, userId: user.id, email: user.email, by: actor.as },
    });
    return (await this.repo.findAssignment(claim.id))!;
  }

  /** Takes a seat back before it was used; it returns to the pack. */
  async revoke(assignmentId: string, actor: Actor) {
    const assignment = await this.repo.findAssignment(assignmentId);
    if (!assignment) throw new NotFoundError('Seat assignment', assignmentId);
    const pack = await this.mustPack(assignment.seatPackId, actor);
    const now = this.clock.now();
    const batch = pack.batchId ? await this.repo.findBatch(pack.batchId) : null;
    const refusal = revokeRefusal({
      assignmentStatus: assignment.status,
      batch,
      completedLessons: batch ? 0 : await this.repo.completedLessons(assignment.userId, pack.courseId!),
      now,
    });
    if (refusal) throw refuse(refusal);

    await this.repo.revokeAssignment(assignmentId, actor.id, now);
    if (batch && assignment.enrollmentId) {
      const enrollment = await this.repo.enrollmentOf(assignment.enrollmentId);
      if (enrollment?.status === 'ACTIVE') await this.lifecycle.move(enrollment, 'CANCELLED');
      // the seat is back in the pack (still held for the organization), so fullness is unchanged; resync anyway
      await this.lifecycle.syncFullness(batch.id);
    } else if (assignment.subscriptionId) {
      await this.repo.endSeatSubscription(assignment.subscriptionId, now);
    }
    await this.audit.record({
      actorId: actor.id,
      action: 'SEAT_REVOKED',
      entityType: 'SeatPack',
      entityId: pack.id,
      data: { assignmentId, userId: assignment.userId, by: actor.as },
    });
    return { ...assignment, status: 'REVOKED' as const, revokedAt: now } satisfies AssignmentRecord;
  }

  /** Job: recorded seats whose pack access has ended. */
  async expireSeats() {
    return { expired: await this.repo.expireSeatSubscriptions(this.clock.now()) };
  }

  // ───────── report ─────────

  /** Per learner: attendance, completion and certificates; plus totals and seat usage per pack. */
  async report(organizationId: string, actor: Actor) {
    this.assertOrg(actor, organizationId);
    const [organization, packs, data] = await Promise.all([this.mustOrg(organizationId), this.repo.packsOf(organizationId), this.repo.reportData(organizationId)]);
    const attended = attendanceByUser(data.joins, data.marks);
    const rows = [
      ...data.live.map((s) => orgReportRow({ kind: 'LIVE', ...s, attendedSessionIds: attended.get(s.learner.id) ?? new Set() })),
      ...data.recorded.map((s) => orgReportRow({ kind: 'RECORDED', ...s, completedLessonIds: new Set(s.completedLessonIds) })),
    ];
    return { organization, summary: orgReportSummary(rows), packs: packs.map(packView), rows };
  }

  async reportCsv(organizationId: string, actor: Actor) {
    const { rows } = await this.report(organizationId, actor);
    await this.audit.record({ actorId: actor.id, action: 'ORGANIZATION_REPORT_EXPORTED', entityType: 'Organization', entityId: organizationId, data: { rows: rows.length, by: actor.as } });
    return orgReportCsv(rows);
  }

  // ───────── helpers ─────────

  private async mustOrg(id: string) {
    const org = await this.repo.findOrganization(id);
    if (!org) throw new NotFoundError('Organization', id);
    return org;
  }

  private assertOrg(actor: Actor, organizationId: string) {
    if (actor.as === 'MANAGER' && actor.organizationId !== organizationId) throw new ForbiddenError('You do not manage this organization');
  }

  private async mustPack(id: string, actor: Actor): Promise<SeatPackRecord> {
    const pack = await this.repo.findPack(id);
    if (!pack || (actor.as === 'MANAGER' && pack.organizationId !== actor.organizationId)) throw new NotFoundError('Seat pack', id);
    return pack;
  }

  private async enrollmentStatus(userId: string, batchId: string): Promise<EnrollmentStatus | null> {
    return (await this.repo.enrollmentFor(userId, batchId))?.status ?? null;
  }

  private async findOrInvite(email: string, name?: string) {
    const found = await this.repo.findUserByEmail(email);
    if (found) return found;
    if (!name) throw new BusinessRuleError('This person has no account yet: add their name to invite them', 'NAME_REQUIRED');
    const { id } = await this.provisioner.createInvited({ name, email: email.toLowerCase(), role: 'STUDENT', locale: 'ar' });
    return { id, name, email: email.toLowerCase() };
  }

  private async newReference() {
    for (let i = 0; i < 5; i++) {
      const ref = seatPackReference();
      if (!(await this.repo.referenceExists(ref))) return ref;
    }
    throw new BusinessRuleError('Could not create a pack reference, try again', 'REFERENCE_TAKEN');
  }
}

/** A pack as the pages show it: seat usage spelled out. */
function packView(p: SeatPackRecord) {
  return { ...p, unused: unusedSeats(p), kind: p.batchId ? ('LIVE' as const) : ('RECORDED' as const) };
}

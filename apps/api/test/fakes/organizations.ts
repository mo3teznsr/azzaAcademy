import type { OrganizationInput, OrganizationRole } from '@azza/shared';
import type { AuditEntry, AuditLog, AuditRecord } from '../../src/modules/audit/audit-log';
import type {
  AssignmentRecord,
  MemberRecord,
  NewSeatPack,
  OrganizationRecord,
  OrganizationRepository,
  PackBatch,
  PackCourse,
  ReportData,
  SeatPackPatch,
  SeatPackRecord,
} from '../../src/modules/organizations/organization.repository';
import { reservedSeats, SEAT_PACK_LIVE } from '../../src/modules/organizations/seat-pack-policy';
import { InMemoryPaymentsRepository } from './in-memory';

type StoredPack = Omit<SeatPackRecord, 'used' | 'title' | 'batchCode'>;

/** Payments fake whose held seats include unassigned seats of live packs, like PrismaPaymentsRepository. */
export class PackAwarePaymentsRepository extends InMemoryPaymentsRepository {
  orgs?: InMemoryOrganizationRepository;
  override async heldSeats(batchId: string, excludeUserId?: string) {
    const enrolled = await super.heldSeats(batchId, excludeUserId);
    const packs = (this.orgs?.packs ?? []).filter((p) => p.batchId === batchId).map((p) => ({ seats: p.seats, used: this.orgs!.usedOf(p.id), status: p.status }));
    return enrolled + reservedSeats(packs);
  }
}

export class InMemoryOrganizationRepository implements OrganizationRepository {
  orgs: OrganizationRecord[] = [];
  members_: MemberRecord[] = [];
  packs: StoredPack[] = [];
  assigned: AssignmentRecord[] = [];
  batches = new Map<string, PackBatch>();
  courses = new Map<string, PackCourse>();
  subscriptions: { id: string; userId: string; courseId: string; status: string; currentPeriodEnd: Date; provider: string }[] = [];
  lessonsDone = new Map<string, number>();
  report: ReportData = { live: [], recorded: [], joins: [], marks: [] };
  private seq = 0;

  constructor(
    private readonly payments: InMemoryPaymentsRepository,
    private readonly now: () => Date,
  ) {}

  private id(prefix: string) {
    return `${prefix}_${++this.seq}`;
  }

  usedOf(packId: string) {
    return this.assigned.filter((a) => a.seatPackId === packId && a.status === 'ACTIVE').length;
  }

  private view(p: StoredPack): SeatPackRecord {
    const batch = p.batchId ? this.batches.get(p.batchId) : null;
    return {
      ...p,
      used: this.usedOf(p.id),
      title: batch ? `${batch.courseTitle} · ${batch.code}` : (this.courses.get(p.courseId!)?.titleEn ?? ''),
      batchCode: batch?.code ?? null,
    };
  }

  async createOrganization(input: OrganizationInput) {
    const org = { ...input, id: this.id('org'), createdAt: this.now() };
    this.orgs.push(org);
    return org;
  }
  async updateOrganization(id: string, input: OrganizationInput) {
    const org = this.orgs.find((o) => o.id === id)!;
    Object.assign(org, input);
    return org;
  }
  async findOrganization(id: string) {
    return this.orgs.find((o) => o.id === id) ?? null;
  }
  async listOrganizations() {
    return { items: this.orgs.map((o) => ({ ...o, members: 0, packs: 0 })), total: this.orgs.length };
  }

  async findUserByEmail(email: string) {
    const u = [...this.payments.users.values()].find((x) => x.email === email.toLowerCase());
    return u ? { id: u.id, name: u.name, email: u.email } : null;
  }
  async members(organizationId: string) {
    return this.members_.filter((m) => m.organizationId === organizationId);
  }
  async findMember(organizationId: string, userId: string) {
    return this.members_.find((m) => m.organizationId === organizationId && m.userId === userId) ?? null;
  }
  async upsertMember(organizationId: string, userId: string, role: OrganizationRole) {
    const found = await this.findMember(organizationId, userId);
    if (found) {
      found.role = role;
      return found;
    }
    const u = this.payments.users.get(userId)!;
    const m = { id: this.id('mem'), organizationId, userId, role, user: { id: u.id, name: u.name, email: u.email }, createdAt: this.now() };
    this.members_.push(m);
    return m;
  }
  async removeMember(organizationId: string, userId: string) {
    this.members_ = this.members_.filter((m) => !(m.organizationId === organizationId && m.userId === userId));
  }
  async managedBy(userId: string) {
    const ids = this.members_.filter((m) => m.userId === userId && m.role === 'MANAGER').map((m) => m.organizationId);
    return this.orgs.filter((o) => ids.includes(o.id));
  }

  async findBatch(batchId: string) {
    return this.batches.get(batchId) ?? null;
  }
  async findCourse(courseId: string) {
    return this.courses.get(courseId) ?? null;
  }

  async referenceExists(reference: string) {
    return this.packs.some((p) => p.reference === reference);
  }
  async createPack(data: NewSeatPack) {
    const p: StoredPack = { ...data, id: this.id('pack'), refundedFils: 0, cancelledAt: null, createdAt: this.now() };
    this.packs.push(p);
    return this.view(p);
  }
  async findPack(id: string) {
    const p = this.packs.find((x) => x.id === id);
    return p ? this.view(p) : null;
  }
  async packsOf(organizationId: string) {
    return this.packs.filter((p) => p.organizationId === organizationId).map((p) => this.view(p));
  }
  async updatePack(id: string, patch: SeatPackPatch) {
    const p = this.packs.find((x) => x.id === id)!;
    Object.assign(p, patch);
    return this.view(p);
  }

  async assignments(seatPackId: string) {
    return this.assigned.filter((a) => a.seatPackId === seatPackId);
  }
  async findAssignment(id: string) {
    return this.assigned.find((a) => a.id === id) ?? null;
  }
  async findActiveAssignment(seatPackId: string, userId: string) {
    return this.assigned.find((a) => a.seatPackId === seatPackId && a.userId === userId && a.status === 'ACTIVE') ?? null;
  }
  async claimSeat(seatPackId: string, userId: string) {
    const p = this.packs.find((x) => x.id === seatPackId);
    if (!p || !SEAT_PACK_LIVE.includes(p.status) || this.usedOf(seatPackId) >= p.seats) return null;
    const u = this.payments.users.get(userId)!;
    const a: AssignmentRecord = {
      id: this.id('seat'),
      seatPackId,
      userId,
      user: { id: u.id, name: u.name, email: u.email },
      enrollmentId: null,
      subscriptionId: null,
      status: 'ACTIVE',
      assignedAt: this.now(),
      revokedAt: null,
    };
    this.assigned.push(a);
    return a;
  }
  async dropClaim(assignmentId: string) {
    this.assigned = this.assigned.filter((a) => a.id !== assignmentId);
  }
  async linkAssignment(id: string, link: { enrollmentId?: string; subscriptionId?: string }) {
    Object.assign(this.assigned.find((a) => a.id === id)!, link);
  }
  async revokeAssignment(id: string, _by: string | null, at: Date) {
    Object.assign(this.assigned.find((a) => a.id === id)!, { status: 'REVOKED', revokedAt: at });
  }

  async hasLivePlan(userId: string, courseId: string, now: Date) {
    return this.subscriptions.some((s) => s.userId === userId && s.courseId === courseId && s.status === 'ACTIVE' && s.currentPeriodEnd > now);
  }
  async createSeatSubscription(userId: string, courseId: string, endsAt: Date) {
    const id = this.id('sub');
    this.subscriptions.push({ id, userId, courseId, status: 'ACTIVE', currentPeriodEnd: endsAt, provider: 'ORGANIZATION' });
    return id;
  }
  async endSeatSubscription(subscriptionId: string, at: Date) {
    Object.assign(this.subscriptions.find((s) => s.id === subscriptionId)!, { status: 'EXPIRED', currentPeriodEnd: at });
  }
  async expireSeatSubscriptions(now: Date) {
    const due = this.subscriptions.filter((s) => s.provider === 'ORGANIZATION' && s.status === 'ACTIVE' && s.currentPeriodEnd <= now);
    for (const s of due) s.status = 'EXPIRED';
    return due.length;
  }
  async completedLessons(userId: string, courseId: string) {
    return this.lessonsDone.get(`${userId}:${courseId}`) ?? 0;
  }
  async enrollmentOf(enrollmentId: string) {
    return this.payments.findEnrollmentById(enrollmentId);
  }
  async enrollmentFor(userId: string, batchId: string) {
    return this.payments.findEnrollment(userId, batchId);
  }
  async reportData() {
    return this.report;
  }
}

export class RecordingAuditLog implements AuditLog {
  entries: AuditEntry[] = [];
  async record(entry: AuditEntry) {
    this.entries.push(entry);
  }
  async forEntity(entityType: string, entityId: string): Promise<AuditRecord[]> {
    return this.entries
      .filter((e) => e.entityType === entityType && e.entityId === entityId)
      .map((e, i) => ({ ...e, id: String(i), createdAt: new Date(0), actorName: null }));
  }
  actions() {
    return this.entries.map((e) => e.action);
  }
}

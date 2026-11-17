import { beforeEach, describe, expect, test } from 'bun:test';
import { FixedClock } from '../src/infrastructure/clock';
import { organizationBuyer, seatPackDescription } from '../src/modules/invoices/tax-document-math';
import { orgReportCsv, orgReportRow, orgReportSummary } from '../src/modules/organizations/org-report';
import { OrganizationService } from '../src/modules/organizations/organization.service';
import {
  assignRefusal,
  cancellationCreditFils,
  packAmounts,
  packRefusal,
  reservedSeats,
  revokeRefusal,
} from '../src/modules/organizations/seat-pack-policy';
import { EnrollmentLifecycle } from '../src/modules/payments/enrollment-lifecycle';
import { EnrollmentStateMachine } from '../src/modules/payments/enrollment-state';
import { InMemoryOrganizationRepository, PackAwarePaymentsRepository, RecordingAuditLog } from './fakes/organizations';
import { RecordingBroadcaster, RecordingNotifier } from './fakes/in-memory';

const T0 = new Date('2026-11-17T08:00:00Z');
const FIRST_SESSION = new Date('2026-12-01T14:00:00Z');

describe('seat pack rules', () => {
  test('money: seats × unit price, discount capped, 5% VAT on the rest', () => {
    expect(packAmounts(10, 80_000, 50_000, 5)).toEqual({ subtotalFils: 800_000, discountFils: 50_000, vatFils: 37_500, totalFils: 787_500 });
    expect(packAmounts(1, 1_000, 5_000, 5)).toEqual({ subtotalFils: 1_000, discountFils: 1_000, vatFils: 0, totalFils: 0 });
  });

  test('a live pack must fit in what the class has left', () => {
    const batch = { status: 'ENROLLING' as const, capacity: 20 };
    expect(packRefusal(batch, 12, 8)).toBeNull();
    expect(packRefusal(batch, 12, 9)).toBe('CAPACITY_EXCEEDED');
    expect(packRefusal({ ...batch, status: 'COMPLETED' }, 0, 1)).toBe('BATCH_NOT_OPEN');
  });

  test('only unassigned seats of live packs are held', () => {
    expect(reservedSeats([{ seats: 5, used: 2, status: 'PAID' }, { seats: 3, used: 0, status: 'INVOICED' }, { seats: 9, used: 1, status: 'CANCELLED' }])).toBe(6);
  });

  test('over-assigning is refused, as is a second seat or an existing enrollment', () => {
    const base = { packStatus: 'PAID' as const, seats: 2, used: 1, alreadyAssigned: false, batchStatus: 'ENROLLING' as const, existing: null, now: T0 };
    expect(assignRefusal(base)).toBeNull();
    expect(assignRefusal({ ...base, used: 2 })).toBe('NO_SEATS_LEFT');
    expect(assignRefusal({ ...base, alreadyAssigned: true })).toBe('ALREADY_ASSIGNED');
    expect(assignRefusal({ ...base, existing: 'ACTIVE' })).toBe('ALREADY_ENROLLED');
    expect(assignRefusal({ ...base, existing: 'WAITLISTED' })).toBeNull();
    expect(assignRefusal({ ...base, packStatus: 'CANCELLED' })).toBe('PACK_CANCELLED');
    expect(assignRefusal({ ...base, batchStatus: null, accessEndsAt: new Date(T0.getTime() - 1) })).toBe('ACCESS_ENDED');
  });

  test('a seat is taken back only before it is used', () => {
    const batch = { status: 'ENROLLING' as const, firstSessionAt: FIRST_SESSION, startsOn: FIRST_SESSION };
    expect(revokeRefusal({ assignmentStatus: 'ACTIVE', batch, completedLessons: 0, now: T0 })).toBeNull();
    expect(revokeRefusal({ assignmentStatus: 'ACTIVE', batch, completedLessons: 0, now: FIRST_SESSION })).toBe('CLASS_STARTED');
    expect(revokeRefusal({ assignmentStatus: 'ACTIVE', batch: { ...batch, status: 'RUNNING' }, completedLessons: 0, now: T0 })).toBe('CLASS_STARTED');
    expect(revokeRefusal({ assignmentStatus: 'REVOKED', batch, completedLessons: 0, now: T0 })).toBe('NOT_ACTIVE');
    expect(revokeRefusal({ assignmentStatus: 'ACTIVE', batch: null, completedLessons: 1, now: T0 })).toBe('LEARNING_STARTED');
  });

  test('cancelling credits the unused seats only', () => {
    expect(cancellationCreditFils({ seats: 10, used: 0, totalFils: 840_000, refundedFils: 0 })).toBe(840_000);
    expect(cancellationCreditFils({ seats: 10, used: 4, totalFils: 840_000, refundedFils: 0 })).toBe(504_000);
    expect(cancellationCreditFils({ seats: 10, used: 10, totalFils: 840_000, refundedFils: 0 })).toBe(0);
  });
});

describe('seat pack invoice buyer', () => {
  test('the organization is the buyer, with its TRN and address when registered', () => {
    expect(organizationBuyer({ legalName: 'Gulf Schools LLC', billingEmail: 'ap@gulf.ae', trn: '100123456700003', address: 'Dubai' })).toEqual({
      name: 'Gulf Schools LLC',
      email: 'ap@gulf.ae',
      trn: '100123456700003',
      address: 'Dubai',
    });
    expect(organizationBuyer({ legalName: 'Small Co', billingEmail: 'x@y.ae', trn: null, address: null })).toEqual({ name: 'Small Co', email: 'x@y.ae' });
  });

  test('the invoice line names the seats and the class', () => {
    expect(seatPackDescription({ seats: 12, courseTitle: 'Spoken Arabic', batchCode: 'B3' })).toBe('12 seats · Spoken Arabic · class B3 (live class seats)');
    expect(seatPackDescription({ seats: 1, courseTitle: 'Excel', batchCode: null })).toBe('1 seat · Excel (recorded course access)');
  });
});

describe('organization report math', () => {
  const learner = { id: 'u1', name: 'Sara', email: 'sara@co.ae' };
  const sessions = [
    { id: 's1', status: 'ENDED' as const },
    { id: 's2', status: 'ENDED' as const },
    { id: 's3', status: 'ENDED' as const },
    { id: 's4', status: 'SCHEDULED' as const },
    { id: 's5', status: 'CANCELLED' as const },
  ];

  test('live: attendance over ended sessions; not completed while the class runs', () => {
    const row = orgReportRow({ kind: 'LIVE', learner, packReference: 'CORP-1', title: 'Arabic', code: 'B1', batchStatus: 'RUNNING', sessions, attendedSessionIds: new Set(['s1', 's2']), certificateCode: null });
    expect(row).toMatchObject({ done: 2, total: 4, attendanceRate: 0.6667, finished: false, completed: false });
  });

  test('live: a finished class with 80% attendance is completed', () => {
    const ended = sessions.map((s) => (s.status === 'SCHEDULED' ? { ...s, status: 'ENDED' as const } : s));
    const row = orgReportRow({ kind: 'LIVE', learner, packReference: 'CORP-1', title: 'Arabic', code: 'B1', batchStatus: 'COMPLETED', sessions: ended, attendedSessionIds: new Set(['s1', 's2', 's4', 's3']), certificateCode: 'AZ-1' });
    expect(row).toMatchObject({ done: 4, total: 4, attendanceRate: 1, finished: true, completed: true, certificateCode: 'AZ-1' });
  });

  test('recorded: lessons done over lessons', () => {
    const row = orgReportRow({ kind: 'RECORDED', learner, packReference: 'CORP-2', title: 'Excel', lessonIds: ['l1', 'l2', 'l3', 'l4'], completedLessonIds: new Set(['l1']), certificateCode: null });
    expect(row).toMatchObject({ done: 1, total: 4, progressRate: 0.25, attendanceRate: null, finished: false, completed: false });
  });

  test('summary: mean attendance, completion over judged seats, certificates', () => {
    const a = orgReportRow({ kind: 'LIVE', learner, packReference: 'P', title: 'T', code: 'B', batchStatus: 'COMPLETED', sessions: sessions.slice(0, 3), attendedSessionIds: new Set(['s1', 's2', 's3']), certificateCode: 'C1' });
    const b = orgReportRow({ kind: 'LIVE', learner: { ...learner, id: 'u2' }, packReference: 'P', title: 'T', code: 'B', batchStatus: 'COMPLETED', sessions: sessions.slice(0, 3), attendedSessionIds: new Set(['s1']), certificateCode: null });
    const c = orgReportRow({ kind: 'LIVE', learner: { ...learner, id: 'u3' }, packReference: 'P', title: 'T', code: 'B', batchStatus: 'RUNNING', sessions, attendedSessionIds: new Set(), certificateCode: null });
    const s = orgReportSummary([a, b, c]);
    expect(s.learners).toBe(3);
    expect(s.attendanceRate).toBe(0.4444); // (1 + 1/3 + 0) / 3
    expect(s.completionRate).toBe(0.5); // c is still running
    expect(s.certificates).toBe(1);
  });

  test('CSV has a BOM and neutralises formulas', () => {
    const row = orgReportRow({ kind: 'RECORDED', learner: { ...learner, name: '=HYPERLINK("x")' }, packReference: 'P', title: 'T', lessonIds: ['l1'], completedLessonIds: new Set(['l1']), certificateCode: null });
    const csv = orgReportCsv([row]);
    expect(csv.startsWith('﻿name,email')).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain(',100.0,,yes,yes,');
  });
});

describe('seat accounting through the service', () => {
  let clock: FixedClock;
  let payments: PackAwarePaymentsRepository;
  let orgs: InMemoryOrganizationRepository;
  let audit: RecordingAuditLog;
  let notifier: RecordingNotifier;
  let service: OrganizationService;
  const admin = { id: 'admin', as: 'ADMIN' as const };

  beforeEach(async () => {
    clock = new FixedClock(T0);
    payments = new PackAwarePaymentsRepository(() => clock.now());
    orgs = new InMemoryOrganizationRepository(payments, () => clock.now());
    payments.orgs = orgs;
    for (const u of ['sara', 'omar', 'maya', 'manager', 'admin']) payments.addUser(u);
    const batch = { id: 'b1', code: 'B1', status: 'ENROLLING' as const, capacity: 4, courseTitle: 'Arabic', firstSessionAt: FIRST_SESSION };
    payments.batches.set('b1', { ...batch, waitlistEnabled: true, priceFils: 80_000, timezone: 'Asia/Dubai', teacherId: 't', courseId: 'c1' });
    orgs.batches.set('b1', { ...batch, startsOn: FIRST_SESSION });
    orgs.courses.set('rec', { id: 'rec', titleEn: 'Excel', titleAr: null, type: 'RECORDED' });
    audit = new RecordingAuditLog();
    notifier = new RecordingNotifier();
    const lifecycle = new EnrollmentLifecycle(payments, new EnrollmentStateMachine(), notifier, new RecordingBroadcaster(), clock, 'http://web.test');
    const provisioner = {
      createInvited: async (u: { name: string; email: string }) => {
        payments.users.set('invited', { id: 'invited', name: u.name, email: u.email, locale: 'ar', timezone: 'Asia/Dubai' });
        return { id: 'invited' };
      },
    };
    service = new OrganizationService(orgs, payments, lifecycle, provisioner, audit, notifier, clock, async () => 5);
    await service.create({ name: 'Gulf', legalName: 'Gulf LLC', trn: '100123456700003', address: null, contactName: 'M', contactEmail: 'm@g.ae', contactPhone: null, billingEmail: 'ap@g.ae' }, 'admin');
  });

  const orgId = () => orgs.orgs[0]!.id;
  const livePack = (seats: number) => service.createPack(orgId(), { batchId: 'b1', seats, unitPriceFils: 80_000, discountFils: 0, paid: false }, 'admin');

  test('a pack holds its seats in the class; more than capacity is refused', async () => {
    const pack = await livePack(3);
    expect(pack).toMatchObject({ status: 'INVOICED', totalFils: 252_000, unused: 3 });
    expect(await payments.heldSeats('b1')).toBe(3);
    await expect(livePack(2)).rejects.toMatchObject({ code: 'CAPACITY_EXCEEDED' });
  });

  test('a pack that fills the class marks it FULL', async () => {
    await livePack(4);
    expect(payments.batches.get('b1')!.status).toBe('FULL');
  });

  test('assigning enrolls the learner without an order; held seats do not change', async () => {
    const pack = await livePack(2);
    const seat = await service.assign(pack.id, { email: 'sara@test' }, admin);
    expect(seat.enrollmentId).toBeTruthy();
    expect(payments.enrollments.find((e) => e.userId === 'sara')!.status).toBe('ACTIVE');
    expect(payments.orders).toHaveLength(0);
    expect(await payments.heldSeats('b1')).toBe(2);
    expect(notifier.types()).toContain('ENROLLED');
    expect(audit.actions()).toContain('SEAT_ASSIGNED');
  });

  test('over-assigning is refused', async () => {
    const pack = await livePack(1);
    await service.assign(pack.id, { email: 'sara@test' }, admin);
    await expect(service.assign(pack.id, { email: 'omar@test' }, admin)).rejects.toMatchObject({ code: 'NO_SEATS_LEFT' });
    await expect(service.assign(pack.id, { email: 'sara@test' }, admin)).rejects.toMatchObject({ code: 'ALREADY_ASSIGNED' });
  });

  test('a learner without an account is invited when a name is given', async () => {
    const pack = await livePack(1);
    await expect(service.assign(pack.id, { email: 'new@co.ae' }, admin)).rejects.toMatchObject({ code: 'NAME_REQUIRED' });
    const seat = await service.assign(pack.id, { email: 'new@co.ae', name: 'New Person' }, admin);
    expect(seat.userId).toBe('invited');
    expect((await orgs.findMember(orgId(), 'invited'))?.role).toBe('LEARNER');
  });

  test('revoking before the class returns the seat to the pack', async () => {
    const pack = await livePack(1);
    const seat = await service.assign(pack.id, { email: 'sara@test' }, admin);
    await service.revoke(seat.id, admin);
    expect(payments.enrollments.find((e) => e.userId === 'sara')!.status).toBe('CANCELLED');
    expect((await orgs.findPack(pack.id))!.used).toBe(0);
    expect(await payments.heldSeats('b1')).toBe(1);
    await service.assign(pack.id, { email: 'omar@test' }, admin);
    expect(audit.actions()).toContain('SEAT_REVOKED');
  });

  test('revoking after the first session is refused', async () => {
    const pack = await livePack(1);
    const seat = await service.assign(pack.id, { email: 'sara@test' }, admin);
    clock.set(FIRST_SESSION);
    await expect(service.revoke(seat.id, admin)).rejects.toMatchObject({ code: 'CLASS_STARTED' });
  });

  test('cancelling releases unused seats and credits them', async () => {
    const pack = await livePack(4);
    await service.assign(pack.id, { email: 'sara@test' }, admin);
    const cancelled = await service.cancelPack(pack.id, 'admin');
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.refundedFils).toBe(Math.floor((pack.totalFils * 3) / 4));
    expect(await payments.heldSeats('b1')).toBe(1);
    expect(payments.batches.get('b1')!.status).toBe('ENROLLING');
  });

  test('managers act only inside their organization', async () => {
    const pack = await livePack(1);
    await expect(service.managerActor('manager', orgId())).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await service.addMember(orgId(), { email: 'manager@test', role: 'MANAGER' }, 'admin');
    const actor = await service.managerActor('manager', orgId());
    await service.assign(pack.id, { email: 'maya@test' }, actor);
    const other = { id: 'manager', as: 'MANAGER' as const, organizationId: 'elsewhere' };
    await expect(service.assign(pack.id, { email: 'omar@test' }, other)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('recorded packs give an organization plan that ends with the pack', async () => {
    const ends = new Date('2027-11-17T00:00:00Z');
    const pack = await service.createPack(orgId(), { courseId: 'rec', seats: 2, unitPriceFils: 50_000, discountFils: 0, paid: true, paymentReference: 'TT-1', accessEndsAt: ends }, 'admin');
    expect(pack.status).toBe('PAID');
    const seat = await service.assign(pack.id, { email: 'sara@test' }, admin);
    expect(orgs.subscriptions[0]).toMatchObject({ id: seat.subscriptionId, provider: 'ORGANIZATION', currentPeriodEnd: ends });
    await expect(service.assign(pack.id, { email: 'sara@test' }, admin)).rejects.toMatchObject({ code: 'ALREADY_ASSIGNED' });
    clock.set(ends);
    expect(await service.expireSeats()).toEqual({ expired: 1 });
  });

  test('every pack action is in the audit log', async () => {
    const pack = await livePack(2);
    await service.markPaid(pack.id, 'TT-9', 'admin');
    await service.cancelPack(pack.id, 'admin');
    expect(audit.actions()).toEqual(['ORGANIZATION_CREATED', 'SEAT_PACK_CREATED', 'SEAT_PACK_PAID', 'SEAT_PACK_CANCELLED']);
  });
});

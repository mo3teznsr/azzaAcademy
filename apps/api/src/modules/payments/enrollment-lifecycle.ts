import { SOCKET_EVENTS, type EnrollmentStatus, type OrderUpdatedEvent } from '@azza/shared';
import type { Clock, RealtimeBroadcaster } from '../../core/ports';
import { formatInZone } from '../../core/time';
import { appEmails } from '../notifications/email-templates';
import type { Notifier } from '../notifications/notification.types';
import type { EnrollmentStateMachine } from './enrollment-state';
import type { EnrollmentRecord, OrderRecord, PaymentsRepository } from './payments.repository';

/**
 * Enrollment status changes plus their side effects (seat accounting, waitlist, emails).
 * Shared by checkout, the Stripe webhook, transfer review, refunds and the expiry job.
 */
export class EnrollmentLifecycle {
  constructor(
    private readonly repo: PaymentsRepository,
    private readonly machine: EnrollmentStateMachine,
    private readonly notifier: Notifier,
    private readonly realtime: RealtimeBroadcaster,
    private readonly clock: Clock,
    private readonly webUrl: string,
  ) {}

  async move(enrollment: EnrollmentRecord, to: EnrollmentStatus): Promise<EnrollmentRecord> {
    if (enrollment.status === to) return enrollment;
    this.machine.assert(enrollment.status, to);
    return this.repo.setEnrollmentStatus(enrollment.id, to);
  }

  async activate(enrollmentId: string) {
    const enrollment = await this.repo.findEnrollmentById(enrollmentId);
    if (!enrollment) return null;
    const active = await this.move(enrollment, 'ACTIVE');
    const batch = await this.repo.findBatchForSale(enrollment.batchId);
    if (batch) {
      await this.syncFullness(batch.id);
      await this.notifier.notify([enrollment.userId], {
        type: 'ENROLLED',
        title: `You’re enrolled · ${batch.courseTitle} ${batch.code}`,
        body: batch.firstSessionAt ? `First session ${formatInZone(batch.firstSessionAt, batch.timezone)}` : 'See your schedule',
        data: { batchId: batch.id, enrollmentId },
        email: (r) =>
          appEmails.enrolled(
            r.name,
            batch.courseTitle,
            batch.code,
            batch.firstSessionAt ? formatInZone(batch.firstSessionAt, r.timezone, r.locale) : 'to be announced',
            `${this.webUrl}/schedule`,
          ),
      });
    }
    return active;
  }

  /** A seat may have been freed: update FULL/ENROLLING and offer seats to the waitlist. */
  async release(batchId: string) {
    await this.promoteWaitlist(batchId);
    await this.syncFullness(batchId);
  }

  async promoteWaitlist(batchId: string) {
    const batch = await this.repo.findBatchForSale(batchId);
    if (!batch || !['ENROLLING', 'FULL', 'RUNNING'].includes(batch.status)) return [];
    const promoted: EnrollmentRecord[] = [];
    while ((await this.repo.heldSeats(batchId)) < batch.capacity) {
      const next = await this.repo.firstWaitlisted(batchId);
      if (!next) break;
      promoted.push(await this.move(next, 'PENDING_PAYMENT'));
      await this.notifier.notify([next.userId], {
        type: 'WAITLIST_SEAT_OPEN',
        title: `A seat opened · ${batch.courseTitle} ${batch.code}`,
        body: 'Complete checkout within 24 hours to keep it',
        data: { batchId },
        email: (r) => appEmails.seatAvailable(r.name, batch.courseTitle, batch.code, `${this.webUrl}/checkout/${batchId}`),
      });
    }
    return promoted;
  }

  async syncFullness(batchId: string) {
    const batch = await this.repo.findBatchForSale(batchId);
    if (!batch) return;
    const held = await this.repo.heldSeats(batchId);
    if (batch.status === 'ENROLLING' && held >= batch.capacity) await this.repo.setBatchStatus(batchId, 'FULL');
    else if (batch.status === 'FULL' && held < batch.capacity) await this.repo.setBatchStatus(batchId, 'ENROLLING');
  }

  orderUpdated(order: OrderRecord) {
    const event: OrderUpdatedEvent = { orderId: order.id, reference: order.reference, status: order.status };
    this.realtime.toUser(order.userId, SOCKET_EVENTS.ORDER_UPDATED, event);
    this.realtime.toRole('ADMIN', SOCKET_EVENTS.ORDER_UPDATED, event);
  }

  now() {
    return this.clock.now();
  }
}

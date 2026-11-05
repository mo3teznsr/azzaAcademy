import { addHours } from '../../core/time';
import type { Db } from '../../infrastructure/db';
import { PENDING_HOLD_HOURS } from './checkout.service';
import { OPEN_ORDER_STATUSES } from './payments.repository';
import { waitlistPosition } from './waitlist-position';

const batchSelect = {
  id: true,
  code: true,
  status: true,
  startsOn: true,
  course: { select: { id: true, slug: true, titleEn: true, titleAr: true, coverImageUrl: true, introVideoUrl: true } },
} as const;

/** Read model for `GET /me/waitlist`. Writes (join/leave/promote) go through CheckoutService + EnrollmentLifecycle. */
export class WaitlistQueries {
  constructor(private readonly db: Db) {}

  async mine(userId: string) {
    const [mine, holds, seatNotices] = await Promise.all([
      this.db.enrollment.findMany({
        where: { userId, status: 'WAITLISTED' },
        orderBy: { createdAt: 'asc' },
        select: { id: true, createdAt: true, batch: { select: batchSelect } },
      }),
      // A promoted waitlister is PENDING_PAYMENT without an open order; the WAITLIST_SEAT_OPEN notice tells it apart from a failed card.
      this.db.enrollment.findMany({
        where: { userId, status: 'PENDING_PAYMENT', orders: { none: { status: { in: OPEN_ORDER_STATUSES } } } },
        select: { id: true, updatedAt: true, batch: { select: batchSelect } },
      }),
      this.db.notification.findMany({ where: { userId, type: 'WAITLIST_SEAT_OPEN' }, select: { data: true } }),
    ]);
    const queues = mine.length
      ? await this.db.enrollment.findMany({
          where: { batchId: { in: mine.map((e) => e.batch.id) }, status: 'WAITLISTED' },
          select: { id: true, batchId: true, createdAt: true },
        })
      : [];

    const items = mine.map((e) => {
      const place = waitlistPosition(queues.filter((q) => q.batchId === e.batch.id), e.id) ?? { position: 1, total: 1 };
      return {
        enrollmentId: e.id,
        joinedAt: e.createdAt,
        batchId: e.batch.id,
        batchCode: e.batch.code,
        batchStatus: e.batch.status,
        startsOn: e.batch.startsOn,
        course: e.batch.course,
        courseTitle: e.batch.course.titleEn,
        ...place,
      };
    });

    const noticed = new Set(seatNotices.map((n) => (n.data as { batchId?: string } | null)?.batchId));
    const promoted = holds
      .filter((h) => noticed.has(h.batch.id))
      .map((h) => ({
        enrollmentId: h.id,
        batchId: h.batch.id,
        batchCode: h.batch.code,
        batchStatus: h.batch.status,
        startsOn: h.batch.startsOn,
        course: h.batch.course,
        courseTitle: h.batch.course.titleEn,
        promotedAt: h.updatedAt,
        holdExpiresAt: addHours(h.updatedAt, PENDING_HOLD_HOURS),
      }));
    return { items, promoted };
  }
}

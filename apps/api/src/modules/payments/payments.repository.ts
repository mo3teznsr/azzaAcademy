import type { BatchStatus, EnrollmentStatus, OrderStatus, PaymentMethod } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import { SEAT_HOLDING } from './enrollment-state';
import type { CouponState } from './price-calculator';

export interface SaleBatch {
  id: string;
  code: string;
  status: BatchStatus;
  capacity: number;
  waitlistEnabled: boolean;
  priceFils: number | null;
  timezone: string;
  teacherId: string;
  courseId: string;
  courseTitle: string;
  coursePriceFils: number;
  firstSessionAt: Date | null;
}

export interface EnrollmentRecord {
  id: string;
  userId: string;
  batchId: string;
  status: EnrollmentStatus;
  updatedAt: Date;
}

export interface OrderRecord {
  id: string;
  reference: string;
  enrollmentId: string;
  userId: string;
  method: PaymentMethod;
  status: OrderStatus;
  subtotalFils: number;
  discountFils: number;
  vatFils: number;
  totalFils: number;
  receivedFils: number | null;
  refundedFils: number;
  feeFils: number;
  displayCurrency: string;
  fxRate: number;
  couponCode: string | null;
  stripePaymentIntentId: string | null;
  appleProductId: string | null;
  appleAppAccountToken: string | null;
  appleTransactionId: string | null;
  appleOriginalTransactionId: string | null;
  appleEnvironment: string | null;
  bankAccountId: string | null;
  receiptUrl: string | null;
  receiptUploadedAt: Date | null;
  expiresAt: Date | null;
  verifiedById: string | null;
  verifiedAt: Date | null;
  rejectionReason: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

export type NewOrder = Pick<
  OrderRecord,
  | 'reference'
  | 'enrollmentId'
  | 'userId'
  | 'method'
  | 'status'
  | 'subtotalFils'
  | 'discountFils'
  | 'vatFils'
  | 'totalFils'
  | 'displayCurrency'
  | 'fxRate'
  | 'couponCode'
  | 'stripePaymentIntentId'
  | 'appleProductId'
  | 'appleAppAccountToken'
  | 'bankAccountId'
  | 'expiresAt'
>;

export type OrderPatch = Partial<Omit<OrderRecord, 'id' | 'reference' | 'createdAt'>>;

export interface BankAccountRecord {
  id: string;
  bankName: string;
  accountName: string;
  iban: string;
  swift: string;
  branch: string | null;
  instructions: string | null;
  currency: string;
  active: boolean;
  sortOrder: number;
}

export interface UserContact {
  id: string;
  name: string;
  email: string;
  locale: string;
  timezone: string;
}

export interface CouponRecord extends CouponState {
  id: string;
}

/** Orders that still block a new checkout for the same enrollment. */
export const OPEN_ORDER_STATUSES: OrderStatus[] = ['AWAITING_PAYMENT', 'AWAITING_RECEIPT', 'VERIFYING', 'AMOUNT_MISMATCH'];

/** Persistence port for checkout & enrollment lifecycle (faked in unit tests). */
export interface PaymentsRepository {
  findBatchForSale(batchId: string): Promise<SaleBatch | null>;
  heldSeats(batchId: string, excludeUserId?: string): Promise<number>;
  setBatchStatus(batchId: string, status: BatchStatus): Promise<void>;

  findEnrollment(userId: string, batchId: string): Promise<EnrollmentRecord | null>;
  findEnrollmentById(id: string): Promise<EnrollmentRecord | null>;
  saveEnrollment(userId: string, batchId: string, status: EnrollmentStatus): Promise<EnrollmentRecord>;
  setEnrollmentStatus(id: string, status: EnrollmentStatus): Promise<EnrollmentRecord>;
  firstWaitlisted(batchId: string): Promise<EnrollmentRecord | null>;
  /** PENDING_PAYMENT enrollments with no open order, untouched since `before` (waitlist promotions, failed cards). */
  staleHolds(before: Date): Promise<EnrollmentRecord[]>;

  referenceExists(reference: string): Promise<boolean>;
  createOrder(data: NewOrder): Promise<OrderRecord>;
  findOrder(id: string): Promise<OrderRecord | null>;
  findOrderByPaymentIntent(paymentIntentId: string): Promise<OrderRecord | null>;
  findOrderByAppleTransaction(transactionId: string): Promise<OrderRecord | null>;
  findOrderByAppleToken(appAccountToken: string): Promise<OrderRecord | null>;
  /** The student's newest APPLE_IAP order for this product that is not PAID/REFUNDED (fallback when a transaction has no token). */
  latestUnpaidAppleOrder(userId: string, productId: string): Promise<OrderRecord | null>;
  openOrderFor(enrollmentId: string): Promise<OrderRecord | null>;
  updateOrder(id: string, patch: OrderPatch): Promise<OrderRecord>;
  /** AWAITING_PAYMENT / AWAITING_RECEIPT orders whose hold expired. */
  staleOrders(now: Date): Promise<OrderRecord[]>;

  findCoupon(code: string): Promise<CouponRecord | null>;
  /** Paid redemptions plus the student's still-open orders carrying this coupon. */
  couponUsesBy(couponId: string, code: string, userId: string): Promise<number>;
  /** Records the redemption of a PAID order (idempotent per order). */
  redeemCoupon(order: Pick<OrderRecord, 'id' | 'userId' | 'couponCode' | 'discountFils'>): Promise<void>;

  findBankAccount(id: string): Promise<BankAccountRecord | null>;
  firstActiveBankAccount(): Promise<BankAccountRecord | null>;

  findUser(id: string): Promise<UserContact | null>;
}

const toOrder = (o: { fxRate: { toNumber(): number } | number } & Omit<OrderRecord, 'fxRate'>): OrderRecord => ({
  ...o,
  fxRate: typeof o.fxRate === 'number' ? o.fxRate : o.fxRate.toNumber(),
});

const orderFields = {
  id: true,
  reference: true,
  enrollmentId: true,
  userId: true,
  method: true,
  status: true,
  subtotalFils: true,
  discountFils: true,
  vatFils: true,
  totalFils: true,
  receivedFils: true,
  refundedFils: true,
  feeFils: true,
  displayCurrency: true,
  fxRate: true,
  couponCode: true,
  stripePaymentIntentId: true,
  appleProductId: true,
  appleAppAccountToken: true,
  appleTransactionId: true,
  appleOriginalTransactionId: true,
  appleEnvironment: true,
  bankAccountId: true,
  receiptUrl: true,
  receiptUploadedAt: true,
  expiresAt: true,
  verifiedById: true,
  verifiedAt: true,
  rejectionReason: true,
  paidAt: true,
  createdAt: true,
} as const;

const enrollmentFields = { id: true, userId: true, batchId: true, status: true, updatedAt: true } as const;

export class PrismaPaymentsRepository implements PaymentsRepository {
  constructor(private readonly db: Db) {}

  async findBatchForSale(batchId: string): Promise<SaleBatch | null> {
    const b = await this.db.batch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        code: true,
        status: true,
        capacity: true,
        waitlistEnabled: true,
        priceFils: true,
        timezone: true,
        teacherId: true,
        course: { select: { id: true, titleEn: true, priceFils: true } },
        sessions: { where: { status: { not: 'CANCELLED' } }, orderBy: { startsAt: 'asc' }, take: 1, select: { startsAt: true } },
      },
    });
    if (!b) return null;
    const { course, sessions, ...rest } = b;
    return { ...rest, courseId: course.id, courseTitle: course.titleEn, coursePriceFils: course.priceFils, firstSessionAt: sessions[0]?.startsAt ?? null };
  }

  heldSeats(batchId: string, excludeUserId?: string) {
    return this.db.enrollment.count({
      where: { batchId, status: { in: SEAT_HOLDING }, ...(excludeUserId && { userId: { not: excludeUserId } }) },
    });
  }

  async setBatchStatus(batchId: string, status: BatchStatus) {
    await this.db.batch.update({ where: { id: batchId }, data: { status } });
  }

  findEnrollment(userId: string, batchId: string) {
    return this.db.enrollment.findUnique({ where: { userId_batchId: { userId, batchId } }, select: enrollmentFields });
  }

  findEnrollmentById(id: string) {
    return this.db.enrollment.findUnique({ where: { id }, select: enrollmentFields });
  }

  saveEnrollment(userId: string, batchId: string, status: EnrollmentStatus) {
    return this.db.enrollment.upsert({
      where: { userId_batchId: { userId, batchId } },
      create: { userId, batchId, status },
      update: { status },
      select: enrollmentFields,
    });
  }

  setEnrollmentStatus(id: string, status: EnrollmentStatus) {
    return this.db.enrollment.update({ where: { id }, data: { status }, select: enrollmentFields });
  }

  firstWaitlisted(batchId: string) {
    return this.db.enrollment.findFirst({ where: { batchId, status: 'WAITLISTED' }, orderBy: { createdAt: 'asc' }, select: enrollmentFields });
  }

  staleHolds(before: Date) {
    return this.db.enrollment.findMany({
      where: { status: 'PENDING_PAYMENT', updatedAt: { lt: before }, orders: { none: { status: { in: OPEN_ORDER_STATUSES } } } },
      select: enrollmentFields,
    });
  }

  async referenceExists(reference: string) {
    return (await this.db.order.count({ where: { reference } })) > 0;
  }

  async createOrder(data: NewOrder) {
    return toOrder(await this.db.order.create({ data, select: orderFields }));
  }

  async findOrder(id: string) {
    const o = await this.db.order.findUnique({ where: { id }, select: orderFields });
    return o && toOrder(o);
  }

  async findOrderByPaymentIntent(paymentIntentId: string) {
    const o = await this.db.order.findUnique({ where: { stripePaymentIntentId: paymentIntentId }, select: orderFields });
    return o && toOrder(o);
  }

  async findOrderByAppleTransaction(transactionId: string) {
    const o = await this.db.order.findUnique({ where: { appleTransactionId: transactionId }, select: orderFields });
    return o && toOrder(o);
  }

  async findOrderByAppleToken(appAccountToken: string) {
    const o = await this.db.order.findUnique({ where: { appleAppAccountToken: appAccountToken.toLowerCase() }, select: orderFields });
    return o && toOrder(o);
  }

  async latestUnpaidAppleOrder(userId: string, productId: string) {
    const o = await this.db.order.findFirst({
      where: { userId, method: 'APPLE_IAP', appleProductId: productId, status: { notIn: ['PAID', 'REFUNDED'] } },
      orderBy: { createdAt: 'desc' },
      select: orderFields,
    });
    return o && toOrder(o);
  }

  async openOrderFor(enrollmentId: string) {
    const o = await this.db.order.findFirst({
      where: { enrollmentId, status: { in: OPEN_ORDER_STATUSES } },
      orderBy: { createdAt: 'desc' },
      select: orderFields,
    });
    return o && toOrder(o);
  }

  async updateOrder(id: string, patch: OrderPatch) {
    return toOrder(await this.db.order.update({ where: { id }, data: patch, select: orderFields }));
  }

  async staleOrders(now: Date) {
    const rows = await this.db.order.findMany({
      where: { status: { in: ['AWAITING_PAYMENT', 'AWAITING_RECEIPT'] }, expiresAt: { lt: now } },
      select: orderFields,
    });
    return rows.map(toOrder);
  }

  async findCoupon(code: string) {
    return this.db.coupon.findUnique({
      where: { code: code.toUpperCase() },
      select: {
        id: true,
        code: true,
        percentOff: true,
        amountOffFils: true,
        active: true,
        startsOn: true,
        expiresOn: true,
        maxRedemptions: true,
        redemptions: true,
        perUserLimit: true,
        minOrderFils: true,
        courseId: true,
        batchId: true,
      },
    });
  }

  async couponUsesBy(couponId: string, code: string, userId: string) {
    const [paid, open] = await Promise.all([
      this.db.couponRedemption.count({ where: { couponId, userId } }),
      this.db.order.count({ where: { userId, couponCode: code.toUpperCase(), status: { in: OPEN_ORDER_STATUSES } } }),
    ]);
    return paid + open;
  }

  async redeemCoupon(order: Pick<OrderRecord, 'id' | 'userId' | 'couponCode' | 'discountFils'>) {
    if (!order.couponCode) return;
    const coupon = await this.db.coupon.findUnique({ where: { code: order.couponCode.toUpperCase() }, select: { id: true } });
    if (!coupon) return;
    if (await this.db.couponRedemption.findUnique({ where: { orderId: order.id }, select: { id: true } })) return;
    await this.db.$transaction([
      this.db.couponRedemption.create({ data: { couponId: coupon.id, userId: order.userId, orderId: order.id, discountFils: order.discountFils } }),
      this.db.coupon.update({ where: { id: coupon.id }, data: { redemptions: { increment: 1 } } }),
    ]);
  }

  findBankAccount(id: string) {
    return this.db.bankAccount.findUnique({ where: { id } });
  }

  firstActiveBankAccount() {
    return this.db.bankAccount.findFirst({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }

  findUser(id: string) {
    return this.db.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, locale: true, timezone: true } });
  }
}

import type { BatchStatus, EnrollmentStatus, Role } from '@azza/shared';
import type { RealtimeBroadcaster } from '../../src/core/ports';
import type { Notice, Notifier } from '../../src/modules/notifications/notification.types';
import { SEAT_HOLDING } from '../../src/modules/payments/enrollment-state';
import {
  OPEN_ORDER_STATUSES,
  type BankAccountRecord,
  type CouponRecord,
  type EnrollmentRecord,
  type NewOrder,
  type OrderPatch,
  type OrderRecord,
  type PaymentsRepository,
  type SaleBatch,
  type UserContact,
} from '../../src/modules/payments/payments.repository';

export class InMemoryPaymentsRepository implements PaymentsRepository {
  batches = new Map<string, SaleBatch>();
  enrollments: (EnrollmentRecord & { createdAt: Date })[] = [];
  orders: OrderRecord[] = [];
  coupons: CouponRecord[] = [];
  bankAccounts: BankAccountRecord[] = [];
  users = new Map<string, UserContact>();
  private seq = 0;
  constructor(private readonly now: () => Date) {}

  private id(prefix: string) {
    return `${prefix}_${++this.seq}`;
  }

  addUser(id: string) {
    this.users.set(id, { id, name: id, email: `${id}@test`, locale: 'en', timezone: 'Asia/Dubai' });
  }

  async findBatchForSale(id: string) {
    return this.batches.get(id) ?? null;
  }
  async heldSeats(batchId: string, excludeUserId?: string) {
    return this.enrollments.filter((e) => e.batchId === batchId && SEAT_HOLDING.includes(e.status) && e.userId !== excludeUserId).length;
  }
  async setBatchStatus(batchId: string, status: BatchStatus) {
    const b = this.batches.get(batchId)!;
    this.batches.set(batchId, { ...b, status });
  }
  async findEnrollment(userId: string, batchId: string) {
    return this.enrollments.find((e) => e.userId === userId && e.batchId === batchId) ?? null;
  }
  async findEnrollmentById(id: string) {
    return this.enrollments.find((e) => e.id === id) ?? null;
  }
  async saveEnrollment(userId: string, batchId: string, status: EnrollmentStatus) {
    const existing = await this.findEnrollment(userId, batchId);
    if (existing) {
      existing.status = status;
      existing.updatedAt = this.now();
      return existing;
    }
    const e = { id: this.id('enr'), userId, batchId, status, updatedAt: this.now(), createdAt: new Date(this.now().getTime() + this.seq) };
    this.enrollments.push(e);
    return e;
  }
  async setEnrollmentStatus(id: string, status: EnrollmentStatus) {
    const e = this.enrollments.find((x) => x.id === id)!;
    e.status = status;
    e.updatedAt = this.now();
    return e;
  }
  async firstWaitlisted(batchId: string) {
    return this.enrollments.filter((e) => e.batchId === batchId && e.status === 'WAITLISTED').sort((a, b) => +a.createdAt - +b.createdAt)[0] ?? null;
  }
  async staleHolds(before: Date) {
    return this.enrollments.filter(
      (e) => e.status === 'PENDING_PAYMENT' && e.updatedAt < before && !this.orders.some((o) => o.enrollmentId === e.id && OPEN_ORDER_STATUSES.includes(o.status)),
    );
  }
  async referenceExists(ref: string) {
    return this.orders.some((o) => o.reference === ref);
  }
  async createOrder(data: NewOrder) {
    const o: OrderRecord = {
      ...data,
      id: this.id('ord'),
      appleTransactionId: null,
      appleOriginalTransactionId: null,
      appleEnvironment: null,
      receivedFils: null,
      refundedFils: 0,
      feeFils: 0,
      receiptUrl: null,
      receiptUploadedAt: null,
      verifiedById: null,
      verifiedAt: null,
      rejectionReason: null,
      paidAt: null,
      createdAt: this.now(),
    };
    this.orders.push(o);
    return o;
  }
  async findOrder(id: string) {
    return this.orders.find((o) => o.id === id) ?? null;
  }
  async findOrderByCheckoutSession(sessionId: string) {
    return this.orders.find((o) => o.stripeCheckoutSessionId === sessionId) ?? null;
  }
  async findOrderByPaymentIntent(pi: string) {
    return this.orders.find((o) => o.stripePaymentIntentId === pi) ?? null;
  }
  async findOrderByAppleTransaction(transactionId: string) {
    return this.orders.find((o) => o.appleTransactionId === transactionId) ?? null;
  }
  async findOrderByAppleToken(token: string) {
    return this.orders.find((o) => o.appleAppAccountToken === token.toLowerCase()) ?? null;
  }
  async latestUnpaidAppleOrder(userId: string, productId: string) {
    return (
      this.orders
        .filter((o) => o.userId === userId && o.method === 'APPLE_IAP' && o.appleProductId === productId && o.status !== 'PAID' && o.status !== 'REFUNDED')
        .at(-1) ?? null
    );
  }
  async openOrderFor(enrollmentId: string) {
    return this.orders.find((o) => o.enrollmentId === enrollmentId && OPEN_ORDER_STATUSES.includes(o.status)) ?? null;
  }
  async updateOrder(id: string, patch: OrderPatch) {
    const o = this.orders.find((x) => x.id === id)!;
    Object.assign(o, patch);
    return o;
  }
  async staleOrders(now: Date) {
    return this.orders.filter((o) => (o.status === 'AWAITING_PAYMENT' || o.status === 'AWAITING_RECEIPT') && o.expiresAt && o.expiresAt < now);
  }
  async findCoupon(code: string) {
    return this.coupons.find((c) => c.code === code.toUpperCase()) ?? null;
  }
  redemptions: Array<{ couponId: string; userId: string; orderId: string; discountFils: number }> = [];
  async couponUsesBy(couponId: string, code: string, userId: string) {
    const paid = this.redemptions.filter((r) => r.couponId === couponId && r.userId === userId).length;
    const open = this.orders.filter((o) => o.userId === userId && o.couponCode === code.toUpperCase() && OPEN_ORDER_STATUSES.includes(o.status)).length;
    return paid + open;
  }
  async redeemCoupon(order: Pick<OrderRecord, 'id' | 'userId' | 'couponCode' | 'discountFils'>) {
    const c = this.coupons.find((x) => x.code === order.couponCode?.toUpperCase());
    if (!c || this.redemptions.some((r) => r.orderId === order.id)) return;
    this.redemptions.push({ couponId: c.id, userId: order.userId, orderId: order.id, discountFils: order.discountFils });
    c.redemptions++;
  }
  async findBankAccount(id: string) {
    return this.bankAccounts.find((b) => b.id === id) ?? null;
  }
  async firstActiveBankAccount() {
    return this.bankAccounts.filter((b) => b.active).sort((a, b) => a.sortOrder - b.sortOrder)[0] ?? null;
  }
  async findUser(id: string) {
    return this.users.get(id) ?? null;
  }
}

export class RecordingNotifier implements Notifier {
  readonly sent: Array<{ userIds: string[]; notice: Notice }> = [];
  async notify(userIds: string[], notice: Notice) {
    this.sent.push({ userIds, notice });
  }
  async notifyRole(role: Role, notice: Notice) {
    this.sent.push({ userIds: [`role:${role}`], notice });
  }
  types() {
    return this.sent.map((s) => s.notice.type);
  }
}

export class RecordingBroadcaster implements RealtimeBroadcaster {
  readonly events: Array<{ to: string; event: string; payload: unknown }> = [];
  toUser(id: string, event: string, payload: unknown) {
    this.events.push({ to: `user:${id}`, event, payload });
  }
  toSession(id: string, event: string, payload: unknown) {
    this.events.push({ to: `session:${id}`, event, payload });
  }
  toRole(role: string, event: string, payload: unknown) {
    this.events.push({ to: `role:${role}`, event, payload });
  }
}

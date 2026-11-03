import { aedToFils, type BankAccountInput, type CouponInput, type Role, type UpdateBankAccountInput, type UpdateCouponInput } from '@azza/shared';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../core/errors';
import type { CouponData, PrismaBankAccountRepository, PrismaCouponRepository } from './catalog-admin.repository';
import { couponStatus } from './coupon-eligibility';

export const maskIban = (iban: string) => `${iban.slice(0, 4)}${'•'.repeat(Math.max(0, iban.length - 8))}${iban.slice(-4)}`;

/** Bank accounts shown at checkout. Non-admins only ever see a masked IBAN in listings. */
export class BankAccountService {
  constructor(private readonly repo: PrismaBankAccountRepository) {}

  async list(viewerRole: Role | null) {
    const admin = viewerRole === 'ADMIN';
    const rows = await this.repo.list(!admin);
    return { items: admin ? rows : rows.map((r) => ({ ...r, iban: maskIban(r.iban) })) };
  }

  create(input: BankAccountInput) {
    return this.repo.create(input);
  }

  async update(id: string, input: UpdateBankAccountInput) {
    if (!(await this.repo.find(id))) throw new NotFoundError('Bank account', id);
    return this.repo.update(id, input);
  }
}

const day = (iso: string | null | undefined) => (iso ? new Date(`${iso}T00:00:00.000Z`) : null);
const fils = (aed: number | null | undefined) => (aed != null ? aedToFils(aed) : null);

/** Cross-field coupon rules the zod schema cannot see on a PATCH (it only knows the changed fields). */
function assertTerms(d: CouponData) {
  if ((d.percentOff == null) === (d.amountOffFils == null)) {
    throw new BusinessRuleError('Give exactly one of percentOff or amountOffAed', 'COUPON_TERMS', { field: 'discount' });
  }
  if (d.courseId && d.batchId) throw new BusinessRuleError('Scope a coupon to a course or a batch, not both', 'COUPON_TERMS', { field: 'scope' });
  if (d.startsOn && d.expiresOn && d.startsOn > d.expiresOn) {
    throw new BusinessRuleError('The start date must be on or before the expiry date', 'COUPON_TERMS', { field: 'dates' });
  }
  if (d.perUserLimit != null && d.maxRedemptions != null && d.perUserLimit > d.maxRedemptions) {
    throw new BusinessRuleError('The per-student limit cannot exceed the total limit', 'COUPON_TERMS', { field: 'perUserLimit' });
  }
}

export class CouponService {
  constructor(
    private readonly repo: PrismaCouponRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private view<T extends Parameters<typeof couponStatus>[0]>(c: T) {
    return { ...c, status: couponStatus(c, this.now()) };
  }

  private async assertScope(d: CouponData) {
    if (d.courseId && !(await this.repo.courseExists(d.courseId))) throw new NotFoundError('Course', d.courseId);
    if (d.batchId && !(await this.repo.batchExists(d.batchId))) throw new NotFoundError('Batch', d.batchId);
  }

  async list() {
    return { items: (await this.repo.list()).map((c) => this.view(c)) };
  }

  async create(input: CouponInput) {
    const code = input.code.toUpperCase();
    const data: CouponData = {
      percentOff: input.percentOff ?? null,
      amountOffFils: fils(input.amountOffAed),
      maxRedemptions: input.maxRedemptions ?? null,
      perUserLimit: input.perUserLimit ?? null,
      minOrderFils: fils(input.minOrderAed),
      startsOn: day(input.startsOn),
      expiresOn: day(input.expiresOn),
      courseId: input.courseId ?? null,
      batchId: input.batchId ?? null,
      stackable: input.stackable,
      active: input.active,
    };
    assertTerms(data);
    await this.assertScope(data);
    if (await this.repo.findByCode(code)) throw new ConflictError(`Coupon ${code} exists`);
    return this.view(await this.repo.create({ ...data, code }));
  }

  /** Partial update; `null` clears. Setting one discount kind / scope clears the other. */
  async update(id: string, input: UpdateCouponInput) {
    const cur = await this.repo.find(id);
    if (!cur) throw new NotFoundError('Coupon', id);
    const has = (k: keyof UpdateCouponInput) => input[k] !== undefined;
    const data: CouponData = {
      percentOff: has('percentOff') ? (input.percentOff ?? null) : has('amountOffAed') && input.amountOffAed != null ? null : cur.percentOff,
      amountOffFils: has('amountOffAed') ? fils(input.amountOffAed) : has('percentOff') && input.percentOff != null ? null : cur.amountOffFils,
      maxRedemptions: has('maxRedemptions') ? (input.maxRedemptions ?? null) : cur.maxRedemptions,
      perUserLimit: has('perUserLimit') ? (input.perUserLimit ?? null) : cur.perUserLimit,
      minOrderFils: has('minOrderAed') ? fils(input.minOrderAed) : cur.minOrderFils,
      startsOn: has('startsOn') ? day(input.startsOn) : cur.startsOn,
      expiresOn: has('expiresOn') ? day(input.expiresOn) : cur.expiresOn,
      courseId: has('courseId') ? (input.courseId ?? null) : has('batchId') && input.batchId != null ? null : cur.courseId,
      batchId: has('batchId') ? (input.batchId ?? null) : has('courseId') && input.courseId != null ? null : cur.batchId,
      stackable: input.stackable ?? cur.stackable,
      active: input.active ?? cur.active,
    };
    assertTerms(data);
    await this.assertScope(data);
    return this.view(await this.repo.update(id, data));
  }

  /** `GET /admin/coupons/:id/usage` — paid orders that redeemed this coupon, newest first. */
  async usage(id: string) {
    const coupon = await this.repo.find(id);
    if (!coupon) throw new NotFoundError('Coupon', id);
    const rows = await this.repo.usage(id);
    return {
      coupon: { id: coupon.id, code: coupon.code, redemptions: coupon.redemptions, maxRedemptions: coupon.maxRedemptions },
      totalDiscountFils: rows.reduce((sum, r) => sum + r.discountFils, 0),
      items: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        discountFils: r.discountFils,
        student: r.user,
        order: { id: r.order.id, reference: r.order.reference, totalFils: r.order.totalFils },
        batch: {
          id: r.order.enrollment.batch.id,
          code: r.order.enrollment.batch.code,
          courseTitleEn: r.order.enrollment.batch.course.titleEn,
          courseTitleAr: r.order.enrollment.batch.course.titleAr,
        },
      })),
    };
  }
}

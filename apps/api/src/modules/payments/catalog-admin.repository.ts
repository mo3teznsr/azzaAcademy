import type { BankAccountInput, UpdateBankAccountInput } from '@azza/shared';
import type { Db } from '../../infrastructure/db';

export class PrismaBankAccountRepository {
  constructor(private readonly db: Db) {}
  list(activeOnly: boolean) {
    return this.db.bankAccount.findMany({ where: activeOnly ? { active: true } : {}, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }
  find(id: string) {
    return this.db.bankAccount.findUnique({ where: { id } });
  }
  create(data: BankAccountInput) {
    return this.db.bankAccount.create({ data });
  }
  update(id: string, data: UpdateBankAccountInput) {
    return this.db.bankAccount.update({ where: { id }, data });
  }
}

export interface CouponData {
  percentOff: number | null;
  amountOffFils: number | null;
  maxRedemptions: number | null;
  perUserLimit: number | null;
  minOrderFils: number | null;
  startsOn: Date | null;
  expiresOn: Date | null;
  courseId: string | null;
  batchId: string | null;
  stackable: boolean;
  active: boolean;
}

const couponScope = {
  course: { select: { id: true, titleEn: true, titleAr: true } },
  batch: { select: { id: true, code: true, course: { select: { id: true, titleEn: true, titleAr: true } } } },
} as const;

export class PrismaCouponRepository {
  constructor(private readonly db: Db) {}
  list() {
    return this.db.coupon.findMany({ orderBy: { createdAt: 'desc' }, include: couponScope });
  }
  find(id: string) {
    return this.db.coupon.findUnique({ where: { id }, include: couponScope });
  }
  findByCode(code: string) {
    return this.db.coupon.findUnique({ where: { code } });
  }
  create(data: CouponData & { code: string }) {
    return this.db.coupon.create({ data, include: couponScope });
  }
  update(id: string, data: CouponData) {
    return this.db.coupon.update({ where: { id }, data, include: couponScope });
  }
  courseExists(id: string) {
    return this.db.course.count({ where: { id } }).then((n) => n > 0);
  }
  batchExists(id: string) {
    return this.db.batch.count({ where: { id } }).then((n) => n > 0);
  }
  usage(couponId: string) {
    return this.db.couponRedemption.findMany({
      where: { couponId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        discountFils: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        order: {
          select: {
            id: true,
            reference: true,
            totalFils: true,
            enrollment: { select: { batch: { select: { id: true, code: true, course: { select: { titleEn: true, titleAr: true } } } } } },
          },
        },
      },
    });
  }
}

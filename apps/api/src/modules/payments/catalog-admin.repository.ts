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

export class PrismaCouponRepository {
  constructor(private readonly db: Db) {}
  list() {
    return this.db.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }
  findByCode(code: string) {
    return this.db.coupon.findUnique({ where: { code } });
  }
  create(data: { code: string; percentOff?: number; amountOffFils?: number; maxRedemptions?: number; expiresOn?: Date }) {
    return this.db.coupon.create({ data });
  }
}

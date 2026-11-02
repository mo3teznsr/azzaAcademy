import { aedToFils, type BankAccountInput, type Role, type UpdateBankAccountInput, type couponInput } from '@azza/shared';
import type { z } from 'zod';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../core/errors';
import type { PrismaBankAccountRepository, PrismaCouponRepository } from './catalog-admin.repository';

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

export class CouponService {
  constructor(private readonly repo: PrismaCouponRepository) {}

  async list() {
    return { items: await this.repo.list() };
  }

  async create(input: z.infer<typeof couponInput>) {
    if (!input.percentOff === !input.amountOffAed) {
      throw new BusinessRuleError('Give exactly one of percentOff or amountOffAed', 'COUPON_TERMS');
    }
    const code = input.code.toUpperCase();
    if (await this.repo.findByCode(code)) throw new ConflictError(`Coupon ${code} exists`);
    return this.repo.create({
      code,
      percentOff: input.percentOff,
      amountOffFils: input.amountOffAed !== undefined ? aedToFils(input.amountOffAed) : undefined,
      maxRedemptions: input.maxRedemptions,
      expiresOn: input.expiresOn ? new Date(`${input.expiresOn}T00:00:00.000Z`) : undefined,
    });
  }
}

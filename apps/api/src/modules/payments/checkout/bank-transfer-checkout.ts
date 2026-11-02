import { formatMoney } from '@azza/shared';
import { BusinessRuleError, NotFoundError } from '../../../core/errors';
import { addHours, formatInZone } from '../../../core/time';
import { appEmails } from '../../notifications/email-templates';
import type { Notifier } from '../../notifications/notification.types';
import type { PaymentsRepository } from '../payments.repository';
import type { CheckoutContext, CheckoutStart, CheckoutStrategy } from './checkout-strategy';

/** Seat is held for BANK_TRANSFER_HOLD_HOURS while the student transfers and uploads a receipt. */
export class BankTransferCheckout implements CheckoutStrategy {
  readonly method = 'BANK_TRANSFER' as const;
  readonly pendingEnrollmentStatus = 'AWAITING_TRANSFER' as const;

  constructor(
    private readonly repo: Pick<PaymentsRepository, 'findBankAccount' | 'firstActiveBankAccount'>,
    private readonly notifier: Notifier,
    private readonly holdHours: number,
  ) {}

  async start(ctx: CheckoutContext): Promise<CheckoutStart> {
    const account = ctx.input.bankAccountId
      ? await this.repo.findBankAccount(ctx.input.bankAccountId)
      : await this.repo.firstActiveBankAccount();
    if (ctx.input.bankAccountId && !account) throw new NotFoundError('Bank account', ctx.input.bankAccountId);
    if (!account || !account.active) throw new BusinessRuleError('No bank account is available for transfers', 'NO_BANK_ACCOUNT');

    const expiresAt = addHours(ctx.now, this.holdHours);
    const amount = formatMoney(ctx.quote.totalFils / 100, 'AED');
    return {
      orderStatus: 'AWAITING_RECEIPT',
      expiresAt,
      bankAccountId: account.id,
      response: { bankAccount: account, reference: ctx.reference, expiresAt },
      onCreated: async (order) => {
        await this.notifier.notify([ctx.user.id], {
          type: 'TRANSFER_INSTRUCTIONS',
          title: `Seat held · ${ctx.batch.courseTitle} ${ctx.batch.code}`,
          body: `Transfer ${amount} with reference ${order.reference} before ${formatInZone(expiresAt, ctx.user.timezone)}`,
          data: { orderId: order.id, reference: order.reference },
          email: (r) =>
            appEmails.transferInstructions(r.name, amount, order.reference, account.bankName, account.iban, formatInZone(expiresAt, r.timezone, r.locale)),
        });
      },
    };
  }
}

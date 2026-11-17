import { ALL_ACCESS_ID, appleAllAccessProductId, type AllAccessPlanInput, type AllAccessPlanView, type AppleProductsInput } from '@azza/shared';
import { BusinessRuleError } from '../../core/errors';
import type { PaymentGateway } from '../../core/ports';
import { ALL_ACCESS_TITLE, type AllAccessPlanRecord } from './all-access-course';
import type { AllAccessPlanRepository } from './all-access.repository';

/**
 * The all-access plan's settings: prices (before VAT, like recorded courses) and an on/off switch, edited by admins.
 * Prices are synced to one Stripe Product with a monthly and a yearly VAT-inclusive Price (`upsertRecordedProduct`):
 * a changed amount gets a new Price, and existing subscribers keep theirs. Switching the plan off stops new purchases
 * only; live plans keep renewing and keep their access. On iOS the plan is sold as the App Store products admins enter
 * (made by hand in App Store Connect, in their own subscription group); without them it is not sold in the iPhone app.
 */
export class AllAccessPlanService {
  constructor(
    private readonly repo: AllAccessPlanRepository,
    private readonly payments: Pick<PaymentGateway, 'upsertRecordedProduct'> | null,
  ) {}

  /** `GET /all-access` — public. */
  async view(): Promise<AllAccessPlanView> {
    const [plan, courseCount] = await Promise.all([this.repo.get(), this.repo.publishedRecordedCount()]);
    const monthly = plan.appleMonthlyProductId ?? null;
    const yearly = plan.appleYearlyProductId ?? null;
    return {
      enabled: plan.enabled,
      monthlyPriceFils: plan.monthlyPriceFils,
      yearlyPriceFils: plan.yearlyPriceFils,
      courseCount,
      appleProducts: monthly || yearly ? { monthly, yearly } : null,
    };
  }

  /** `GET /admin/all-access` — plus whether card checkout is ready (the Stripe Prices exist). */
  async adminView() {
    const plan = await this.repo.get();
    return { ...(await this.view()), cardReady: !!(plan.stripeMonthlyPriceId && plan.stripeYearlyPriceId) };
  }

  /** `PUT /admin/all-access`. */
  async update(input: AllAccessPlanInput) {
    const plan = await this.repo.get();
    const synced = !!(plan.stripeProductId && plan.stripeMonthlyPriceId && plan.stripeYearlyPriceId);
    const unchanged = plan.monthlyPriceFils === input.monthlyPriceFils && plan.yearlyPriceFils === input.yearlyPriceFils;
    const stripe = input.monthlyPriceFils != null && input.yearlyPriceFils != null && !(synced && unchanged) ? await this.sync(plan, input.monthlyPriceFils, input.yearlyPriceFils) : null;
    await this.repo.save({ enabled: input.enabled, monthlyPriceFils: input.monthlyPriceFils, yearlyPriceFils: input.yearlyPriceFils, ...stripe });
    return this.adminView();
  }

  /**
   * `PUT /admin/all-access/apple-products` — like a recorded course's: each id must be `appleAllAccessProductId(plan)`
   * (so App Store notifications reach the plan flow); null clears it, a missing key leaves it as it is.
   */
  async setAppleProducts(input: AppleProductsInput) {
    const patch: Partial<AllAccessPlanRecord> = {};
    for (const [plan, key, value] of [
      ['MONTHLY', 'appleMonthlyProductId', input.monthly],
      ['YEARLY', 'appleYearlyProductId', input.yearly],
    ] as const) {
      if (value === undefined) continue;
      if (value !== null && value !== appleAllAccessProductId(plan)) {
        throw new BusinessRuleError(`Expected ${appleAllAccessProductId(plan)}`, 'APPLE_PRODUCT_MISMATCH');
      }
      patch[key] = value;
    }
    if (Object.keys(patch).length) await this.repo.save(patch);
    return this.adminView();
  }

  /** After a VAT change (Stripe Prices are VAT-inclusive): new Prices for the new inclusive amounts. */
  async resyncStripePrices() {
    const plan = await this.repo.get();
    if (!this.payments || plan.monthlyPriceFils == null || plan.yearlyPriceFils == null) return { synced: false };
    await this.repo.save(await this.sync(plan, plan.monthlyPriceFils, plan.yearlyPriceFils));
    return { synced: true };
  }

  private async sync(plan: AllAccessPlanRecord, monthlyFils: number, yearlyFils: number): Promise<Partial<AllAccessPlanRecord>> {
    if (!this.payments) return {};
    const r = await this.payments.upsertRecordedProduct({
      productId: plan.stripeProductId ?? undefined,
      name: ALL_ACCESS_TITLE.en,
      courseId: ALL_ACCESS_ID,
      monthlyFils,
      yearlyFils,
      currentMonthlyPriceId: plan.stripeMonthlyPriceId ?? undefined,
      currentYearlyPriceId: plan.stripeYearlyPriceId ?? undefined,
    });
    return { stripeProductId: r.productId, stripeMonthlyPriceId: r.monthlyPriceId, stripeYearlyPriceId: r.yearlyPriceId };
  }
}

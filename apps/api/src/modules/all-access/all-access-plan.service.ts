import { ALL_ACCESS_ID, type AllAccessPlanInput, type AllAccessPlanView } from '@azza/shared';
import type { PaymentGateway } from '../../core/ports';
import { ALL_ACCESS_TITLE, type AllAccessPlanRecord } from './all-access-course';
import type { AllAccessPlanRepository } from './all-access.repository';

/**
 * The all-access plan's settings: prices (before VAT, like recorded courses) and an on/off switch, edited by admins.
 * Prices are synced to one Stripe Product with a monthly and a yearly VAT-inclusive Price (`upsertRecordedProduct`):
 * a changed amount gets a new Price, and existing subscribers keep theirs. Switching the plan off stops new purchases
 * only; live plans keep renewing and keep their access. There are no App Store products: the plan is not sold on iOS.
 */
export class AllAccessPlanService {
  constructor(
    private readonly repo: AllAccessPlanRepository,
    private readonly payments: Pick<PaymentGateway, 'upsertRecordedProduct'> | null,
  ) {}

  /** `GET /all-access` — public. */
  async view(): Promise<AllAccessPlanView> {
    const [plan, courseCount] = await Promise.all([this.repo.get(), this.repo.publishedRecordedCount()]);
    return { enabled: plan.enabled, monthlyPriceFils: plan.monthlyPriceFils, yearlyPriceFils: plan.yearlyPriceFils, courseCount };
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

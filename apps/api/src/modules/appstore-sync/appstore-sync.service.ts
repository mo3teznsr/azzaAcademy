import { appleRecordedProductId, appleSeatProductId } from '@azza/shared';
import type { PriceCalculator } from '../payments/price-calculator';
import type { AppStoreCatalog, LocalizationInput, PricePoint } from './appstore-sync.port';

export type SyncStatus = 'SYNCED' | 'SKIPPED' | 'FAILED';
export interface SyncResult {
  status: SyncStatus;
  detail: string;
}
export interface RecordedSyncResult extends SyncResult {
  monthly: string | null;
  yearly: string | null;
}

export interface RecordedCourseInput {
  slug: string;
  titleEn: string;
  titleAr?: string | null;
  /** Pre-VAT prices in fils. */
  monthlyPriceFils: number;
  yearlyPriceFils: number;
}

/** Picks the price point closest to the target (fils); ties go to the lower price. */
export function nearestPricePoint(points: PricePoint[], targetFils: number): PricePoint | null {
  let best: PricePoint | null = null;
  let bestDiff = Infinity;
  for (const p of points) {
    const diff = Math.abs(Math.round(p.customerPrice * 100) - targetFils);
    if (diff < bestDiff || (diff === bestDiff && best && p.customerPrice < best.customerPrice)) {
      best = p;
      bestDiff = diff;
    }
  }
  return best;
}

const SEAT_REVIEW_NOTE = 'Consumable class seat. One purchase books one place in a live class.';
const MAX_SUB_DESCRIPTION = 45;
/** Display-name limit for subscription and IAP localizations (App Store Connect help: 30; not stated in the API reference). */
export const MAX_DISPLAY_NAME = 30;

/** `<title> · <suffix>` within `max` characters: the title is cut with an ellipsis, the suffix stays intact. */
export function fitDisplayName(title: string, suffix: string, max = MAX_DISPLAY_NAME): string {
  const tail = ` · ${suffix}`;
  const chars = [...title.trim()];
  const room = max - [...tail].length;
  // A suffix that leaves no room for the title: keep what fits of the suffix alone.
  if (room < 1) return [...tail.trim()].slice(0, max).join('');
  if (chars.length <= room) return chars.join('') + tail;
  return chars.slice(0, Math.max(0, room - 1)).join('').trimEnd() + '…' + tail;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export class AppStoreSyncService {
  constructor(
    private readonly catalog: AppStoreCatalog,
    private readonly prices: PriceCalculator,
  ) {}

  async syncSeatPrice(priceFils: number): Promise<SyncResult> {
    const productId = appleSeatProductId(priceFils);
    if (!productId) return { status: 'SKIPPED', detail: `price ${priceFils} fils is not a whole number of dirhams` };
    try {
      let iap = await this.catalog.findIapByProductId(productId);
      let created = false;
      if (!iap) {
        const { id } = await this.catalog.createConsumable({
          productId,
          name: `Class seat AED ${priceFils / 100}`,
          reviewNote: SEAT_REVIEW_NOTE,
        });
        iap = { id, state: null };
        created = true;
      }
      await this.catalog.setIapLocalizations(iap.id, [
        { locale: 'en-US', name: 'Class seat', description: 'One place in a live class' },
        { locale: 'ar-SA', name: 'مقعد في صفّ', description: 'مكان واحد في صفّ مباشر' },
      ]);
      const target = this.prices.inclusive(priceFils);
      const point = nearestPricePoint(await this.catalog.uaePricePoints(iap.id, 'iap'), target);
      if (!point) return { status: 'FAILED', detail: `no ARE price points for ${productId}` };
      const current = created ? null : await this.catalog.currentIapPrice(iap.id);
      if (current !== point.id) await this.catalog.setIapPrice(iap.id, point.id);
      return {
        status: 'SYNCED',
        detail: `${created ? 'created' : 'found'} ${productId}; price AED ${point.customerPrice} (target ${target / 100})${current === point.id ? ' unchanged' : ''}`,
      };
    } catch (e) {
      return { status: 'FAILED', detail: message(e) };
    }
  }

  async syncRecordedCourse(course: RecordedCourseInput): Promise<RecordedSyncResult> {
    if (!course.slug) return { status: 'SKIPPED', detail: 'course has no slug', monthly: null, yearly: null };
    const monthlyId = appleRecordedProductId(course.slug, 'MONTHLY');
    const yearlyId = appleRecordedProductId(course.slug, 'YEARLY');
    const fail = (detail: string): RecordedSyncResult => ({ status: 'FAILED', detail, monthly: null, yearly: null });
    try {
      const referenceName = `rec.${course.slug}`;
      const group =
        (await this.catalog.findSubscriptionGroup(referenceName)) ??
        (await this.catalog.createSubscriptionGroup(referenceName));
      const titleAr = course.titleAr?.trim() || course.titleEn;
      const plans = [
        {
          productId: yearlyId,
          period: 'ONE_YEAR' as const,
          groupLevel: 1,
          targetFils: this.prices.inclusive(course.yearlyPriceFils),
          nameEn: fitDisplayName(course.titleEn, 'Yearly'),
          nameAr: fitDisplayName(titleAr, 'سنوي'),
        },
        {
          productId: monthlyId,
          period: 'ONE_MONTH' as const,
          groupLevel: 2,
          targetFils: this.prices.inclusive(course.monthlyPriceFils),
          nameEn: fitDisplayName(course.titleEn, 'Monthly'),
          nameAr: fitDisplayName(titleAr, 'شهري'),
        },
      ];
      const notes: string[] = [];
      for (const plan of plans) {
        let sub = await this.catalog.findSubscriptionByProductId(plan.productId);
        if (!sub) {
          const { id } = await this.catalog.createSubscription({
            groupId: group.id,
            productId: plan.productId,
            name: plan.nameEn,
            period: plan.period,
            groupLevel: plan.groupLevel,
          });
          sub = { id, state: null };
        }
        const description = (s: string) => s.slice(0, MAX_SUB_DESCRIPTION);
        const locs: LocalizationInput[] = [
          { locale: 'en-US', name: plan.nameEn, description: description(course.titleEn) },
          { locale: 'ar-SA', name: plan.nameAr, description: description(titleAr) },
        ];
        await this.catalog.setSubscriptionLocalizations(sub.id, locs);
        const point = nearestPricePoint(await this.catalog.uaePricePoints(sub.id, 'subscription'), plan.targetFils);
        if (!point) return fail(`no ARE price points for ${plan.productId}`);
        const current = await this.catalog.currentSubscriptionPrice(sub.id);
        if (current !== point.id) await this.catalog.setSubscriptionPrice(sub.id, point.id);
        notes.push(`${plan.productId} AED ${point.customerPrice}${current === point.id ? ' unchanged' : ''}`);
      }
      return { status: 'SYNCED', detail: notes.join('; '), monthly: monthlyId, yearly: yearlyId };
    } catch (e) {
      return fail(message(e));
    }
  }
}

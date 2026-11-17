import { ALL_ACCESS_ID } from '@azza/shared';
import type { SubscribableCourse } from '../subscriptions/subscription.repository';

/** The plan's names, used where a course title goes (receipts, notices, the plans list, the transfer inbox). */
export const ALL_ACCESS_TITLE = { en: 'All recorded courses', ar: 'كل الدورات المسجّلة' } as const;

/** The stored settings row (`AllAccessPlan`). */
export interface AllAccessPlanRecord {
  enabled: boolean;
  monthlyPriceFils: number | null;
  yearlyPriceFils: number | null;
  stripeProductId: string | null;
  stripeMonthlyPriceId: string | null;
  stripeYearlyPriceId: string | null;
  appleMonthlyProductId: string | null;
  appleYearlyProductId: string | null;
}

export const EMPTY_ALL_ACCESS_PLAN: AllAccessPlanRecord = {
  enabled: false,
  monthlyPriceFils: null,
  yearlyPriceFils: null,
  stripeProductId: null,
  stripeMonthlyPriceId: null,
  stripeYearlyPriceId: null,
  appleMonthlyProductId: null,
  appleYearlyProductId: null,
};

/**
 * The all-access plan dressed as a recorded course, so the subscription flows (Stripe Checkout, webhooks, bank transfer,
 * plan switching, receipts, reminders) sell it unchanged. Switched off it reads as a draft: new purchases are refused
 * while existing plans keep renewing and can still be managed. On iOS it sells the App Store products admins set (its own subscription group).
 */
export function allAccessCourse(plan: AllAccessPlanRecord | null): SubscribableCourse {
  const p = plan ?? EMPTY_ALL_ACCESS_PLAN;
  return {
    id: ALL_ACCESS_ID,
    slug: ALL_ACCESS_ID,
    titleEn: ALL_ACCESS_TITLE.en,
    titleAr: ALL_ACCESS_TITLE.ar,
    coverImageUrl: null,
    type: 'RECORDED',
    status: p.enabled ? 'PUBLISHED' : 'DRAFT',
    monthlyPriceFils: p.monthlyPriceFils,
    yearlyPriceFils: p.yearlyPriceFils,
    stripeMonthlyPriceId: p.stripeMonthlyPriceId,
    stripeYearlyPriceId: p.stripeYearlyPriceId,
    appleMonthlyProductId: p.appleMonthlyProductId ?? null,
    appleYearlyProductId: p.appleYearlyProductId ?? null,
  };
}

/** Database `courseId` (null = all-access) → the id the services use, and back. */
export const courseKey = (courseId: string | null): string => courseId ?? ALL_ACCESS_ID;
export const dbCourseId = (courseId: string): string | null => (courseId === ALL_ACCESS_ID ? null : courseId);

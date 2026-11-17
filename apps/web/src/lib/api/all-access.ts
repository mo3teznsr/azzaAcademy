import { ALL_ACCESS_ID, type AllAccessPlanInput, type AllAccessPlanView, type AppleProductsInput } from '@azza/shared';
import { http } from './client';

export type AdminAllAccessPlan = AllAccessPlanView & { cardReady: boolean };

export const allAccessQueryKeys = {
  plan: ['all-access'] as const,
  admin: ['admin', 'all-access'] as const,
};

export const allAccessApi = {
  /** Public: is the plan on, its prices (before VAT) and how many recorded courses it opens. */
  plan: () => http.get<AllAccessPlanView>('/api/v1/all-access'),
  adminPlan: () => http.get<AdminAllAccessPlan>('/api/v1/admin/all-access'),
  save: (input: AllAccessPlanInput) => http.put<AdminAllAccessPlan>('/api/v1/admin/all-access', input),
  /** The App Store products (iOS); each must be `appleAllAccessProductId(plan)`, null clears it. */
  setAppleProducts: (input: AppleProductsInput) => http.put<AdminAllAccessPlan>('/api/v1/admin/all-access/apple-products', input),
};

/** Plan rows and notices carry `ALL_ACCESS_ID` where a course slug goes. */
export const isAllAccessSlug = (slug: string | null | undefined) => slug === ALL_ACCESS_ID;
/** Where to buy or renew a plan: the all-access page, or the course page's plan card. */
export const planHref = (slug: string) => (isAllAccessSlug(slug) ? '/all-access' : `/courses/${slug}#plan`);

import { z } from 'zod';

/**
 * The all-access plan: one monthly or yearly plan that opens every published recorded course.
 *
 * It is stored as a `Subscription` with no course (`courseId` null). The API and clients address it with this id
 * wherever a course id or slug goes (`POST /courses/_all-access/subscribe`, `courseSlug` on plan rows and notices).
 * The leading underscore can never come out of a course slug (slugs are `[a-z0-9-]`), so it never collides.
 */
export const ALL_ACCESS_ID = '_all-access';

export const isAllAccess = (courseIdOrSlug: string | null | undefined) => courseIdOrSlug === ALL_ACCESS_ID;

/** PUT /admin/all-access — prices before VAT (fils of AED) and the on/off switch. */
export const allAccessPlanInput = z
  .object({
    enabled: z.boolean(),
    monthlyPriceFils: z.number().int().min(100).nullable(),
    yearlyPriceFils: z.number().int().min(100).nullable(),
  })
  .refine((v) => !v.enabled || (v.monthlyPriceFils != null && v.yearlyPriceFils != null), {
    message: 'Set both prices before switching the plan on',
    path: ['enabled'],
  })
  .refine((v) => v.monthlyPriceFils == null || v.yearlyPriceFils == null || v.yearlyPriceFils < v.monthlyPriceFils * 12, {
    message: 'Yearly price must be lower than twelve monthly payments',
    path: ['yearlyPriceFils'],
  });
export type AllAccessPlanInput = z.infer<typeof allAccessPlanInput>;

/** GET /all-access — what the course pages and /plans show. Prices before VAT, like recorded courses. */
export interface AllAccessPlanView {
  enabled: boolean;
  monthlyPriceFils: number | null;
  yearlyPriceFils: number | null;
  /** Published recorded courses the plan opens today. */
  courseCount: number;
}

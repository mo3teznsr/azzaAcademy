import { z } from 'zod';

/** Channels admins record marketing spend for. Values match `utm_source` tags; `other` holds any other paid source. */
export const MARKETING_CHANNELS = ['instagram', 'tiktok', 'snapchat', 'google', 'facebook', 'other'] as const;
export type MarketingChannel = (typeof MARKETING_CHANNELS)[number];

/** Admin: the spend on one channel in one calendar month (`YYYY-MM`), in fils of AED. Saving the same month and channel replaces it. */
export const marketingSpendSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  channel: z.enum(MARKETING_CHANNELS),
  amountFils: z.number().int().min(0).max(1_000_000_000),
  note: z.string().trim().max(300).nullish(),
});
export type MarketingSpendInput = z.infer<typeof marketingSpendSchema>;

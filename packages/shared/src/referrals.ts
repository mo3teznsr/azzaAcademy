import { z } from 'zod';

/** Readable code alphabet: no 0/O, 1/I/L, so a code read aloud or typed from a screenshot still works. */
export const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const REFERRAL_CODE_LENGTH = 7;

/** Pure: a referral code as typed or read from a link (trimmed, upper case), or null when it cannot be one. */
export function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z0-9]{4,16}$/.test(code) ? code : null;
}

/** `https://azza.academy/?ref=CODE` from the web base URL. */
export function referralLink(webUrl: string, code: string): string {
  return `${webUrl.replace(/\/$/, '')}/?ref=${encodeURIComponent(code)}`;
}

export const REFERRAL_STATUSES = ['PENDING', 'QUALIFIED', 'REWARDED', 'VOID'] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export const REFERRAL_REWARD_TYPES = ['PERCENT', 'AMOUNT'] as const;
export type ReferralRewardType = (typeof REFERRAL_REWARD_TYPES)[number];

/** Admin: the program rules. Amounts in the API are fils. */
export interface ReferralProgramSettings {
  enabled: boolean;
  rewardType: ReferralRewardType;
  /** Percent off (PERCENT) or fils off (AMOUNT). */
  rewardValue: number;
  couponValidDays: number;
  /** Teachers get this BONUS earning instead of a coupon; 0 = they get the coupon like everyone else. */
  teacherBonusFils: number;
}

export const referralProgramInput = z
  .object({
    enabled: z.boolean(),
    rewardType: z.enum(REFERRAL_REWARD_TYPES),
    rewardValue: z.number().int().min(1).max(100_000_00),
    couponValidDays: z.number().int().min(1).max(365),
    teacherBonusFils: z.number().int().min(0).max(100_000_00),
  })
  .refine((v) => v.rewardType !== 'PERCENT' || v.rewardValue <= 100, { message: 'A percent reward is at most 100', path: ['rewardValue'] });
export type ReferralProgramInput = z.infer<typeof referralProgramInput>;

/** `GET /referrals/me`: the reader's invite link and what it has earned. */
export interface MyReferrals {
  enabled: boolean;
  code: string;
  link: string;
  reward: { type: ReferralRewardType; value: number; validDays: number };
  /** Set when the reader is a teacher and the program pays teachers a bonus. */
  teacherBonusFils: number | null;
  /** Everyone who signed up with the link. */
  joined: number;
  /** Of those, how many have paid (rewards on the way or issued). */
  paid: number;
  rewarded: number;
  /** Teacher bonuses added to earnings so far. */
  bonusFils: number;
  /** The reader's reward coupons (as referrer or as the invited friend), newest first. */
  coupons: Array<{ code: string; percentOff: number | null; amountOffFils: number | null; expiresOn: string | null; used: boolean }>;
}

/** `GET /admin/referrals` row. */
export interface AdminReferralRow {
  id: string;
  status: ReferralStatus;
  code: string;
  referrer: { id: string; name: string; email: string; role: string };
  referred: { id: string; name: string; email: string };
  createdAt: string;
  firstPaidAt: string | null;
  rewardedAt: string | null;
  voidedAt: string | null;
}

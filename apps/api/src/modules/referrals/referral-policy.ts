/**
 * Pure referral rules. No I/O: the service loads users, payments and the program, then asks these.
 *
 * The flow: a new account that signed up through `?ref=CODE` is linked to the code's owner (PENDING). Its first paid
 * seat order or plan payment qualifies the referral (QUALIFIED). Rewards are issued once that payment has been held
 * for the earning hold (the same days teacher earnings wait) without a refund (REWARDED); a refund inside the hold
 * voids it (VOID). A refund after the rewards were issued does not take them back.
 */
import { REFERRAL_CODE_ALPHABET, REFERRAL_CODE_LENGTH, type ReferralProgramSettings } from '@azza/shared';

const DAY_MS = 86_400_000;

export const DEFAULT_REFERRAL_PROGRAM: ReferralProgramSettings = {
  enabled: true,
  rewardType: 'PERCENT',
  rewardValue: 10,
  couponValidDays: 90,
  teacherBonusFils: 2500,
};

/** A random readable code; `random` returns [0, 1) (tests pass a fixed sequence). */
export function generateCode(random: () => number = Math.random, length = REFERRAL_CODE_LENGTH): string {
  let out = '';
  for (let i = 0; i < length; i++) out += REFERRAL_CODE_ALPHABET[Math.floor(random() * REFERRAL_CODE_ALPHABET.length)];
  return out;
}

export interface LinkCandidate {
  id: string;
  phone: string | null;
  banned: boolean;
}

export type LinkRefusal = 'PROGRAM_OFF' | 'UNKNOWN_CODE' | 'SELF' | 'SAME_PHONE' | 'REFERRER_BANNED';

/** null when the new account may be linked to the code's owner; otherwise why not. */
export function linkRefusal(input: { enabled: boolean; referrer: LinkCandidate | null; referred: LinkCandidate }): LinkRefusal | null {
  if (!input.enabled) return 'PROGRAM_OFF';
  const { referrer, referred } = input;
  if (!referrer) return 'UNKNOWN_CODE';
  if (referrer.id === referred.id) return 'SELF';
  if (referrer.banned) return 'REFERRER_BANNED';
  // The same mobile number on both sides is one person with two accounts.
  if (referrer.phone && referred.phone && referrer.phone === referred.phone) return 'SAME_PHONE';
  return null;
}

export interface PaymentRef {
  kind: 'ORDER' | 'PLAN';
  id: string;
  paidAt: Date;
  /** Any money returned on it (partial or full). */
  refunded: boolean;
}

/** The earliest payment (ties: seat orders first, then id, so the choice is stable). */
export function firstPayment(payments: PaymentRef[]): PaymentRef | null {
  if (!payments.length) return null;
  return [...payments].sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime() || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id))[0]!;
}

export type RewardDecision = 'WAIT' | 'REWARD' | 'VOID';

/** For a QUALIFIED referral: refunded → VOID; held for `holdDays` → REWARD; else WAIT. */
export function rewardDecision(payment: Pick<PaymentRef, 'paidAt' | 'refunded'>, now: Date, holdDays: number): RewardDecision {
  if (payment.refunded) return 'VOID';
  return now.getTime() >= payment.paidAt.getTime() + holdDays * DAY_MS ? 'REWARD' : 'WAIT';
}

export type ReferrerReward = { kind: 'BONUS'; amountFils: number } | { kind: 'COUPON' };

/** Teachers get a BONUS earning (they rarely buy classes); everyone else, or teachers when the bonus is 0, a coupon. */
export function referrerReward(role: string, program: Pick<ReferralProgramSettings, 'teacherBonusFils'>): ReferrerReward {
  return role === 'TEACHER' && program.teacherBonusFils > 0 ? { kind: 'BONUS', amountFils: program.teacherBonusFils } : { kind: 'COUPON' };
}

export interface CouponDraft {
  code: string;
  percentOff: number | null;
  amountOffFils: number | null;
  /** Calendar day at 00:00 UTC (valid through that day, like every coupon). */
  expiresOn: Date;
  ownerId: string;
}

/** A single-use personal coupon worth the program's reward, valid `couponValidDays` from today. */
export function rewardCoupon(program: ReferralProgramSettings, ownerId: string, code: string, now: Date): CouponDraft {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return {
    code,
    percentOff: program.rewardType === 'PERCENT' ? program.rewardValue : null,
    amountOffFils: program.rewardType === 'AMOUNT' ? program.rewardValue : null,
    expiresOn: new Date(today + program.couponValidDays * DAY_MS),
    ownerId,
  };
}

/** Reward coupon codes: `REF-` and 8 readable characters. */
export const rewardCouponCode = (random: () => number = Math.random) => `REF-${generateCode(random, 8)}`;

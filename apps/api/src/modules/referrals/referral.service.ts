import { cleanAttribution, normalizeReferralCode, referralLink, type MyReferrals, type ReferralProgramInput, type ReferralStatus } from '@azza/shared';
import { NotFoundError } from '../../core/errors';
import type { Clock } from '../../core/ports';
import type { Notifier } from '../notifications/notification.types';
import { friendRewardNotice, referrerCouponNotice, teacherBonusNotice } from './referral-emails';
import {
  firstPayment,
  generateCode,
  linkRefusal,
  referrerReward,
  rewardCoupon,
  rewardCouponCode,
  rewardDecision,
  type LinkRefusal,
} from './referral-policy';
import type { ReferralRepository } from './referral.repository';

export interface ReferralServiceDeps {
  /** The earning hold in days (the admin-editable rule): rewards wait this long after the first payment. */
  holdDays: () => Promise<number>;
  webUrl: string;
  /** [0, 1); tests pass a fixed sequence. */
  random?: () => number;
  log?: (message: string, error?: unknown) => void;
}

const BATCH = 200;
const CODE_ATTEMPTS = 8;

/**
 * Two-sided referrals. Every user has a personal code; a new account that arrives with `?ref=CODE` is linked to its
 * owner at sign-up. The hourly job qualifies a referral at the friend's first paid seat order or plan payment and,
 * once that payment has passed the earning hold without a refund, rewards both sides: a single-use personal coupon
 * for the friend, and a coupon (or, for teachers, a BONUS earning) for the referrer. Rules in referral-policy.ts.
 *
 * Qualification reads the payments themselves (PAID/REFUNDED orders and plan payments), not payment events, so it
 * covers every paid path (Stripe, bank transfer approval, Apple) and webhook replays cannot double anything. Every
 * status change is a conditional update, and the reward is one transaction that first claims the row.
 */
export class ReferralService {
  private readonly random: () => number;
  private readonly log: (message: string, error?: unknown) => void;

  constructor(
    private readonly repo: ReferralRepository,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
    private readonly deps: ReferralServiceDeps,
  ) {
    this.random = deps.random ?? Math.random;
    this.log = deps.log ?? ((m, e) => (e ? console.error(m, e) : console.info(m)));
  }

  /** The user's code, created on first use. */
  async ensureCode(userId: string): Promise<string> {
    for (let i = 0; i < CODE_ATTEMPTS; i++) {
      const user = await this.repo.findUser(userId);
      if (!user) throw new NotFoundError('User', userId);
      if (user.referralCode) return user.referralCode;
      if (await this.repo.setReferralCode(userId, generateCode(this.random))) return (await this.repo.findUser(userId))!.referralCode!;
    }
    throw new Error('Could not create a unique referral code');
  }

  /**
   * Sign-up hook: links a brand-new account to the owner of the code it arrived with (the `ref` key of its
   * first-touch attribution). Never throws: a bad code must not break sign-up.
   */
  async linkNewUser(userId: string, acquisition: unknown): Promise<LinkRefusal | 'LINKED' | 'NO_CODE' | 'ALREADY_LINKED'> {
    try {
      const code = normalizeReferralCode(cleanAttribution(acquisition)?.ref);
      if (!code) return 'NO_CODE';
      const [program, referrer, referred] = await Promise.all([this.repo.program(), this.repo.findUserByCode(code), this.repo.findUser(userId)]);
      if (!referred) return 'UNKNOWN_CODE';
      const refusal = linkRefusal({ enabled: program.enabled, referrer, referred });
      if (refusal) return refusal;
      return (await this.repo.createReferral({ referrerId: referrer!.id, referredId: userId, code })) ? 'LINKED' : 'ALREADY_LINKED';
    } catch (e) {
      this.log('[referrals] could not link a new account', e);
      return 'UNKNOWN_CODE';
    }
  }

  /** `GET /referrals/me`. */
  async mine(userId: string): Promise<MyReferrals> {
    const code = await this.ensureCode(userId);
    const [program, user, stats, coupons] = await Promise.all([this.repo.program(), this.repo.findUser(userId), this.repo.stats(userId), this.repo.couponsOf(userId)]);
    const reward = referrerReward(user?.role ?? 'STUDENT', program);
    return {
      enabled: program.enabled,
      code,
      link: referralLink(this.deps.webUrl, code),
      reward: { type: program.rewardType, value: program.rewardValue, validDays: program.couponValidDays },
      teacherBonusFils: reward.kind === 'BONUS' ? reward.amountFils : null,
      ...stats,
      coupons,
    };
  }

  /**
   * Hourly job. Does nothing while the program is off (referrals wait and resume when it is back on).
   * 1. PENDING with a paid order or plan payment → QUALIFIED (first payment remembered).
   * 2. QUALIFIED whose first payment was refunded → VOID; held past the earning hold → REWARDED + notices.
   */
  async run() {
    const result = { qualified: 0, rewarded: 0, voided: 0 };
    const program = await this.repo.program();
    if (!program.enabled) return result;
    const now = this.clock.now();

    for (const r of await this.repo.pendingReferrals(BATCH)) {
      const first = firstPayment(await this.repo.paymentsOf(r.referredId));
      if (first && (await this.repo.markQualified(r.id, first, now))) result.qualified++;
    }

    const holdDays = await this.deps.holdDays();
    for (const r of await this.repo.qualifiedReferrals(BATCH)) {
      const decision = rewardDecision(r.payment, now, holdDays);
      if (decision === 'VOID') {
        if (await this.repo.markVoid(r.id, now)) result.voided++;
        continue;
      }
      if (decision === 'WAIT') continue;

      const reward = referrerReward(r.referrer.role, program);
      const referredCoupon = rewardCoupon(program, r.referredId, rewardCouponCode(this.random), now);
      const referrerCoupon = reward.kind === 'COUPON' ? rewardCoupon(program, r.referrer.id, rewardCouponCode(this.random), now) : null;
      const referrerBonus = reward.kind === 'BONUS' ? { teacherId: r.referrer.id, amountFils: reward.amountFils, availableAt: now } : null;
      if (!(await this.repo.reward({ referralId: r.id, at: now, referredCoupon, referrerCoupon, referrerBonus }))) continue;
      result.rewarded++;

      const [referrer, referred] = await Promise.all([this.repo.findUser(r.referrer.id), this.repo.findUser(r.referredId)]);
      const send = (userId: string, notice: Parameters<Notifier['notify']>[1]) =>
        this.notifier.notify([userId], notice, { channels: ['in-app', 'push', 'email'] }).catch((e) => this.log('[referrals] reward notice failed', e));
      await send(r.referredId, friendRewardNotice(referredCoupon, referrer?.name ?? '', this.deps.webUrl));
      if (referrerCoupon) await send(r.referrer.id, referrerCouponNotice(referrerCoupon, referred?.name ?? '', this.deps.webUrl));
      if (referrerBonus) await send(r.referrer.id, teacherBonusNotice(referrerBonus.amountFils, referred?.name ?? '', this.deps.webUrl));
    }
    return result;
  }

  // ───────── admin ─────────

  program() {
    return this.repo.program();
  }

  updateProgram(input: ReferralProgramInput) {
    return this.repo.saveProgram(input);
  }

  async adminList(input: { page: number; pageSize: number; status?: ReferralStatus }) {
    const [list, counts] = await Promise.all([this.repo.adminList(input), this.repo.adminCounts()]);
    return { ...list, counts };
  }
}

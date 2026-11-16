import { describe, expect, test } from 'bun:test';
import { normalizeReferralCode, referralLink, referralProgramInput, type ReferralProgramSettings, type ReferralStatus } from '@azza/shared';
import { localizedText } from '../src/modules/notifications/notification.types';
import {
  DEFAULT_REFERRAL_PROGRAM,
  firstPayment,
  generateCode,
  linkRefusal,
  referrerReward,
  rewardCoupon,
  rewardDecision,
  type PaymentRef,
} from '../src/modules/referrals/referral-policy';
import type { QualifiedReferral, ReferralRepository, ReferralUser, RewardWrite } from '../src/modules/referrals/referral.repository';
import { ReferralService } from '../src/modules/referrals/referral.service';
import { RecordingNotifier } from './fakes/in-memory';

const DAY = 86_400_000;
const NOW = new Date('2026-11-16T10:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

/** A deterministic [0, 1) sequence so codes are predictable. */
function sequence() {
  let i = 0;
  return () => ((i++ * 7) % 31) / 31;
}

describe('referral policy', () => {
  test('codes are readable and of the right length', () => {
    const code = generateCode(sequence());
    expect(code).toHaveLength(7);
    expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/);
  });

  test('normalizing and building links', () => {
    expect(normalizeReferralCode(' ab3k9qz ')).toBe('AB3K9QZ');
    expect(normalizeReferralCode('no spaces allowed')).toBeNull();
    expect(normalizeReferralCode(42)).toBeNull();
    expect(referralLink('https://azza.academy/', 'AB3K9QZ')).toBe('https://azza.academy/?ref=AB3K9QZ');
  });

  test('who may be linked', () => {
    const referrer = { id: 'r', phone: '+971500000001', banned: false };
    const referred = { id: 'n', phone: '+971500000002', banned: false };
    expect(linkRefusal({ enabled: true, referrer, referred })).toBeNull();
    expect(linkRefusal({ enabled: false, referrer, referred })).toBe('PROGRAM_OFF');
    expect(linkRefusal({ enabled: true, referrer: null, referred })).toBe('UNKNOWN_CODE');
    expect(linkRefusal({ enabled: true, referrer, referred: { ...referred, id: 'r' } })).toBe('SELF');
    expect(linkRefusal({ enabled: true, referrer: { ...referrer, banned: true }, referred })).toBe('REFERRER_BANNED');
    expect(linkRefusal({ enabled: true, referrer, referred: { ...referred, phone: referrer.phone } })).toBe('SAME_PHONE');
  });

  test('the first payment is the earliest one', () => {
    const p = (kind: 'ORDER' | 'PLAN', id: string, at: Date): PaymentRef => ({ kind, id, paidAt: at, refunded: false });
    expect(firstPayment([])).toBeNull();
    expect(firstPayment([p('PLAN', 'p1', daysAgo(3)), p('ORDER', 'o1', daysAgo(5)), p('ORDER', 'o2', daysAgo(1))])?.id).toBe('o1');
  });

  test('rewards wait for the hold and never follow a refund', () => {
    expect(rewardDecision({ paidAt: daysAgo(3), refunded: false }, NOW, 7)).toBe('WAIT');
    expect(rewardDecision({ paidAt: daysAgo(7), refunded: false }, NOW, 7)).toBe('REWARD');
    expect(rewardDecision({ paidAt: daysAgo(3), refunded: true }, NOW, 7)).toBe('VOID');
  });

  test('teachers get a bonus unless it is zero', () => {
    expect(referrerReward('TEACHER', { teacherBonusFils: 2500 })).toEqual({ kind: 'BONUS', amountFils: 2500 });
    expect(referrerReward('TEACHER', { teacherBonusFils: 0 })).toEqual({ kind: 'COUPON' });
    expect(referrerReward('STUDENT', { teacherBonusFils: 2500 })).toEqual({ kind: 'COUPON' });
  });

  test('reward coupons follow the program', () => {
    const c = rewardCoupon(DEFAULT_REFERRAL_PROGRAM, 'u1', 'REF-AAAA', NOW);
    expect(c).toEqual({ code: 'REF-AAAA', percentOff: 10, amountOffFils: null, expiresOn: new Date('2027-02-14T00:00:00Z'), ownerId: 'u1' });
    const amount = rewardCoupon({ ...DEFAULT_REFERRAL_PROGRAM, rewardType: 'AMOUNT', rewardValue: 2000, couponValidDays: 30 }, 'u1', 'REF-B', NOW);
    expect(amount).toMatchObject({ percentOff: null, amountOffFils: 2000, expiresOn: new Date('2026-12-16T00:00:00Z') });
  });

  test('settings input: a percent reward is at most 100', () => {
    const base = { enabled: true, rewardType: 'PERCENT', rewardValue: 10, couponValidDays: 90, teacherBonusFils: 2500 };
    expect(referralProgramInput.safeParse(base).success).toBe(true);
    expect(referralProgramInput.safeParse({ ...base, rewardValue: 150 }).success).toBe(false);
    expect(referralProgramInput.safeParse({ ...base, rewardType: 'AMOUNT', rewardValue: 15000 }).success).toBe(true);
  });
});

interface MemReferral {
  id: string;
  referrerId: string;
  referredId: string;
  code: string;
  status: ReferralStatus;
  payment: PaymentRef | null;
}

class MemReferrals implements ReferralRepository {
  settings: ReferralProgramSettings = { ...DEFAULT_REFERRAL_PROGRAM };
  users = new Map<string, ReferralUser>();
  referrals: MemReferral[] = [];
  payments = new Map<string, PaymentRef[]>();
  coupons: Array<RewardWrite['referredCoupon']> = [];
  earnings: Array<NonNullable<RewardWrite['referrerBonus']>> = [];
  rewardCalls = 0;

  addUser(id: string, role = 'STUDENT', extra: Partial<ReferralUser> = {}) {
    this.users.set(id, { id, name: `${id[0]!.toUpperCase()}${id.slice(1)} Test`, role, phone: null, banned: false, referralCode: null, ...extra });
  }
  async program() { return { ...this.settings }; }
  async saveProgram(p: ReferralProgramSettings) { this.settings = { ...p }; return this.program(); }
  async findUser(id: string) { return this.users.get(id) ?? null; }
  async findUserByCode(code: string) { return [...this.users.values()].find((u) => u.referralCode === code) ?? null; }
  async setReferralCode(userId: string, code: string) {
    const u = this.users.get(userId);
    if (!u || u.referralCode || [...this.users.values()].some((x) => x.referralCode === code)) return false;
    u.referralCode = code;
    return true;
  }
  async createReferral(input: { referrerId: string; referredId: string; code: string }) {
    if (this.referrals.some((r) => r.referredId === input.referredId)) return false;
    this.referrals.push({ id: `ref${this.referrals.length + 1}`, ...input, status: 'PENDING', payment: null });
    return true;
  }
  async pendingReferrals() { return this.referrals.filter((r) => r.status === 'PENDING').map((r) => ({ id: r.id, referredId: r.referredId })); }
  async paymentsOf(userId: string) { return this.payments.get(userId) ?? []; }
  async markQualified(id: string, payment: PaymentRef) {
    const r = this.referrals.find((x) => x.id === id);
    if (r?.status !== 'PENDING') return false;
    r.status = 'QUALIFIED';
    r.payment = payment;
    return true;
  }
  async qualifiedReferrals(): Promise<QualifiedReferral[]> {
    return this.referrals
      .filter((r) => r.status === 'QUALIFIED')
      .map((r) => {
        // The payment's current refund state, like the real repository re-reads it.
        const now = (this.payments.get(r.referredId) ?? []).find((p) => p.id === r.payment!.id);
        return { id: r.id, referredId: r.referredId, referrer: { id: r.referrerId, role: this.users.get(r.referrerId)!.role }, payment: { ...r.payment!, refunded: now?.refunded ?? true } };
      });
  }
  async markVoid(id: string) {
    const r = this.referrals.find((x) => x.id === id);
    if (r?.status !== 'QUALIFIED') return false;
    r.status = 'VOID';
    return true;
  }
  async reward(input: RewardWrite) {
    this.rewardCalls++;
    const r = this.referrals.find((x) => x.id === input.referralId);
    if (r?.status !== 'QUALIFIED') return false;
    r.status = 'REWARDED';
    this.coupons.push(input.referredCoupon);
    if (input.referrerCoupon) this.coupons.push(input.referrerCoupon);
    if (input.referrerBonus) this.earnings.push(input.referrerBonus);
    return true;
  }
  async stats(referrerId: string) {
    const mine = this.referrals.filter((r) => r.referrerId === referrerId);
    return {
      joined: mine.length,
      paid: mine.filter((r) => r.status === 'QUALIFIED' || r.status === 'REWARDED').length,
      rewarded: mine.filter((r) => r.status === 'REWARDED').length,
      bonusFils: this.earnings.filter((e) => e.teacherId === referrerId).reduce((s, e) => s + e.amountFils, 0),
    };
  }
  async couponsOf(userId: string) {
    return this.coupons.filter((c) => c.ownerId === userId).map((c) => ({ code: c.code, percentOff: c.percentOff, amountOffFils: c.amountOffFils, expiresOn: c.expiresOn.toISOString(), used: false }));
  }
  async adminList() { return { items: [], total: 0 }; }
  async adminCounts() { return { PENDING: 0, QUALIFIED: 0, REWARDED: 0, VOID: 0 }; }
}

function build() {
  const repo = new MemReferrals();
  const notifier = new RecordingNotifier();
  let now = NOW;
  const service = new ReferralService(repo, notifier, { now: () => now }, { holdDays: async () => 7, webUrl: 'https://azza.test', random: sequence(), log: () => {} });
  return { repo, notifier, service, setNow: (d: Date) => (now = d) };
}
const attr = (ref: string) => JSON.stringify({ ref, landing: '/' });
const reader = (locale: string) => ({ id: 'u', name: 'Sara', email: 's@x', locale, timezone: 'Asia/Dubai' });

describe('referral service', () => {
  test('a user gets one stable code and a link', async () => {
    const { repo, service } = build();
    repo.addUser('sara');
    const first = await service.mine('sara');
    expect(first.code).toHaveLength(7);
    expect(first.link).toBe(`https://azza.test/?ref=${first.code}`);
    expect((await service.mine('sara')).code).toBe(first.code);
    expect(first).toMatchObject({ enabled: true, joined: 0, teacherBonusFils: null, reward: { type: 'PERCENT', value: 10, validDays: 90 } });
  });

  test('sign-up links a new account once, and refuses bad cases', async () => {
    const { repo, service } = build();
    repo.addUser('sara', 'STUDENT', { referralCode: 'SARA777', phone: '+971500000001' });
    repo.addUser('omar');
    repo.addUser('twin', 'STUDENT', { phone: '+971500000001' });
    repo.addUser('nobody');
    expect(await service.linkNewUser('omar', attr('sara777'))).toBe('LINKED');
    expect(await service.linkNewUser('omar', attr('SARA777'))).toBe('ALREADY_LINKED');
    expect(await service.linkNewUser('twin', attr('SARA777'))).toBe('SAME_PHONE');
    expect(await service.linkNewUser('nobody', attr('NOPE999'))).toBe('UNKNOWN_CODE');
    expect(await service.linkNewUser('nobody', null)).toBe('NO_CODE');
    expect(await service.linkNewUser('nobody', '{not json')).toBe('NO_CODE');
    repo.settings.enabled = false;
    expect(await service.linkNewUser('nobody', attr('SARA777'))).toBe('PROGRAM_OFF');
    expect(repo.referrals).toHaveLength(1);
  });

  test('first payment qualifies; rewards after the hold, once, to both sides', async () => {
    const { repo, notifier, service, setNow } = build();
    repo.addUser('sara', 'STUDENT', { referralCode: 'SARA777' });
    repo.addUser('omar');
    await service.linkNewUser('omar', attr('SARA777'));

    expect(await service.run()).toEqual({ qualified: 0, rewarded: 0, voided: 0 });
    repo.payments.set('omar', [{ kind: 'ORDER', id: 'o1', paidAt: daysAgo(1), refunded: false }]);
    expect(await service.run()).toEqual({ qualified: 1, rewarded: 0, voided: 0 });
    expect((await service.mine('sara')).paid).toBe(1);

    setNow(new Date(NOW.getTime() + 6 * DAY));
    expect((await service.run()).rewarded).toBe(1);
    // Replays (a second run, a webhook replay creating no new payment) never reward again.
    expect((await service.run()).rewarded).toBe(0);
    expect(repo.coupons.map((c) => c.ownerId)).toEqual(['omar', 'sara']);
    expect(repo.coupons.every((c) => c.code.startsWith('REF-') && c.percentOff === 10)).toBe(true);

    expect(notifier.sent.map((s) => [s.userIds[0], s.notice.type])).toEqual([['omar', 'REFERRAL_REWARD'], ['sara', 'REFERRAL_REWARD']]);
    const friend = notifier.sent[0]!.notice;
    expect(friend.title).toBe('A gift from Sara: 10% off');
    expect(localizedText(friend, { locale: 'ar' }).title).toBe('هدية من Sara: خصم 10%');
    expect(friend.email?.(reader('ar'))?.subject).toBe('هدية من Sara: خصم 10%');
    expect(notifier.sent[1]!.notice.email?.(reader('en'))?.html).toContain(repo.coupons[1]!.code);
    const mine = await service.mine('sara');
    expect(mine).toMatchObject({ joined: 1, paid: 1, rewarded: 1 });
    expect(mine.coupons).toHaveLength(1);
  });

  test('a teacher referrer gets a bonus earning instead of a coupon', async () => {
    const { repo, notifier, service } = build();
    repo.addUser('tala', 'TEACHER', { referralCode: 'TALA222' });
    repo.addUser('omar');
    await service.linkNewUser('omar', attr('TALA222'));
    repo.payments.set('omar', [{ kind: 'PLAN', id: 'p1', paidAt: daysAgo(10), refunded: false }]);
    expect(await service.run()).toEqual({ qualified: 1, rewarded: 1, voided: 0 });
    expect(repo.earnings).toEqual([{ teacherId: 'tala', amountFils: 2500, availableAt: NOW }]);
    expect(repo.coupons.map((c) => c.ownerId)).toEqual(['omar']);
    expect(notifier.sent[1]).toMatchObject({ userIds: ['tala'], notice: { type: 'REFERRAL_BONUS' } });
    expect(notifier.sent[1]!.notice.email?.(reader('en'))?.subject).toBe('Referral bonus: AED 25.00');
    expect((await service.mine('tala')).teacherBonusFils).toBe(2500);
  });

  test('a refund inside the hold voids the referral', async () => {
    const { repo, notifier, service, setNow } = build();
    repo.addUser('sara', 'STUDENT', { referralCode: 'SARA777' });
    repo.addUser('omar');
    await service.linkNewUser('omar', attr('SARA777'));
    repo.payments.set('omar', [{ kind: 'ORDER', id: 'o1', paidAt: daysAgo(1), refunded: false }]);
    await service.run();
    repo.payments.set('omar', [{ kind: 'ORDER', id: 'o1', paidAt: daysAgo(1), refunded: true }]);
    setNow(new Date(NOW.getTime() + 10 * DAY));
    expect(await service.run()).toEqual({ qualified: 0, rewarded: 0, voided: 1 });
    expect(repo.coupons).toHaveLength(0);
    expect(notifier.sent).toHaveLength(0);
  });

  test('nothing happens while the program is off', async () => {
    const { repo, service } = build();
    repo.addUser('sara', 'STUDENT', { referralCode: 'SARA777' });
    repo.addUser('omar');
    await service.linkNewUser('omar', attr('SARA777'));
    repo.payments.set('omar', [{ kind: 'ORDER', id: 'o1', paidAt: daysAgo(30), refunded: false }]);
    repo.settings.enabled = false;
    expect(await service.run()).toEqual({ qualified: 0, rewarded: 0, voided: 0 });
    repo.settings.enabled = true;
    expect(await service.run()).toEqual({ qualified: 1, rewarded: 1, voided: 0 });
  });

  test('an amount reward reads as money', async () => {
    const { repo, notifier, service } = build();
    repo.settings = { ...repo.settings, rewardType: 'AMOUNT', rewardValue: 2000 };
    repo.addUser('sara', 'STUDENT', { referralCode: 'SARA777' });
    repo.addUser('omar');
    await service.linkNewUser('omar', attr('SARA777'));
    repo.payments.set('omar', [{ kind: 'ORDER', id: 'o1', paidAt: daysAgo(30), refunded: false }]);
    await service.run();
    expect(notifier.sent[0]!.notice.title).toBe('A gift from Sara: AED 20.00 off');
  });
});

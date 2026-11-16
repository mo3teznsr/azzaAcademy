import { describe, expect, test } from 'bun:test';
import { LifecycleService, type EndedPlan, type InactiveLearner, type LifecycleRepository } from '../src/modules/lifecycle/lifecycle.service';
import { localizedText } from '../src/modules/notifications/notification.types';
import { RecordingNotifier } from './fakes/in-memory';

const NOW = new Date('2026-11-16T10:00:00Z');
const DAY = 86_400_000;

class MemLifecycle implements LifecycleRepository {
  inactive: InactiveLearner[] = [];
  ended: Array<EndedPlan & { daysAgo: number }> = [];
  fresh: Array<{ userId: string; daysAgo: number }> = [];
  claimed = new Set<string>();
  async inactiveLearners() { return this.inactive; }
  async endedPlans(from: Date, to: Date) {
    return this.ended.filter((p) => p.endedAt >= from && p.endedAt < to);
  }
  async newStudentsWithoutPurchase(from: Date, to: Date) {
    return this.fresh.filter((u) => { const at = new Date(NOW.getTime() - u.daysAgo * DAY); return at >= from && at < to; }).map((u) => u.userId);
  }
  async claim(userId: string, key: string) {
    const k = `${userId}|${key}`;
    if (this.claimed.has(k)) return false;
    this.claimed.add(k);
    return true;
  }
}

function build() {
  const repo = new MemLifecycle();
  const notifier = new RecordingNotifier();
  return { repo, notifier, service: new LifecycleService(repo, notifier, { now: () => NOW }, 'https://azza.test') };
}
const reader = (locale: string) => ({ id: 'u', name: 'Sara', email: 's@x', locale, timezone: 'Asia/Dubai' });

describe('lifecycle messages', () => {
  test('welcome on day 1 and day 4, once each', async () => {
    const { repo, notifier, service } = build();
    repo.fresh.push({ userId: 'new1', daysAgo: 1.5 }, { userId: 'new4', daysAgo: 4.5 }, { userId: 'old', daysAgo: 9 });
    expect((await service.run()).welcome).toBe(2);
    expect((await service.run()).welcome).toBe(0);
    expect(notifier.sent.map((s) => [s.userIds[0], s.notice.title])).toEqual([['new1', 'Welcome to Azza'], ['new4', 'Not sure where to start?']]);
    expect(notifier.sent[0]!.notice.email?.(reader('ar'))?.subject).toBe('أهلًا بك في عازة');
  });

  test('an inactive learner is nudged once per quiet stretch', async () => {
    const { repo, notifier, service } = build();
    const learner = { subscriptionId: 's1', userId: 'sam', courseSlug: 'logo', courseEn: 'Logo Design', courseAr: 'تصميم الشعارات', lastActivityAt: new Date(NOW.getTime() - 9 * DAY) };
    repo.inactive.push(learner);
    expect((await service.run()).inactive).toBe(1);
    expect((await service.run()).inactive).toBe(0);
    const n = notifier.sent[0]!.notice;
    expect(n).toMatchObject({ type: 'LEARNING_NUDGE', data: { courseSlug: 'logo' } });
    expect(localizedText(n, { locale: 'ar' }).title).toBe('أكمل تصميم الشعارات من حيث توقفت');
    expect(n.email?.(reader('en'))?.html).toContain('https://azza.test/learn/courses/logo');
    // They studied again, then went quiet again: a new stretch, a new nudge.
    repo.inactive = [{ ...learner, lastActivityAt: new Date(NOW.getTime() - 8 * DAY) }];
    expect((await service.run()).inactive).toBe(1);
  });

  test('win-back 7 and 30 days after a plan ended', async () => {
    const { repo, notifier, service } = build();
    const plan = (id: string, daysAgo: number) => ({ subscriptionId: id, userId: `u-${id}`, courseSlug: 'logo', courseEn: 'Logo Design', courseAr: 'تصميم الشعارات', endedAt: new Date(NOW.getTime() - daysAgo * DAY), daysAgo });
    repo.ended.push(plan('a', 7.5), plan('b', 30.2), plan('c', 12));
    expect((await service.run()).winback).toBe(2);
    expect((await service.run()).winback).toBe(0);
    expect(notifier.sent.map((s) => s.userIds[0])).toEqual(['u-a', 'u-b']);
    expect(notifier.sent[0]!.notice.email?.(reader('en'))?.subject).toBe('Come back to Logo Design');
  });
});

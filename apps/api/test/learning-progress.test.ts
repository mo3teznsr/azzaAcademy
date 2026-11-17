import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { BadgeId } from '@azza/shared';
import { errorHandler } from '../src/http/error-handler';
import type { AppEnv, CurrentUser } from '../src/http/types';
import { localizedText } from '../src/modules/notifications/notification.types';
import { progressRoutes } from '../src/modules/progress/progress.routes';
import { ProgressService, type GoalHolder, type LearnerActivity, type LearningGoal, type ProgressRepository } from '../src/modules/progress/progress.service';
import { RecordingNotifier } from './fakes/in-memory';

// Friday 2026-11-20, 18:00 in Dubai.
const FRIDAY_EVENING = new Date('2026-11-20T14:00:00Z');

const emptyActivity = (): LearnerActivity => ({
  lessonCompletions: [],
  quizSubmissions: [],
  liveAttendance: [],
  watchSecondsByDay: [],
  lessonsCompleted: 0,
  liveClassesAttended: 0,
  certificates: 0,
  perfectQuiz: false,
});

class MemProgress implements ProgressRepository {
  activities = new Map<string, LearnerActivity>();
  goals = new Map<string, LearningGoal>();
  earned = new Map<string, Array<{ id: BadgeId; earnedAt: Date }>>();
  claimed = new Set<string>();
  active: string[] = [];
  async activity(userId: string) { return this.activities.get(userId) ?? emptyActivity(); }
  async timezone() { return 'Asia/Dubai'; }
  async goal(userId: string) { return this.goals.get(userId) ?? null; }
  async saveGoal(userId: string, goal: LearningGoal) { this.goals.set(userId, goal); }
  async deleteGoal(userId: string) { this.goals.delete(userId); }
  async goalHolders(): Promise<GoalHolder[]> {
    return [...this.goals].map(([userId, g]) => ({ userId, timezone: 'Asia/Dubai', ...g }));
  }
  async badges(userId: string) { return this.earned.get(userId) ?? []; }
  async award(userId: string, id: BadgeId, at: Date) {
    const list = this.earned.get(userId) ?? [];
    if (list.some((b) => b.id === id)) return false;
    this.earned.set(userId, [...list, { id, earnedAt: at }]);
    return true;
  }
  async activeSince() { return this.active; }
  async claim(userId: string, key: string) {
    const k = `${userId}|${key}`;
    if (this.claimed.has(k)) return false;
    this.claimed.add(k);
    return true;
  }
}

function build(now = FRIDAY_EVENING) {
  const repo = new MemProgress();
  const notifier = new RecordingNotifier();
  const clock = { now: () => now };
  return { repo, notifier, clock, service: new ProgressService(repo, notifier, clock, 'https://azza.test') };
}

const at = (iso: string) => new Date(iso);

describe('progress summary', () => {
  test('streak, week and goal from the learner’s activity', async () => {
    const { repo, service } = build();
    repo.activities.set('sam', {
      ...emptyActivity(),
      // Mon, Tue, Thu (Wed bridged by the freeze) and Fri, Dubai time.
      lessonCompletions: [at('2026-11-16T08:00:00Z'), at('2026-11-17T08:00:00Z'), at('2026-11-19T08:00:00Z')],
      quizSubmissions: [at('2026-11-20T10:00:00Z')],
      lessonsCompleted: 3,
    });
    repo.goals.set('sam', { unit: 'DAYS', target: 5, reminders: true });
    const p = await service.summary('sam');
    expect(p.today).toBe('2026-11-20');
    expect(p.streak).toMatchObject({ current: 4, best: 4, todayDone: true, freezeAvailable: false, frozenDays: ['2026-11-18'] });
    expect(p.week).toEqual({ start: '2026-11-16', days: ['2026-11-16', '2026-11-17', '2026-11-19', '2026-11-20'], lessons: 3 });
    expect(p.goal).toEqual({ unit: 'DAYS', target: 5, reminders: true, progress: 4, met: false });
    expect(p.badgeCount).toEqual({ earned: 1, total: 8 });
    expect(p.latestBadges.map((b) => b.id)).toEqual(['FIRST_LESSON']);
  });

  test('badges are awarded once, with a bilingual notice', async () => {
    const { repo, notifier, service } = build();
    repo.activities.set('sam', { ...emptyActivity(), lessonCompletions: [at('2026-11-20T08:00:00Z')], lessonsCompleted: 10, perfectQuiz: true });
    await service.summary('sam');
    await service.summary('sam');
    expect(notifier.types()).toEqual(['BADGE_EARNED', 'BADGE_EARNED', 'BADGE_EARNED']);
    const n = notifier.sent[0]!.notice;
    expect(n.title).toBe('New badge: First lesson');
    expect(localizedText(n, { locale: 'ar' }).title).toBe('شارة جديدة: الدرس الأول');
    const { items } = await service.badges('sam');
    expect(items.filter((b) => b.earnedAt).map((b) => b.id)).toEqual(['FIRST_LESSON', 'LESSONS_10', 'PERFECT_QUIZ']);
    expect(items.find((b) => b.id === 'STREAK_30')?.earnedAt).toBeNull();
  });

  test('the hourly sweep awards badges for recently active learners', async () => {
    const { repo, notifier, service } = build(at('2026-11-16T10:00:00Z'));
    repo.active = ['lina'];
    repo.activities.set('lina', { ...emptyActivity(), liveAttendance: [at('2026-11-16T07:00:00Z')], liveClassesAttended: 1, certificates: 1 });
    expect(await service.run()).toEqual({ awarded: 2, reminded: 0 });
    expect(await service.run()).toEqual({ awarded: 0, reminded: 0 });
    expect(notifier.sent.map((s) => s.notice.data?.badge)).toEqual(['FIRST_LIVE_CLASS', 'FIRST_CERTIFICATE']);
  });
});

describe('weekly goal reminder', () => {
  test('one gentle reminder per week when behind', async () => {
    const { repo, notifier, service } = build();
    repo.goals.set('sam', { unit: 'LESSONS', target: 3, reminders: true });
    repo.activities.set('sam', { ...emptyActivity(), lessonCompletions: [at('2026-11-17T08:00:00Z')], lessonsCompleted: 1 });
    repo.earned.set('sam', [{ id: 'FIRST_LESSON', earnedAt: at('2026-11-17T08:00:00Z') }]);
    expect((await service.run()).reminded).toBe(1);
    expect((await service.run()).reminded).toBe(0);
    const n = notifier.sent[0]!.notice;
    expect(n.type).toBe('LEARNING_GOAL_REMINDER');
    expect(n.body).toContain('2 more lessons');
    expect(localizedText(n, { locale: 'ar' }).body).toContain('2 دروس إضافية');
    expect(repo.claimed.has('sam|goal-reminder:2026-11-16')).toBe(true);
  });

  test('none when opted out, on track, or early in the week', async () => {
    const opted = build();
    opted.repo.goals.set('sam', { unit: 'DAYS', target: 3, reminders: false });
    expect((await opted.service.run()).reminded).toBe(0);

    const onTrack = build();
    onTrack.repo.goals.set('sam', { unit: 'DAYS', target: 1, reminders: true });
    onTrack.repo.activities.set('sam', { ...emptyActivity(), quizSubmissions: [at('2026-11-18T08:00:00Z')] });
    expect((await onTrack.service.run()).reminded).toBe(0);

    const wednesday = build(at('2026-11-18T14:00:00Z'));
    wednesday.repo.goals.set('sam', { unit: 'DAYS', target: 3, reminders: true });
    expect((await wednesday.service.run()).reminded).toBe(0);
  });
});

describe('routes under /me', () => {
  const sam: CurrentUser = { id: 'sam', name: 'Sam', email: 's@x.test', role: 'STUDENT', locale: 'en', timezone: 'Asia/Dubai' };
  function app(who: CurrentUser | null) {
    const ctx = build();
    const a = new Hono<AppEnv>();
    a.onError(errorHandler);
    a.use('*', async (c, next) => (c.set('user', who), next()));
    a.route('/me', progressRoutes(ctx.service));
    return { a, ...ctx };
  }
  const json = (method: string, body: unknown) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  test('sign-in required', async () => {
    const { a } = app(null);
    expect((await a.request('/me/progress')).status).toBe(401);
    expect((await a.request('/me/badges')).status).toBe(401);
    expect((await a.request('/me/progress/goal', json('PUT', { unit: 'DAYS', target: 3 }))).status).toBe(401);
  });

  test('set, read and clear the weekly goal', async () => {
    const { a, repo } = app(sam);
    const set = await a.request('/me/progress/goal', json('PUT', { unit: 'DAYS', target: 3 }));
    expect(set.status).toBe(200);
    expect((await set.json()).goal).toEqual({ unit: 'DAYS', target: 3, reminders: true, progress: 0, met: false });
    expect(repo.goals.get('sam')).toEqual({ unit: 'DAYS', target: 3, reminders: true });
    expect((await a.request('/me/progress/goal', json('PUT', { unit: 'DAYS', target: 3, reminders: false }))).status).toBe(200);
    expect(repo.goals.get('sam')?.reminders).toBe(false);
    expect((await (await a.request('/me/progress')).json()).goal.target).toBe(3);
    expect((await (await a.request('/me/progress/goal', { method: 'DELETE' })).json()).goal).toBeNull();
  });

  test('rejects an impossible goal', async () => {
    const { a } = app(sam);
    expect((await a.request('/me/progress/goal', json('PUT', { unit: 'DAYS', target: 8 }))).status).toBe(400);
    expect((await a.request('/me/progress/goal', json('PUT', { unit: 'HOURS', target: 3 }))).status).toBe(400);
    expect((await a.request('/me/progress/goal', json('PUT', { unit: 'LESSONS', target: 0 }))).status).toBe(400);
  });

  test('lists every badge, earned or locked', async () => {
    const { a } = app(sam);
    const { items } = await (await a.request('/me/badges')).json();
    expect(items).toHaveLength(8);
    expect(items[0]).toEqual({ id: 'FIRST_LESSON', earnedAt: null });
  });
});

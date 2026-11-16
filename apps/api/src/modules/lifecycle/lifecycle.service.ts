import type { Clock } from '../../core/ports';
import type { Db } from '../../infrastructure/db';
import { emailsIn } from '../notifications/email-templates';
import type { Notifier } from '../notifications/notification.types';

const DAY = 86_400_000;

export interface InactiveLearner {
  subscriptionId: string;
  userId: string;
  courseSlug: string;
  courseEn: string;
  courseAr: string;
  /** Last lesson completed or video watched in this course (or the plan's start when there is none). */
  lastActivityAt: Date;
}

export interface EndedPlan {
  subscriptionId: string;
  userId: string;
  courseSlug: string;
  courseEn: string;
  courseAr: string;
  endedAt: Date;
}

export interface LifecycleRepository {
  /** Learners on a live plan (ACTIVE or CANCELLING) whose last activity in that course is before `before`. */
  inactiveLearners(before: Date): Promise<InactiveLearner[]>;
  /** Plans that ended (EXPIRED) with their last period ending in [from, to). */
  endedPlans(from: Date, to: Date): Promise<EndedPlan[]>;
  /** Students who signed up in [from, to) and have bought nothing yet. */
  newStudentsWithoutPurchase(from: Date, to: Date): Promise<string[]>;
  /** Records the message once; false when it was already sent (the key is unique per user). */
  claim(userId: string, key: string, at: Date): Promise<boolean>;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Hourly job: the messages that bring learners back.
 * - Welcome: a day after sign-up, and again on day 4 for students who haven't bought anything (free previews, how to pick).
 * - Inactive: a learner on a live plan with no progress in that course for 7 days, once per quiet stretch.
 * - Win-back: 7 and 30 days after a plan ended.
 * Each message is claimed in LifecycleMessage first (unique per user and key), so nothing is ever sent twice.
 */
export class LifecycleService {
  constructor(
    private readonly repo: LifecycleRepository,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
    private readonly webUrl: string,
  ) {}

  async run() {
    const now = this.clock.now();
    const sent = { welcome: 0, inactive: 0, winback: 0 };

    for (const [day, key] of [
      [1, 'welcome-1'],
      [4, 'welcome-4'],
    ] as const) {
      const from = new Date(now.getTime() - (day + 1) * DAY);
      const to = new Date(now.getTime() - day * DAY);
      for (const userId of await this.repo.newStudentsWithoutPurchase(from, to)) {
        if (!(await this.repo.claim(userId, key, now))) continue;
        await this.notifier.notify([userId], this.welcome(day), { channels: ['in-app', 'email'] });
        sent.welcome++;
      }
    }

    for (const l of await this.repo.inactiveLearners(new Date(now.getTime() - 7 * DAY))) {
      // One nudge per quiet stretch: new activity gives a new key.
      if (!(await this.repo.claim(l.userId, `inactive:${l.subscriptionId}:${isoDay(l.lastActivityAt)}`, now))) continue;
      const url = `${this.webUrl}/learn/courses/${encodeURIComponent(l.courseSlug)}`;
      await this.notifier.notify(
        [l.userId],
        {
          type: 'LEARNING_NUDGE',
          title: `Pick up ${l.courseEn} where you left off`,
          body: 'A short lesson today keeps the course moving. Your plan is still running.',
          ar: { title: `أكمل ${l.courseAr} من حيث توقفت`, body: 'درس قصير اليوم يبقي الدورة في حركة. اشتراكك ما زال ساريًا.' },
          data: { courseSlug: l.courseSlug, subscriptionId: l.subscriptionId },
          email: (r) => emailsIn(r.locale).learningNudge(r.name, r.locale.startsWith('ar') ? l.courseAr : l.courseEn, url),
        },
        { channels: ['in-app', 'push', 'email'] },
      );
      sent.inactive++;
    }

    for (const days of [7, 30] as const) {
      const from = new Date(now.getTime() - (days + 1) * DAY);
      const to = new Date(now.getTime() - days * DAY);
      for (const p of await this.repo.endedPlans(from, to)) {
        if (!(await this.repo.claim(p.userId, `winback-${days}:${p.subscriptionId}`, now))) continue;
        const url = `${this.webUrl}/courses/${encodeURIComponent(p.courseSlug)}`;
        await this.notifier.notify(
          [p.userId],
          {
            type: 'PLAN_WINBACK',
            title: `Come back to ${p.courseEn}`,
            body: 'Your progress and certificate progress are saved. Renew any time to carry on.',
            ar: { title: `عُد إلى ${p.courseAr}`, body: 'تقدّمك محفوظ، وكذلك تقدّمك نحو الشهادة. جدّد في أي وقت لتكمل.' },
            data: { courseSlug: p.courseSlug, subscriptionId: p.subscriptionId },
            email: (r) => emailsIn(r.locale).planWinback(r.name, r.locale.startsWith('ar') ? p.courseAr : p.courseEn, url),
          },
          { channels: ['in-app', 'email'] },
        );
        sent.winback++;
      }
    }
    return sent;
  }

  private welcome(day: 1 | 4) {
    const url = `${this.webUrl}/`;
    return day === 1
      ? {
          type: 'WELCOME',
          title: 'Welcome to Azza',
          body: 'Start with a free preview lesson, or pick a live class that fits your week.',
          ar: { title: 'أهلًا بك في عازة', body: 'ابدأ بدرس مجاني للمعاينة، أو اختر صفًا مباشرًا يناسب أسبوعك.' },
          email: (r: { name: string; locale: string }) => emailsIn(r.locale).welcome(r.name, url),
        }
      : {
          type: 'WELCOME',
          title: 'Not sure where to start?',
          body: 'Every recorded course has a free lesson you can watch now, and live classes start every month.',
          ar: { title: 'لا تعرف من أين تبدأ؟', body: 'لكل دورة مسجّلة درس مجاني تشاهده الآن، والصفوف المباشرة تبدأ كل شهر.' },
          email: (r: { name: string; locale: string }) => emailsIn(r.locale).welcomeFollowUp(r.name, url),
        };
  }
}

export class PrismaLifecycleRepository implements LifecycleRepository {
  constructor(private readonly db: Db) {}

  async inactiveLearners(before: Date) {
    const plans = await this.db.subscription.findMany({
      where: { status: { in: ['ACTIVE', 'CANCELLING'] }, createdAt: { lt: before } },
      select: { id: true, userId: true, createdAt: true, course: { select: { id: true, slug: true, titleEn: true, titleAr: true } } },
      take: 2000,
    });
    const out: InactiveLearner[] = [];
    for (const p of plans) {
      const lessonFilter = { lesson: { module: { courseId: p.course.id } } };
      const [done, watched] = await Promise.all([
        this.db.lessonProgress.findFirst({ where: { userId: p.userId, ...lessonFilter }, orderBy: { completedAt: 'desc' }, select: { completedAt: true } }),
        this.db.lessonVideoPosition.findFirst({ where: { userId: p.userId, ...lessonFilter }, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
      ]);
      const last = Math.max(p.createdAt.getTime(), done?.completedAt.getTime() ?? 0, watched?.updatedAt.getTime() ?? 0);
      if (last >= before.getTime()) continue;
      out.push({
        subscriptionId: p.id,
        userId: p.userId,
        courseSlug: p.course.slug,
        courseEn: p.course.titleEn,
        courseAr: p.course.titleAr ?? p.course.titleEn,
        lastActivityAt: new Date(last),
      });
    }
    return out;
  }

  async endedPlans(from: Date, to: Date) {
    const rows = await this.db.subscription.findMany({
      where: { status: 'EXPIRED', currentPeriodEnd: { gte: from, lt: to } },
      select: { id: true, userId: true, currentPeriodEnd: true, course: { select: { slug: true, titleEn: true, titleAr: true } } },
    });
    // A learner who already has another live plan for the course needs no win-back.
    const out: EndedPlan[] = [];
    for (const r of rows) {
      const live = await this.db.subscription.count({ where: { userId: r.userId, course: { slug: r.course.slug }, status: { in: ['ACTIVE', 'CANCELLING', 'PAST_DUE'] } } });
      if (live) continue;
      out.push({ subscriptionId: r.id, userId: r.userId, courseSlug: r.course.slug, courseEn: r.course.titleEn, courseAr: r.course.titleAr ?? r.course.titleEn, endedAt: r.currentPeriodEnd! });
    }
    return out;
  }

  async newStudentsWithoutPurchase(from: Date, to: Date) {
    const users = await this.db.user.findMany({
      where: {
        role: 'STUDENT',
        banned: false,
        createdAt: { gte: from, lt: to },
        orders: { none: { status: { in: ['PAID', 'REFUNDED'] } } },
        subscriptions: { none: { status: { not: 'INCOMPLETE' } } },
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  async claim(userId: string, key: string, at: Date) {
    const r = await this.db.lifecycleMessage.createMany({ data: [{ userId, key, sentAt: at }], skipDuplicates: true });
    return r.count > 0;
  }
}

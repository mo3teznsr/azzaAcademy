import { ALL_ACCESS_ID, isAllAccess } from '@azza/shared';
import type { Clock } from '../../core/ports';
import type { Db } from '../../infrastructure/db';
import { emailsIn } from '../notifications/email-templates';
import type { Notifier } from '../notifications/notification.types';
import { ALL_ACCESS_TITLE } from '../all-access/all-access-course';

const DAY = 86_400_000;

export interface InactiveLearner {
  subscriptionId: string;
  userId: string;
  /** The course's slug, or `ALL_ACCESS_ID` for an all-access plan. */
  courseSlug: string;
  courseEn: string;
  courseAr: string;
  /** Last lesson completed or video watched in this course (or the plan's start when there is none). */
  lastActivityAt: Date;
}

export interface EndedPlan {
  subscriptionId: string;
  userId: string;
  /** The course's slug, or `ALL_ACCESS_ID` for an all-access plan. */
  courseSlug: string;
  courseEn: string;
  courseAr: string;
  endedAt: Date;
}

export interface LifecycleRepository {
  /** Learners on a live plan (ACTIVE or CANCELLING) whose last activity in that course (all-access: any recorded course) is before `before`. */
  inactiveLearners(before: Date): Promise<InactiveLearner[]>;
  /** Plans that ended (EXPIRED) with their last period ending in [from, to). */
  endedPlans(from: Date, to: Date): Promise<EndedPlan[]>;
  /** Students who signed up in [from, to) and have bought nothing yet. */
  newStudentsWithoutPurchase(from: Date, to: Date): Promise<string[]>;
  /** Records the message once; false when it was already sent (the key is unique per user). */
  claim(userId: string, key: string, at: Date): Promise<boolean>;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** A plan's course names; an all-access plan (no course) goes by `ALL_ACCESS_ID` and the plan's own names. */
const planNames = (course: { slug: string; titleEn: string; titleAr: string | null } | null) =>
  course
    ? { courseSlug: course.slug, courseEn: course.titleEn, courseAr: course.titleAr ?? course.titleEn }
    : { courseSlug: ALL_ACCESS_ID, courseEn: ALL_ACCESS_TITLE.en, courseAr: ALL_ACCESS_TITLE.ar };

/**
 * Hourly job: the messages that bring learners back.
 * - Welcome: a day after sign-up, and again on day 4 for students who haven't bought anything (free previews, how to pick).
 * - Inactive: a learner on a live plan with no progress in that course (all-access: in any recorded course) for 7 days,
 *   once per quiet stretch.
 * - Win-back: 7 and 30 days after a plan ended (an all-access one links to /all-access).
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
      await this.notifier.notify([l.userId], this.nudge(l), { channels: ['in-app', 'push', 'email'] });
      sent.inactive++;
    }

    for (const days of [7, 30] as const) {
      const from = new Date(now.getTime() - (days + 1) * DAY);
      const to = new Date(now.getTime() - days * DAY);
      for (const p of await this.repo.endedPlans(from, to)) {
        if (!(await this.repo.claim(p.userId, `winback-${days}:${p.subscriptionId}`, now))) continue;
        await this.notifier.notify([p.userId], this.winback(p), { channels: ['in-app', 'email'] });
        sent.winback++;
      }
    }
    return sent;
  }

  /** A quiet learner. All-access: quiet across every recorded course; it opens the dashboard (web) or the plan's screen (apps). */
  private nudge(l: InactiveLearner) {
    const data = { courseSlug: l.courseSlug, subscriptionId: l.subscriptionId };
    if (isAllAccess(l.courseSlug)) {
      const url = `${this.webUrl}/learn`;
      return {
        type: 'LEARNING_NUDGE',
        title: 'Your all-access plan is waiting',
        body: 'Every recorded course is open to you. A short lesson today keeps you moving.',
        ar: { title: 'اشتراكك الشامل بانتظارك', body: 'كل الدورات المسجّلة مفتوحة لك. درس قصير اليوم يبقيك في الطريق.' },
        data,
        email: (r: { name: string; locale: string }) => emailsIn(r.locale).allAccessNudge(r.name, url),
      };
    }
    const url = `${this.webUrl}/learn/courses/${encodeURIComponent(l.courseSlug)}`;
    return {
      type: 'LEARNING_NUDGE',
      title: `Pick up ${l.courseEn} where you left off`,
      body: 'A short lesson today keeps the course moving. Your plan is still running.',
      ar: { title: `أكمل ${l.courseAr} من حيث توقفت`, body: 'درس قصير اليوم يبقي الدورة في حركة. اشتراكك ما زال ساريًا.' },
      data,
      email: (r: { name: string; locale: string }) => emailsIn(r.locale).learningNudge(r.name, r.locale.startsWith('ar') ? l.courseAr : l.courseEn, url),
    };
  }

  /** A plan that ended: back to the course, or to /all-access for an all-access plan. */
  private winback(p: EndedPlan) {
    const data = { courseSlug: p.courseSlug, subscriptionId: p.subscriptionId };
    if (isAllAccess(p.courseSlug)) {
      const url = `${this.webUrl}/all-access`;
      return {
        type: 'PLAN_WINBACK',
        title: 'Come back to every recorded course',
        body: 'Your progress in every course is saved. Renew your all-access plan any time to carry on.',
        ar: { title: 'عُد إلى كل الدورات المسجّلة', body: 'تقدّمك محفوظ في كل دورة. جدّد اشتراكك الشامل في أي وقت لتكمل.' },
        data,
        email: (r: { name: string; locale: string }) => emailsIn(r.locale).allAccessWinback(r.name, url),
      };
    }
    const url = `${this.webUrl}/courses/${encodeURIComponent(p.courseSlug)}`;
    return {
      type: 'PLAN_WINBACK',
      title: `Come back to ${p.courseEn}`,
      body: 'Your progress and certificate progress are saved. Renew any time to carry on.',
      ar: { title: `عُد إلى ${p.courseAr}`, body: 'تقدّمك محفوظ، وكذلك تقدّمك نحو الشهادة. جدّد في أي وقت لتكمل.' },
      data,
      email: (r: { name: string; locale: string }) => emailsIn(r.locale).planWinback(r.name, r.locale.startsWith('ar') ? p.courseAr : p.courseEn, url),
    };
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
      // An all-access plan (no course) counts activity in any recorded course.
      const lessonFilter = p.course ? { lesson: { module: { courseId: p.course.id } } } : { lesson: { module: { course: { type: 'RECORDED' as const } } } };
      const [done, watched] = await Promise.all([
        this.db.lessonProgress.findFirst({ where: { userId: p.userId, ...lessonFilter }, orderBy: { completedAt: 'desc' }, select: { completedAt: true } }),
        this.db.lessonVideoPosition.findFirst({ where: { userId: p.userId, ...lessonFilter }, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
      ]);
      const last = Math.max(p.createdAt.getTime(), done?.completedAt.getTime() ?? 0, watched?.updatedAt.getTime() ?? 0);
      if (last >= before.getTime()) continue;
      out.push({
        subscriptionId: p.id,
        userId: p.userId,
        ...planNames(p.course),
        lastActivityAt: new Date(last),
      });
    }
    return out;
  }

  async endedPlans(from: Date, to: Date) {
    const rows = await this.db.subscription.findMany({
      where: { status: 'EXPIRED', currentPeriodEnd: { gte: from, lt: to } },
      select: { id: true, userId: true, courseId: true, currentPeriodEnd: true, course: { select: { slug: true, titleEn: true, titleAr: true } } },
    });
    // No win-back for a learner who already has another live plan for the course, or a live all-access plan (it opens every
    // recorded course). An ended all-access plan is skipped only for another live all-access plan.
    const out: EndedPlan[] = [];
    const LIVE = { in: ['ACTIVE', 'CANCELLING', 'PAST_DUE'] as Array<'ACTIVE' | 'CANCELLING' | 'PAST_DUE'> };
    for (const r of rows) {
      const live = await this.db.subscription.count({
        where: { userId: r.userId, status: LIVE, OR: [{ courseId: null }, ...(r.courseId ? [{ courseId: r.courseId }] : [])] },
      });
      if (live) continue;
      out.push({ subscriptionId: r.id, userId: r.userId, ...planNames(r.course), endedAt: r.currentPeriodEnd! });
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

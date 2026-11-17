'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Infinity as InfinityIcon } from 'lucide-react';
import { ALL_ACCESS_ID } from '@azza/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageTitle } from '@/components/brand/section';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { allAccessApi, allAccessQueryKeys, isAllAccessSlug, learningApi, subscriptionsApi, type MySubscription } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useAuth } from '@/lib/auth/use-auth';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { PlanForm } from './plan-picker';

/** The public plan (on/off, prices, course count). */
export function useAllAccessPlan() {
  return useQuery({ queryKey: allAccessQueryKeys.plan, queryFn: allAccessApi.plan, staleTime: 5 * 60_000, retry: false });
}

/** The learner's all-access row that decides access, if any. */
export function findAllAccess(rows: MySubscription[] | undefined, withAccess = true) {
  return rows?.find((s) => isAllAccessSlug(s.course.slug) && s.status !== 'INCOMPLETE' && (!withAccess || s.hasAccess)) ?? null;
}

/**
 * A quiet second offer under a recorded course's own plan card: the same money could open every course.
 * Renders nothing while the plan is off or has no prices.
 */
export function AllAccessTeaser() {
  const { t, f, fill } = useI18n();
  const money = useMoney();
  const plan = useAllAccessPlan();
  const p = plan.data;
  if (!p?.enabled || p.monthlyPriceFils == null || p.yearlyPriceFils == null) return null;
  const perMonth = Math.min(p.monthlyPriceFils, Math.round(p.yearlyPriceFils / 12));
  return (
    <aside aria-labelledby="all-access-teaser" className="flex flex-col gap-3 rounded-[24px] border border-dashed border-line-strong p-5">
      <span className="label-mono flex items-center gap-1.5 text-muted-foreground">
        <InfinityIcon className="size-4" aria-hidden /> {t.allAccess.kicker}
      </span>
      <h3 id="all-access-teaser" className="font-display text-xl font-extrabold leading-tight">
        {t.allAccess.title}
      </h3>
      <p className="text-sm text-muted-foreground">
        {f.plural(p.courseCount, t.allAccess.courses)} · {fill(t.allAccess.from, { amount: money.display(perMonth) })}
      </p>
      <Button asChild variant="outline" className="self-start">
        <Link href="/all-access">
          {t.allAccess.cta} <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </Link>
      </Button>
    </aside>
  );
}

/** On a recorded course page, for a learner whose all-access plan opens it. */
export function AllAccessIncluded({ courseId }: { courseId: string }) {
  const { t } = useI18n();
  const lessons = useQuery({ queryKey: qk.lessons(courseId), queryFn: () => learningApi.lessons(courseId), retry: false });
  const nextId = lessons.data?.progress.nextLesson?.id ?? lessons.data?.modules.flatMap((m) => m.lessons)[0]?.id;
  return (
    <Card className="theme-cream h-fit gap-0 rounded-[24px] bg-ivory py-0 text-ink ring-0 light:border light:border-border lg:sticky lg:top-6">
      <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
        <span className="label-mono flex items-center gap-1.5 text-stone-2">
          <InfinityIcon className="size-4" aria-hidden /> {t.allAccess.kicker}
        </span>
        <b className="font-display text-2xl font-extrabold leading-tight">{t.allAccess.includedTitle}</b>
        <p className="text-sm text-stone-2">{t.allAccess.includedBody}</p>
        <Button asChild variant="ink" size="lg" className="w-full">
          <Link href={nextId ? `/learn/courses/${courseId}?lesson=${nextId}` : `/learn/courses/${courseId}`}>{t.allAccess.continue}</Link>
        </Button>
        <Link href="/plans" className="text-[13px] text-stone-2 underline-offset-4 hover:underline">
          {t.allAccess.managePlan}
        </Link>
      </CardContent>
    </Card>
  );
}

/** `/all-access`: what the plan opens, and the same plan form as a recorded course (card or bank transfer). */
export function AllAccessPage() {
  const { t, f } = useI18n();
  const { isSignedIn } = useAuth();
  const plan = useAllAccessPlan();
  const subs = useQuery({ queryKey: qk.mySubscriptions, queryFn: subscriptionsApi.mine, enabled: !!isSignedIn, retry: false });
  const mine = findAllAccess(subs.data, false);
  const p = plan.data;
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-5">
          <span className="label-mono flex items-center gap-1.5 text-muted-foreground">
            <InfinityIcon className="size-4" aria-hidden /> {t.allAccess.kicker}
          </span>
          <PageTitle title={t.allAccess.title} />
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">{t.allAccess.body}</p>
          {p && <p className="font-semibold">{f.plural(p.courseCount, t.allAccess.courses)}</p>}
          <Button asChild variant="outline" className="self-start">
            <Link href="/#catalog">{t.allAccess.browse}</Link>
          </Button>
          <p className="text-[13px] text-muted-foreground">{t.allAccess.appNote}</p>
        </div>
        {plan.isPending ? (
          <LoadingBlock rows={1} height={420} />
        ) : plan.isError ? (
          <ErrorState error={plan.error} onRetry={() => void plan.refetch()} />
        ) : mine?.hasAccess ? (
          <Card className="h-fit rounded-[24px]">
            <CardContent className="flex flex-col gap-4 p-6">
              <b className="font-display text-2xl font-extrabold">{t.recorded.yourPlan}</b>
              <Button asChild variant="ink" size="lg">
                <Link href="/plans">{t.allAccess.managePlan}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : !p?.enabled ? (
          <p role="status" className="h-fit rounded-xl bg-sage px-4 py-3 text-sm font-semibold text-ink">
            {t.allAccess.unavailable}
          </p>
        ) : (
          <PlanForm
            course={{ id: ALL_ACCESS_ID, slug: ALL_ACCESS_ID, titleEn: t.allAccess.name, monthlyPriceFils: p.monthlyPriceFils, yearlyPriceFils: p.yearlyPriceFils }}
            subscription={mine}
            renewing={false}
            gets={[t.allAccess.getLessons, t.allAccess.getCertificate, t.allAccess.getCancel]}
            signInNext="/all-access"
          />
        )}
      </section>
    </div>
  );
}

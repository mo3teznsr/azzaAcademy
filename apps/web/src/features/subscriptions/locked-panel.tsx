'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingBlock } from '@/components/brand/states';
import { coursesApi, subscriptionsApi } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { PlanPicker } from './plan-picker';
import { PendingTransfer } from './manage-plan';

/**
 * Reading a lesson that needs a plan: a calm panel with the plans right there, not an error page.
 * A learner whose plan ended sees that their progress is saved.
 */
export function LockedLessonPanel({ slug, lapsed, embedded }: { slug: string; lapsed: boolean; embedded?: boolean }) {
  const { t } = useI18n();
  const course = useQuery({ queryKey: qk.course(slug), queryFn: () => coursesApi.get(slug), retry: false });
  const subs = useQuery({ queryKey: qk.mySubscriptions, queryFn: subscriptionsApi.mine, retry: false });
  const subscription = subs.data?.find((s) => s.course.slug === slug && s.status !== 'INCOMPLETE') ?? null;
  const pending = subs.data?.find((s) => s.course.slug === slug && s.status === 'INCOMPLETE' && !!s.pendingPayment && s.pendingPayment.status !== 'REJECTED') ?? null;
  const c = course.data;
  return (
    <section aria-labelledby="locked-title" className={cn('mx-auto grid w-full items-start gap-8 py-6', embedded ? 'max-w-xl' : 'max-w-4xl lg:grid-cols-[1fr_minmax(0,420px)]')}>
      <div className="flex flex-col items-start gap-4">
        <span className="flex size-11 items-center justify-center rounded-full bg-secondary" aria-hidden>
          <Lock className="size-5" />
        </span>
        <h1 id="locked-title" className="font-display text-3xl font-extrabold leading-tight">
          {t.recorded.lockedTitle}
        </h1>
        <p className="max-w-[46ch] text-muted-foreground">{lapsed ? t.recorded.lockedLapsed : t.recorded.lockedBody}</p>
        <Button asChild variant="outline">
          <Link href={`/courses/${slug}`}>{t.recorded.previewBack}</Link>
        </Button>
      </div>
      {course.isPending ? (
        <LoadingBlock rows={1} height={320} />
      ) : pending ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-xl font-extrabold">{t.recorded.pendingTitle}</h2>
          <PendingTransfer subscription={pending} />
        </div>
      ) : c ? (
        <PlanPicker course={c} subscription={subscription} />
      ) : (
        <Button asChild variant="ink" className="self-start">
          <Link href={`/courses/${slug}#plan`}>{t.recorded.seePlans}</Link>
        </Button>
      )}
    </section>
  );
}

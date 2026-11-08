'use client';

import { useQuery } from '@tanstack/react-query';
import { PageTitle } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { subscriptionsApi } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { ManagePlan } from './manage-plan';

/** "Your plans": one card per recorded-course subscription, with the things a learner may want to change. */
export function PlansPage() {
  const { t } = useI18n();
  const q = useQuery({ queryKey: qk.mySubscriptions, queryFn: subscriptionsApi.mine, retry: false });
  // An unfinished card checkout (INCOMPLETE, no transfer attached) isn't a plan yet.
  const rows = (q.data ?? []).filter((s) => s.status !== 'INCOMPLETE' || !!s.pendingPayment);
  return (
    <>
      <PageTitle title={t.recorded.plansTitle} />
      <p className="max-w-xl text-muted-foreground">{t.recorded.plansIntro}</p>
      {q.isPending ? (
        <LoadingBlock rows={2} height={160} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title={t.recorded.plansEmptyTitle} body={t.recorded.plansEmptyBody} action={{ label: t.recorded.plansBrowse, href: '/#catalog' }} />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] items-start gap-4">
          {rows.map((s) => (
            <li key={s.id} className="flex min-w-0 flex-col">
              <ManagePlan subscription={s} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { SignalMark } from '@/components/brand/signal-mark';
import { ErrorState } from '@/components/brand/states';
import { subscriptionsApi } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

/** Poll every 1.5 s while the webhook hasn't landed, for up to a minute. */
const POLL_MS = 1_500;
const DEADLINE_MS = 60_000;

/** Stripe Checkout landing for a plan (`/learn/recorded/return?ref=…`): setting up → into the first lesson, or "still processing". */
export function RecordedReturn({ reference }: { reference: string | null }) {
  const { t } = useI18n();
  if (!reference) return <ErrorState error={new Error(t.recorded.return.missingRef)} />;
  return <ReturnView reference={reference} />;
}

function ReturnView({ reference }: { reference: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  // A fresh key per visit, so counts or data cached from an earlier visit can't leak in.
  const [visit] = useState(() => Date.now());
  const [timedOut, setTimedOut] = useState(false);
  const timedOutRef = useRef(false);
  useEffect(() => {
    const id = setTimeout(() => {
      timedOutRef.current = true;
      setTimedOut(true);
    }, DEADLINE_MS);
    return () => clearTimeout(id);
  }, []);
  const q = useQuery({
    queryKey: ['subscription', 'by-reference', reference, visit],
    queryFn: () => subscriptionsApi.byReference(reference),
    gcTime: 0,
    // INCOMPLETE is the normal state until the webhook lands; it is never a failure. Poll until active or the 60 s deadline.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'ACTIVE' || status === 'CANCELLING' || timedOutRef.current) return false;
      return POLL_MS;
    },
    retry: 2,
    retryDelay: POLL_MS,
  });
  const active = q.data?.status === 'ACTIVE' || q.data?.status === 'CANCELLING';
  const slug = q.data?.courseSlug;
  const next = q.data?.nextLessonId;
  useEffect(() => {
    if (!active || !slug) return;
    void qc.invalidateQueries({ queryKey: qk.mySubscriptions });
    void qc.invalidateQueries({ queryKey: qk.learningProgress });
    router.replace(next ? `/learn/courses/${slug}?lesson=${next}` : `/learn/courses/${slug}`);
  }, [active, slug, next, qc, router]);

  const slow = timedOut && !active;
  const view = active ? 'active' : slow ? 'slow' : 'waiting';
  const copy = {
    waiting: { title: t.recorded.return.settingUpTitle, body: t.recorded.return.settingUpBody },
    active: { title: t.recorded.return.activeTitle, body: t.recorded.return.activeBody },
    slow: { title: t.recorded.return.slowTitle, body: t.recorded.return.slowBody },
  }[view];
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <section
        role="status"
        aria-live="polite"
        aria-busy={view === 'waiting'}
        className={cn('rounded-[28px] p-6 sm:p-8', view === 'active' ? 'bg-sage text-ink' : 'border border-border bg-card')}
      >
        <SignalMark state={view === 'active' ? 'live' : 'starting'} size={36} />
        <h1 className="mt-6 font-display text-[clamp(32px,5vw,56px)] font-extrabold leading-[0.95]">{copy.title}</h1>
        <p className="mt-3 text-lg opacity-80">{copy.body}</p>
      </section>
      {view === 'slow' && (
        <div className="flex flex-wrap gap-3">
          <Button size="lg" onClick={() => void q.refetch()}>
            {t.recorded.return.checkAgain}
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/plans">{t.recorded.return.yourPlans}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

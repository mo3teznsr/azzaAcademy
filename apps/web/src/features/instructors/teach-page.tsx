'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpenCheck, Hourglass, MessageSquareWarning, RefreshCw, UsersRound, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { ReviewNoteQuote } from '@/features/admin/proposal-review';
import { instructorsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth/use-auth';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { ApplicationForm } from './application-form';

const POINT_ICONS = [BookOpenCheck, UsersRound, Wallet];
const PROPOSE = '/studio/courses/new';

/** `/teach`: the pitch plus, depending on who is looking, the application, its status, or the way into the studio. */
export function TeachPage() {
  const { t } = useI18n();
  const c = t.instructors.apply;
  return (
    <div className="mx-auto grid w-full max-w-[1360px] items-start gap-10 px-4 pt-6 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:px-10">
      <section aria-labelledby="teach-title" className="flex flex-col gap-8 lg:sticky lg:top-8">
        <div className="flex flex-col gap-5">
          <span className="label-mono text-muted-foreground">{c.kicker}</span>
          <h1 id="teach-title" className="font-display text-[clamp(44px,6.5vw,88px)] font-extrabold leading-[0.9]">
            {c.titleA}
            <span className="block font-light">{c.titleB}</span>
          </h1>
          <p className="max-w-lg text-lg text-soft-foreground">{c.body}</p>
        </div>
        <ul className="flex flex-col gap-4">
          {c.points.map((p, i) => {
            const Icon = POINT_ICONS[i] ?? BookOpenCheck;
            return (
              <li key={p.title} className="flex gap-4 border-t border-border pt-4">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-sage text-sage-fg">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="flex flex-col gap-0.5">
                  <b className="font-display text-base">{p.title}</b>
                  <span className="text-sm text-muted-foreground">{p.body}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <ApplyPanel />
    </div>
  );
}

function ApplyPanel() {
  const { t, f, fill } = useI18n();
  const c = t.instructors.apply;
  const { user, role, isPending: authPending, refetch } = useAuth();
  const isStudent = role === 'STUDENT';
  const mine = useQuery({ queryKey: qk.myInstructorApplication, queryFn: instructorsApi.mine, enabled: isStudent, retry: false });

  if (authPending || (isStudent && mine.isPending)) return <Card><LoadingBlock rows={4} height={56} /></Card>;

  if (!user) {
    return (
      <Card>
        <h2 className="font-display text-[28px] leading-tight font-extrabold">{c.signedOutTitle}</h2>
        <p className="text-muted-foreground">{c.signedOutBody}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={`/sign-up?next=${encodeURIComponent('/teach')}`}>
              {c.createAccount} <ArrowRight className="rtl:rotate-180" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/sign-in?next=${encodeURIComponent('/teach')}`}>{c.signIn}</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const application = isStudent ? (mine.data ?? null) : null;

  if (role === 'TEACHER' || role === 'ADMIN' || application?.status === 'APPROVED') {
    const justApproved = isStudent;
    return (
      <Card tone="ink">
        <span className="label-mono text-mint">{c.kicker}</span>
        <h2 className="font-display text-[clamp(32px,4vw,44px)] leading-tight font-extrabold">{c.approvedTitle}</h2>
        <p className="text-soft-foreground">{justApproved ? c.approvedBody : c.teacherBody}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" variant="sun">
            <Link href={PROPOSE}>
              {c.propose} <ArrowRight className="rtl:rotate-180" />
            </Link>
          </Button>
          {justApproved && (
            <Button type="button" size="lg" variant="outline" onClick={() => void refetch()}>
              <RefreshCw /> {c.refresh}
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (mine.isError) return <Card><ErrorState error={mine.error} onRetry={() => void mine.refetch()} compact /></Card>;

  if (application?.status === 'PENDING') {
    return (
      <Card>
        <span role="status" className="inline-flex size-12 items-center justify-center rounded-full bg-sun text-ink">
          <Hourglass className="size-6" aria-hidden />
        </span>
        <h2 className="font-display text-[28px] leading-tight font-extrabold">{c.pendingTitle}</h2>
        <p className="text-muted-foreground">{fill(c.pendingBody, { d: f.dayMonth(application.createdAt) })}</p>
        <p className="border-t border-border pt-4 font-bold" dir="auto">
          {application.headline}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display text-[28px] leading-tight font-extrabold">{c.formTitle}</h2>
        <p className="text-muted-foreground">{c.formSub}</p>
      </div>
      {application?.status === 'REJECTED' && (
        <section role="alert" className="flex items-start gap-3 rounded-2xl bg-peach p-4 text-ink">
          <MessageSquareWarning className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="flex flex-col gap-2">
            <b className="font-display">{c.rejectedTitle}</b>
            <span className="text-sm">{c.rejectedBody}</span>
            {application.reviewNote && <ReviewNoteQuote note={application.reviewNote} />}
          </div>
        </section>
      )}
      <ApplicationForm key={application?.id ?? 'new'} previous={application} />
    </Card>
  );
}

function Card({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'ink' }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-5 rounded-[18px] p-[clamp(1.25rem,3vw,2.25rem)] shadow-card',
        tone === 'ink' ? 'theme-ink bg-ink-deep text-foreground' : 'border border-border bg-card',
      )}
    >
      {children}
    </div>
  );
}

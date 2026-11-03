'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { CourseCover } from '@/components/brand/course-cover';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { Chip } from '@/components/brand/status-chip';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { ApiError, coursesApi, type TeacherProfile as Profile } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';

const STYLES = ['sun', 'sky', 'sage', 'peach'] as const;

export function TeacherProfile({ id }: { id: string }) {
  const { t } = useI18n();
  const q = useQuery({
    queryKey: qk.teacher(id),
    queryFn: () => coursesApi.teacher(id),
    retry: (n, e) => !(e instanceof ApiError && e.isNotFound) && n < 2,
  });
  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-16 px-4 sm:px-6 lg:px-10">
      {q.isPending ? (
        <LoadingBlock rows={2} height={220} />
      ) : q.error instanceof ApiError && q.error.isNotFound ? (
        <EmptyState title={t.teacherProfile.notFoundTitle} body={t.teacherProfile.notFoundBody} action={{ label: t.nav.public.courses, href: '/#catalog' }} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <ProfileView p={q.data} />
      )}
    </div>
  );
}

function ProfileView({ p }: { p: Profile }) {
  const { t, f, fill, pick } = useI18n();
  const money = useMoney();
  return (
    <>
      <section aria-labelledby="teacher-name" className="grid items-end gap-8 pt-6 md:grid-cols-[auto_1fr]">
        <InitialsAvatar name={p.name} src={p.image} size={176} className="rise rounded-[32px] text-5xl" />
        <div className="flex min-w-0 flex-col gap-4">
          <span className="label-mono text-stone">{t.teacherProfile.kicker}</span>
          <h1 id="teacher-name" className="rise font-display text-[clamp(56px,9vw,128px)] leading-[0.85] font-extrabold" style={{ '--i': 1 } as React.CSSProperties}>
            <bdi>{p.name}</bdi>
          </h1>
          {p.headline && <p className="max-w-2xl text-xl text-cream-2">{p.headline}</p>}
          {p.languages.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="label-mono text-stone">{t.teacherProfile.languages}</span>
              {p.languages.map((l) => (
                <Chip key={l} tone="ivory">
                  {t.status.sessionLanguage[l]}
                </Chip>
              ))}
            </div>
          )}
        </div>
      </section>

      {p.bio && (
        <section aria-labelledby="about" className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <h2 id="about" className="label-mono text-stone">
            {t.teacherProfile.about}
          </h2>
          <p className="max-w-3xl text-lg leading-relaxed whitespace-pre-line">{p.bio}</p>
        </section>
      )}

      <section aria-labelledby="courses" className="flex flex-col gap-6">
        <h2 id="courses" className="font-display text-[40px] leading-none font-extrabold">
          {t.teacherProfile.courses}
        </h2>
        {p.courses.length === 0 ? (
          <p className="text-stone">{t.teacherProfile.noCourses}</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-4">
            {p.courses.map((c, i) => (
              <li key={c.id}>
                <Link href={`/courses/${c.slug}`} className="group flex flex-col gap-3 rounded-[20px] bg-card p-3 text-foreground no-underline">
                  <CourseCover course={{ ...c, coverStyle: STYLES[i % STYLES.length] }} className="h-48" />
                  <span className="flex items-center justify-between gap-2 px-2 pb-2">
                    <b className="text-lg leading-tight">{pick(c.titleEn, c.titleAr).text}</b>
                    <ArrowRight className="size-5 shrink-0 text-sun transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="upcoming" className="flex flex-col gap-6">
        <h2 id="upcoming" className="font-display text-[40px] leading-none font-extrabold">
          {t.teacherProfile.upcoming}
        </h2>
        {p.upcomingBatches.length === 0 ? (
          <p className="text-stone">{t.teacherProfile.noUpcoming}</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
            {p.upcomingBatches.map((b) => (
              <li key={b.id} className="flex flex-col gap-3 rounded-2xl border border-line p-5">
                <div className="flex items-center justify-between gap-2">
                  <b className="font-display text-3xl font-extrabold" dir="ltr">
                    {b.code}
                  </b>
                  {b.status === 'FULL' || b.seatsLeft <= 0 ? <Chip tone="peach">{t.teacherProfile.full}</Chip> : <Chip tone="sage">{fill(t.common.seatsLeft, { n: f.number(b.seatsLeft) })}</Chip>}
                </div>
                <Link href={`/courses/${b.courseSlug}`} className="font-bold text-ivory no-underline hover:underline">
                  {pick(b.courseTitle, b.courseTitleAr).text}
                </Link>
                <span className="font-display text-lg">
                  <bdi dir="ltr">{b.scheduleSummary}</bdi>
                </span>
                <span className="text-sm text-stone">
                  {fill(t.teacherProfile.starts, { d: f.dayMonth(b.startsOn, b.timezone) })} · {t.status.sessionLanguage[b.language]}
                </span>
                <div className="mt-auto flex items-end justify-between gap-2 border-t border-line pt-3">
                  <b className="text-lg">{money.aed(b.priceFils)}</b>
                  <Link href={`/courses/${b.courseSlug}?batch=${b.id}`} className="link-sun inline-flex min-h-11 items-center text-sm">
                    {t.teacherProfile.viewBatch}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

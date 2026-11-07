'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { Chip } from '@/components/brand/status-chip';
import { EmptyState, ErrorState, LoadingGrid } from '@/components/brand/states';
import { useCategoryLabel } from '@/components/brand/category';
import { instructorsApi, type DirectoryTeacher } from '@/lib/api';
import { useAuth } from '@/lib/auth/use-auth';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

/** `/teachers`: the public instructors directory. */
export function InstructorsDirectory() {
  const { t } = useI18n();
  const c = t.instructors.directory;
  const { role } = useAuth();
  const q = useQuery({ queryKey: qk.teachersDirectory, queryFn: instructorsApi.directory, staleTime: 5 * 60_000 });
  const canTeach = role === 'TEACHER' || role === 'ADMIN';

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-12 px-4 sm:px-6 lg:px-10">
      <header className="grid gap-6 pt-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div className="flex flex-col gap-4">
          <span className="label-mono text-muted-foreground">{c.kicker}</span>
          <h1 className="font-display text-[clamp(44px,7vw,96px)] font-extrabold leading-[0.9]">{c.title}</h1>
        </div>
        <p className="max-w-md text-lg text-soft-foreground lg:justify-self-end">{c.body}</p>
      </header>

      {q.isPending ? (
        <LoadingGrid count={6} height={280} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState title={c.empty} body={c.emptyBody} />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {q.data.map((teacher) => (
            <li key={teacher.id}>
              <InstructorCard teacher={teacher} />
            </li>
          ))}
        </ul>
      )}

      {!canTeach && (
        <section aria-labelledby="teach-cta" className="theme-ink flex flex-wrap items-center justify-between gap-6 rounded-[24px] bg-ink-deep p-[clamp(1.5rem,4vw,3rem)] text-foreground">
          <div className="flex max-w-xl flex-col gap-2">
            <h2 id="teach-cta" className="font-display text-[clamp(28px,3.5vw,40px)] font-extrabold leading-tight">
              {c.ctaTitle}
            </h2>
            <p className="text-soft-foreground">{c.ctaBody}</p>
          </div>
          <Button asChild size="lg" variant="sun">
            <Link href="/teach">
              {c.ctaButton} <ArrowRight className="rtl:rotate-180" />
            </Link>
          </Button>
        </section>
      )}
    </div>
  );
}

function InstructorCard({ teacher }: { teacher: DirectoryTeacher }) {
  const { t, f, fill, pick } = useI18n();
  const c = t.instructors.directory;
  const categoryLabel = useCategoryLabel();
  const subject = teacher.headline || teacher.courses.map((co) => pick(co.titleEn, co.titleAr).text).join(' · ');
  return (
    <Link
      href={`/teachers/${teacher.id}`}
      aria-label={fill(c.profileOf, { name: teacher.name })}
      className="group flex h-full flex-col gap-5 rounded-[18px] border border-border bg-card p-5 text-foreground no-underline shadow-card transition-[translate,border-color] duration-200 hover:-translate-y-0.5 hover:border-green-deep focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      <div className="flex items-center gap-4">
        <InitialsAvatar name={teacher.name} src={teacher.image} size={72} className="rounded-[18px] text-2xl" />
        <div className="flex min-w-0 flex-col gap-1">
          <bdi className="font-display text-xl leading-tight font-extrabold">{teacher.name}</bdi>
          {subject && <span className="line-clamp-2 text-sm text-muted-foreground">{subject}</span>}
        </div>
      </div>

      {teacher.categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {teacher.categories.map((slug) => (
            <Chip key={slug} tone="sage">
              {categoryLabel({ category: slug })}
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-[13px]">
        {teacher.languages.length > 0 && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {c.teaches}
            {teacher.languages.map((l) => (
              <b key={l} className="text-foreground">
                {t.status.sessionLanguage[l]}
              </b>
            ))}
          </span>
        )}
        <span className="flex items-center gap-3 text-muted-foreground">
          <span>{f.plural(teacher.courses.length, c.courses)}</span>
          <span className={cn('flex items-center gap-1.5', teacher.openBatches > 0 && 'font-bold text-sun-fg')}>
            {teacher.openBatches > 0 && <span aria-hidden className="size-1.5 rounded-full bg-green" />}
            {f.plural(teacher.openBatches, c.openBatches)}
          </span>
        </span>
      </div>
    </Link>
  );
}

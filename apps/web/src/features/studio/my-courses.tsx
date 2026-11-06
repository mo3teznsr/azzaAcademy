'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { CourseCover } from '@/components/brand/course-cover';
import { CourseStatusChip } from '@/components/brand/status-chip';
import { PageTitle } from '@/components/brand/section';
import { EmptyState, LoadingBlock, QueryView } from '@/components/brand/states';
import { coursesApi, type Course } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useCategoryLabel } from '@/components/brand/category';
import { ReviewNoteQuote } from '../admin/proposal-review';

/** Studio "My courses": every course this teacher proposed, any status, with the admin's note when one was sent back. */
export function MyCourses() {
  const { t } = useI18n();
  const p = { mine: true, pageSize: 100 };
  const q = useQuery({ queryKey: qk.courses(p), queryFn: () => coursesApi.list(p) });
  return (
    <>
      <PageTitle
        kicker={t.studio.courses.kicker}
        title={t.studio.courses.title}
        aside={
          <Button asChild variant="ink">
            <Link href="/studio/courses/new">{t.studio.courses.newCourse}</Link>
          </Button>
        }
      />
      <QueryView
        query={q}
        isEmpty={(d) => d.items.length === 0}
        loading={<LoadingBlock rows={3} height={96} />}
        empty={<EmptyState title={t.studio.courses.empty} body={t.studio.courses.emptyBody} action={{ label: t.studio.proposeCourse, href: '/studio/courses/new' }} />}
      >
        {(d) => (
          <ul className="flex flex-col gap-3">
            {d.items.map((c) => (
              <li key={c.id}>
                <CourseRow c={c} />
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </>
  );
}

function CourseRow({ c }: { c: Course }) {
  const { t, f, fill, pick } = useI18n();
  const categoryLabel = useCategoryLabel();
  const sentBack = c.status === 'DRAFT' && !!c.reviewNote;
  return (
    <article className="flex flex-col gap-3 rounded-[20px] bg-card p-4">
      <Link href={`/studio/courses/${c.id}`} className="flex items-center gap-4 text-foreground no-underline">
        <CourseCover course={c} size="sm" showMeta={false} className="h-16 w-16 shrink-0 rounded-xl p-1.5 [&>span]:text-[11px]" />
        <span className="min-w-0 flex-1">
          <b className="block truncate font-display text-xl">{pick(c.titleEn, c.titleAr).text}</b>
          <span className="text-[13px] text-muted-foreground">
            {categoryLabel(c)} · {t.status.level[c.level]} · {fill(t.studio.courses.updated, { d: f.dayMonth(c.updatedAt) })}
          </span>
        </span>
        <CourseStatusChip status={c.status} />
      </Link>
      {sentBack && (
        <div role="note" className="flex flex-col gap-1.5 rounded-[14px] bg-peach p-3.5 text-ink">
          <b className="text-sm">{t.proposals.sentBackTitle}</b>
          <ReviewNoteQuote note={c.reviewNote!} />
        </div>
      )}
    </article>
  );
}

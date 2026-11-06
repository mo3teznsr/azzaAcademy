'use client';

import { CourseCard } from '@/features/catalog/course-card';
import { usePublicBatches } from '@/features/catalog/use-catalog';
import { PageTitle } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingGrid } from '@/components/brand/states';
import { useI18n } from '@/lib/i18n/provider';
import { useSavedCourses } from './use-saved';

/** Student "Saved": the courses they hearted, newest first. */
export function SavedPage() {
  const { t } = useI18n();
  const saved = useSavedCourses();
  const batches = usePublicBatches();
  return (
    <>
      <PageTitle kicker={t.saved.kicker} title={t.saved.title} />
      {saved.isPending ? (
        <LoadingGrid count={3} height={380} />
      ) : saved.isError ? (
        <ErrorState error={saved.error} onRetry={() => void saved.refetch()} />
      ) : saved.data.length === 0 ? (
        <EmptyState title={t.saved.empty} body={t.saved.emptyBody} action={{ label: t.saved.browse, href: '/#catalog' }} />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-5">
          {saved.data.map((c) => (
            <li key={c.id}>
              <CourseCard course={c} batches={batches.byCourse.get(c.id) ?? []} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

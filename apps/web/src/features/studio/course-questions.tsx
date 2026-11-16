'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageTitle } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { ApiError, lessonQaApi, qaKeys } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';
import { QuestionCard } from '../lessons/lesson-qa';

/** Studio: every learner question across one recorded course's lessons, waiting ones first by default. Author and admins only. */
export function CourseQuestions({ courseId }: { courseId: string }) {
  const { t, fill, pick } = useI18n();
  const c = t.courseInsights;
  const [unanswered, setUnanswered] = useState(true);
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: qaKeys.inbox(courseId, unanswered, page), queryFn: () => lessonQaApi.courseInbox(courseId, unanswered, page), retry: false });
  const title = q.data ? pick(q.data.course.titleEn, q.data.course.titleAr).text : c.questionsTitle;
  const pages = q.data ? Math.max(1, Math.ceil(q.data.total / q.data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <BackToCourse courseId={courseId} />
      <PageTitle kicker={c.questionsKicker} title={title} />
      <Tabs
        value={unanswered ? 'waiting' : 'all'}
        onValueChange={(v) => {
          setUnanswered(v === 'waiting');
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="waiting">{c.unanswered}</TabsTrigger>
          <TabsTrigger value="all">{c.all}</TabsTrigger>
        </TabsList>
      </Tabs>
      {q.isPending ? (
        <LoadingBlock rows={3} height={120} />
      ) : q.isError ? (
        <InsightError error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.items.length === 0 ? (
        <EmptyState title={unanswered ? c.inboxEmpty : c.inboxEmptyAll} body={c.inboxEmptyBody} />
      ) : (
        <ol className="flex flex-col gap-4">
          {q.data.items.map((question) => (
            <li key={question.id}>
              <QuestionCard
                question={question}
                canAnswer
                context={question.lesson && <span className="label-mono text-muted-foreground">{fill(c.onLesson, { lesson: pick(question.lesson.titleEn, question.lesson.titleAr).text })}</span>}
              />
            </li>
          ))}
        </ol>
      )}
      {pages > 1 && (
        <div className="flex justify-between gap-3">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            {t.common.previous}
          </Button>
          <Button variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            {t.common.next}
          </Button>
        </div>
      )}
    </div>
  );
}

export function BackToCourse({ courseId }: { courseId: string }) {
  const { t } = useI18n();
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/studio/courses" className="hover:text-foreground">
        {t.studio.courses.title}
      </Link>
      <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
      <Link href={`/studio/courses/${courseId}`} className="hover:text-foreground">
        {t.courseInsights.back}
      </Link>
    </nav>
  );
}

/** Forbidden and live-course answers get their own message; anything else the shared error state. */
export function InsightError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useI18n();
  if (error instanceof ApiError && error.isForbidden) return <EmptyState title={t.common.forbiddenTitle} body={t.courseInsights.forbidden} />;
  if (error instanceof ApiError && (error.code === 'QA_RECORDED_ONLY' || error.code === 'ANALYTICS_RECORDED_ONLY')) return <EmptyState title={t.courseInsights.recordedOnly} body="" />;
  return <ErrorState error={error} onRetry={onRetry} />;
}

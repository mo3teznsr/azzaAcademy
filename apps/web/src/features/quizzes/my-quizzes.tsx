'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/brand/status-chip';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { learningApi, type MyQuiz } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { QuizStatusChip } from './shared';

export function useMyQuizzes() {
  return useQuery({ queryKey: qk.myQuizzes, queryFn: learningApi.myQuizzes });
}

const isTodo = (q: MyQuiz) => q.mine.status === 'OPEN' || q.mine.status === 'IN_PROGRESS';

export function MyQuizzesPage() {
  const { t } = useI18n();
  const q = useMyQuizzes();
  return (
    <>
      <PageTitle title={t.learning.quizzes.myTitle} />
      {q.isPending ? (
        <LoadingBlock rows={4} height={96} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState title={t.learning.quizzes.myEmpty} body={t.learning.quizzes.myEmptyBody} />
      ) : (
        <div className="flex flex-col gap-8">
          {(
            [
              [t.learning.quizzes.todo, q.data.filter(isTodo)],
              [t.learning.quizzes.done, q.data.filter((x) => !isTodo(x))],
            ] as const
          ).map(([label, list]) =>
            list.length ? (
              <section key={label} className="flex flex-col gap-3">
                <SectionHeader title={label} as="h2" size="sm" />
                <ul className="flex flex-col gap-3">
                  {list.map((quiz) => (
                    <QuizRow key={quiz.id} quiz={quiz} />
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </div>
      )}
    </>
  );
}

function QuizRow({ quiz }: { quiz: MyQuiz }) {
  const { t, f, fill, pick } = useI18n();
  const m = quiz.mine;
  const action = m.status === 'IN_PROGRESS' ? t.learning.quizzes.resume : m.attemptsUsed === 0 && m.canStart ? t.learning.quizzes.start : m.canStart ? t.learning.quizzes.retry : t.learning.quizzes.resultTitle;
  return (
    <li className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="label-mono text-muted-foreground">
          <bdi dir="ltr">{quiz.batch.code}</bdi> · {pick(quiz.batch.course.titleEn, quiz.batch.course.titleAr).text}
        </span>
        <b className="text-lg">{quiz.title}</b>
        <span className="text-[13px] text-muted-foreground">
          {fill(t.learning.quizzes.questions, { n: f.number(quiz.questionCount) })} · {quiz.timeLimitMin ? fill(t.learning.quizzes.timeLimit, { n: f.number(quiz.timeLimitMin) }) : t.learning.quizzes.untimed} ·{' '}
          {fill(t.learning.quizzes.attempts, { a: f.number(m.attemptsUsed), b: f.number(quiz.maxAttempts) })}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {m.bestPercent !== null && <Chip tone="ivory">{fill(t.learning.quizzes.best, { p: f.percent(m.bestPercent) })}</Chip>}
        {quiz.dueAt && <Chip tone="outline">{fill(t.learning.quizzes.due, { d: f.dateTime(quiz.dueAt) })}</Chip>}
        <QuizStatusChip status={m.status} />
        <Button asChild size="sm" variant={m.canStart ? 'default' : 'outline'}>
          <Link href={`/quizzes/${quiz.id}`}>{action}</Link>
        </Button>
      </div>
    </li>
  );
}

/** Learn dashboard panel: quizzes still to do. */
export function QuizzesDuePanel() {
  const { t, f, fill, pick } = useI18n();
  const q = useMyQuizzes();
  const todo = (q.data ?? []).filter(isTodo).slice(0, 4);
  return (
    <Panel aria-labelledby="quizzes-due">
      <SectionHeader title={<span id="quizzes-due">{t.learning.quizzes.dashboardTitle}</span>} href="/quizzes" linkLabel={t.learning.quizzes.dashboardAll} />
      {q.isPending ? (
        <LoadingBlock rows={2} height={56} />
      ) : q.isError ? (
        <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />
      ) : todo.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.learning.quizzes.dashboardEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {todo.map((quiz) => (
            <li key={quiz.id}>
              <Link href={`/quizzes/${quiz.id}`} className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-card p-3.5 transition-colors hover:border-green-deep">
                <div className="min-w-0">
                  <b className="block truncate text-[15px]">{quiz.title}</b>
                  <span className="text-[13px] text-muted-foreground">
                    <bdi dir="ltr">{quiz.batch.code}</bdi> · {pick(quiz.batch.course.titleEn, quiz.batch.course.titleAr).text}
                  </span>
                </div>
                {quiz.dueAt ? <Chip tone="sun">{fill(t.learning.quizzes.due, { d: f.dayMonth(quiz.dueAt) })}</Chip> : <QuizStatusChip status={quiz.mine.status} />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, EyeOff, MessageCircleQuestion } from 'lucide-react';
import { toast } from 'sonner';
import { LESSON_ANSWER_MAX, LESSON_QUESTION_MAX, LESSON_QUESTIONS_PER_DAY } from '@azza/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { Chip } from '@/components/brand/status-chip';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { ApiError, lessonQaApi, qaKeys, type LessonAnswer, type LessonQuestion } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

/** The Q&A under a recorded lesson: ask (learners), read the thread (everyone who can read the lesson), answer and moderate (author, admins). */
export function LessonQaPanel({ lessonId }: { lessonId: string }) {
  const { t, f, fill } = useI18n();
  const [pages, setPages] = useState(1);
  const q = useQuery({ queryKey: qaKeys.lesson(lessonId, pages), queryFn: () => loadPages(lessonId, pages), retry: false });
  const d = q.data;
  return (
    <section id="qa" aria-labelledby={`qa-${lessonId}`} className="flex scroll-mt-24 flex-col gap-5 rounded-2xl border border-border bg-card p-5">
      <header className="flex flex-col gap-1">
        <h2 id={`qa-${lessonId}`} className="flex items-center gap-2 font-display text-2xl font-extrabold">
          <MessageCircleQuestion className="size-5 text-muted-foreground" aria-hidden />
          {t.lessonQa.title}
          {d && d.total > 0 && <span className="timecode text-sm font-normal text-muted-foreground">{f.number(d.total)}</span>}
        </h2>
        {d?.canAsk && <p className="max-w-[60ch] text-sm text-muted-foreground">{t.lessonQa.intro}</p>}
      </header>
      {q.isPending ? (
        <LoadingBlock rows={2} height={72} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} compact />
      ) : (
        <>
          {d!.canAsk && <AskForm lessonId={lessonId} left={d!.questionsLeftToday} />}
          {d!.items.length === 0 ? (
            <div className="flex flex-col gap-1 rounded-xl border border-dashed border-border p-5 text-center">
              <b className="text-sm">{t.lessonQa.empty}</b>
              <span className="text-sm text-muted-foreground">{d!.canAsk ? t.lessonQa.emptyBody : t.lessonQa.emptyStaff}</span>
            </div>
          ) : (
            <ol className="flex flex-col gap-4">
              {d!.items.map((question) => (
                <li key={question.id}>
                  <QuestionCard question={question} canAnswer={d!.canAnswer} />
                </li>
              ))}
            </ol>
          )}
          {d!.items.length < d!.total && (
            <Button variant="outline" className="self-center" onClick={() => setPages((p) => p + 1)} disabled={q.isFetching}>
              {t.lessonQa.loadMore}
            </Button>
          )}
          <span className="sr-only">{fill(t.lessonQa.count, { n: d!.total })}</span>
        </>
      )}
    </section>
  );
}

/** Loads the first `pages` pages and merges them, so "Show more" keeps earlier questions in place after a refetch. */
async function loadPages(lessonId: string, pages: number) {
  const all = await Promise.all(Array.from({ length: pages }, (_, i) => lessonQaApi.questions(lessonId, i + 1)));
  const last = all[all.length - 1]!;
  const seen = new Set<string>();
  const items = all.flatMap((p) => p.items).filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
  return { ...last, items };
}

/** Refreshes every Q&A list (the reader's thread and the author's inbox). */
function useInvalidateQa() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: qaKeys.all });
}

function useQaError() {
  const { t, fill } = useI18n();
  return (e: unknown) => {
    if (e instanceof ApiError && e.code === 'QA_DAILY_LIMIT') toast.error(fill(t.lessonQa.limitReached, { n: LESSON_QUESTIONS_PER_DAY }));
    else toast.error(e instanceof ApiError && e.message && e.status < 500 ? e.message : t.lessonQa.error);
  };
}

function AskForm({ lessonId, left }: { lessonId: string; left: number }) {
  const { t, fill } = useI18n();
  const [body, setBody] = useState('');
  const invalidate = useInvalidateQa();
  const onError = useQaError();
  const ask = useMutation({
    mutationFn: () => lessonQaApi.ask(lessonId, body.trim()),
    onSuccess: () => {
      setBody('');
      toast.success(t.lessonQa.asked);
      void invalidate();
    },
    onError,
  });
  const trimmed = body.trim();
  const tooLong = trimmed.length > LESSON_QUESTION_MAX;
  const blocked = left === 0;
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed.length >= 3 && !tooLong && !blocked) ask.mutate();
      }}
    >
      <label htmlFor={`ask-${lessonId}`} className="text-sm font-bold">
        {t.lessonQa.askLabel}
      </label>
      <Textarea
        id={`ask-${lessonId}`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t.lessonQa.askPlaceholder}
        rows={3}
        maxLength={LESSON_QUESTION_MAX + 200}
        disabled={blocked}
        aria-invalid={tooLong || undefined}
        aria-describedby={`ask-hint-${lessonId}`}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span id={`ask-hint-${lessonId}`} className={cn('text-[13px] text-muted-foreground', (tooLong || blocked) && 'text-danger-fg')}>
          {blocked
            ? fill(t.lessonQa.limitReached, { n: LESSON_QUESTIONS_PER_DAY })
            : tooLong
              ? fill(t.lessonQa.tooLong, { n: LESSON_QUESTION_MAX })
              : fill(t.lessonQa.left, { n: left })}
        </span>
        <Button type="submit" disabled={ask.isPending || blocked || tooLong || trimmed.length < 3}>
          {ask.isPending ? t.lessonQa.asking : t.lessonQa.ask}
        </Button>
      </div>
    </form>
  );
}

/** One question with its answers; used in the lesson reader and in the author's inbox. */
export function QuestionCard({ question, canAnswer, context }: { question: LessonQuestion; canAnswer: boolean; context?: React.ReactNode }) {
  const { t, f } = useI18n();
  const invalidate = useInvalidateQa();
  const onError = useQaError();
  const remove = useMutation({
    mutationFn: () => lessonQaApi.deleteQuestion(question.id),
    onSuccess: () => {
      toast.success(t.lessonQa.deleted);
      void invalidate();
    },
    onError,
  });
  const hide = useMutation({
    mutationFn: (hidden: boolean) => lessonQaApi.hideQuestion(question.id, hidden),
    onSuccess: (r) => {
      toast.success(r.hidden ? t.lessonQa.hiddenDone : t.lessonQa.shownDone);
      void invalidate();
    },
    onError,
  });
  return (
    <article className={cn('flex flex-col gap-3 rounded-xl border border-border p-4', question.hidden && 'border-dashed opacity-80')}>
      {context}
      <div className="flex items-start gap-3">
        <InitialsAvatar name={question.author.name} src={question.author.image} size={32} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
            <b className="text-sm">{question.mine ? t.lessonQa.you : question.author.name}</b>
            <time dateTime={question.createdAt} className="text-muted-foreground">
              {f.dateTime(question.createdAt)}
            </time>
            {question.hidden && (
              <Chip tone="dashed">
                <EyeOff className="size-3" aria-hidden /> {t.lessonQa.hiddenChip}
              </Chip>
            )}
          </div>
          <p className="whitespace-pre-line break-words text-[15px]" dir="auto">
            {question.body}
          </p>
          {question.hidden && question.mine && <span className="text-[13px] text-muted-foreground">{t.lessonQa.hiddenNote}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canAnswer && (
            <Button size="xs" variant="ghost" onClick={() => hide.mutate(!question.hidden)} disabled={hide.isPending}>
              {question.hidden ? t.lessonQa.unhide : t.lessonQa.hide}
            </Button>
          )}
          {question.mine && question.canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="xs" variant="ghost" disabled={remove.isPending}>
                  {t.lessonQa.delete}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.lessonQa.deleteTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{t.lessonQa.deleteBody}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => remove.mutate()}>
                    {t.lessonQa.delete}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      {question.answers.length > 0 ? (
        <ol className="flex flex-col gap-3 border-s-2 border-border ps-4 ms-4">
          {question.answers.map((a) => (
            <li key={a.id}>
              <AnswerRow answer={a} mineQuestion={question.mine} canModerate={canAnswer} />
            </li>
          ))}
        </ol>
      ) : (
        !canAnswer && <span className="ms-11 text-[13px] text-muted-foreground">{t.lessonQa.waiting}</span>
      )}
      {canAnswer && <AnswerForm questionId={question.id} />}
    </article>
  );
}

function AnswerRow({ answer, mineQuestion, canModerate }: { answer: LessonAnswer; mineQuestion: boolean; canModerate: boolean }) {
  const { t, f } = useI18n();
  const invalidate = useInvalidateQa();
  const onError = useQaError();
  const accept = useMutation({ mutationFn: (v: boolean) => lessonQaApi.accept(answer.id, v), onSuccess: () => void invalidate(), onError });
  const hide = useMutation({
    mutationFn: (hidden: boolean) => lessonQaApi.hideAnswer(answer.id, hidden),
    onSuccess: (r) => {
      toast.success(r.hidden ? t.lessonQa.hiddenDone : t.lessonQa.shownDone);
      void invalidate();
    },
    onError,
  });
  return (
    <div className={cn('flex items-start gap-3', answer.hidden && 'opacity-70')}>
      <InitialsAvatar name={answer.author.name} src={answer.author.image} size={28} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
          <b className="text-sm">{answer.author.name}</b>
          {answer.instructor && <Chip tone="sage">{t.lessonQa.instructor}</Chip>}
          {answer.accepted && (
            <Chip tone="sun">
              <CircleCheck className="size-3" aria-hidden /> {t.lessonQa.helped}
            </Chip>
          )}
          {answer.hidden && <Chip tone="dashed">{t.lessonQa.hiddenChip}</Chip>}
          <time dateTime={answer.createdAt} className="text-muted-foreground">
            {f.dateTime(answer.createdAt)}
          </time>
        </div>
        <p className="whitespace-pre-line break-words text-[15px]" dir="auto">
          {answer.body}
        </p>
        <div className="flex flex-wrap gap-1">
          {mineQuestion && !answer.hidden && (
            <Button size="xs" variant={answer.accepted ? 'ghost' : 'outline'} aria-pressed={answer.accepted} onClick={() => accept.mutate(!answer.accepted)} disabled={accept.isPending}>
              {answer.accepted ? t.lessonQa.unmarkHelped : t.lessonQa.markHelped}
            </Button>
          )}
          {canModerate && (
            <Button size="xs" variant="ghost" onClick={() => hide.mutate(!answer.hidden)} disabled={hide.isPending}>
              {answer.hidden ? t.lessonQa.unhide : t.lessonQa.hide}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function AnswerForm({ questionId }: { questionId: string }) {
  const { t, fill } = useI18n();
  const [body, setBody] = useState('');
  const invalidate = useInvalidateQa();
  const onError = useQaError();
  const send = useMutation({
    mutationFn: () => lessonQaApi.answer(questionId, body.trim()),
    onSuccess: () => {
      setBody('');
      toast.success(t.lessonQa.answered);
      void invalidate();
    },
    onError,
  });
  const trimmed = body.trim();
  const tooLong = trimmed.length > LESSON_ANSWER_MAX;
  return (
    <form
      className="flex flex-col gap-2 ms-11"
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed && !tooLong) send.mutate();
      }}
    >
      <label htmlFor={`answer-${questionId}`} className="sr-only">
        {t.lessonQa.answerLabel}
      </label>
      <Textarea id={`answer-${questionId}`} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t.lessonQa.answerPlaceholder} rows={2} aria-invalid={tooLong || undefined} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] text-danger-fg">{tooLong ? fill(t.lessonQa.tooLong, { n: LESSON_ANSWER_MAX }) : ''}</span>
        <Button type="submit" size="sm" disabled={send.isPending || !trimmed || tooLong}>
          {t.lessonQa.answer}
        </Button>
      </div>
    </form>
  );
}

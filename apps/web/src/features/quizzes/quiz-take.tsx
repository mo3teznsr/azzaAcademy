'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, Clock, Minus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Chip } from '@/components/brand/status-chip';
import { Markdown } from '@/components/brand/markdown';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { ApiError, learningApi, type QuizAttempt, type QuizQuestion, type StudentQuizView } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useNow } from '@/lib/use-now';
import { cn } from '@/lib/utils';
import { clock, QuizStatusChip, usePoints, useQuizError } from './shared';

type Mode = { kind: 'overview' } | { kind: 'taking' } | { kind: 'result'; attempt: QuizAttempt };

export function QuizPage({ quizId }: { quizId: string }) {
  const q = useQuery({ queryKey: qk.quiz(quizId), queryFn: () => learningApi.studentQuiz(quizId), retry: false });
  if (q.isPending) return <LoadingBlock rows={3} height={120} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <Quiz view={q.data} />;
}

function Quiz({ view }: { view: StudentQuizView }) {
  const [mode, setMode] = useState<Mode>(view.openAttempt ? { kind: 'taking' } : { kind: 'overview' });
  if (mode.kind === 'taking' && view.openAttempt) return <Runner view={view} onDone={(attempt) => setMode(attempt ? { kind: 'result', attempt } : { kind: 'overview' })} />;
  if (mode.kind === 'result') return <Result view={view} attempt={mode.attempt} onBack={() => setMode({ kind: 'overview' })} />;
  return <Overview view={view} onStarted={() => setMode({ kind: 'taking' })} onOpenAttempt={(attempt) => setMode({ kind: 'result', attempt })} />;
}

function BackLink() {
  const { t } = useI18n();
  return (
    <Link href="/quizzes" className="inline-flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground">
      <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden /> {t.learning.quizzes.backToQuizzes}
    </Link>
  );
}

// ───────── overview ─────────

function Overview({ view, onStarted, onOpenAttempt }: { view: StudentQuizView; onStarted: () => void; onOpenAttempt: (a: QuizAttempt) => void }) {
  const { t, f, fill } = useI18n();
  const qc = useQueryClient();
  const errorText = useQuizError();
  const points = usePoints();
  const { quiz, progress } = view;
  const [confirm, setConfirm] = useState(false);
  const start = useMutation({
    mutationFn: () => learningApi.startQuiz(quiz.id),
    onSuccess: (next) => {
      qc.setQueryData(qk.quiz(quiz.id), next);
      onStarted();
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const now = useNow(60_000);
  const closed = !!quiz.dueAt && new Date(quiz.dueAt).getTime() < now;
  const label = progress.status === 'IN_PROGRESS' ? t.learning.quizzes.resume : progress.attemptsUsed ? t.learning.quizzes.retry : t.learning.quizzes.start;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <BackLink />
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <QuizStatusChip status={progress.status} />
          {quiz.dueAt && <Chip tone="outline">{fill(t.learning.quizzes.due, { d: f.dateTime(quiz.dueAt) })}</Chip>}
        </div>
        <h1 className="font-display text-4xl font-extrabold leading-tight">{quiz.title}</h1>
        <p className="text-muted-foreground">
          {fill(t.learning.quizzes.questions, { n: f.number(quiz.questionCount) })} · {fill(t.learning.quizzes.points, { n: points(quiz.totalPoints) })} ·{' '}
          {quiz.timeLimitMin ? fill(t.learning.quizzes.timeLimit, { n: f.number(quiz.timeLimitMin) }) : t.learning.quizzes.untimed} ·{' '}
          {fill(t.learning.quizzes.attempts, { a: f.number(progress.attemptsUsed), b: f.number(quiz.maxAttempts) })}
        </p>
      </header>
      {quiz.description.trim() && <Markdown source={quiz.description} className="rounded-2xl border border-border bg-card p-5" />}
      {quiz.questions.some((x) => x.type === 'MULTIPLE') && <p className="text-[13px] text-muted-foreground">{t.learning.quizzes.partialRule}</p>}
      <div className="flex flex-wrap items-center gap-4">
        {progress.canStart ? (
          <Button size="lg" disabled={start.isPending} onClick={() => (quiz.timeLimitMin && progress.status !== 'IN_PROGRESS' ? setConfirm(true) : start.mutate())}>
            {label}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">{closed ? t.learning.quizzes.closedNote : t.learning.quizzes.noAttemptsNote}</p>
        )}
        {progress.bestPercent !== null && <Chip tone="ivory">{fill(t.learning.quizzes.best, { p: f.percent(progress.bestPercent) })}</Chip>}
      </div>
      {view.attempts.length > 0 && (
        <section aria-labelledby="past" className="flex flex-col gap-2">
          <h2 id="past" className="font-bold">
            {t.learning.quizzes.pastAttempts}
          </h2>
          <ul className="flex flex-col gap-2">
            {[...view.attempts].reverse().map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onOpenAttempt(a)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border bg-card p-4 text-start transition-colors hover:border-green-deep"
                >
                  <span className="font-bold">{fill(t.learning.quizzes.attemptN, { n: f.number(a.number) })}</span>
                  <span className="text-sm text-muted-foreground">{f.dateTime(a.submittedAt)}</span>
                  <span className="text-sm">
                    {fill(t.learning.quizzes.score, { s: points(a.score), m: points(a.maxScore) })} · {f.percent(a.percent)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.learning.quizzes.startTimedTitle}</AlertDialogTitle>
            <AlertDialogDescription>{fill(t.learning.quizzes.startTimedBody, { n: f.number(quiz.timeLimitMin ?? 0) })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => start.mutate()}>{t.learning.quizzes.start}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ───────── taking ─────────

function Runner({ view, onDone }: { view: StudentQuizView; onDone: (attempt: QuizAttempt | null) => void }) {
  const { t, f, fill, pick } = useI18n();
  const qc = useQueryClient();
  const errorText = useQuizError();
  const points = usePoints();
  const { quiz } = view;
  const questions = quiz.questions;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [confirm, setConfirm] = useState(false);
  const now = useNow(500);
  const deadline = view.openAttempt?.deadline ? new Date(view.openAttempt.deadline).getTime() : null;
  const remaining = deadline === null ? null : (deadline - now) / 1000;
  const autoSent = useRef(false);

  const submit = useMutation({
    mutationFn: () => learningApi.submitQuiz(quiz.id, answers),
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: qk.myQuizzes });
      qc.setQueryData(qk.quiz(quiz.id), next);
      onDone(next.result ?? null);
    },
    onError: (e) => {
      toast.error(errorText(e));
      if (e instanceof ApiError && e.status === 422) {
        void qc.invalidateQueries({ queryKey: qk.quiz(quiz.id) });
        onDone(null);
      }
    },
  });

  // The server allows a short grace after the deadline, so submitting at zero always lands in time.
  useEffect(() => {
    if (remaining !== null && remaining <= 0 && !autoSent.current && !submit.isPending) {
      autoSent.current = true;
      toast.message(t.learning.quizzes.timeUp);
      submit.mutate();
    }
  }, [remaining, submit, t]);

  // Answers live on this page only: warn before leaving.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!submit.isSuccess) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [submit.isSuccess]);

  const question = questions[index]!;
  const answeredCount = questions.filter((x) => (answers[x.id] ?? []).length > 0).length;
  const set = (ids: string[]) => setAnswers((a) => ({ ...a, [question.id]: ids }));
  const lowTime = remaining !== null && remaining < 60;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="label-mono text-muted-foreground">{fill(t.learning.quizzes.questionOf, { a: f.number(index + 1), b: f.number(questions.length) })}</span>
          <h1 className="truncate font-display text-2xl font-extrabold">{quiz.title}</h1>
        </div>
        {remaining !== null && (
          <div
            role="timer"
            aria-label={t.learning.quizzes.timeLeft}
            className={cn('flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-lg tabular-nums', lowTime ? 'border-danger-line bg-danger-bg text-danger-fg' : 'border-border bg-card')}
          >
            <Clock className="size-4" aria-hidden />
            <span dir="ltr">{clock(remaining)}</span>
          </div>
        )}
      </header>
      <Progress value={(answeredCount / questions.length) * 100} aria-label={fill(t.learning.quizzes.answered, { a: f.number(answeredCount), b: f.number(questions.length) })} />
      <nav aria-label={t.learning.quizzes.questionOf.replace(/\{.\}/g, '').trim()} className="flex flex-wrap gap-1.5">
        {questions.map((x, i) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={fill(t.learning.quizzes.goTo, { n: f.number(i + 1) })}
            aria-current={i === index ? 'step' : undefined}
            className={cn(
              'grid size-8 place-items-center rounded-full border text-[13px] font-bold transition-colors',
              i === index ? 'border-foreground bg-foreground text-background' : (answers[x.id] ?? []).length ? 'border-green bg-green/15' : 'border-border hover:border-green-deep',
            )}
          >
            {i + 1}
          </button>
        ))}
      </nav>
      <section key={question.id} aria-labelledby={`q-${question.id}`} className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 id={`q-${question.id}`} className="text-lg font-bold leading-snug">
            {pick(question.promptEn, question.promptAr).text}
          </h2>
          <Chip tone="outline">{fill(t.learning.quizzes.points, { n: points(question.points) })}</Chip>
        </div>
        <span className="text-[13px] text-muted-foreground">
          {question.type === 'MULTIPLE' ? t.learning.quizzes.chooseAll : question.type === 'TRUE_FALSE' ? t.learning.quizzes.trueFalse : t.learning.quizzes.chooseOne}
        </span>
        <Options question={question} value={answers[question.id] ?? []} onChange={set} />
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          <ChevronLeft className="rtl:rotate-180" aria-hidden /> {t.learning.quizzes.prevQ}
        </Button>
        <span className="text-sm text-muted-foreground">{fill(t.learning.quizzes.answered, { a: f.number(answeredCount), b: f.number(questions.length) })}</span>
        {index < questions.length - 1 ? (
          <Button onClick={() => setIndex((i) => i + 1)}>
            {t.learning.quizzes.nextQ} <ChevronRight className="rtl:rotate-180" aria-hidden />
          </Button>
        ) : (
          <Button variant="sun" disabled={submit.isPending} onClick={() => setConfirm(true)}>
            {submit.isPending ? t.learning.quizzes.submitting : t.learning.quizzes.submit}
          </Button>
        )}
      </footer>
      <p className="text-[13px] text-muted-foreground">{t.learning.quizzes.leaveWarning}</p>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.learning.quizzes.submitTitle}</AlertDialogTitle>
            <AlertDialogDescription>{fill(t.learning.quizzes.submitBody, { a: f.number(answeredCount), b: f.number(questions.length) })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => submit.mutate()}>{t.learning.quizzes.submit}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Options({ question, value, onChange }: { question: QuizQuestion; value: string[]; onChange: (ids: string[]) => void }) {
  const { pick } = useI18n();
  const row = 'flex cursor-pointer items-center gap-3 rounded-[14px] border border-border p-4 transition-colors hover:border-green-deep has-[[data-state=checked]]:border-green has-[[data-state=checked]]:bg-green/10';
  if (question.type === 'MULTIPLE') {
    return (
      <div className="grid gap-2">
        {question.options.map((o) => {
          const id = `${question.id}-${o.id}`;
          return (
            <Label key={o.id} htmlFor={id} className={row}>
              <Checkbox id={id} checked={value.includes(o.id)} onCheckedChange={(on) => onChange(on ? [...value, o.id] : value.filter((v) => v !== o.id))} />
              <span className="text-[15px] font-normal">{pick(o.textEn, o.textAr).text}</span>
            </Label>
          );
        })}
      </div>
    );
  }
  return (
    <RadioGroup value={value[0] ?? ''} onValueChange={(v) => onChange([v])}>
      {question.options.map((o) => {
        const id = `${question.id}-${o.id}`;
        return (
          <Label key={o.id} htmlFor={id} className={row}>
            <RadioGroupItem id={id} value={o.id} />
            <span className="text-[15px] font-normal">{pick(o.textEn, o.textAr).text}</span>
          </Label>
        );
      })}
    </RadioGroup>
  );
}

// ───────── result ─────────

function Result({ view, attempt, onBack }: { view: StudentQuizView; attempt: QuizAttempt; onBack: () => void }) {
  const { t, f, fill, pick } = useI18n();
  const points = usePoints();
  const { quiz } = view;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <BackLink />
      <section aria-labelledby="result" className="flex flex-wrap items-end justify-between gap-6 rounded-[28px] bg-ink p-8 text-white">
        <div className="flex flex-col gap-2">
          <span className="label-mono opacity-80">
            {quiz.title} · {fill(t.learning.quizzes.attemptN, { n: f.number(attempt.number) })}
          </span>
          <h1 id="result" className="font-display text-3xl font-extrabold">
            {t.learning.quizzes.resultTitle}
          </h1>
          <span>{fill(t.learning.quizzes.score, { s: points(attempt.score), m: points(attempt.maxScore) })}</span>
        </div>
        <b className="font-display text-7xl font-extrabold leading-none text-mint">{f.percent(attempt.percent)}</b>
      </section>
      {attempt.timedOut && <p className="rounded-2xl bg-danger-bg p-4 text-sm text-danger-fg">{t.learning.quizzes.timedOut}</p>}
      {attempt.questions ? (
        <ol className="flex flex-col gap-3">
          {quiz.questions.map((q, i) => {
            const r = attempt.questions!.find((x) => x.questionId === q.id);
            const verdict = !r || r.selected.length === 0 ? 'unanswered' : r.correct ? 'correct' : r.earned > 0 ? 'partly' : 'incorrect';
            const tone = verdict === 'correct' ? 'sage' : verdict === 'partly' ? 'peach' : verdict === 'incorrect' ? 'danger' : 'outline';
            return (
              <li key={q.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <b className="text-[15px]">
                    {f.number(i + 1)}. {pick(q.promptEn, q.promptAr).text}
                  </b>
                  <div className="flex items-center gap-2">
                    <Chip tone={tone}>{t.learning.quizzes[verdict]}</Chip>
                    <span className="text-[13px] text-muted-foreground">{fill(t.learning.quizzes.earned, { e: points(r?.earned), p: points(q.points) })}</span>
                  </div>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {q.options.map((o) => {
                    const picked = r?.selected.includes(o.id) ?? false;
                    const right = r?.correctOptionIds.includes(o.id) ?? false;
                    return (
                      <li
                        key={o.id}
                        className={cn('flex items-center gap-2 rounded-[12px] px-3 py-2 text-sm', right ? 'bg-sage text-sage-fg' : picked ? 'bg-danger-bg text-danger-fg' : 'text-muted-foreground')}
                      >
                        {right ? <Check className="size-4" aria-label={t.learning.quizzes.rightAnswer} /> : picked ? <X className="size-4" aria-label={t.learning.quizzes.yourPick} /> : <Minus className="size-4 opacity-40" aria-hidden />}
                        <span>{pick(o.textEn, o.textAr).text}</span>
                        {picked && <span className="ms-auto text-[12px]">{t.learning.quizzes.yourPick}</span>}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          {quiz.dueAt ? t.learning.quizzes.answersLater : t.learning.quizzes.answersLaterNoDue}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={onBack}>
          {t.learning.quizzes.pastAttempts}
        </Button>
        <Button asChild>
          <Link href="/quizzes">{t.learning.quizzes.backToQuizzes}</Link>
        </Button>
      </div>
    </div>
  );
}

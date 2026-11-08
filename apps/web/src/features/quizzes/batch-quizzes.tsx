'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useFieldArray, useForm, useWatch, type Control, type UseFormRegister } from 'react-hook-form';
import { quizInput, QUIZ_QUESTION_TYPES, type QuizQuestionType } from '@azza/shared';
import { BarChart3, ChevronLeft, Clock, Pencil, Plus, Send, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Chip } from '@/components/brand/status-chip';
import { StatTile } from '@/components/brand/section';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { EmptyState, ErrorState, LoadingBlock, QueryView } from '@/components/brand/states';
import { coursesApi, learningApi, quizScopeKey, type QuizScope, type QuizSummary, type StaffQuiz } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { usePoints, useQuizError } from './shared';

type View = { kind: 'list' } | { kind: 'edit'; quizId?: string } | { kind: 'results'; quizId: string };

/** Quizzes tab of a batch, for its teacher and for admins: list, build, publish, results. */
export function BatchQuizzes({ batchId, courseId }: { batchId: string; courseId: string }) {
  return <QuizzesPanel scope={{ batchId }} courseId={courseId} />;
}

/** Quizzes of a recorded course (no batch): unlimited attempts, no due date, one pass mark each. */
export function CourseQuizzes({ courseId }: { courseId: string }) {
  return <QuizzesPanel scope={{ courseId }} courseId={courseId} />;
}

function QuizzesPanel({ scope, courseId }: { scope: QuizScope; courseId: string }) {
  const [view, setView] = useState<View>({ kind: 'list' });
  if (view.kind === 'edit') return <QuizEditor scope={scope} courseId={courseId} quizId={view.quizId} onClose={() => setView({ kind: 'list' })} />;
  if (view.kind === 'results') return <QuizResultsView quizId={view.quizId} onBack={() => setView({ kind: 'list' })} />;
  return <QuizList scope={scope} onEdit={(quizId) => setView({ kind: 'edit', quizId })} onResults={(quizId) => setView({ kind: 'results', quizId })} />;
}

function BackButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <Button variant="ghost" size="sm" className="self-start" onClick={onClick}>
      <ChevronLeft className="rtl:rotate-180" aria-hidden /> {t.learning.studio.back}
    </Button>
  );
}

// ───────── list ─────────

function QuizList({ scope, onEdit, onResults }: { scope: QuizScope; onEdit: (id?: string) => void; onResults: (id: string) => void }) {
  const { t } = useI18n();
  const q = useQuery({ queryKey: qk.quizzes(quizScopeKey(scope)), queryFn: () => learningApi.scopeQuizzes(scope) });
  return (
    <div className="flex flex-col gap-3">
      <Button className="self-start" onClick={() => onEdit()}>
        <Plus aria-hidden /> {t.learning.studio.new}
      </Button>
      <QueryView query={q} loading={<LoadingBlock rows={3} height={72} />} empty={<EmptyState title={t.learning.studio.empty} body={t.learning.studio.emptyBody} />}>
        {(list) => (
          <ul className="flex flex-col gap-2">
            {list.map((quiz) => (
              <QuizRow key={quiz.id} scope={scope} quiz={quiz} onEdit={() => onEdit(quiz.id)} onResults={() => onResults(quiz.id)} />
            ))}
          </ul>
        )}
      </QueryView>
    </div>
  );
}

function QuizRow({ scope, quiz, onEdit, onResults }: { scope: QuizScope; quiz: QuizSummary; onEdit: () => void; onResults: () => void }) {
  const { t, f, fill } = useI18n();
  const qc = useQueryClient();
  const errorText = useQuizError();
  const refresh = () => qc.invalidateQueries({ queryKey: qk.quizzes(quizScopeKey(scope)) });
  const publish = useMutation({
    mutationFn: () => learningApi.publishQuiz(scope, quiz.id),
    onSuccess: () => {
      toast.success(t.learning.studio.publishedToast);
      void refresh();
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const published = quiz.status === 'PUBLISHED';
  return (
    <li className="flex flex-wrap items-center gap-4 rounded-[14px] border border-border bg-card p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <b className="text-[15px]">{quiz.title}</b>
          <Chip tone={published ? 'sage' : 'dashed'}>{published ? t.learning.studio.published : t.learning.studio.draft}</Chip>
        </div>
        <span className="text-[13px] text-muted-foreground">
          {fill(t.learning.quizzes.questions, { n: f.number(quiz.questionCount) })} · {quiz.timeLimitMin ? fill(t.learning.quizzes.timeLimit, { n: f.number(quiz.timeLimitMin) }) : t.learning.quizzes.untimed}
          {quiz.dueAt && <> · {fill(t.learning.quizzes.due, { d: f.dateTime(quiz.dueAt) })}</>}
          {quiz.passPercent != null && <> · {fill(t.recordedOps.quiz.passMarkValue, { n: f.percent(quiz.passPercent) })}</>}
          {published && <> · {fill(t.learning.studio.studentsCount, { n: f.number(quiz.studentsAttempted ?? 0) })}</>}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil aria-hidden /> {t.learning.studio.edit}
        </Button>
        {published ? (
          <Button size="sm" variant="outline" onClick={onResults}>
            <BarChart3 aria-hidden /> {t.learning.studio.results}
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="sun" disabled={publish.isPending || quiz.questionCount === 0}>
                <Send aria-hidden /> {t.learning.studio.publish}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.learning.studio.publishTitle}</AlertDialogTitle>
                <AlertDialogDescription>{t.learning.studio.publishBody}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={() => publish.mutate()}>{t.learning.studio.publish}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </li>
  );
}

// ───────── editor ─────────

interface OptionValues {
  oid?: string;
  textEn: string;
  textAr: string;
  correct: boolean;
}
interface QuestionValues {
  qid?: string;
  type: QuizQuestionType;
  promptEn: string;
  promptAr: string;
  points: number;
  options: OptionValues[];
}
interface QuizValues {
  title: string;
  description: string;
  moduleId: string;
  dueAt: string;
  timeLimitMin: string;
  maxAttempts: number;
  passPercent: number;
  questions: QuestionValues[];
}

const NO_MODULE = '__none';

function trueFalse(t: ReturnType<typeof useI18n>['t']): OptionValues[] {
  return [
    { textEn: t.learning.studio.trueLabel, textAr: '', correct: true },
    { textEn: t.learning.studio.falseLabel, textAr: '', correct: false },
  ];
}

const blankQuestion = (): QuestionValues => ({
  type: 'SINGLE',
  promptEn: '',
  promptAr: '',
  points: 1,
  options: [
    { textEn: '', textAr: '', correct: true },
    { textEn: '', textAr: '', correct: false },
  ],
});

/** ISO → value for `<input type="datetime-local">` in the viewer's local time. */
function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toValues(q?: StaffQuiz): QuizValues {
  return {
    title: q?.title ?? '',
    description: q?.description ?? '',
    moduleId: q?.moduleId ?? NO_MODULE,
    dueAt: toLocalInput(q?.dueAt ?? null),
    timeLimitMin: q?.timeLimitMin ? String(q.timeLimitMin) : '',
    maxAttempts: q?.maxAttempts ?? 1,
    passPercent: q?.passPercent ?? 70,
    questions: q
      ? q.questions.map((x) => ({
          qid: x.id,
          type: x.type,
          promptEn: x.promptEn,
          promptAr: x.promptAr ?? '',
          points: x.points,
          options: x.options.map((o) => ({ oid: o.id, textEn: o.textEn, textAr: o.textAr ?? '', correct: !!o.correct })),
        }))
      : [blankQuestion()],
  };
}

function QuizEditor({ scope, courseId, quizId, onClose }: { scope: QuizScope; courseId: string; quizId?: string; onClose: () => void }) {
  const existing = useQuery({ queryKey: qk.quiz(quizId ?? 'new'), queryFn: () => learningApi.staffQuiz(quizId!), enabled: !!quizId });
  if (quizId && existing.isPending) return <LoadingBlock rows={3} height={120} />;
  if (quizId && existing.isError) return <ErrorState error={existing.error} onRetry={() => void existing.refetch()} />;
  return <QuizForm scope={scope} courseId={courseId} quiz={existing.data as StaffQuiz | undefined} onClose={onClose} />;
}

function QuizForm({ scope, courseId, quiz, onClose }: { scope: QuizScope; courseId: string; quiz?: StaffQuiz; onClose: () => void }) {
  const { t, f, fill, pick } = useI18n();
  const qc = useQueryClient();
  const errorText = useQuizError();
  const points = usePoints();
  const course = useQuery({ queryKey: qk.course(courseId), queryFn: () => coursesApi.get(courseId), retry: false });
  const form = useForm<QuizValues>({ defaultValues: toValues(quiz) });
  const questions = useFieldArray({ control: form.control, name: 'questions' });
  const watched = useWatch({ control: form.control, name: 'questions' });
  // Recorded course quizzes: unlimited attempts and no due date, so those fields stay out of the form.
  const courseQuiz = 'courseId' in scope;
  const locked = !!quiz?.hasAttempts;
  const total = (watched ?? []).reduce((s, q) => s + (Number(q.points) || 0), 0);

  const done = () => {
    void qc.invalidateQueries({ queryKey: qk.quizzes(quizScopeKey(scope)) });
    if (quiz) void qc.invalidateQueries({ queryKey: qk.quiz(quiz.id) });
  };
  const save = useMutation({
    mutationFn: (payload: ReturnType<typeof quizInput.parse>) =>
      quiz ? learningApi.updateQuiz(scope, quiz.id, locked ? { ...payload, questions: undefined } : payload) : learningApi.createQuiz(scope, payload),
    onSuccess: () => {
      toast.success(t.learning.studio.saved);
      done();
      onClose();
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const remove = useMutation({
    mutationFn: () => learningApi.deleteQuiz(scope, quiz!.id),
    onSuccess: () => {
      toast.success(t.learning.studio.deleted);
      done();
      onClose();
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const unpublish = useMutation({
    mutationFn: () => learningApi.unpublishQuiz(scope, quiz!.id),
    onSuccess: () => {
      done();
      onClose();
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const onSubmit = form.handleSubmit((v) => {
    const parsed = quizInput.safeParse({
      title: v.title,
      description: v.description,
      moduleId: v.moduleId === NO_MODULE ? null : v.moduleId,
      dueAt: !courseQuiz && v.dueAt ? new Date(v.dueAt).toISOString() : null,
      timeLimitMin: v.timeLimitMin ? Number(v.timeLimitMin) : null,
      maxAttempts: courseQuiz ? 1 : Number(v.maxAttempts),
      passPercent: Number(v.passPercent),
      questions: v.questions.map((q) => ({
        id: q.qid,
        type: q.type,
        promptEn: q.promptEn,
        promptAr: q.promptAr || undefined,
        points: Number(q.points),
        options: q.options.map((o) => ({ id: o.oid, textEn: o.textEn, textAr: o.textAr || undefined, correct: o.correct })),
      })),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0]!;
      const at = issue.path[0] === 'questions' && typeof issue.path[1] === 'number' ? `${fill(t.learning.studio.questionN, { n: f.number(issue.path[1] + 1) })}: ` : '';
      return void toast.error(`${at}${issue.path.includes('options') ? t.learning.studio.needCorrect : issue.message}`);
    }
    save.mutate(parsed.data);
  });

  const modules = course.data?.modules ?? [];

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <BackButton onClick={onClose} />
      <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-2">
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <Label htmlFor="quiz-title">{t.learning.studio.quizTitle}</Label>
          <Input id="quiz-title" required minLength={2} {...form.register('title', { required: true })} />
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <Label htmlFor="quiz-desc">{t.learning.studio.description}</Label>
          <Textarea id="quiz-desc" rows={3} {...form.register('description')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="quiz-module">{t.learning.studio.module}</Label>
          <Controller
            control={form.control}
            name="moduleId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="quiz-module">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_MODULE}>{t.learning.studio.noModule}</SelectItem>
                  {modules.map((m, i) => (
                    <SelectItem key={m.id} value={m.id}>
                      {f.number(i + 1)}. {pick(m.titleEn, m.titleAr).text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        {!courseQuiz && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quiz-due">{t.learning.studio.dueAt}</Label>
            <Input id="quiz-due" type="datetime-local" dir="ltr" {...form.register('dueAt')} />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="quiz-limit">{t.learning.studio.timeLimit}</Label>
          <InputGroup>
            <InputGroupAddon>
              <Clock aria-hidden />
            </InputGroupAddon>
            <InputGroupInput id="quiz-limit" type="number" min={1} max={600} inputMode="numeric" placeholder={t.learning.studio.timeLimitHint} {...form.register('timeLimitMin')} />
            <InputGroupAddon align="inline-end">
              <InputGroupText>min</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </div>
        {!courseQuiz && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quiz-attempts">{t.learning.studio.maxAttempts}</Label>
            <Input id="quiz-attempts" type="number" min={1} max={20} inputMode="numeric" {...form.register('maxAttempts', { valueAsNumber: true })} />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="quiz-pass">{t.recordedOps.quiz.passMark}</Label>
          <InputGroup>
            <InputGroupInput id="quiz-pass" type="number" min={0} max={100} step={1} inputMode="numeric" dir="ltr" {...form.register('passPercent', { valueAsNumber: true })} />
            <InputGroupAddon align="inline-end">
              <InputGroupText>%</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          <span className="text-[13px] text-muted-foreground">{courseQuiz ? t.recordedOps.quiz.passMarkHintCourse : t.recordedOps.quiz.passMarkHint}</span>
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="quiz-questions">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="quiz-questions" className="font-display text-xl font-bold">
            {t.learning.studio.questions}
          </h3>
          <span className="text-sm text-muted-foreground">{fill(t.learning.studio.totalPoints, { n: points(total) })}</span>
        </div>
        {locked && <p className="rounded-2xl bg-peach p-4 text-sm text-peach-fg">{t.learning.studio.locked}</p>}
        <fieldset disabled={locked} className="flex flex-col gap-3">
          {questions.fields.map((field, i) => (
            <QuestionEditor key={field.id} index={i} control={form.control} register={form.register} onRemove={questions.fields.length > 1 ? () => questions.remove(i) : undefined} />
          ))}
          <Button type="button" variant="outline" className="self-start" onClick={() => questions.append(blankQuestion())}>
            <Plus aria-hidden /> {t.learning.studio.addQuestion}
          </Button>
        </fieldset>
      </section>

      <footer className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <Button type="submit" disabled={save.isPending}>
          {quiz ? t.learning.studio.save : t.learning.studio.create}
        </Button>
        {quiz?.status === 'PUBLISHED' && !quiz.hasAttempts && (
          <Button type="button" variant="outline" disabled={unpublish.isPending} onClick={() => unpublish.mutate()}>
            <Undo2 aria-hidden /> {t.learning.studio.unpublish}
          </Button>
        )}
        {quiz && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" className="ms-auto">
                <Trash2 aria-hidden /> {t.learning.studio.delete}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.learning.studio.deleteTitle}</AlertDialogTitle>
                <AlertDialogDescription>{t.learning.studio.deleteBody}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={() => remove.mutate()}>{t.learning.studio.delete}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </footer>
    </form>
  );
}

function QuestionEditor({ index, control, register, onRemove }: { index: number; control: Control<QuizValues>; register: UseFormRegister<QuizValues>; onRemove?: () => void }) {
  const { t, f, fill } = useI18n();
  const options = useFieldArray({ control, name: `questions.${index}.options` });
  const type = useWatch({ control, name: `questions.${index}.type` });
  const values = useWatch({ control, name: `questions.${index}.options` }) ?? [];
  const single = type !== 'MULTIPLE';
  const noCorrect = !values.some((o) => o.correct);
  const base = `q${index}`;

  const setCorrect = (i: number, on: boolean) => {
    values.forEach((o, j) => {
      const next = single ? j === i : j === i ? on : o.correct;
      if (next !== o.correct) options.update(j, { ...o, correct: next });
    });
  };

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5" aria-label={fill(t.learning.studio.questionN, { n: f.number(index + 1) })}>
      <div className="flex flex-wrap items-end gap-3">
        <b className="label-mono me-auto text-muted-foreground">{fill(t.learning.studio.questionN, { n: f.number(index + 1) })}</b>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${base}-type`}>{t.learning.studio.type}</Label>
          <Controller
            control={control}
            name={`questions.${index}.type`}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => {
                  const next = v as QuizQuestionType;
                  field.onChange(next);
                  if (next === 'TRUE_FALSE') options.replace(trueFalse(t));
                  else if (field.value === 'MULTIPLE' && values.filter((o) => o.correct).length > 1) {
                    const first = values.findIndex((o) => o.correct);
                    options.replace(values.map((o, j) => ({ ...o, correct: j === first })));
                  }
                }}
              >
                <SelectTrigger id={`${base}-type`} className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUIZ_QUESTION_TYPES.map((ty) => (
                    <SelectItem key={ty} value={ty}>
                      {t.learning.studio.types[ty]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex w-24 flex-col gap-1.5">
          <Label htmlFor={`${base}-pts`}>{t.learning.studio.pointsLabel}</Label>
          <Input id={`${base}-pts`} type="number" min={1} max={100} inputMode="numeric" {...register(`questions.${index}.points`, { valueAsNumber: true })} />
        </div>
        {onRemove && (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t.learning.studio.removeQuestion} onClick={onRemove}>
            <Trash2 aria-hidden />
          </Button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Textarea rows={2} aria-label={t.learning.studio.prompt} placeholder={t.learning.studio.prompt} {...register(`questions.${index}.promptEn`)} />
        <Textarea rows={2} aria-label={t.learning.studio.promptAr} placeholder={t.learning.studio.promptAr} dir="rtl" lang="ar" {...register(`questions.${index}.promptAr`)} />
      </div>
      <ul className="flex flex-col gap-2">
        {options.fields.map((o, i) => {
          const label = fill(t.learning.studio.option, { n: f.number(i + 1) });
          const checked = values[i]?.correct ?? false;
          return (
            <li key={o.id} className={cn('flex flex-wrap items-center gap-3 rounded-[14px] border p-2.5 ps-3.5', checked ? 'border-green bg-green/10' : 'border-border')}>
              <Checkbox
                checked={checked}
                onCheckedChange={(on) => setCorrect(i, on === true)}
                aria-label={`${t.learning.studio.markCorrect}: ${label}`}
                className={cn(single && 'rounded-full')}
              />
              <Input className="min-w-40 flex-1" aria-label={label} placeholder={label} readOnly={type === 'TRUE_FALSE'} {...register(`questions.${index}.options.${i}.textEn`)} />
              <Input className="min-w-32 flex-1" aria-label={`${label} · ${t.learning.studio.optionAr}`} placeholder={t.learning.studio.optionAr} dir="rtl" lang="ar" {...register(`questions.${index}.options.${i}.textAr`)} />
              {type !== 'TRUE_FALSE' && options.fields.length > 2 && (
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t.learning.studio.removeOption} onClick={() => options.remove(i)}>
                  <Trash2 aria-hidden />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {type !== 'TRUE_FALSE' && options.fields.length < 8 ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => options.append({ textEn: '', textAr: '', correct: false })}>
            <Plus aria-hidden /> {t.learning.studio.addOption}
          </Button>
        ) : (
          <span />
        )}
        {noCorrect && <span className="text-[13px] text-danger-fg">{t.learning.studio.needCorrect}</span>}
      </div>
    </article>
  );
}

// ───────── results ─────────

function QuizResultsView({ quizId, onBack }: { quizId: string; onBack: () => void }) {
  const { t, f, fill, pick } = useI18n();
  const points = usePoints();
  const q = useQuery({ queryKey: qk.quizResults(quizId), queryFn: () => learningApi.quizResults(quizId) });
  return (
    <div className="flex flex-col gap-5">
      <BackButton onClick={onBack} />
      {q.isPending ? (
        <LoadingBlock rows={3} height={96} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <h3 className="font-display text-2xl font-bold">{q.data.quiz.title}</h3>
          <section className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
            <StatTile label={t.learning.studio.students} value={f.number(q.data.summary.students)} />
            <StatTile label={t.learning.studio.submitted} value={f.number(q.data.summary.submitted)} />
            <StatTile label={t.learning.studio.average} value={q.data.summary.averagePercent === null ? '—' : f.percent(q.data.summary.averagePercent)} />
          </section>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.learning.studio.student}</TableHead>
                  <TableHead>{t.learning.studio.attemptsCol}</TableHead>
                  <TableHead>{t.learning.studio.bestCol}</TableHead>
                  <TableHead>{t.learning.studio.lastCol}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.students.map((s) => (
                  <TableRow key={s.user.id}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <InitialsAvatar name={s.user.name} src={s.user.image} size={28} />
                        <bdi>{s.user.name}</bdi>
                      </span>
                    </TableCell>
                    <TableCell>{f.number(s.attempts)}</TableCell>
                    <TableCell>
                      {s.bestScore === null ? (
                        <span className="text-muted-foreground">{t.learning.studio.notYet}</span>
                      ) : (
                        <>
                          {points(s.bestScore)}/{points(q.data.quiz.totalPoints)} · <b>{f.percent(s.bestPercent ?? 0)}</b>
                        </>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.lastSubmittedAt ? f.dateTime(s.lastSubmittedAt) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <section aria-labelledby="by-question" className="flex flex-col gap-2">
            <h4 id="by-question" className="font-bold">
              {t.learning.studio.byQuestion}
            </h4>
            <ol className="flex flex-col gap-2">
              {q.data.questions.map((x, i) => (
                <li key={x.questionId} className="flex flex-col gap-2 rounded-[14px] border border-border bg-card p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[15px]">
                      {f.number(i + 1)}. {pick(x.promptEn, x.promptAr).text}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {x.rate === null ? t.learning.studio.noAnswers : fill(t.learning.studio.correctRate, { p: f.percent(x.rate * 100) })}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-md bg-secondary" aria-hidden>
                    <div className="h-1.5 rounded-md bg-green" style={{ width: `${(x.rate ?? 0) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}

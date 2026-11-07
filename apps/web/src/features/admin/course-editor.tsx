'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { COURSE_LEVELS, createCourseInput, type CourseStatus } from '@azza/shared';
import type { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CourseCover } from '@/components/brand/course-cover';
import { Price } from '@/components/brand/price';
import { BatchStatusChip, CourseStatusChip } from '@/components/brand/status-chip';
import { PageTitle, Panel } from '@/components/brand/section';
import { ErrorState, LoadingBlock, QueryView } from '@/components/brand/states';
import { batchesApi, categoriesApi, coursesApi, type Course } from '@/lib/api';
import { uploadCourseMediaAsAdmin } from '@/lib/api/courses';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { describeRule } from '@/lib/schedule';
import { cn } from '@/lib/utils';
import { CoverPhotoField, IntroVideoField } from './course-media-fields';
import { ProposalNotice, ReviewActions, ReviewNoteQuote, useProposalError } from './proposal-review';
import { ReviewModeration } from '../course/reviews';
import { ModuleLessons } from '../lessons/module-lessons';

type In = z.input<typeof createCourseInput>;
type Out = z.output<typeof createCourseInput>;
const COVERS = ['sun', 'sky', 'sage', 'peach'] as const;

/** `admin` edits any course; `teacher` drafts and submits their own proposals (studio). */
export type EditorMode = 'admin' | 'teacher';

export function CourseEditor({ courseId, mode = 'admin' }: { courseId?: string; mode?: EditorMode }) {
  const q = useQuery({ queryKey: qk.course(courseId ?? 'new'), queryFn: () => coursesApi.get(courseId!), enabled: !!courseId });
  if (courseId && q.isPending) return <LoadingBlock rows={4} height={80} />;
  if (courseId && q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <Editor course={q.data} mode={mode} />;
}

const BULLET_LISTS = ['outcomes', 'requirements', 'audience'] as const;
type BulletKey = `${(typeof BULLET_LISTS)[number]}${'En' | 'Ar'}`;
const BULLET_KEYS: BulletKey[] = BULLET_LISTS.flatMap((l) => [`${l}En`, `${l}Ar`] as const);

/** Drops blank list lines and empty FAQ rows before validation, so "+ Add line" never blocks a save. */
function clean(v: In): In {
  const out: In = { ...v, faq: (v.faq ?? []).filter((q) => [q.qEn, q.aEn, q.qAr, q.aAr].some((x) => x?.trim())) };
  for (const k of BULLET_KEYS) out[k] = (v[k] ?? []).filter((x) => x.trim());
  return out;
}
const baseResolver = zodResolver(createCourseInput);
const resolver: typeof baseResolver = (values, ctx, opts) => baseResolver(clean(values), ctx, opts);

function toForm(c?: Course): In {
  return {
    slug: c?.slug,
    titleEn: c?.titleEn ?? '',
    titleAr: c?.titleAr ?? '',
    descriptionEn: c?.descriptionEn ?? '',
    descriptionAr: c?.descriptionAr ?? '',
    category: c?.category ?? '',
    level: c?.level ?? 'BEGINNER',
    coverStyle: (COVERS as readonly string[]).includes(c?.coverStyle ?? '') ? (c!.coverStyle as In['coverStyle']) : 'sun',
    coverImageUrl: c?.coverImageUrl ?? null,
    introVideoUrl: c?.introVideoUrl ?? null,
    modules: c?.modules.map((m) => ({ id: m.id, titleEn: m.titleEn, titleAr: m.titleAr ?? '', descriptionEn: m.descriptionEn ?? '', descriptionAr: m.descriptionAr ?? '', order: m.order })) ?? [],
    outcomesEn: c?.outcomesEn ?? [],
    outcomesAr: c?.outcomesAr ?? [],
    requirementsEn: c?.requirementsEn ?? [],
    requirementsAr: c?.requirementsAr ?? [],
    audienceEn: c?.audienceEn ?? [],
    audienceAr: c?.audienceAr ?? [],
    faq: c?.faq.map((q) => ({ qEn: q.qEn, aEn: q.aEn, qAr: q.qAr ?? '', aAr: q.aAr ?? '' })) ?? [],
    featuredRank: c?.featuredRank ?? null,
  };
}

function Editor({ course, mode }: { course?: Course; mode: EditorMode }) {
  const { t, f, fill, pick } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const errorMessage = useProposalError();
  const teacher = mode === 'teacher';
  const base = teacher ? '/studio/courses' : '/admin/courses';
  const status = course?.status;
  const pendingReview = status === 'PENDING_REVIEW';
  // A teacher edits their proposal only while it's a draft or waiting; published/archived courses belong to the admins.
  const locked = teacher && !!course && status !== 'DRAFT' && !pendingReview;
  const uploader = teacher ? coursesApi.uploadMedia : uploadCourseMediaAsAdmin;
  const form = useForm<In, unknown, Out>({ resolver, defaultValues: toForm(course) });
  const faq = useFieldArray({ control: form.control, name: 'faq' });
  // Admins may file a course under a hidden category; teachers pick from the visible ones.
  const categories = useQuery({ queryKey: qk.categories(!teacher), queryFn: () => categoriesApi.list(!teacher) });
  useEffect(() => form.reset(toForm(course)), [course, form]);
  const modules = useFieldArray({ control: form.control, name: 'modules' });
  const preview = useWatch({ control: form.control });
  const err = form.formState.errors;

  const persist = (values: Out, nextStatus?: CourseStatus) => {
    const body = {
      ...values,
      // Teachers never set the slug; the API derives it from the English title.
      slug: teacher ? undefined : values.slug || undefined,
      titleAr: values.titleAr || undefined,
      descriptionAr: values.descriptionAr || undefined,
      modules: values.modules.map((m, i) => ({
        ...m,
        order: i,
        titleAr: m.titleAr || undefined,
        descriptionEn: m.descriptionEn?.trim() || undefined,
        descriptionAr: m.descriptionAr?.trim() || undefined,
      })),
      faq: values.faq.map((q) => ({ ...q, qAr: q.qAr || undefined, aAr: q.aAr || undefined })),
      // Featured placement is an admin decision; blank clears it.
      featuredRank: teacher ? undefined : (values.featuredRank ?? null),
    };
    return course ? coursesApi.update(course.id, { ...body, status: nextStatus }) : coursesApi.create(body);
  };
  const settle = (c: Course) => {
    void qc.invalidateQueries({ queryKey: ['courses'] });
    void qc.invalidateQueries({ queryKey: qk.course(c.id) });
    if (!course) router.replace(`${base}/${c.id}`);
  };

  const save = useMutation({
    mutationFn: ({ values, status: next }: { values: Out; status?: CourseStatus }) => persist(values, next),
    onSuccess: (c) => {
      toast.success(course ? t.admin.editor.saved : t.admin.editor.created);
      settle(c);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const submit = (next?: CourseStatus) => form.handleSubmit((values) => save.mutate({ values, status: next }))();

  /** Teacher: save the form first, then submit. A failed submit still keeps (and routes to) the saved draft. */
  const submitForReview = useMutation({
    mutationFn: async (values: Out) => {
      const saved = await persist(values);
      try {
        return { course: await coursesApi.submit(saved.id), error: null };
      } catch (e) {
        return { course: saved, error: e };
      }
    },
    onSuccess: (r) => {
      if (r.error) toast.error(errorMessage(r.error));
      else toast.success(t.proposals.submitted);
      settle(r.course);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  /** Admin decision on a PENDING_REVIEW proposal; unsaved edits are saved before approving. */
  const review = useMutation({
    mutationFn: async ({ approve, note, values }: { approve: boolean; note?: string; values?: Out }) => {
      if (values) await persist(values);
      return coursesApi.review(course!.id, { approve, note });
    },
    onSuccess: (c, v) => {
      toast.success(v.approve ? t.proposals.approvedCourse : t.proposals.sentBack);
      settle(c);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const busy = save.isPending || submitForReview.isPending || review.isPending;
  const proposer = useQuery({
    queryKey: qk.teacher(course?.createdById ?? ''),
    queryFn: () => coursesApi.teacher(course!.createdById!),
    enabled: !teacher && !!course?.createdById,
    retry: false,
  });
  const proposedBy = course?.createdById ? (proposer.data ? fill(t.proposals.proposedBy, { name: proposer.data.name }) : t.proposals.proposedByTeacher) : null;
  const submittedOn = course?.submittedAt ? fill(t.proposals.submittedOn, { d: f.dayMonth(course.submittedAt) }) : null;

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href={base} className="hover:text-foreground">
          {teacher ? t.studio.courses.title : t.admin.courses.title}
        </Link>{' '}
        / <span className="text-foreground">{course?.titleEn ?? t.admin.editor.newTitle}</span>
      </nav>
      <PageTitle
        kicker={
          course ? (
            <span className="flex flex-wrap items-center gap-2">
              <CourseStatusChip status={course.status} />
              {!teacher && proposedBy && <span>{proposedBy}</span>}
            </span>
          ) : undefined
        }
        title={course?.titleEn ?? t.admin.editor.newTitle}
        aside={
          course &&
          (!teacher || status === 'PUBLISHED') && (
            <Button asChild variant="outline">
              <Link href={`/courses/${course.slug}`} target="_blank">
                {t.admin.courses.viewPublic}
              </Link>
            </Button>
          )
        }
      />
      {teacher && pendingReview && (
        <ProposalNotice tone="pending" title={t.proposals.pendingTitle}>
          <p className="text-[15px]">{t.proposals.pendingCourse}</p>
          {submittedOn && <span className="text-[13px]">{submittedOn}</span>}
        </ProposalNotice>
      )}
      {teacher && status === 'DRAFT' && course?.reviewNote && (
        <ProposalNotice tone="sentBack" title={t.proposals.sentBackTitle}>
          <ReviewNoteQuote note={course.reviewNote} />
          <span className="text-[13px]">{t.proposals.sentBackHint}</span>
        </ProposalNotice>
      )}
      {teacher && (!course || (status === 'DRAFT' && !course.reviewNote)) && (
        <ProposalNotice tone="neutral" title={t.proposals.draftCourse}>
          <span className="text-[13px] text-muted-foreground">{t.proposals.submitHint}</span>
        </ProposalNotice>
      )}
      {locked && <ProposalNotice tone="neutral" title={t.proposals.publishedLocked} />}
      {!teacher && pendingReview && (
        <ProposalNotice tone="pending" title={t.proposals.reviewBanner}>
          <span className="text-[13px]">{[proposedBy, submittedOn].filter(Boolean).join(' · ')}</span>
        </ProposalNotice>
      )}
      <form onSubmit={(e) => (e.preventDefault(), void submit())} noValidate className="flex flex-col gap-6">
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">{t.admin.editor.tabDetails}</TabsTrigger>
            <TabsTrigger value="curriculum">
              {t.admin.editor.tabCurriculum} · {f.number(modules.fields.length)}
            </TabsTrigger>
            <TabsTrigger value="content">{t.admin.editor.tabContent}</TabsTrigger>
            {course && <TabsTrigger value="batches">{t.admin.editor.tabBatches}</TabsTrigger>}
            {course && !teacher && <TabsTrigger value="reviews">{t.admin.editor.tabReviews}</TabsTrigger>}
          </TabsList>
          <TabsContent value="details" className="mt-4">
            <div className="grid items-start gap-5 xl:grid-cols-[1.5fr_1fr]">
              <fieldset disabled={locked} className="contents">
                <Panel className="grid gap-4 md:grid-cols-2">
                  <Field label={t.admin.editor.titleEn} error={err.titleEn?.message}>
                    <Input {...form.register('titleEn')} aria-invalid={!!err.titleEn} />
                  </Field>
                  <Field label={t.admin.editor.titleAr}>
                    <Input dir="rtl" lang="ar" {...form.register('titleAr')} />
                  </Field>
                  {!teacher && (
                    <Field label={t.admin.editor.slug} hint={t.admin.editor.slugHint} error={err.slug?.message}>
                      <Input dir="ltr" {...form.register('slug', { setValueAs: (v: string | undefined) => v || undefined })} aria-invalid={!!err.slug} />
                    </Field>
                  )}
                  <Field label={t.admin.editor.category} error={err.category?.message}>
                    <Controller
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <Select value={field.value || undefined} onValueChange={field.onChange} disabled={categories.isPending}>
                          <SelectTrigger className="w-full" aria-invalid={!!err.category}>
                            <SelectValue placeholder={t.admin.editor.categoryPlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {(categories.data ?? []).map((c) => {
                              const name = pick(c.nameEn, c.nameAr).text;
                              return (
                                <SelectItem key={c.slug} value={c.slug}>
                                  {c.active ? name : fill(t.admin.editor.hiddenCategory, { name })}
                                </SelectItem>
                              );
                            })}
                            {/* Keep a course's current category selectable even if it's no longer listed. */}
                            {field.value && categories.data && !categories.data.some((c) => c.slug === field.value) && (
                              <SelectItem value={field.value}>{course?.categoryRef ? pick(course.categoryRef.nameEn, course.categoryRef.nameAr).text : field.value}</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                  <Field label={t.admin.editor.level}>
                    <Controller
                      control={form.control}
                      name="level"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COURSE_LEVELS.map((l) => (
                              <SelectItem key={l} value={l}>
                                {t.status.level[l]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                  {!teacher && (
                    <Field label={t.admin.editor.featuredRank} hint={t.admin.editor.featuredHint} error={err.featuredRank?.message}>
                      <Input
                        type="number"
                        min={0}
                        max={999}
                        step={1}
                        dir="ltr"
                        {...form.register('featuredRank', { setValueAs: (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v)) })}
                        aria-invalid={!!err.featuredRank}
                      />
                    </Field>
                  )}
                  <Field label={t.admin.editor.fallbackColour} hint={t.admin.editor.fallbackColourHint}>
                    <Controller
                      control={form.control}
                      name="coverStyle"
                      render={({ field }) => (
                        <div className="flex gap-2" role="radiogroup" aria-label={t.admin.editor.fallbackColour}>
                          {COVERS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              role="radio"
                              aria-checked={field.value === c}
                              aria-label={c}
                              onClick={() => field.onChange(c)}
                              className={cn('size-12 rounded-xl border-2', field.value === c ? 'border-ink' : 'border-transparent')}
                              style={{ background: `var(--${c})` }}
                            />
                          ))}
                        </div>
                      )}
                    />
                  </Field>
                  <Field label={t.admin.editor.coverPhoto} className="md:col-span-2">
                    <Controller
                      control={form.control}
                      name="coverImageUrl"
                      render={({ field }) => <CoverPhotoField value={field.value} onChange={(v) => field.onChange(v)} uploader={uploader} />}
                    />
                    {err.coverImageUrl?.message && <span className="text-[13px] text-destructive">{err.coverImageUrl.message}</span>}
                  </Field>
                  <Field label={t.admin.editor.descriptionEn} className="md:col-span-2">
                    <Textarea rows={4} {...form.register('descriptionEn')} />
                  </Field>
                  <Field label={t.admin.editor.descriptionAr} className="md:col-span-2">
                    <Textarea rows={4} dir="rtl" lang="ar" {...form.register('descriptionAr')} />
                  </Field>
                  <Field label={t.admin.editor.introVideo} className="md:col-span-2">
                    <Controller
                      control={form.control}
                      name="introVideoUrl"
                      render={({ field }) => (
                        <IntroVideoField value={field.value} onChange={(v) => field.onChange(v)} title={preview.titleEn || t.admin.editor.introVideo} error={err.introVideoUrl?.message} uploader={uploader} />
                      )}
                    />
                  </Field>
                </Panel>
              </fieldset>
              <div className="xl:sticky xl:top-6">
                <CourseCover
                  course={{
                    titleEn: preview.titleEn || '—',
                    titleAr: preview.titleAr ?? null,
                    coverStyle: preview.coverStyle ?? 'sun',
                    coverImageUrl: preview.coverImageUrl,
                    category: preview.category,
                    categoryRef: categories.data?.find((c) => c.slug === preview.category) ?? null,
                    level: preview.level,
                  }}
                  size="lg"
                  className="min-h-72"
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="curriculum" className="mt-4">
            <fieldset disabled={locked} className="contents">
              <Panel>
                <p className="text-sm text-muted-foreground">{t.admin.editor.modulesNote}</p>
                <ol className="flex flex-col gap-2">
                  {modules.fields.map((m, i) => (
                    <li key={m.id} className="grid grid-cols-[48px_1fr_1fr_auto] items-center gap-2 rounded-[14px] border border-border p-2">
                      <span className="timecode text-sm text-muted-foreground">M{String(i + 1).padStart(2, '0')}</span>
                      <Input aria-label={t.admin.editor.moduleEn} placeholder={t.admin.editor.moduleEn} {...form.register(`modules.${i}.titleEn`)} />
                      <Input aria-label={t.admin.editor.moduleAr} placeholder={t.admin.editor.moduleAr} dir="rtl" lang="ar" {...form.register(`modules.${i}.titleAr`)} />
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={t.common.remove} onClick={() => modules.remove(i)}>
                        <Trash2 />
                      </Button>
                      <span aria-hidden />
                      <Textarea rows={2} aria-label={t.admin.editor.moduleDescEn} placeholder={t.admin.editor.moduleDescEn} {...form.register(`modules.${i}.descriptionEn`)} />
                      <Textarea rows={2} aria-label={t.admin.editor.moduleDescAr} placeholder={t.admin.editor.moduleDescAr} dir="rtl" lang="ar" {...form.register(`modules.${i}.descriptionAr`)} />
                      <span aria-hidden />
                      <div className="col-span-3">
                        {/* Lessons save on their own; a module needs to be saved (have an id) first. */}
                        <ModuleLessons courseId={course?.id} moduleId={preview.modules?.[i]?.id} editable={!locked} uploader={uploader} />
                      </div>
                    </li>
                  ))}
                </ol>
                <Button type="button" variant="outline" className="self-start" onClick={() => modules.append({ titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '', order: modules.fields.length })}>
                  <Plus /> {t.admin.editor.addModule}
                </Button>
              </Panel>
            </fieldset>
          </TabsContent>
          <TabsContent value="content" className="mt-4">
            <fieldset disabled={locked} className="contents">
              <div className="flex flex-col gap-5">
                <Panel>
                  <p className="text-sm text-muted-foreground">{t.admin.editor.contentNote}</p>
                  <div className="grid gap-6 md:grid-cols-2">
                    {BULLET_KEYS.map((k) => (
                      <Controller
                        key={k}
                        control={form.control}
                        name={k}
                        render={({ field }) => <ListEditor label={t.admin.editor[k]} value={field.value ?? []} onChange={field.onChange} rtl={k.endsWith('Ar')} disabled={locked} />}
                      />
                    ))}
                  </div>
                </Panel>
                <Panel>
                  <Label className="font-display text-xl font-extrabold">{t.admin.editor.faq}</Label>
                  <ol className="flex flex-col gap-3">
                    {faq.fields.map((q, i) => (
                      <li key={q.id} className="grid gap-2 rounded-[14px] border border-border p-3 md:grid-cols-2">
                        <Input aria-label={t.admin.editor.faqQEn} placeholder={t.admin.editor.faqQEn} {...form.register(`faq.${i}.qEn`)} aria-invalid={!!err.faq?.[i]?.qEn} />
                        <Input aria-label={t.admin.editor.faqQAr} placeholder={t.admin.editor.faqQAr} dir="rtl" lang="ar" {...form.register(`faq.${i}.qAr`)} />
                        <Textarea rows={3} aria-label={t.admin.editor.faqAEn} placeholder={t.admin.editor.faqAEn} {...form.register(`faq.${i}.aEn`)} aria-invalid={!!err.faq?.[i]?.aEn} />
                        <Textarea rows={3} aria-label={t.admin.editor.faqAAr} placeholder={t.admin.editor.faqAAr} dir="rtl" lang="ar" {...form.register(`faq.${i}.aAr`)} />
                        {(err.faq?.[i]?.qEn || err.faq?.[i]?.aEn) && (
                          <span className="text-[13px] text-destructive md:col-span-2">{err.faq?.[i]?.qEn?.message ?? err.faq?.[i]?.aEn?.message}</span>
                        )}
                        <Button type="button" variant="ghost" size="sm" className="justify-self-end md:col-span-2" onClick={() => faq.remove(i)}>
                          <Trash2 /> {t.common.remove}
                        </Button>
                      </li>
                    ))}
                  </ol>
                  <Button type="button" variant="outline" className="self-start" disabled={faq.fields.length >= 30} onClick={() => faq.append({ qEn: '', aEn: '', qAr: '', aAr: '' })}>
                    <Plus /> {t.admin.editor.addFaq}
                  </Button>
                </Panel>
              </div>
            </fieldset>
          </TabsContent>
          {course && (
            <TabsContent value="batches" className="mt-4">
              <CourseBatches courseId={course.id} mode={mode} canAdd={status !== 'ARCHIVED'} />
            </TabsContent>
          )}
          {course && !teacher && (
            <TabsContent value="reviews" className="mt-4">
              <Panel>
                <ReviewModeration courseId={course.id} />
              </Panel>
            </TabsContent>
          )}
        </Tabs>
        {!locked && (
          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-2 rounded-full bg-ink p-2 ps-5 text-ivory">
            {form.formState.isDirty && <span className="me-auto text-sm text-stone">{t.common.edit}…</span>}
            <Button type="submit" variant="secondary" className="bg-ink-2 text-ivory" disabled={busy}>
              {course ? t.admin.editor.save : t.admin.editor.saveDraft}
            </Button>
            {teacher && !pendingReview && (
              <Button type="button" variant="sun" disabled={busy} onClick={() => void form.handleSubmit((values) => submitForReview.mutate(values))()}>
                {submitForReview.isPending ? t.proposals.submitting : !course || form.formState.isDirty ? t.proposals.saveAndSubmit : t.proposals.submit}
              </Button>
            )}
            {!teacher && pendingReview && (
              <ReviewActions
                onInk
                pending={busy}
                onApprove={() => void form.handleSubmit((values) => review.mutate({ approve: true, values: form.formState.isDirty ? values : undefined }))()}
                onSendBack={(note) => review.mutateAsync({ approve: false, note })}
              />
            )}
            {!teacher && course && !pendingReview && course.status !== 'PUBLISHED' && (
              <Button type="button" variant="sun" disabled={busy} onClick={() => void submit('PUBLISHED')}>
                {t.admin.editor.publish}
              </Button>
            )}
          </div>
        )}
      </form>
    </>
  );
}

/** Editable list of short lines (outcomes, requirements, audience); max 20 lines. */
function ListEditor({ label, value, onChange, rtl, disabled }: { label: string; value: string[]; onChange: (v: string[]) => void; rtl?: boolean; disabled?: boolean }) {
  const { t, f, fill } = useI18n();
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-[13px] text-muted-foreground">{label}</Label>
      {value.map((line, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={line}
            maxLength={300}
            dir={rtl ? 'rtl' : undefined}
            lang={rtl ? 'ar' : undefined}
            aria-label={fill(t.admin.editor.lineLabel, { list: label, n: f.number(i + 1) })}
            onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <Button type="button" variant="ghost" size="icon" aria-label={t.common.remove} onClick={() => onChange(value.filter((_, j) => j !== i))}>
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="self-start" disabled={disabled || value.length >= 20} onClick={() => onChange([...value, ''])}>
        {t.admin.editor.addLine}
      </Button>
    </div>
  );
}

function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label className="text-[13px] text-muted-foreground">{label}</Label>
      {children}
      {hint && <span className="text-[13px] text-muted-foreground">{hint}</span>}
      {error && <span className="text-[13px] text-destructive">{error}</span>}
    </div>
  );
}

function CourseBatches({ courseId, mode, canAdd }: { courseId: string; mode: EditorMode; canAdd: boolean }) {
  const { t, f } = useI18n();
  const p = { courseId, pageSize: 50 };
  const q = useQuery({ queryKey: qk.batches(p), queryFn: () => batchesApi.list(p) });
  // Teachers build batches in the studio and only see their own; admins see every batch of the course.
  const base = mode === 'teacher' ? '/studio/batches' : '/admin/batches';
  return (
    <Panel>
      {canAdd && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-muted-foreground">{t.batchOps.pricePerBatch}</p>
          <Button asChild variant="ink">
            <Link href={`${base}/new?courseId=${courseId}`}>{mode === 'teacher' ? t.studio.courses.newBatch : t.admin.editor.newBatch}</Link>
          </Button>
        </div>
      )}
      <QueryView query={q} isEmpty={(d) => d.items.length === 0} loading={<LoadingBlock rows={2} />} empty={<p className="text-sm text-muted-foreground">{t.admin.editor.noBatches}</p>}>
        {(d) => (
          <ul className="flex flex-col gap-2">
            {d.items.map((b) => (
              <li key={b.id}>
                <Link href={`${base}/${b.id}`} className="flex items-center justify-between gap-3 rounded-[14px] border border-border p-3.5 no-underline">
                  <span>
                    <b dir="ltr">{b.code}</b> · {describeRule(b, f)}
                    <span className="block text-[13px] text-muted-foreground">
                      {f.dayMonth(b.startsOn)} → {f.dayMonth(b.endsOn)} · <bdi>{b.teacher.name}</bdi> · {f.number(b._count?.enrollments ?? 0)}/{f.number(b.capacity)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <Price fils={b.priceFils} compact align="end" className="font-semibold" />
                    <BatchStatusChip status={b.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </Panel>
  );
}

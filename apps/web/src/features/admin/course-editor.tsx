'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { COURSE_LEVELS, createCourseInput, filsToAed, type CourseStatus } from '@azza/shared';
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
import { BatchStatusChip, CourseStatusChip } from '@/components/brand/status-chip';
import { PageTitle, Panel } from '@/components/brand/section';
import { ErrorState, LoadingBlock, QueryView } from '@/components/brand/states';
import { batchesApi, coursesApi, type Course } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { describeRule } from '@/lib/schedule';
import { cn } from '@/lib/utils';
import { CoverPhotoField, IntroVideoField } from './course-media-fields';

type In = z.input<typeof createCourseInput>;
type Out = z.output<typeof createCourseInput>;
const COVERS = ['sun', 'sky', 'sage', 'peach'] as const;

export function CourseEditor({ courseId }: { courseId?: string }) {
  const q = useQuery({ queryKey: qk.course(courseId ?? 'new'), queryFn: () => coursesApi.get(courseId!), enabled: !!courseId });
  if (courseId && q.isPending) return <LoadingBlock rows={4} height={80} />;
  if (courseId && q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <Editor course={q.data} />;
}

function toForm(c?: Course): In {
  return {
    slug: c?.slug ?? '',
    titleEn: c?.titleEn ?? '',
    titleAr: c?.titleAr ?? '',
    descriptionEn: c?.descriptionEn ?? '',
    descriptionAr: c?.descriptionAr ?? '',
    category: c?.category ?? '',
    level: c?.level ?? 'BEGINNER',
    coverStyle: (COVERS as readonly string[]).includes(c?.coverStyle ?? '') ? (c!.coverStyle as In['coverStyle']) : 'sun',
    coverImageUrl: c?.coverImageUrl ?? null,
    introVideoUrl: c?.introVideoUrl ?? null,
    priceAed: c ? filsToAed(c.priceFils) : 0,
    modules: c?.modules.map((m) => ({ titleEn: m.titleEn, titleAr: m.titleAr ?? '', order: m.order })) ?? [],
  };
}

function Editor({ course }: { course?: Course }) {
  const { t, f } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const form = useForm<In, unknown, Out>({ resolver: zodResolver(createCourseInput), defaultValues: toForm(course) });
  useEffect(() => form.reset(toForm(course)), [course, form]);
  const modules = useFieldArray({ control: form.control, name: 'modules' });
  const preview = useWatch({ control: form.control });
  const err = form.formState.errors;

  const save = useMutation({
    mutationFn: async ({ values, status }: { values: Out; status?: CourseStatus }) => {
      const body = { ...values, titleAr: values.titleAr || undefined, descriptionAr: values.descriptionAr || undefined, modules: values.modules.map((m, i) => ({ ...m, order: i, titleAr: m.titleAr || undefined })) };
      return course ? coursesApi.update(course.id, { ...body, status }) : coursesApi.create(body);
    },
    onSuccess: (c) => {
      toast.success(course ? t.admin.editor.saved : t.admin.editor.created);
      void qc.invalidateQueries({ queryKey: ['courses'] });
      void qc.invalidateQueries({ queryKey: qk.course(c.id) });
      if (!course) router.replace(`/admin/courses/${c.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const submit = (status?: CourseStatus) => form.handleSubmit((values) => save.mutate({ values, status }))();

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/admin/courses" className="hover:text-foreground">
          {t.admin.courses.title}
        </Link>{' '}
        / <span className="text-foreground">{course?.titleEn ?? t.admin.editor.newTitle}</span>
      </nav>
      <PageTitle
        kicker={course ? <CourseStatusChip status={course.status} /> : undefined}
        title={course?.titleEn ?? t.admin.editor.newTitle}
        aside={
          course && (
            <Button asChild variant="outline">
              <Link href={`/courses/${course.slug}`} target="_blank">
                {t.admin.courses.viewPublic}
              </Link>
            </Button>
          )
        }
      />
      <form onSubmit={(e) => (e.preventDefault(), void submit())} noValidate className="flex flex-col gap-6">
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">{t.admin.editor.tabDetails}</TabsTrigger>
            <TabsTrigger value="curriculum">
              {t.admin.editor.tabCurriculum} · {f.number(modules.fields.length)}
            </TabsTrigger>
            <TabsTrigger value="pricing">{t.admin.editor.tabPricing}</TabsTrigger>
            {course && <TabsTrigger value="batches">{t.admin.editor.tabBatches}</TabsTrigger>}
          </TabsList>
          <TabsContent value="details" className="mt-4">
            <div className="grid items-start gap-5 xl:grid-cols-[1.5fr_1fr]">
              <Panel className="grid gap-4 md:grid-cols-2">
                <Field label={t.admin.editor.titleEn} error={err.titleEn?.message}>
                  <Input {...form.register('titleEn')} aria-invalid={!!err.titleEn} />
                </Field>
                <Field label={t.admin.editor.titleAr}>
                  <Input dir="rtl" lang="ar" {...form.register('titleAr')} />
                </Field>
                <Field label={t.admin.editor.slug} error={err.slug?.message}>
                  <Input dir="ltr" {...form.register('slug')} aria-invalid={!!err.slug} />
                </Field>
                <Field label={t.admin.editor.category} error={err.category?.message}>
                  <Input {...form.register('category')} aria-invalid={!!err.category} />
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
                    render={({ field }) => <CoverPhotoField value={field.value} onChange={(v) => field.onChange(v)} />}
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
                      <IntroVideoField value={field.value} onChange={(v) => field.onChange(v)} title={preview.titleEn || t.admin.editor.introVideo} error={err.introVideoUrl?.message} />
                    )}
                  />
                </Field>
              </Panel>
              <div className="xl:sticky xl:top-6">
                <CourseCover
                  course={{
                    titleEn: preview.titleEn || '—',
                    titleAr: preview.titleAr ?? null,
                    coverStyle: preview.coverStyle ?? 'sun',
                    coverImageUrl: preview.coverImageUrl,
                    category: preview.category,
                    level: preview.level,
                  }}
                  size="lg"
                  className="min-h-72"
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="curriculum" className="mt-4">
            <Panel>
              <p className="text-sm text-muted-foreground">{t.admin.editor.modulesNote}</p>
              <ol className="flex flex-col gap-2">
                {modules.fields.map((m, i) => (
                  <li key={m.id} className="grid grid-cols-[48px_1fr_1fr_auto] items-center gap-2">
                    <span className="timecode text-sm text-muted-foreground">M{String(i + 1).padStart(2, '0')}</span>
                    <Input aria-label={t.admin.editor.moduleEn} placeholder={t.admin.editor.moduleEn} {...form.register(`modules.${i}.titleEn`)} />
                    <Input aria-label={t.admin.editor.moduleAr} placeholder={t.admin.editor.moduleAr} dir="rtl" lang="ar" {...form.register(`modules.${i}.titleAr`)} />
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={t.common.remove} onClick={() => modules.remove(i)}>
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ol>
              <Button type="button" variant="outline" className="self-start" onClick={() => modules.append({ titleEn: '', titleAr: '', order: modules.fields.length })}>
                <Plus /> {t.admin.editor.addModule}
              </Button>
            </Panel>
          </TabsContent>
          <TabsContent value="pricing" className="mt-4">
            <Panel className="max-w-md">
              <Field label={t.admin.editor.price} error={err.priceAed?.message}>
                <Input type="number" step="0.01" min={0} dir="ltr" {...form.register('priceAed', { valueAsNumber: true })} aria-invalid={!!err.priceAed} />
              </Field>
              <p className="text-sm text-muted-foreground">{t.admin.editor.priceNote}</p>
            </Panel>
          </TabsContent>
          {course && (
            <TabsContent value="batches" className="mt-4">
              <CourseBatches courseId={course.id} />
            </TabsContent>
          )}
        </Tabs>
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-2 rounded-full bg-ink p-2 ps-5 text-ivory">
          {form.formState.isDirty && <span className="me-auto text-sm text-stone">{t.common.edit}…</span>}
          <Button type="submit" variant="secondary" className="bg-ink-2 text-ivory" disabled={save.isPending}>
            {course ? t.admin.editor.save : t.admin.editor.saveDraft}
          </Button>
          {course && course.status !== 'PUBLISHED' && (
            <Button type="button" variant="sun" disabled={save.isPending} onClick={() => void submit('PUBLISHED')}>
              {t.admin.editor.publish}
            </Button>
          )}
        </div>
      </form>
    </>
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

function CourseBatches({ courseId }: { courseId: string }) {
  const { t, f } = useI18n();
  const p = { courseId, pageSize: 50 };
  const q = useQuery({ queryKey: qk.batches(p), queryFn: () => batchesApi.list(p) });
  return (
    <Panel>
      <div className="flex justify-end">
        <Button asChild variant="ink">
          <Link href={`/admin/batches/new?courseId=${courseId}`}>{t.admin.editor.newBatch}</Link>
        </Button>
      </div>
      <QueryView query={q} isEmpty={(d) => d.items.length === 0} loading={<LoadingBlock rows={2} />} empty={<p className="text-sm text-muted-foreground">{t.admin.editor.noBatches}</p>}>
        {(d) => (
          <ul className="flex flex-col gap-2">
            {d.items.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/batches/${b.id}`} className="flex items-center justify-between gap-3 rounded-[14px] border border-border p-3.5 no-underline">
                  <span>
                    <b dir="ltr">{b.code}</b> · {describeRule(b, f)}
                    <span className="block text-[13px] text-muted-foreground">
                      {f.dayMonth(b.startsOn)} → {f.dayMonth(b.endsOn)} · <bdi>{b.teacher.name}</bdi> · {f.number(b._count?.enrollments ?? 0)}/{f.number(b.capacity)}
                    </span>
                  </span>
                  <BatchStatusChip status={b.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </Panel>
  );
}

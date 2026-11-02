'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBatchInput, SESSION_LANGUAGES } from '@azza/shared';
import type { z } from 'zod';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Chip } from '@/components/brand/status-chip';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { adminApi, batchesApi, coursesApi, type SchedulePreview } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { sessionCode } from '@/lib/i18n/format';
import { cn } from '@/lib/utils';

type In = z.input<typeof createBatchInput>;
type Out = z.output<typeof createBatchInput>;
const ZONES = ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Africa/Cairo', 'Europe/London'];
const today = () => new Date().toISOString().slice(0, 10);

export function BatchBuilder() {
  const { t, f, fill } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useSearchParams();
  const courses = useQuery({ queryKey: qk.courses({ pageSize: 100 }), queryFn: () => coursesApi.list({ pageSize: 100 }) });
  const teachers = useQuery({ queryKey: qk.admin.users({ role: 'TEACHER' }), queryFn: () => adminApi.users({ role: 'TEACHER', pageSize: 100 }) });
  const [preview, setPreview] = useState<SchedulePreview | null>(null);

  const form = useForm<In, unknown, Out>({
    resolver: zodResolver(createBatchInput),
    defaultValues: {
      courseId: params.get('courseId') ?? '',
      code: 'B01',
      teacherId: '',
      capacity: 24,
      language: 'EN',
      timezone: 'Asia/Dubai',
      waitlistEnabled: true,
      minStudents: 0,
      schedule: { weekdays: [2, 4], startTime: '19:00', durationMin: 90, sessionCount: 12, startsOn: today(), skipDates: [] },
    },
  });
  const skip = useFieldArray({ control: form.control, name: 'schedule.skipDates' as never });
  const values = useWatch({ control: form.control });
  const err = form.formState.errors;

  const runPreview = useMutation({
    mutationFn: () => {
      const v = form.getValues();
      return batchesApi.preview({
        weekdays: v.schedule.weekdays,
        startTime: v.schedule.startTime,
        durationMin: Number(v.schedule.durationMin),
        sessionCount: Number(v.schedule.sessionCount),
        startsOn: v.schedule.startsOn,
        skipDates: (v.schedule.skipDates ?? []).filter(Boolean),
        timezone: v.timezone,
        teacherId: v.teacherId || undefined,
      });
    },
    onSuccess: setPreview,
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: (v: Out) => batchesApi.create({ ...v, schedule: { ...v.schedule, skipDates: v.schedule.skipDates.filter(Boolean) } }),
    onSuccess: (b) => {
      toast.success(t.admin.builder.created);
      void qc.invalidateQueries({ queryKey: ['batches'] });
      router.push(`/admin/batches/${b.id}`);
    },
    onError: (e: Error) => {
      if (e instanceof ApiError && e.status === 409) {
        const conflicts = (e.details as { conflicts?: SchedulePreview['conflicts'] } | undefined)?.conflicts;
        if (conflicts && preview) setPreview({ ...preview, conflicts });
      }
      toast.error(e.message);
    },
  });

  const conflictNums = new Set(preview?.conflicts.map((c) => c.sessionNumber));

  return (
    <>
      <PageTitle kicker={t.status.batch.DRAFT} title={t.admin.builder.title} />
      <form className="grid items-start gap-5 xl:grid-cols-[1.3fr_1fr]" onSubmit={form.handleSubmit((v) => create.mutate(v))} noValidate>
        <div className="flex flex-col gap-5">
          <Panel>
            <SectionHeader title={t.admin.builder.basics} size="sm" />
            <div className="grid gap-4 md:grid-cols-2">
              <F label={t.admin.builder.course} error={err.courseId?.message} className="md:col-span-2">
                {courses.isError ? (
                  <ErrorState compact error={courses.error} />
                ) : (
                  <Controller
                    control={form.control}
                    name="courseId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {(courses.data?.items ?? []).map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.titleEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </F>
              <F label={t.admin.builder.code} error={err.code?.message}>
                <Input dir="ltr" {...form.register('code')} aria-invalid={!!err.code} />
              </F>
              <F label={t.admin.builder.capacity} error={err.capacity?.message}>
                <Input type="number" min={1} {...form.register('capacity', { valueAsNumber: true })} />
              </F>
              <F label={t.admin.builder.language}>
                <Controller
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SESSION_LANGUAGES.map((l) => (
                          <SelectItem key={l} value={l}>
                            {t.status.sessionLanguage[l]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </F>
              <F label={t.admin.builder.timezone}>
                <Controller
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ZONES.map((z) => (
                          <SelectItem key={z} value={z}>
                            {z}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </F>
              <F label={t.admin.builder.teacher} error={err.teacherId?.message} className="md:col-span-2">
                {teachers.isPending ? (
                  <LoadingBlock rows={1} height={48} />
                ) : teachers.isError ? (
                  <ErrorState compact error={teachers.error} />
                ) : teachers.data.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.admin.builder.noTeachers}</p>
                ) : (
                  <Controller
                    control={form.control}
                    name="teacherId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(v) => (field.onChange(v), setPreview(null))}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {teachers.data.items.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} · {u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </F>
            </div>
          </Panel>

          <Panel>
            <SectionHeader title={t.admin.builder.schedule} size="sm" />
            <div className="grid gap-4 md:grid-cols-2">
              <F label={t.admin.builder.firstDate} error={err.schedule?.startsOn?.message}>
                <Input type="date" dir="ltr" {...form.register('schedule.startsOn')} />
              </F>
              <F label={t.admin.builder.startTime} error={err.schedule?.startTime?.message}>
                <Input type="time" dir="ltr" {...form.register('schedule.startTime')} />
              </F>
              <F label={t.admin.builder.duration}>
                <Input type="number" min={15} step={15} {...form.register('schedule.durationMin', { valueAsNumber: true })} />
              </F>
              <F label={t.admin.builder.sessionCount}>
                <Input type="number" min={1} {...form.register('schedule.sessionCount', { valueAsNumber: true })} />
              </F>
              <F label={t.admin.builder.repeatsOn} error={err.schedule?.weekdays?.message} className="md:col-span-2">
                <Controller
                  control={form.control}
                  name="schedule.weekdays"
                  render={({ field }) => (
                    <ToggleGroup type="multiple" value={field.value.map(String)} onValueChange={(v) => field.onChange(v.map(Number))} className="flex flex-wrap justify-start gap-2">
                      {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                        <ToggleGroupItem key={d} value={String(d)} className="h-10 min-w-14 rounded-full border border-border px-3 data-[state=on]:bg-ink data-[state=on]:text-ivory">
                          {f.weekdayName(d)}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  )}
                />
              </F>
              <div className="flex flex-col gap-2 md:col-span-2">
                <Label className="text-[13px] text-muted-foreground">{t.admin.builder.skipDates}</Label>
                {skip.fields.map((s, i) => (
                  <div key={s.id} className="flex gap-2">
                    <Input type="date" dir="ltr" {...form.register(`schedule.skipDates.${i}` as const)} />
                    <Button type="button" variant="ghost" size="icon" aria-label={t.common.remove} onClick={() => skip.remove(i)}>
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => skip.append('' as never)}>
                  <Plus /> {t.admin.builder.addSkip}
                </Button>
              </div>
            </div>
            <Button type="button" variant="ink" className="self-start" onClick={() => runPreview.mutate()} disabled={runPreview.isPending}>
              {t.admin.builder.runPreview}
            </Button>
          </Panel>

          <Panel>
            <SectionHeader title={t.admin.builder.enrollment} size="sm" />
            <div className="grid gap-4 md:grid-cols-2">
              <F label={t.admin.builder.price}>
                <Input type="number" step="0.01" dir="ltr" {...form.register('priceAed', { setValueAs: (v: string) => (v === '' || v == null ? undefined : Number(v)) })} />
              </F>
              <F label={t.admin.builder.minStudents}>
                <Input type="number" min={0} {...form.register('minStudents', { valueAsNumber: true })} />
              </F>
              <F label={t.admin.builder.opens}>
                <Input type="date" dir="ltr" {...form.register('enrollmentOpensOn', { setValueAs: (v: string) => v || undefined })} />
              </F>
              <F label={t.admin.builder.closes}>
                <Input type="date" dir="ltr" {...form.register('enrollmentClosesOn', { setValueAs: (v: string) => v || undefined })} />
              </F>
              <label className="flex items-center justify-between gap-3 md:col-span-2">
                <span>{t.admin.builder.waitlist}</span>
                <Controller control={form.control} name="waitlistEnabled" render={({ field }) => <Switch checked={!!field.value} onCheckedChange={field.onChange} />} />
              </label>
            </div>
          </Panel>
        </div>

        <aside className="flex flex-col gap-5 xl:sticky xl:top-6">
          <Panel>
            <SectionHeader
              title={t.admin.builder.preview}
              size="sm"
              aside={preview && preview.conflicts.length > 0 ? <Chip tone="peach">{fill(t.admin.builder.conflicts, { n: f.number(preview.conflicts.length) })}</Chip> : undefined}
            />
            {runPreview.isPending ? (
              <LoadingBlock rows={4} height={40} />
            ) : !preview ? (
              <p className="text-sm text-muted-foreground">{t.admin.builder.previewEmpty}</p>
            ) : (
              <>
                {preview.conflicts.map((c) => (
                  <div key={c.sessionNumber} className="flex gap-2 rounded-[14px] bg-ink p-3 text-sm text-ivory">
                    <AlertTriangle className="size-4 shrink-0 text-peach" />
                    {fill(t.admin.builder.conflictLine, { s: sessionCode(c.sessionNumber), d: c.localDate, b: c.withBatch })}
                  </div>
                ))}
                {preview.skipped.length > 0 && <p className="text-sm text-muted-foreground">{fill(t.admin.builder.skipped, { d: preview.skipped.join(', ') })}</p>}
                <p className="text-sm font-semibold">{fill(t.admin.builder.endsOn, { d: preview.endsOn })}</p>
                <ol className="flex max-h-96 flex-col gap-1 overflow-y-auto">
                  {preview.sessions.map((s) => (
                    <li key={s.number} className={cn('grid grid-cols-[52px_1fr_auto] items-center gap-2 rounded-lg px-2 py-1.5 text-sm', conflictNums.has(s.number) ? 'bg-peach text-ink' : 'odd:bg-muted')}>
                      <span className="timecode">{sessionCode(s.number)}</span>
                      <span>{f.date(s.startsAt, values.timezone)}</span>
                      <span className="timecode">{f.time(s.startsAt, values.timezone)}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </Panel>
          <Panel>
            <SectionHeader title={t.admin.builder.review} size="sm" />
            {preview && preview.conflicts.length > 0 && <p className="text-sm text-destructive">{t.admin.builder.resolve}</p>}
            <Button type="submit" variant="ink" size="lg" disabled={create.isPending}>
              {create.isPending ? t.admin.builder.creating : t.admin.builder.create}
            </Button>
          </Panel>
        </aside>
      </form>
    </>
  );
}

function F({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label className="text-[13px] text-muted-foreground">{label}</Label>
      {children}
      {error && <span className="text-[13px] text-destructive">{error}</span>}
    </div>
  );
}

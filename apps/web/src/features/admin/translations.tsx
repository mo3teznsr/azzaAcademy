'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Chip } from '@/components/brand/status-chip';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { coursesApi, type Course } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';

const missingCount = (c: Course) => [c.titleAr, c.descriptionAr, ...c.modules.map((m) => m.titleAr)].filter((v) => !v || !v.trim()).length;

/** Translation workbench for learner-facing course content (aw-10). UI strings live in code dictionaries. */
export function Translations() {
  const { t, f } = useI18n();
  const q = useQuery({ queryKey: qk.courses({ pageSize: 100, scope: 'translations' }), queryFn: () => coursesApi.list({ pageSize: 100 }) });
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const items = useMemo(() => (q.data?.items ?? []).filter((c) => !onlyMissing || missingCount(c) > 0), [q.data, onlyMissing]);
  const selected = q.data?.items.find((c) => c.id === selectedId) ?? null;

  return (
    <>
      <PageTitle kicker={t.nav.admin.settings} title={t.admin.translations.title} />
      <p className="max-w-3xl text-muted-foreground">{t.admin.translations.intro}</p>
      <Panel>
        <SectionHeader title={t.admin.translations.languages} size="sm" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-border p-4">
            <b className="block text-lg" lang="en">
              English
            </b>
            <span className="text-sm text-muted-foreground">{t.admin.translations.english}</span>
          </div>
          <div className="rounded-2xl border border-border p-4" dir="rtl">
            <b className="block text-lg" lang="ar">
              العربية
            </b>
            <span className="text-sm text-muted-foreground">{t.admin.translations.arabic}</span>
          </div>
        </div>
      </Panel>
      <div className="flex items-center gap-3">
        <Switch id="missing" checked={onlyMissing} onCheckedChange={setOnlyMissing} />
        <Label htmlFor="missing">{t.admin.translations.filterMissing}</Label>
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[1fr_1.4fr]">
        <Panel className="p-2">
          {q.isPending ? (
            <LoadingBlock rows={5} height={48} />
          ) : q.isError ? (
            <ErrorState error={q.error} onRetry={() => void q.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState title={t.admin.translations.empty} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.translations.colItem}</TableHead>
                  <TableHead>{t.admin.translations.colArabic}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => {
                  const missing = missingCount(c);
                  return (
                    <TableRow key={c.id} onClick={() => setSelectedId(c.id)} data-state={c.id === selectedId ? 'selected' : undefined} className="cursor-pointer">
                      <TableCell>
                        <b className="block">{c.titleEn}</b>
                        <span className="text-xs text-muted-foreground" dir="rtl" lang="ar">
                          {c.titleAr || '—'}
                        </span>
                      </TableCell>
                      <TableCell>{missing ? <Chip tone="peach">{`${t.admin.translations.missing} · ${f.number(missing)}`}</Chip> : <Chip tone="sage">{t.admin.translations.translated}</Chip>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Panel>
        {selected ? <Editor key={selected.id} course={selected} /> : <Panel><p className="text-sm text-muted-foreground">{t.admin.translations.selectItem}</p></Panel>}
      </div>
    </>
  );
}

interface TForm {
  titleAr: string;
  descriptionAr: string;
  modules: Array<{ titleEn: string; titleAr: string; order: number }>;
}

function Editor({ course }: { course: Course }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const form = useForm<TForm>();
  const modules = useFieldArray({ control: form.control, name: 'modules' });
  useEffect(() => {
    form.reset({ titleAr: course.titleAr ?? '', descriptionAr: course.descriptionAr ?? '', modules: course.modules.map((m) => ({ titleEn: m.titleEn, titleAr: m.titleAr ?? '', order: m.order })) });
  }, [course, form]);
  const save = useMutation({
    mutationFn: (v: TForm) =>
      coursesApi.update(course.id, {
        titleAr: v.titleAr || undefined,
        descriptionAr: v.descriptionAr || undefined,
        modules: v.modules.map((m) => ({ titleEn: m.titleEn, titleAr: m.titleAr || undefined, order: m.order })),
      }),
    onSuccess: () => {
      toast.success(t.admin.translations.saved);
      void qc.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Panel>
      <SectionHeader title={course.titleEn} size="sm" aside={<Chip tone="sun">{t.admin.translations.editing}</Chip>} />
      <form className="flex flex-col gap-5" onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3" dir="ltr" lang="en">
            <span className="label-mono text-muted-foreground">{t.admin.translations.source}</span>
            <Input value={course.titleEn} readOnly />
            <Textarea value={course.descriptionEn} readOnly rows={5} />
          </div>
          <div className="flex flex-col gap-3" dir="rtl" lang="ar">
            <span className="label-mono text-muted-foreground">{t.admin.translations.target}</span>
            <Input aria-label={t.admin.editor.titleAr} {...form.register('titleAr')} />
            <Textarea aria-label={t.admin.editor.descriptionAr} rows={5} {...form.register('descriptionAr')} />
          </div>
        </div>
        {modules.fields.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="label-mono text-muted-foreground">{t.admin.editor.modules}</span>
            {modules.fields.map((m, i) => (
              <div key={m.id} className="grid gap-2 md:grid-cols-2">
                <Input value={m.titleEn} readOnly dir="ltr" />
                <Input dir="rtl" lang="ar" aria-label={t.admin.editor.moduleAr} {...form.register(`modules.${i}.titleAr`)} />
              </div>
            ))}
          </div>
        )}
        <Button type="submit" variant="ink" className="self-start" disabled={save.isPending}>
          {t.admin.translations.save}
        </Button>
      </form>
    </Panel>
  );
}

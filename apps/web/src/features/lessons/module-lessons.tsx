'use client';

import { useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lessonInput } from '@azza/shared';
import { ArrowDown, ArrowUp, ChevronDown, CircleCheck, Link2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Markdown } from '@/components/brand/markdown';
import { ApiError, learningApi, type Lesson, type LessonAttachment } from '@/lib/api';
import type { CourseMediaUploader } from '@/lib/api/courses';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { IntroVideoField } from '../admin/course-media-fields';

/** Lessons of one course, shared by every module row of the course editor (one request). */
export function useCourseLessons(courseId: string | undefined) {
  return useQuery({ queryKey: qk.lessons(courseId ?? 'new'), queryFn: () => learningApi.lessons(courseId!), enabled: !!courseId, retry: false });
}

const errorText = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : String(e));

/**
 * The lessons of one module inside the course editor's curriculum tab. Lessons save on their own (not with the course
 * form), so this never renders a `<form>`: React submit events would bubble to the editor's form through the portal.
 */
export function ModuleLessons({ courseId, moduleId, editable, uploader }: { courseId?: string; moduleId?: string; editable: boolean; uploader?: CourseMediaUploader }) {
  const { t, f, fill, pick } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | 'new' | null>(null);
  const q = useCourseLessons(courseId);
  const panelId = useId();
  const lessons = q.data?.modules.find((m) => m.id === moduleId)?.lessons ?? [];
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: qk.lessons(courseId!) });
    if (courseId) void qc.invalidateQueries({ queryKey: qk.course(courseId) });
    // Adding, removing or moving lessons changes totals and the next lesson.
    void qc.invalidateQueries({ queryKey: qk.learningProgress });
  };
  const reorder = useMutation({
    mutationFn: (ids: string[]) => learningApi.reorderLessons(courseId!, moduleId!, ids),
    onSuccess: refresh,
    onError: (e) => toast.error(errorText(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => learningApi.deleteLesson(courseId!, moduleId!, id),
    onSuccess: () => {
      toast.success(t.learning.editor.deleted);
      refresh();
    },
    onError: (e) => toast.error(errorText(e)),
  });

  if (!courseId || !moduleId) return <p className="text-[13px] text-muted-foreground">{t.learning.editor.saveFirst}</p>;

  const move = (i: number, by: -1 | 1) => {
    const ids = lessons.map((l) => l.id);
    [ids[i], ids[i + by]] = [ids[i + by]!, ids[i]!];
    reorder.mutate(ids);
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 self-start rounded-full px-2 py-1 text-sm font-bold hover:bg-accent"
      >
        <ChevronDown className={cn('size-4 transition-transform', !open && '-rotate-90 rtl:rotate-90')} aria-hidden />
        {t.learning.editor.lessons} · {f.number(lessons.length)}
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-2 ps-6">
          {!editable && <p className="text-[13px] text-muted-foreground">{t.learning.editor.readOnly}</p>}
          {lessons.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">{t.learning.editor.none}</p>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {lessons.map((l, i) => (
                <li key={l.id} className="flex items-center gap-2 rounded-[12px] border border-border bg-background px-3 py-1.5">
                  <span className="timecode w-8 text-xs text-muted-foreground">L{String(i + 1).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{pick(l.titleEn, l.titleAr).text}</span>
                  {l.completed && (
                    <span className="inline-flex items-center gap-1 text-xs text-sun-fg">
                      <CircleCheck className="size-3.5" aria-hidden /> {t.learning.lessons.doneSr}
                    </span>
                  )}
                  {editable && (
                    <>
                      <Button type="button" variant="ghost" size="icon-xs" aria-label={t.learning.editor.moveUp} disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)}>
                        <ArrowUp />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-xs" aria-label={t.learning.editor.moveDown} disabled={i === lessons.length - 1 || reorder.isPending} onClick={() => move(i, 1)}>
                        <ArrowDown />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-xs" aria-label={`${t.learning.editor.edit}: ${l.titleEn}`} onClick={() => setEditing(l)}>
                        <Pencil />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="ghost" size="icon-xs" aria-label={`${t.common.remove}: ${l.titleEn}`}>
                            <Trash2 />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.learning.editor.deleteTitle}</AlertDialogTitle>
                            <AlertDialogDescription>{t.learning.editor.deleteBody}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove.mutate(l.id)}>{t.common.remove}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}
          {editable && (
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setEditing('new')}>
              <Plus /> {t.learning.editor.add}
            </Button>
          )}
          <span className="sr-only" aria-live="polite">
            {fill(t.learning.editor.count, { n: f.number(lessons.length) })}
          </span>
        </div>
      )}
      {editing && (
        <LessonDialog
          courseId={courseId}
          moduleId={moduleId}
          lesson={editing === 'new' ? undefined : editing}
          uploader={uploader}
          onClose={() => setEditing(null)}
          onSaved={() => {
            refresh();
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

interface Draft {
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  videoUrl: string | null;
  attachments: LessonAttachment[];
}

function LessonDialog({
  courseId,
  moduleId,
  lesson,
  uploader,
  onClose,
  onSaved,
}: {
  courseId: string;
  moduleId: string;
  lesson?: Lesson;
  uploader?: CourseMediaUploader;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const ids = useId();
  const [d, setD] = useState<Draft>({
    titleEn: lesson?.titleEn ?? '',
    titleAr: lesson?.titleAr ?? '',
    bodyEn: lesson?.bodyEn ?? '',
    bodyAr: lesson?.bodyAr ?? '',
    videoUrl: lesson?.videoUrl ?? null,
    attachments: lesson?.attachments ?? [],
  });
  const [error, setError] = useState<string | null>(null);
  const patch = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  const save = useMutation({
    mutationFn: () => {
      const parsed = lessonInput.safeParse({
        titleEn: d.titleEn,
        titleAr: d.titleAr.trim() || undefined,
        bodyEn: d.bodyEn,
        bodyAr: d.bodyAr.trim() ? d.bodyAr : undefined,
        videoUrl: d.videoUrl,
        attachments: d.attachments.filter((a) => a.title.trim() || a.url.trim()),
      });
      if (!parsed.success) {
        const issue = parsed.error.issues[0]!;
        throw new Error(`${issue.path.join('.')}: ${issue.message}`);
      }
      return lesson ? learningApi.updateLesson(courseId, moduleId, lesson.id, parsed.data) : learningApi.createLesson(courseId, moduleId, parsed.data);
    },
    onSuccess: () => {
      toast.success(t.learning.editor.saved);
      onSaved();
    },
    onError: (e) => setError(errorText(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{lesson ? t.learning.editor.edit : t.learning.editor.newTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${ids}-ten`}>{t.learning.editor.titleEn}</Label>
              <Input id={`${ids}-ten`} value={d.titleEn} onChange={(e) => patch({ titleEn: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${ids}-tar`}>{t.learning.editor.titleAr}</Label>
              <Input id={`${ids}-tar`} dir="rtl" lang="ar" value={d.titleAr} onChange={(e) => patch({ titleAr: e.target.value })} />
            </div>
          </div>
          <BodyField id={`${ids}-ben`} label={t.learning.editor.bodyEn} value={d.bodyEn} onChange={(bodyEn) => patch({ bodyEn })} />
          <BodyField id={`${ids}-bar`} label={t.learning.editor.bodyAr} value={d.bodyAr} onChange={(bodyAr) => patch({ bodyAr })} rtl />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t.learning.editor.video}</span>
            <IntroVideoField value={d.videoUrl} onChange={(videoUrl) => patch({ videoUrl })} title={d.titleEn || t.learning.editor.video} uploader={uploader} />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-medium">{t.learning.editor.attachments}</legend>
            {d.attachments.map((a, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <Input
                  className="min-w-36 flex-1"
                  aria-label={t.learning.editor.attachmentTitle}
                  placeholder={t.learning.editor.attachmentTitle}
                  value={a.title}
                  onChange={(e) => patch({ attachments: d.attachments.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })}
                />
                <InputGroup className="min-w-52 flex-[2]">
                  <InputGroupAddon>
                    <Link2 aria-hidden />
                  </InputGroupAddon>
                  <InputGroupInput
                    type="url"
                    dir="ltr"
                    aria-label={t.learning.editor.attachmentUrl}
                    placeholder={t.learning.editor.attachmentUrl}
                    value={a.url}
                    onChange={(e) => patch({ attachments: d.attachments.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })}
                  />
                </InputGroup>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t.common.remove} onClick={() => patch({ attachments: d.attachments.filter((_, j) => j !== i) })}>
                  <X />
                </Button>
              </div>
            ))}
            {d.attachments.length < 20 && (
              <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => patch({ attachments: [...d.attachments, { title: '', url: '' }] })}>
                <Plus /> {t.learning.editor.addAttachment}
              </Button>
            )}
          </fieldset>
          {error && (
            <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-fg">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>
            {t.learning.editor.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BodyField({ id, label, value, onChange, rtl }: { id: string; label: string; value: string; onChange: (v: string) => void; rtl?: boolean }) {
  const { t } = useI18n();
  return (
    <Tabs defaultValue="write" className="gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <TabsList>
          <TabsTrigger value="write">{t.learning.editor.write}</TabsTrigger>
          <TabsTrigger value="preview">{t.learning.editor.preview}</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="write" className="flex flex-col gap-1">
        <Textarea id={id} rows={8} dir={rtl ? 'rtl' : 'ltr'} lang={rtl ? 'ar' : 'en'} className="font-mono text-[13px]" value={value} onChange={(e) => onChange(e.target.value)} />
        <span className="text-xs text-muted-foreground">{t.learning.editor.markdownHint}</span>
      </TabsContent>
      <TabsContent value="preview" className="min-h-40 rounded-[14px] border border-border p-4">
        <Markdown source={value} dir={rtl ? 'rtl' : 'ltr'} />
      </TabsContent>
    </Tabs>
  );
}

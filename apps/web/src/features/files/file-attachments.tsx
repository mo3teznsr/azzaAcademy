'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MAX_MATERIAL_FILE_BYTES, MAX_SUBMISSION_FILE_BYTES } from '@azza/shared';
import { Download, FileText, Paperclip, TriangleAlert, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ApiError, mediaUrl, type UploadedFile } from '@/lib/api';
import type { UploadOptions } from '@/lib/api/client';
import type { Formatters } from '@/lib/i18n/format';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

const MB = 1024 * 1024;
const DOCUMENTS = ['pdf', 'docx', 'pptx', 'xlsx', 'png', 'jpg', 'jpeg', 'webp', 'zip', 'txt', 'md'];

/** Mirrors the API's checks (docs/API.md, "Assignment & material files") so a bad file fails before it uploads. */
export const FILE_RULES = {
  submission: { extensions: DOCUMENTS, maxBytes: MAX_SUBMISSION_FILE_BYTES },
  material: { extensions: [...DOCUMENTS, 'mp3', 'm4a'], maxBytes: MAX_MATERIAL_FILE_BYTES },
} as const;
export type FileRuleKind = keyof typeof FILE_RULES;

export type FileUploader = (file: File, opts: UploadOptions) => Promise<UploadedFile>;

const extensionOf = (name: string) => name.slice(name.lastIndexOf('.') + 1).toLowerCase();
const acceptFor = (kind: FileRuleKind) => FILE_RULES[kind].extensions.map((e) => `.${e}`).join(',');

/** 340 KB · 4.2 MB, in the active locale with Western digits. */
export function formatBytes(f: Formatters, bytes: number) {
  if (bytes < MB) return f.number(Math.max(1, Math.round(bytes / 1024)), { style: 'unit', unit: 'kilobyte', unitDisplay: 'short' });
  return f.number(bytes / MB, { style: 'unit', unit: 'megabyte', unitDisplay: 'short', maximumFractionDigits: 1 });
}

/** Localises an upload refusal from the API's `details.reason` (or the client-side check that mirrors it). */
export function useDescribeFileError(kind: FileRuleKind) {
  const { t, fill } = useI18n();
  return useCallback(
    (reason: string | undefined, name: string, fallback: string) => {
      const mb = String(FILE_RULES[kind].maxBytes / MB);
      if (reason === 'TYPE') return fill(kind === 'material' ? t.files.typeMaterial : t.files.type, { name });
      if (reason === 'TOO_LARGE') return fill(t.files.tooLarge, { name, mb });
      if (reason === 'EMPTY') return fill(t.files.empty, { name });
      if (reason === 'MISSING') return t.files.missing;
      if (reason === 'FOREIGN_URL') return t.files.foreign;
      return fallback || fill(t.files.failed, { name });
    },
    [kind, t, fill],
  );
}

/** The `details.reason` of an upload/create error, if the API sent one. */
export const fileErrorReason = (e: unknown) => (e instanceof ApiError ? (e.details as { reason?: string } | undefined)?.reason : undefined);

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'done' | 'error';
  progress: number;
  file?: UploadedFile;
  error?: string;
}

/**
 * Several files uploading at once, each with its own progress and abort. Files are checked for type and size first;
 * a refused file stays in the list with its reason so the learner can see what happened and remove it.
 */
export function useFileUploads({ kind, uploader, max }: { kind: FileRuleKind; uploader: FileUploader; max: number }) {
  const { t, fill } = useI18n();
  const describe = useDescribeFileError(kind);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const controllers = useRef(new Map<string, AbortController>());
  useEffect(() => {
    const live = controllers.current;
    return () => live.forEach((c) => c.abort());
  }, []);

  const patch = (id: string, next: Partial<UploadItem>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...next } : i)));

  const upload = async (id: string, file: File) => {
    const ctrl = new AbortController();
    controllers.current.set(id, ctrl);
    try {
      const stored = await uploader(file, { signal: ctrl.signal, onProgress: (p) => patch(id, { progress: p }) });
      patch(id, { status: 'done', progress: 1, file: stored });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      patch(id, { status: 'error', error: describe(fileErrorReason(e), file.name, e instanceof ApiError && !fileErrorReason(e) ? e.message : '') });
    } finally {
      controllers.current.delete(id);
    }
  };

  const add = (files: File[]) => {
    setNotice(null);
    const rules = FILE_RULES[kind];
    const room = max - items.filter((i) => i.status !== 'error').length;
    if (files.length > room) setNotice(fill(t.files.tooMany, { max: String(max) }));
    const next: Array<{ item: UploadItem; file: File }> = files.slice(0, Math.max(0, room)).map((file) => {
      const id = crypto.randomUUID();
      const reason = !(rules.extensions as readonly string[]).includes(extensionOf(file.name)) ? 'TYPE' : file.size === 0 ? 'EMPTY' : file.size > rules.maxBytes ? 'TOO_LARGE' : undefined;
      return {
        file,
        item: reason
          ? { id, name: file.name, size: file.size, status: 'error', progress: 0, error: describe(reason, file.name, '') }
          : { id, name: file.name, size: file.size, status: 'uploading', progress: 0 },
      };
    });
    setItems((list) => [...list, ...next.map((n) => n.item)]);
    next.filter((n) => n.item.status === 'uploading').forEach((n) => void upload(n.item.id, n.file));
  };

  const remove = (id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    setNotice(null);
    setItems((list) => list.filter((i) => i.id !== id));
  };

  const reset = () => {
    controllers.current.forEach((c) => c.abort());
    controllers.current.clear();
    setNotice(null);
    setItems([]);
  };

  return {
    items,
    add,
    remove,
    reset,
    notice,
    busy: items.some((i) => i.status === 'uploading'),
    uploaded: items.flatMap((i) => (i.status === 'done' && i.file ? [i.file] : [])),
    full: items.filter((i) => i.status !== 'error').length >= max,
  };
}

export type FileUploads = ReturnType<typeof useFileUploads>;

/** Drag-and-drop or pick, then one row per file with progress, size and remove. */
export function AttachmentsField({ uploads, kind, max, label, disabled }: { uploads: FileUploads; kind: FileRuleKind; max: number; label: string; disabled?: boolean }) {
  const { t, f, fill } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const labelId = useId();
  const hintId = useId();
  const hint = fill(kind === 'material' ? t.files.hintMaterial : t.files.hintSubmission, { mb: String(FILE_RULES[kind].maxBytes / MB), max: String(max) });
  const canAdd = !disabled && !uploads.full;

  return (
    <div className="flex flex-col gap-2" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="text-sm font-medium">
        {label}
      </span>
      <input
        ref={input}
        type="file"
        hidden
        multiple={max > 1}
        accept={acceptFor(kind)}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length) uploads.add(files);
        }}
      />
      {canAdd && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const files = Array.from(e.dataTransfer.files);
            if (files.length) uploads.add(files);
          }}
          className={cn(
            'flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-input bg-card px-4 py-5 text-center transition-colors',
            over && 'border-field-focus bg-accent',
          )}
        >
          <Upload className="size-5 text-muted-foreground" aria-hidden />
          <span className="text-sm">{t.files.dropHere}</span>
          <Button type="button" variant="outline" size="sm" aria-describedby={hintId} onClick={() => input.current?.click()}>
            <Paperclip /> {max > 1 ? t.files.chooseMany : t.files.chooseOne}
          </Button>
          <span id={hintId} className="text-[13px] text-muted-foreground">
            {hint}
          </span>
        </div>
      )}
      {uploads.notice && (
        <span role="alert" className="text-[13px] text-destructive">
          {uploads.notice}
        </span>
      )}
      {uploads.items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {uploads.items.map((i) => (
            <li key={i.id} className={cn('flex flex-col gap-2 rounded-[14px] border bg-card p-3', i.status === 'error' ? 'border-danger-line' : 'border-border')}>
              <div className="flex items-center gap-3">
                {i.status === 'error' ? <TriangleAlert className="size-4 shrink-0 text-destructive" aria-hidden /> : <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                <bdi className="min-w-0 flex-1 truncate text-sm font-semibold">{i.name}</bdi>
                <span className="shrink-0 text-[13px] text-muted-foreground tabular-nums">{formatBytes(f, i.size)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={fill(i.status === 'uploading' ? t.files.cancel : t.files.remove, { name: i.name })}
                  onClick={() => uploads.remove(i.id)}
                >
                  <X />
                </Button>
              </div>
              {i.status === 'uploading' && (
                <div className="flex items-center gap-3" role="status">
                  <Progress value={i.progress * 100} aria-label={fill(t.files.uploading, { pct: f.percent(i.progress * 100) })} className="h-1.5 flex-1" />
                  <span className="min-w-12 text-end text-[13px] text-muted-foreground tabular-nums">{f.percent(i.progress * 100)}</span>
                </div>
              )}
              {i.status === 'error' && <span className="text-[13px] text-destructive">{i.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Read-only list of attached files with size and a download link. */
export function FileList({ files, className }: { files: UploadedFile[]; className?: string }) {
  const { t, f, fill } = useI18n();
  if (files.length === 0) return null;
  return (
    <ul className={cn('flex flex-col gap-2', className)}>
      {files.map((file) => (
        <li key={file.url}>
          <a
            href={mediaUrl(file.url)}
            target="_blank"
            rel="noreferrer"
            download={file.name}
            className="flex min-h-11 items-center gap-3 rounded-[14px] border border-border bg-card px-3.5 py-2.5 text-foreground no-underline hover:bg-accent"
          >
            <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <bdi className="min-w-0 flex-1 truncate text-sm font-semibold">{file.name}</bdi>
            <span className="shrink-0 text-[13px] text-muted-foreground tabular-nums">{formatBytes(f, file.size)}</span>
            <Download className="size-4 shrink-0 text-link" aria-hidden />
            <span className="sr-only">{fill(t.files.download, { name: file.name })}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

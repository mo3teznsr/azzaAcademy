'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';
import { parseCourseVideoUrl } from '@azza/shared';
import { ImageUp, Link2, Trash2, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { CourseIntroVideo } from '@/components/brand/course-intro-video';
import { ApiError, mediaUrl } from '@/lib/api';
import { uploadCourseMediaAsAdmin, type CourseMediaKind, type CourseMediaUploader } from '@/lib/api/courses';
import { useI18n } from '@/lib/i18n/provider';

const MB = 1024 * 1024;
const RULES: Record<CourseMediaKind, { accept: string; maxBytes: number }> = {
  'course-cover': { accept: 'image/jpeg,image/png,image/webp', maxBytes: 8 * MB },
  'course-video': { accept: 'video/mp4,video/quicktime,video/webm', maxBytes: 200 * MB },
};

/**
 * Uploads one file with progress through `uploader` (admin: `POST /admin/media`, teacher: `POST /courses/media`);
 * errors are localised from the API's `details.reason`.
 */
function useCourseMediaUpload(kind: CourseMediaKind, onUploaded: (url: string) => void, uploader: CourseMediaUploader) {
  const { t, fill } = useI18n();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const describe = (reason: string | undefined, fallback: string) => {
    if (reason === 'TYPE') return kind === 'course-cover' ? t.admin.editor.mediaTypeCover : t.admin.editor.mediaTypeVideo;
    if (reason === 'TOO_LARGE') return fill(t.admin.editor.mediaTooLarge, { mb: String(RULES[kind].maxBytes / MB) });
    if (reason === 'EMPTY') return t.admin.editor.mediaEmpty;
    return fallback;
  };

  const upload = async (file: File) => {
    setError(null);
    // Fail fast on size so an admin doesn't wait for 300 MB to upload just to be refused.
    if (file.size > RULES[kind].maxBytes) return setError(describe('TOO_LARGE', ''));
    const ctrl = new AbortController();
    abort.current = ctrl;
    setProgress(0);
    try {
      const { url } = await uploader(kind, file, { onProgress: setProgress, signal: ctrl.signal });
      onUploaded(url);
      toast.success(t.admin.editor.mediaUploaded);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      const reason = e instanceof ApiError ? (e.details as { reason?: string } | undefined)?.reason : undefined;
      setError(describe(reason, e instanceof Error ? e.message : String(e)));
    } finally {
      if (abort.current === ctrl) abort.current = null;
      setProgress(null);
    }
  };

  return { upload, progress, error, setError, cancel: () => abort.current?.abort() };
}

/** A project Button that opens a hidden file picker. */
function FilePicker({ accept, disabled, onFile, children }: { accept: string; disabled?: boolean; onFile: (f: File) => void; children: React.ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => input.current?.click()}>
        {children}
      </Button>
    </>
  );
}

function UploadProgress({ value, onCancel }: { value: number; onCancel: () => void }) {
  const { t, f, fill } = useI18n();
  const pct = f.percent(value * 100);
  return (
    <div className="flex items-center gap-3" role="status">
      <Progress value={value * 100} aria-label={fill(t.admin.editor.uploading, { pct })} className="h-1.5 flex-1" />
      <span className="timecode min-w-28 text-[13px] text-muted-foreground">{fill(t.admin.editor.uploading, { pct })}</span>
      <Button type="button" variant="ghost" size="icon-xs" aria-label={t.admin.editor.cancelUpload} onClick={onCancel}>
        <X />
      </Button>
    </div>
  );
}

export function CoverPhotoField({
  value,
  onChange,
  uploader = uploadCourseMediaAsAdmin,
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  uploader?: CourseMediaUploader;
}) {
  const { t } = useI18n();
  const media = useCourseMediaUpload('course-cover', onChange, uploader);
  const src = mediaUrl(value);
  const busy = media.progress !== null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative aspect-[4/3] w-36 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
          {src ? (
            // Unoptimised: admins may paste covers from hosts outside the optimiser's allow-list.
            <Image src={src} alt={t.admin.editor.coverAlt} fill unoptimized sizes="144px" className="object-cover" />
          ) : (
            <ImageUp className="absolute inset-0 m-auto size-6 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilePicker accept={RULES['course-cover'].accept} disabled={busy} onFile={(f) => void media.upload(f)}>
            <ImageUp /> {src ? t.admin.editor.replace : t.admin.editor.uploadPhoto}
          </FilePicker>
          {src && (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => (media.setError(null), onChange(null))}>
              <Trash2 /> {t.common.remove}
            </Button>
          )}
        </div>
      </div>
      {busy && <UploadProgress value={media.progress!} onCancel={media.cancel} />}
      {media.error && <span className="text-[13px] text-destructive">{media.error}</span>}
      <span className="text-[13px] text-muted-foreground">{t.admin.editor.coverPhotoHint}</span>
    </div>
  );
}

export function IntroVideoField({
  value,
  onChange,
  title,
  error,
  uploader = uploadCourseMediaAsAdmin,
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  title: string;
  error?: string;
  uploader?: CourseMediaUploader;
}) {
  const { t } = useI18n();
  const media = useCourseMediaUpload('course-video', onChange, uploader);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const linkId = useId();
  const busy = media.progress !== null;
  const playable = parseCourseVideoUrl(value) !== null;

  const applyLink = () => {
    const url = link.trim();
    if (!parseCourseVideoUrl(url)) return setLinkError(t.admin.editor.videoLinkInvalid);
    setLinkError(null);
    media.setError(null);
    setLink('');
    onChange(url);
  };

  return (
    <div className="flex flex-col gap-3">
      {value && playable && <CourseIntroVideo url={value} title={title} className="max-w-xl" />}
      {value && !playable && (
        <span className="break-all text-[13px] text-muted-foreground" dir="ltr">
          {value}
        </span>
      )}
      <div className="flex flex-wrap gap-2">
        <FilePicker accept={RULES['course-video'].accept} disabled={busy} onFile={(f) => void media.upload(f)}>
          <Video /> {value ? t.admin.editor.replace : t.admin.editor.uploadVideo}
        </FilePicker>
        {value && (
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => (media.setError(null), onChange(null))}>
            <Trash2 /> {t.common.remove}
          </Button>
        )}
      </div>
      {busy && <UploadProgress value={media.progress!} onCancel={media.cancel} />}
      {media.error && <span className="text-[13px] text-destructive">{media.error}</span>}
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={linkId} className="sr-only">
          {t.admin.editor.videoLink}
        </label>
        <Input
          id={linkId}
          type="url"
          dir="ltr"
          inputMode="url"
          placeholder="https://youtu.be/…"
          value={link}
          disabled={busy}
          aria-invalid={!!linkError}
          onChange={(e) => (setLink(e.target.value), setLinkError(null))}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyLink())}
          className="min-w-0 flex-1"
        />
        <Button type="button" variant="outline" size="sm" disabled={busy || !link.trim()} onClick={applyLink}>
          <Link2 /> {t.admin.editor.useLink}
        </Button>
      </div>
      {(linkError ?? error) && <span className="text-[13px] text-destructive">{linkError ?? error}</span>}
      <span className="text-[13px] text-muted-foreground">{t.admin.editor.introVideoHint}</span>
    </div>
  );
}

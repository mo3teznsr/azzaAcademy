'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Copy, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseCover } from '@/components/brand/course-cover';
import { Chip } from '@/components/brand/status-chip';
import { PageTitle, SectionHeader } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingGrid } from '@/components/brand/states';
import { meApi, type Certificate, type CertificateCourse, type CertificateProgress } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useAuth } from '@/lib/auth/use-auth';
import { useI18n } from '@/lib/i18n/provider';
import { useEnrollments } from '../learn/hooks';
import { CertificateSheet, verifyUrl } from './certificate-sheet';

/** The certificate endpoints omit `coverStyle`; borrow it from my enrollments so typographic covers keep their colour. */
function useCoverStyles() {
  const enr = useEnrollments();
  return useMemo(() => new Map((enr.data ?? []).map((e) => [e.batchId, e.batch.course.coverStyle])), [enr.data]);
}
const cover = (course: CertificateCourse, style?: string) => ({ ...course, coverStyle: style ?? 'sun' });

export function CertificatesPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const q = useQuery({ queryKey: qk.certificates, queryFn: meApi.certificates });
  const styles = useCoverStyles();
  const [printing, setPrinting] = useState<Certificate | null>(null);

  useEffect(() => {
    const done = () => setPrinting(null);
    window.addEventListener('afterprint', done);
    return () => window.removeEventListener('afterprint', done);
  }, []);

  const print = (c: Certificate) => {
    flushSync(() => setPrinting(c));
    window.print();
  };

  return (
    <>
      <PageTitle kicker={t.certificates.kicker} title={t.certificates.title} aside={<p className="max-w-sm text-sm text-muted-foreground">{t.certificates.rule}</p>} />
      {q.isPending ? (
        <LoadingGrid count={3} height={360} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <section aria-labelledby="earned" className="flex flex-col gap-4">
            <SectionHeader title={<span id="earned">{t.certificates.earned}</span>} />
            {q.data.items.length === 0 ? (
              <EmptyState title={t.certificates.emptyTitle} body={t.certificates.emptyBody} />
            ) : (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-4">
                {q.data.items.map((c, i) => (
                  <li key={c.id} className="rise" style={{ '--i': i } as React.CSSProperties}>
                    <CertificateCard cert={c} coverStyle={styles.get(c.batchId)} onPrint={() => print(c)} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="progress" className="flex flex-col gap-4">
            <SectionHeader title={<span id="progress">{t.certificates.inProgress}</span>} />
            {q.data.inProgress.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">{t.certificates.noProgress}</p>
            ) : (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,420px),1fr))] gap-4">
                {q.data.inProgress.map((p) => (
                  <li key={p.batchId}>
                    <ProgressCard p={p} coverStyle={styles.get(p.batchId)} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      {printing && <CertificateSheet cert={printing} holderName={user?.name ?? ''} />}
    </>
  );
}

function CertificateCard({ cert, coverStyle, onPrint }: { cert: Certificate; coverStyle?: string; onPrint: () => void }) {
  const { t, f, fill, pick } = useI18n();
  const [copied, setCopied] = useState(false);
  const course = pick(cert.course.titleEn, cert.course.titleAr).text || cert.courseTitle;
  const copy = async () => {
    const url = verifyUrl(cert.code);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t.certificates.linkCopied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(fill(t.certificates.copyFailed, { url }));
    }
  };
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      <CourseCover course={cover(cert.course, coverStyle)} showMeta={false} className="h-36 rounded-none" />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/courses/${cert.course.slug}`} className="block text-lg leading-tight font-bold text-foreground no-underline hover:underline">
              {course}
            </Link>
            <span className="text-[13px] text-muted-foreground">
              <bdi dir="ltr">{cert.batchCode}</bdi> · <bdi>{cert.teacherName}</bdi>
            </span>
          </div>
          <Chip tone="sage">{fill(t.certificates.attended, { a: f.number(cert.attended), b: f.number(cert.total) })}</Chip>
        </div>
        <dl className="grid grid-cols-2 gap-3 border-y border-border py-3 text-sm">
          <div>
            <dt className="label-mono text-muted-foreground">{t.certificates.dates}</dt>
            <dd className="mt-1">
              {f.dayMonth(cert.startsOn)} – {f.dayMonth(cert.endsOn)}
            </dd>
          </div>
          <div>
            <dt className="label-mono text-muted-foreground">{t.certificates.code}</dt>
            <dd className="mt-1 font-mono tracking-[0.08em]" dir="ltr">
              {cert.code}
            </dd>
          </div>
        </dl>
        <span className="text-[13px] text-muted-foreground">{fill(t.certificates.issued, { d: f.dateLong(cert.issuedAt) })}</span>
        <div className="mt-auto flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void copy()}>
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {t.certificates.copyLink}
          </Button>
          <Button onClick={onPrint}>
            <Printer aria-hidden /> {t.certificates.download}
          </Button>
        </div>
      </div>
    </article>
  );
}

function ProgressCard({ p, coverStyle }: { p: CertificateProgress; coverStyle?: string }) {
  const { t, f, fill, pick } = useI18n();
  const total = Math.max(1, p.total);
  const pct = Math.min(100, (p.attended / total) * 100);
  const mark = Math.min(100, (p.required / total) * 100);
  const course = pick(p.course.titleEn, p.course.titleAr).text || p.courseTitle;
  const status = p.needed <= 0 ? t.certificates.met : !p.reachable ? fill(t.certificates.unreachable, { r: f.number(p.required) }) : f.plural(p.needed, t.certificates.needMore);
  return (
    <article className="flex min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <CourseCover course={cover(p.course, coverStyle)} size="sm" showMeta={false} className="w-28 shrink-0 rounded-none sm:w-36" />
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <b className="font-display text-2xl leading-none font-extrabold" dir="ltr">
            {p.batchCode}
          </b>
          <span className="label-mono text-muted-foreground">{fill(t.certificates.sessionsEnded, { a: f.number(p.sessionsEnded), b: f.number(p.total) })}</span>
        </div>
        <b className="truncate">{course}</b>
        <span className="text-[13px] text-muted-foreground">
          <bdi>{p.teacherName}</bdi> · {f.dayMonth(p.startsOn)} – {f.dayMonth(p.endsOn)}
        </span>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[13px]">
            <span>{fill(t.certificates.progress, { a: f.number(p.attended), r: f.number(p.required) })}</span>
            <span className="text-muted-foreground">
              {f.number(p.attended)}/{f.number(p.total)}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={course}
            aria-valuemin={0}
            aria-valuemax={p.total}
            aria-valuenow={p.attended}
            aria-valuetext={fill(t.certificates.progress, { a: p.attended, r: p.required })}
            className="relative h-2 rounded-full bg-secondary"
          >
            <div className={p.needed <= 0 ? 'h-2 rounded-full bg-green-deep' : 'h-2 rounded-full bg-green'} style={{ width: `${pct}%` }} />
            <span aria-hidden className="absolute -top-1 h-4 w-0.5 rounded bg-foreground" style={{ insetInlineStart: `calc(${mark}% - 1px)` }} />
          </div>
          <span className={p.needed > 0 && !p.reachable ? 'text-[13px] text-peach-fg' : 'text-[13px] text-muted-foreground'}>{status}</span>
        </div>
      </div>
    </article>
  );
}

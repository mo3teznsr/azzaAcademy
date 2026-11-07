'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Hash, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { SignalMark } from '@/components/brand/signal-mark';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { ApiError, coursesApi, type CertificateVerification } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';

export function VerifyPage({ code }: { code?: string }) {
  const { t } = useI18n();
  const q = useQuery({
    queryKey: qk.certificate(code ?? ''),
    queryFn: () => coursesApi.verifyCertificate(code!),
    enabled: !!code,
    retry: (n, e) => !(e instanceof ApiError && e.isNotFound) && n < 2,
  });
  const notFound = q.error instanceof ApiError && q.error.isNotFound;
  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-10 px-4 sm:px-6">
      <header>
        <span className="label-mono text-muted-foreground">{t.verify.title}</span>
        {code && (
          <h1 className="mt-2 font-mono text-[clamp(28px,5vw,44px)] tracking-[0.1em]" dir="ltr">
            {code.toUpperCase()}
          </h1>
        )}
      </header>
      {!code ? (
        <section aria-labelledby="verify-form-title" className="flex flex-col gap-6">
          <h1 id="verify-form-title" className="font-display text-[clamp(44px,7vw,80px)] leading-[0.9] font-extrabold">
            {t.verify.checkAnother}
          </h1>
          <CodeForm />
        </section>
      ) : q.isPending ? (
        <LoadingBlock rows={1} height={320} />
      ) : notFound ? (
        <section aria-labelledby="nf" className="flex flex-col gap-6 rounded-[24px] border border-dashed border-line-strong p-8" role="alert">
          <SignalMark state="ended" size={40} />
          <div>
            <h2 id="nf" className="font-display text-4xl font-extrabold">
              {t.verify.notFoundTitle}
            </h2>
            <p className="mt-2 text-muted-foreground">{t.verify.notFoundBody}</p>
          </div>
          <CodeForm initial={code} />
        </section>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <ValidCard c={q.data} />
      )}
    </div>
  );
}

function ValidCard({ c }: { c: CertificateVerification }) {
  const { t, f, fill, pick } = useI18n();
  const course = pick(c.course.titleEn, c.course.titleAr).text || c.courseTitle;
  const rows: Array<[string, React.ReactNode]> = [
    [t.verify.course, course],
    [t.verify.batch, <bdi key="b" dir="ltr">{c.batchCode}</bdi>],
    [t.verify.teacher, <bdi key="t">{c.teacherName}</bdi>],
    [t.verify.dates, `${f.dayMonth(c.startsOn)} – ${f.dayMonth(c.endsOn)}`],
    [t.verify.attendance, fill(t.certificates.attended, { a: f.number(c.attended), b: f.number(c.total) })],
    [t.verify.issued, f.dateLong(c.issuedAt)],
  ];
  return (
    <section aria-labelledby="valid" className="theme-cream rise flex flex-col gap-8 rounded-[28px] bg-ivory p-[clamp(1.5rem,4vw,3rem)] text-ink light:border light:border-border">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex h-8 items-center gap-2 rounded-full bg-sage px-3 font-mono text-xs font-semibold tracking-[0.06em] uppercase">
          <BadgeCheck className="size-4" aria-hidden /> {t.verify.valid}
        </span>
        <span className="text-sm text-stone-2">{t.verify.validBody}</span>
      </div>
      <div>
        <span className="label-mono text-stone-2">{t.verify.holder}</span>
        <h2 id="valid" className="mt-2 font-display text-[clamp(44px,7vw,88px)] leading-[0.88] font-extrabold">
          <bdi>{c.holderName}</bdi>
        </h2>
      </div>
      <dl className="grid gap-x-8 gap-y-4 border-t border-cream-line pt-6 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="label-mono text-stone-2">{k}</dt>
            <dd className="mt-1 text-lg font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <Link href={`/courses/${c.course.slug}`} className="self-start font-semibold text-ink underline">
        {t.verify.viewCourse}
      </Link>
    </section>
  );
}

function CodeForm({ initial = '' }: { initial?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const code = value.trim();
    if (code) router.push(`/verify/${encodeURIComponent(code.toUpperCase())}`);
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-60 flex-1 flex-col gap-1.5">
        <Label htmlFor="cert-code">{t.verify.inputLabel}</Label>
        <InputGroup>
          <InputGroupAddon>
            <Hash aria-hidden />
          </InputGroupAddon>
          <InputGroupInput id="cert-code" value={value} onChange={(e) => setValue(e.target.value)} placeholder="AZ-CERT-7Q4K" dir="ltr" autoComplete="off" spellCheck={false} className="font-mono uppercase" />
          {value && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" aria-label={t.auth.clear} onClick={() => setValue('')}>
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      </div>
      <Button type="submit" size="lg">{t.verify.check}</Button>
    </form>
  );
}

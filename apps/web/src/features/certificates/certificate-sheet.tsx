'use client';

import { useI18n } from '@/lib/i18n/provider';
import type { Certificate } from '@/lib/api/types';

export const verifyUrl = (code: string) => `${typeof window === 'undefined' ? '' : window.location.origin}/verify/${encodeURIComponent(code)}`;

/**
 * Print-only certificate (A4 landscape). Rendered off-screen and revealed by the `.print-sheet`
 * print rules in globals.css, so "Download" is the browser's Save as PDF.
 */
export function CertificateSheet({ cert, holderName }: { cert: Certificate; holderName: string }) {
  const { t, f, fill, pick } = useI18n();
  const course = pick(cert.course.titleEn, cert.course.titleAr).text || cert.courseTitle;
  return (
    <div className="print-sheet hidden bg-ivory text-ink print:flex" aria-hidden>
      <div className="m-[12mm] flex flex-1 flex-col justify-between rounded-[6mm] border-[1.5mm] border-ink p-[14mm]">
        <div className="flex items-center justify-between">
          {/* Plain <img>: print drops background colours, so the CSS-mask logo would vanish on paper. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-ink.png" alt="عازة Azza" className="h-[14mm] w-auto" />
          <span className="label-mono">{t.certificates.sheetKicker}</span>
        </div>
        <div className="flex flex-col gap-4">
          <span className="label-mono">{t.certificates.sheetAwarded}</span>
          <b className="font-display text-[64px] leading-[0.9] font-extrabold">
            <bdi>{holderName}</bdi>
          </b>
          <span className="text-lg">{t.certificates.sheetFor}</span>
          <b className="font-display text-[40px] leading-none font-extrabold">{course}</b>
          <span className="text-lg">
            <bdi dir="ltr">{cert.batchCode}</bdi> · {f.dayMonth(cert.startsOn)} – {f.dayMonth(cert.endsOn)} · {fill(t.certificates.sheetTaught, { name: cert.teacherName })}
          </span>
          <span>{fill(t.certificates.sheetAttended, { a: f.number(cert.attended), b: f.number(cert.total) })}</span>
        </div>
        <div className="flex items-end justify-between gap-6 border-t border-ink pt-5 text-sm">
          <span>
            {fill(t.certificates.issued, { d: f.dateLong(cert.issuedAt) })}
            <span className="block" dir="ltr">
              {fill(t.certificates.sheetVerify, { url: verifyUrl(cert.code) })}
            </span>
          </span>
          <b className="font-mono text-2xl tracking-[0.12em]" dir="ltr">
            {cert.code}
          </b>
        </div>
      </div>
    </div>
  );
}

import type { Locale } from '@azza/shared';
import { API_URL } from '@/lib/api/client';
import type { CertificateVerification } from '@/lib/api/types';

/**
 * The link preview for `/verify/[code]` (WhatsApp, LinkedIn, X…): who earned it, for which course, and that
 * Azza verifies it. Rendered with `ImageResponse` by `verify/[code]/og/route.tsx`; kept here so the layout and
 * copy sit next to the verify page.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;

// Brand tokens from globals.css: deep green ink, bright green accent, lime highlight, cream text.
const INK = '#102018';
const INK_DEEP = '#07110d';
const LINE = '#26402f';
const GREEN = '#25d366';
const LIME = '#dfff69';
const CREAM = '#f1f1e9';
const STONE = '#9daba3';

const COPY = {
  ar: { brand: 'عازة', verified: 'شهادة موثّقة', issued: 'صدرت في', unknown: 'تحقّق من شهادة', unknownBody: 'تحقّق من صحة الشهادات على azza.academy' },
  en: { brand: 'Azza', verified: 'Verified certificate', issued: 'Issued', unknown: 'Certificate check', unknownBody: 'Check any certificate on azza.academy' },
} as const;

/** Public verification data, or null when the code is unknown or the API is unreachable. */
export async function fetchCertificate(code: string): Promise<CertificateVerification | null> {
  const res = await fetch(`${API_URL}/api/v1/certificates/${encodeURIComponent(code)}`, { next: { revalidate: 3600 } }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json().catch(() => null)) as CertificateVerification | null;
}

export const certificateCourse = (c: CertificateVerification, locale: Locale) =>
  (locale === 'ar' ? c.course.titleAr : c.course.titleEn) || c.course.titleEn || c.courseTitle;

/**
 * Almarai (the brand face, Arabic and Latin) as TTF, cut down to the characters drawn. Satori needs a font with
 * Arabic glyphs to draw Arabic at all; if Google Fonts is unreachable the image falls back to the built-in font.
 */
export async function loadBrandFont(text: string, weight: 400 | 800) {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Almarai:wght@${weight}&text=${encodeURIComponent(text)}`, { next: { revalidate: 86400 } })
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    return res.ok ? { name: 'Almarai', data: await res.arrayBuffer(), weight, style: 'normal' as const } : null;
  } catch {
    return null;
  }
}

/** Every string the image draws, so the font request includes exactly those glyphs. */
export function ogText(c: CertificateVerification | null, locale: Locale, issued: string) {
  const t = COPY[locale];
  return c ? [t.brand, t.verified, t.issued, c.holderName, certificateCourse(c, locale), c.code, issued, 'azza.academy'].join('') : [t.brand, t.unknown, t.unknownBody, 'azza.academy'].join('');
}

export function formatIssued(c: CertificateVerification | null, locale: Locale) {
  if (!c) return '';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Dubai' }).format(new Date(c.issuedAt));
}

/** Big text shrinks with length so long names and course titles still fit on two lines. */
const fit = (text: string, base: number, min: number, per: number) => Math.max(min, Math.min(base, Math.round(base - (text.length - per) * 1.6)));

/**
 * Satori (behind ImageResponse) shapes Arabic letters but has no bidi or `direction`: it lays words out left to
 * right. In Arabic each word is its own box in a reversed, wrapping row, so the first word sits on the right and
 * lines wrap right to left. Numbers and Latin tokens stay intact inside their box. Satori also measures joined
 * Arabic words a little wide, so the visible gaps vary slightly; the gap itself is kept small for that reason.
 */
function Line({ text, rtl, style }: { text: string; rtl: boolean; style: React.CSSProperties }) {
  if (!rtl) return <span style={{ display: 'flex', flexWrap: 'wrap', ...style }}>{text}</span>;
  const size = typeof style.fontSize === 'number' ? style.fontSize : 28;
  return (
    <span style={{ display: 'flex', flexWrap: 'wrap', flexDirection: 'row-reverse', columnGap: Math.round(size * 0.15), ...style }}>
      {text.split(/\s+/).filter(Boolean).map((w, i) => (
        <span key={i}>{w}</span>
      ))}
    </span>
  );
}

export function CertificateOgImage({ c, locale, issued }: { c: CertificateVerification | null; locale: Locale; issued: string }) {
  const t = COPY[locale];
  const rtl = locale === 'ar';
  const row = rtl ? 'row-reverse' : 'row';
  const course = c ? certificateCourse(c, locale) : '';
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: rtl ? 'flex-end' : 'flex-start',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background: `linear-gradient(135deg, ${INK} 0%, ${INK_DEEP} 100%)`,
        color: CREAM,
        fontFamily: 'Almarai',
      }}
    >
      <div style={{ display: 'flex', flexDirection: row, alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: row, alignItems: 'center', gap: 16 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: GREEN, display: 'flex' }} />
          <span style={{ fontSize: 40, fontWeight: 800 }}>{t.brand}</span>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: row,
            alignItems: 'center',
            gap: 12,
            padding: '12px 24px',
            borderRadius: 999,
            background: GREEN,
            color: INK_DEEP,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={INK_DEEP} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12.5l5 5L20 6.5" />
          </svg>
          <Line text={c ? t.verified : t.unknown} rtl={rtl} style={{ fontSize: 28, fontWeight: 800 }} />
        </div>
      </div>

      {c ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: rtl ? 'flex-end' : 'flex-start', gap: 20, width: '100%' }}>
          <Line text={c.holderName} rtl={rtl} style={{ fontSize: fit(c.holderName, 92, 56, 18), fontWeight: 800, lineHeight: 1.15, color: CREAM }} />
          <Line text={course} rtl={rtl} style={{ fontSize: fit(course, 46, 32, 34), fontWeight: 400, lineHeight: 1.35, color: LIME }} />
        </div>
      ) : (
        <Line text={t.unknownBody} rtl={rtl} style={{ fontSize: 48, fontWeight: 400, color: LIME }} />
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: row,
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          borderTop: `2px solid ${LINE}`,
          paddingTop: 28,
          fontSize: 26,
          color: STONE,
        }}
      >
        <div style={{ display: 'flex', flexDirection: row, gap: 12 }}>
          {c && <Line text={t.issued} rtl={rtl} style={{ fontSize: 26 }} />}
          {c && <Line text={issued} rtl={rtl} style={{ fontSize: 26, color: CREAM }} />}
        </div>
        <div style={{ display: 'flex', flexDirection: row, gap: 24 }}>
          {c && <span style={{ letterSpacing: 4, color: CREAM }}>{c.code}</span>}
          <span>azza.academy</span>
        </div>
      </div>
    </div>
  );
}

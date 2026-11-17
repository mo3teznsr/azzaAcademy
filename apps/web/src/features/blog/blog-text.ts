import type { Locale } from '@azza/shared';
import type { BlogPost, BlogPostSummary } from '@/lib/api/blog';

/**
 * A post's text in the page language. English pages fall back to the Arabic article when there is no English
 * version (`fallback`), and the caller marks that text `lang="ar" dir="rtl"`.
 */
export function postText(p: BlogPostSummary, locale: Locale) {
  const en = locale === 'en' && p.hasEn;
  return {
    title: en ? p.titleEn! : p.titleAr,
    excerpt: en ? (p.excerptEn ?? '') : p.excerptAr,
    lang: (en ? 'en' : 'ar') as Locale,
    fallback: locale === 'en' && !p.hasEn,
  };
}

export function postBody(p: BlogPost, locale: Locale) {
  return locale === 'en' && p.hasEn ? p.bodyEn! : p.bodyAr;
}

export const postPath = (slug: string) => `/blog/${encodeURIComponent(slug)}`;

export const categoryName = (c: { nameEn: string; nameAr: string | null }, locale: Locale) => (locale === 'ar' && c.nameAr?.trim()) || c.nameEn;

/** A one-line description for metadata: the summary, else the start of the article without Markdown marks. */
export function describe(excerpt: string, body: string) {
  const text = excerpt.trim() || body.replace(/[#>*_`[\]()-]+/g, ' ');
  return text.replace(/\s+/g, ' ').trim().slice(0, 200);
}

/** Rough reading time, about 200 words a minute (Arabic and English alike). */
export const readingMinutes = (body: string) => Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));

/** "18 November 2026" in the page language (Western digits), in UAE time. */
export const postDate = (iso: string, tag: string) => new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Dubai' }).format(new Date(iso));

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getBlogPage } from '@/lib/api/server';
import { getLocale } from '@/lib/i18n/server';
import { fill, makeFormatters } from '@/lib/i18n/format';
import { localePath } from '@/lib/i18n/routing';
import en from '@/lib/i18n/dictionaries/en';
import ar from '@/lib/i18n/dictionaries/ar';
import { jsonLd, ogLocale, pageAlternates, pageUrl } from '@/lib/site';
import { cn } from '@/lib/utils';
import { categoryName, postPath, postText } from '@/features/blog/blog-text';
import { PostCard } from '@/features/blog/post-card';

type Search = Promise<Record<string, string | string[] | undefined>>;

function parse(sp: Record<string, string | string[] | undefined>) {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const page = Math.max(1, Math.min(500, Number.parseInt(one(sp.page) ?? '1', 10) || 1));
  const category = one(sp.category)?.trim().slice(0, 60) || undefined;
  return { page, category };
}

/** `/blog`, `/blog?category=design&page=2` — the canonical keeps the filter and page so each list page is its own URL. */
function listPath(page: number, category?: string) {
  const q = new URLSearchParams();
  if (category) q.set('category', category);
  if (page > 1) q.set('page', String(page));
  const qs = q.toString();
  return qs ? `/blog?${qs}` : '/blog';
}

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const [{ page, category }, locale] = await Promise.all([searchParams.then(parse), getLocale()]);
  const t = locale === 'ar' ? ar : en;
  const path = listPath(page, category);
  return {
    title: t.blog.metaTitle,
    description: t.blog.metaDescription,
    alternates: pageAlternates(locale, path),
    openGraph: { type: 'website', url: pageUrl(locale, path), title: t.blog.metaTitle, description: t.blog.metaDescription, locale: ogLocale(locale) },
  };
}

export default async function BlogIndexPage({ searchParams }: { searchParams: Search }) {
  const [{ page, category }, locale] = await Promise.all([searchParams.then(parse), getLocale()]);
  const t = locale === 'ar' ? ar : en;
  const f = makeFormatters(locale);
  const data = await getBlogPage(page, category);
  const posts = data?.items ?? [];
  const categories = data?.categories ?? [];
  const pageCount = data?.pageCount ?? 1;

  /** schema.org `Blog` with the posts on this page. */
  const blog = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: t.blog.title,
    url: pageUrl(locale, '/blog'),
    inLanguage: locale,
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: postText(p, locale).title,
      url: pageUrl(locale, postPath(p.slug)),
      ...(p.publishedAt && { datePublished: p.publishedAt }),
    })),
  };

  const chip = (active: boolean) =>
    cn(
      'rounded-full border px-4 py-2 text-sm no-underline transition-colors',
      active ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground',
    );

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-12 px-4 sm:px-6 lg:px-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(blog) }} />
      <header className="flex max-w-3xl flex-col gap-4">
        <span className="label-mono text-muted-foreground">{t.blog.kicker}</span>
        <h1 className="font-display text-[clamp(44px,7vw,96px)] leading-[0.9] font-extrabold">{t.blog.title}</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">{t.blog.intro}</p>
      </header>

      {categories.length > 0 && (
        <nav aria-label={t.blog.filterLabel} className="flex flex-wrap gap-2">
          <Link href={localePath(locale, '/blog')} className={chip(!category)} aria-current={!category ? 'page' : undefined}>
            {t.blog.allCategories}
          </Link>
          {categories.map((c) => (
            <Link key={c.slug} href={localePath(locale, listPath(1, c.slug))} className={chip(category === c.slug)} aria-current={category === c.slug ? 'page' : undefined}>
              {categoryName(c, locale)}
            </Link>
          ))}
        </nav>
      )}

      {posts.length === 0 ? (
        <section className="flex flex-col items-start gap-3 rounded-[22px] border border-dashed border-border p-10">
          <h2 className="text-xl font-bold">{t.blog.empty}</h2>
          <p className="text-muted-foreground">{t.blog.emptyBody}</p>
          <Link href={localePath(locale, '/#catalog')} className="font-medium underline underline-offset-4">
            {t.blog.browseCourses}
          </Link>
        </section>
      ) : (
        <div className="grid gap-x-10 gap-y-14 md:grid-cols-2">
          {posts.map((p, i) => (
            <PostCard key={p.id} post={p} locale={locale} t={t} f={f} lead={i === 0 && page === 1} />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label={t.blog.pagination} className="flex items-center justify-between gap-4 border-t border-border pt-6 text-sm">
          {page > 1 ? (
            <Link href={localePath(locale, listPath(page - 1, category))} rel="prev" className="inline-flex items-center gap-2 font-medium no-underline hover:underline">
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> {t.blog.newer}
            </Link>
          ) : (
            <span />
          )}
          <span className="label-mono text-muted-foreground">{fill(t.blog.pageOf, { n: f.number(page), total: f.number(pageCount) })}</span>
          {page < pageCount ? (
            <Link href={localePath(locale, listPath(page + 1, category))} rel="next" className="inline-flex items-center gap-2 font-medium no-underline hover:underline">
              {t.blog.older} <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

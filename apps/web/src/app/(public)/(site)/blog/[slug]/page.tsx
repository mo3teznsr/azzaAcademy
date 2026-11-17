import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import type { Locale } from '@azza/shared';
import type { BlogPost } from '@/lib/api/blog';
import { mediaUrl } from '@/lib/api/client';
import { getBlogPost } from '@/lib/api/server';
import { getLocale } from '@/lib/i18n/server';
import { fill, makeFormatters } from '@/lib/i18n/format';
import { localePath } from '@/lib/i18n/routing';
import en from '@/lib/i18n/dictionaries/en';
import ar from '@/lib/i18n/dictionaries/ar';
import { SITE_URL, jsonLd, ogLocale, pageUrl } from '@/lib/site';
import { Markdown } from '@/components/brand/markdown';
import { categoryName, describe, postBody, postDate, postPath, postText, readingMinutes } from '@/features/blog/blog-text';
import { RelatedCourses } from '@/features/blog/related-courses';

/** Fallback share image when a post has no cover. */
const DEFAULT_OG = `${SITE_URL}/images/landing/gallery.jpg`;

/**
 * Canonical and hreflang. A post with an English version has both language URLs; an Arabic-only post lists only
 * the Arabic URL, and its English URL (which shows the Arabic article) points its canonical there.
 */
function alternates(p: BlogPost, locale: Locale) {
  const path = postPath(p.slug);
  if (p.hasEn) return { canonical: pageUrl(locale, path), languages: { ar: pageUrl('ar', path), en: pageUrl('en', path), 'x-default': pageUrl('ar', path) } };
  return { canonical: pageUrl('ar', path), languages: { ar: pageUrl('ar', path), 'x-default': pageUrl('ar', path) } };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [post, locale] = await Promise.all([getBlogPost(slug), getLocale()]);
  if (!post) return {};
  const text = postText(post, locale);
  const description = describe(text.excerpt, postBody(post, locale));
  const image = mediaUrl(post.coverImageUrl) ?? DEFAULT_OG;
  return {
    title: text.title,
    description,
    alternates: alternates(post, locale),
    ...(post.tags.length && { keywords: post.tags }),
    openGraph: {
      type: 'article',
      url: pageUrl(text.fallback ? 'ar' : locale, postPath(post.slug)),
      title: text.title,
      description,
      locale: ogLocale(text.lang),
      siteName: locale === 'ar' ? 'عازة' : 'Azza',
      ...(post.publishedAt && { publishedTime: post.publishedAt }),
      modifiedTime: post.updatedAt,
      ...(post.author && { authors: [post.author.name] }),
      ...(post.category && { section: categoryName(post.category, locale) }),
      tags: post.tags,
      images: [{ url: image, alt: text.title }],
    },
    twitter: { card: 'summary_large_image', title: text.title, description, images: [image] },
  };
}

/** schema.org `Article` in the language of the text shown. */
function article(p: BlogPost, locale: Locale) {
  const text = postText(p, locale);
  const url = pageUrl(text.fallback ? 'ar' : locale, postPath(p.slug));
  const azza = { '@type': 'Organization', name: text.lang === 'ar' ? 'عازة' : 'Azza', url: SITE_URL, logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.png` } };
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: text.title.slice(0, 110),
    description: describe(text.excerpt, postBody(p, locale)),
    image: [mediaUrl(p.coverImageUrl) ?? DEFAULT_OG],
    inLanguage: text.lang,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(p.publishedAt && { datePublished: p.publishedAt }),
    dateModified: p.updatedAt,
    author: p.author ? { '@type': 'Person', name: p.author.name, url: pageUrl(locale, `/teachers/${encodeURIComponent(p.author.id)}`) } : azza,
    publisher: azza,
    ...(p.category && { articleSection: categoryName(p.category, locale) }),
    ...(p.tags.length && { keywords: p.tags.join(', ') }),
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, locale] = await Promise.all([getBlogPost(slug), getLocale()]);
  if (!post) notFound();
  const t = locale === 'ar' ? ar : en;
  const f = makeFormatters(locale);
  const text = postText(post, locale);
  const body = postBody(post, locale);
  const cover = mediaUrl(post.coverImageUrl);
  const textDir = text.lang === 'ar' ? 'rtl' : 'ltr';
  const meta = [post.publishedAt && postDate(post.publishedAt, f.tag), f.plural(readingMinutes(body), t.blog.readTime)].filter(Boolean).join(' · ');

  return (
    <article className="mx-auto flex w-full max-w-[1360px] flex-col gap-10 px-4 sm:px-6 lg:px-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article(post, locale)) }} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={localePath(locale, '/blog')} className="hover:text-foreground">
          {t.blog.backToBlog}
        </Link>
        {post.category && (
          <>
            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
            <Link href={localePath(locale, `/blog?category=${encodeURIComponent(post.category.slug)}`)} className="hover:text-foreground">
              {categoryName(post.category, locale)}
            </Link>
          </>
        )}
      </nav>

      <header className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        {text.fallback && <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">{t.blog.arabicOnly}</p>}
        <span className="label-mono text-muted-foreground">{meta}</span>
        <h1 lang={text.lang} dir={textDir} className="font-display text-[clamp(36px,5.5vw,68px)] leading-[1.02] font-extrabold text-balance">
          {text.title}
        </h1>
        {text.excerpt && (
          <p lang={text.lang} dir={textDir} className="text-xl leading-relaxed text-muted-foreground">
            {text.excerpt}
          </p>
        )}
        <span className="text-sm text-foreground">{post.author ? fill(t.blog.by, { name: post.author.name }) : t.blog.byAzza}</span>
      </header>

      {cover && (
        <div className="relative mx-auto aspect-[16/9] w-full max-w-5xl overflow-hidden rounded-[26px] border border-border bg-muted">
          {/* Unoptimised: covers may be https links outside the optimiser's allow-list. */}
          <Image src={cover} alt="" fill unoptimized priority sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" />
        </div>
      )}

      <div lang={text.lang} className="mx-auto w-full max-w-3xl">
        <Markdown source={body} dir={textDir} className="text-[17px] leading-[1.85]" />
        {post.tags.length > 0 && (
          <ul aria-label={t.blog.tags} className="mt-10 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <li key={tag} className="label-mono rounded-full border border-border px-3 py-1 text-muted-foreground">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mx-auto w-full max-w-5xl">
        <RelatedCourses courses={post.courses} />
      </div>
    </article>
  );
}

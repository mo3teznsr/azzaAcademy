import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@azza/shared';
import type { BlogPostSummary } from '@/lib/api/blog';
import { mediaUrl } from '@/lib/api/client';
import { localePath } from '@/lib/i18n/routing';
import { fill, type makeFormatters } from '@/lib/i18n/format';
import type { Dictionary } from '@/lib/i18n/dictionaries/en';
import { cn } from '@/lib/utils';
import { categoryName, postDate, postPath, postText } from './blog-text';

/**
 * One article in the blog list (server-rendered). `lead` is the newest post on the first page: wider, with the
 * cover beside the text. No text is ever painted over the cover photo.
 */
export function PostCard({
  post,
  locale,
  t,
  f,
  lead = false,
}: {
  post: BlogPostSummary;
  locale: Locale;
  t: Dictionary;
  f: ReturnType<typeof makeFormatters>;
  lead?: boolean;
}) {
  const text = postText(post, locale);
  const cover = mediaUrl(post.coverImageUrl);
  const meta = [post.category && categoryName(post.category, locale), post.publishedAt && postDate(post.publishedAt, f.tag)].filter(Boolean).join(' · ');
  return (
    <article className={cn('group relative', lead && 'md:col-span-2')}>
      <Link
        href={localePath(locale, postPath(post.slug))}
        className={cn('flex h-full flex-col gap-5 no-underline', lead && 'md:grid md:grid-cols-[1.25fr_1fr] md:items-center md:gap-10')}
      >
        <div className={cn('relative overflow-hidden rounded-[22px] border border-border bg-muted', lead ? 'aspect-[16/10]' : 'aspect-[16/9]')}>
          {cover ? (
            // Unoptimised: covers may be https links outside the optimiser's allow-list.
            <Image
              src={cover}
              alt=""
              fill
              unoptimized
              sizes={lead ? '(min-width: 768px) 55vw, 100vw' : '(min-width: 768px) 33vw, 100vw'}
              className="object-cover transition-transform duration-700 ease-(--ease-expo) group-hover:scale-[1.03]"
            />
          ) : (
            <span aria-hidden className="absolute inset-0 grid place-items-center">
              <span className="size-3 rounded-[4px] bg-primary" />
            </span>
          )}
        </div>
        <div className="flex flex-col gap-3">
          {meta && <span className="label-mono text-muted-foreground">{meta}</span>}
          <h2
            lang={text.fallback ? 'ar' : undefined}
            dir={text.fallback ? 'rtl' : undefined}
            className={cn('font-display font-extrabold leading-tight text-foreground text-balance group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4', lead ? 'text-[clamp(28px,3.4vw,44px)]' : 'text-2xl')}
          >
            {text.title}
          </h2>
          {text.excerpt && (
            <p lang={text.fallback ? 'ar' : undefined} dir={text.fallback ? 'rtl' : undefined} className="line-clamp-3 leading-relaxed text-muted-foreground">
              {text.excerpt}
            </p>
          )}
          <span className="text-sm text-muted-foreground">{post.author ? fill(t.blog.by, { name: post.author.name }) : t.blog.byAzza}</span>
        </div>
      </Link>
    </article>
  );
}

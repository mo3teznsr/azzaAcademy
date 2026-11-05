'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { mediaUrl } from '@/lib/api/client';
import { coverBg } from '@/lib/schedule';
import { useI18n } from '@/lib/i18n/provider';
import type { Course } from '@/lib/api/types';

type CoverCourse = Pick<Course, 'titleEn' | 'titleAr' | 'coverStyle'> & {
  coverImageUrl?: string | null;
  category?: string;
  level?: Course['level'];
};

const IMAGE_SIZES = { sm: '160px', md: '(min-width: 768px) 33vw, 100vw', lg: '50vw', xl: '(min-width: 1024px) 50vw, 100vw' };

/**
 * Course cover (Components.dc.html). With a photo: the film-set photo, clean — no scrim, no text on it;
 * callers render the title and category / level beneath the image. Without one: the flat typographic
 * cover in the section colour, title stacked (first two words) with the meta line.
 */
export function CourseCover({
  course,
  className,
  size = 'md',
  showMeta = true,
}: {
  course: CoverCourse;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showMeta?: boolean;
}) {
  const { pick, t } = useI18n();
  const image = mediaUrl(course.coverImageUrl);
  if (image) {
    return (
      <div className={cn('relative overflow-hidden rounded-2xl bg-muted', className)}>
        <Image src={image} alt="" fill sizes={IMAGE_SIZES[size]} className="object-cover" />
      </div>
    );
  }
  const title = pick(course.titleEn, course.titleAr).text;
  const words = title.split(/\s+/).filter(Boolean);
  const lines = words.length > 2 ? [words[0], words.slice(1, 2).join(' ')] : words;
  const fontSize = { sm: 'text-[28px]', md: 'text-[44px]', lg: 'text-[64px]', xl: 'text-[clamp(56px,9vw,120px)]' }[size];
  return (
    <div
      className={cn('relative isolate flex flex-col justify-between overflow-hidden rounded-2xl p-4 text-ink', className)}
      style={{ background: coverBg(course.coverStyle) }}
    >
      {showMeta && (
        <span className="label-mono">
          {course.category}
          {course.level ? ` · ${t.status.levelShort[course.level]}` : ''}
        </span>
      )}
      <span className={cn('font-display font-extrabold leading-[0.82]', fontSize)} aria-hidden>
        {lines.map((l, i) => (
          <span key={i} className="block">
            {l}
          </span>
        ))}
      </span>
    </div>
  );
}

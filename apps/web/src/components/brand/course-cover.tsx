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
 * Course cover (Components.dc.html): the film-set photo when the course has one, under an ink scrim,
 * with the typographic title on top; a section-colour strip keeps the colour language. Falls back to
 * the flat typographic cover. First two words stacked.
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
  const title = pick(course.titleEn, course.titleAr).text;
  const words = title.split(/\s+/).filter(Boolean);
  const lines = words.length > 2 ? [words[0], words.slice(1, 2).join(' ')] : words;
  const fontSize = { sm: 'text-[28px]', md: 'text-[44px]', lg: 'text-[64px]', xl: 'text-[clamp(56px,9vw,120px)]' }[size];
  const image = mediaUrl(course.coverImageUrl);
  return (
    <div
      className={cn(
        'relative isolate flex flex-col justify-between overflow-hidden rounded-2xl p-4',
        image ? 'bg-ink text-ivory' : 'text-ink',
        className,
      )}
      style={image ? undefined : { background: coverBg(course.coverStyle) }}
    >
      {image && (
        <>
          <Image src={image} alt="" fill sizes={IMAGE_SIZES[size]} className="-z-20 object-cover" />
          <span aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-ink via-ink/45 to-ink/5" />
          <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: coverBg(course.coverStyle) }} />
        </>
      )}
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

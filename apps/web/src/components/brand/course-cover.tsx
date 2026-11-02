'use client';

import { cn } from '@/lib/utils';
import { coverBg } from '@/lib/schedule';
import { useI18n } from '@/lib/i18n/provider';
import type { Course } from '@/lib/api/types';

type CoverCourse = Pick<Course, 'titleEn' | 'titleAr' | 'coverStyle'> & { category?: string; level?: Course['level'] };

/** Typographic cover — no stock photos (Components.dc.html). First two words stacked. */
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
  return (
    <div
      className={cn('flex flex-col justify-between overflow-hidden rounded-2xl p-4 text-ink', className)}
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

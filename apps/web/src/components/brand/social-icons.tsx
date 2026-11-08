import { Ghost } from 'lucide-react';
import type { ReactNode } from 'react';
import type { SocialKey } from '@/lib/api';
import { cn } from '@/lib/utils';

/** Lucide has no brand marks, so these are simple outline glyphs in the same 24px stroke style. */
function Glyph({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn('size-5', className)}>
      {children}
    </svg>
  );
}

export const SOCIAL_KEYS: SocialKey[] = ['instagram', 'x', 'facebook', 'linkedin', 'youtube', 'tiktok', 'snapchat'];

export function SocialIcon({ name, className }: { name: SocialKey; className?: string }) {
  switch (name) {
    case 'instagram':
      return (
        <Glyph className={className}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <path d="M17.5 6.5h.01" />
        </Glyph>
      );
    case 'x':
      return (
        <Glyph className={className}>
          <path d="M4 4l16 16M20 4L4 20" />
        </Glyph>
      );
    case 'facebook':
      return (
        <Glyph className={className}>
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </Glyph>
      );
    case 'linkedin':
      return (
        <Glyph className={className}>
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
          <circle cx="4" cy="4" r="2" />
        </Glyph>
      );
    case 'youtube':
      return (
        <Glyph className={className}>
          <rect x="2" y="5" width="20" height="14" rx="4" />
          <path d="m10 9 5 3-5 3z" />
        </Glyph>
      );
    case 'tiktok':
      return (
        <Glyph className={className}>
          <path d="M9 12a4 4 0 1 0 4 4V3a5 5 0 0 0 5 5" />
        </Glyph>
      );
    case 'snapchat':
      return <Ghost className={cn('size-5', className)} aria-hidden />;
  }
}

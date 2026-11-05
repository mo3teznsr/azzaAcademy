import Image from 'next/image';
import { cn } from '@/lib/utils';
import { mediaUrl } from '@/lib/api/client';
import { initials, toneFor } from '@/lib/schedule';

/** Portrait when the person has an `image`, otherwise coloured initials. Decorative: the name is always shown beside it. */
export function InitialsAvatar({
  name,
  src,
  size = 32,
  className,
  tone,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
  tone?: string;
}) {
  const url = mediaUrl(src);
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={size}
        height={size}
        className={cn('shrink-0 rounded-full object-cover', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold text-ink', className)}
      style={{ width: size, height: size, background: tone ?? toneFor(name), fontSize: Math.max(10, Math.round(size * 0.36)) }}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, max = 3, size = 36 }: { names: string[]; max?: number; size?: number }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <span className="flex items-center">
      {shown.map((n, i) => (
        <InitialsAvatar key={`${n}-${i}`} name={n} size={size} className={cn('border-2 border-background', i > 0 && '-ms-2.5')} />
      ))}
      {extra > 0 && (
        <span
          className="-ms-2.5 inline-flex items-center justify-center rounded-full border-2 border-background bg-secondary text-xs font-bold text-foreground"
          style={{ width: size, height: size }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

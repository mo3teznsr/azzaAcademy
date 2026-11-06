import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SectionHeader({ title, href, linkLabel, as: As = 'h2', size = 'md', aside }: { title: ReactNode; href?: string; linkLabel?: string; as?: 'h1' | 'h2' | 'h3'; size?: 'sm' | 'md' | 'lg'; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <As className={cn('font-display font-extrabold leading-[0.95]', size === 'lg' ? 'text-[40px]' : size === 'md' ? 'text-[28px]' : 'text-xl')}>{title}</As>
      {aside}
      {href && linkLabel && (
        <Link href={href} className="link-sun text-sm">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export function Panel({ children, className, as: As = 'section', ...rest }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cn('flex min-w-0 flex-col gap-4 rounded-[20px] border border-border p-6 in-data-[theme=cream]:border-transparent in-data-[theme=cream]:bg-card light:border-transparent light:bg-card', className)} {...rest}>
      {children}
    </As>
  );
}

export function StatTile({ label, value, sub, tone = 'default', className }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: 'default' | 'ink' | 'live'; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-[20px] p-5',
        tone === 'default' && 'bg-card',
        (tone === 'ink' || tone === 'live') && 'bg-ink text-ivory',
        className,
      )}
    >
      <span className={cn('label-mono flex items-center gap-1.5', tone === 'live' ? 'text-onair-fg' : tone === 'ink' ? 'text-stone' : 'text-muted-foreground')}>
        {tone === 'live' && <span className="onair" aria-hidden />}
        {label}
      </span>
      <div className="font-display text-[44px] font-extrabold leading-none">{value}</div>
      {sub && <span className={cn('text-[13px]', tone === 'default' ? 'text-muted-foreground' : 'text-stone')}>{sub}</span>}
    </div>
  );
}

export function PageTitle({ kicker, title, aside }: { kicker?: ReactNode; title: ReactNode; aside?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker && <span className="label-mono text-muted-foreground">{kicker}</span>}
        <h1 className="mt-1.5 font-display text-[clamp(40px,6vw,68px)] font-extrabold leading-[0.9]">{title}</h1>
      </div>
      {aside}
    </header>
  );
}

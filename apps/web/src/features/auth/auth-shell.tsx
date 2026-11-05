'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { Logo } from '@/components/brand/signal-mark';
import { LocaleSwitcher } from '@/components/brand/switchers';
import { ThemeMenu } from '@/components/brand/theme-switcher';
import { useI18n } from '@/lib/i18n/provider';

/** Split layout from w-00-auth: editorial left, form right. */
export function AuthShell({ kicker, title, sub, children }: { kicker: string; title: string; sub?: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Editorial side: type first, then the photo on its own — no scrim, no text over it. */}
      <section className="hidden flex-col gap-10 border-e border-border p-12 lg:flex">
        <Logo />
        <div>
          <h2 className="font-display text-[clamp(64px,7vw,120px)] font-extrabold leading-[0.82]">
            <span className="block">{t.auth.heroLine1}</span>
            <span className="block font-light">{t.auth.heroLine2}</span>
            <span className="block">
              {t.auth.heroLine3.replace(/\.$/, '')}
              <span className="text-onair-fg">.</span>
            </span>
          </h2>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">{t.auth.heroBody}</p>
        </div>
        <div className="relative min-h-56 flex-1 overflow-hidden rounded-[24px] bg-muted">
          <Image src="/images/scenes/auth.jpg" alt="" fill priority sizes="50vw" className="object-cover object-top" />
        </div>
        <span className="label-mono text-muted-foreground">B07·S05 · 00:42:17</span>
      </section>
      <section className="flex flex-col p-6 sm:p-12">
        <div className="flex items-center justify-between">
          <span className="lg:hidden">
            <Logo />
          </span>
          <div className="ms-auto flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeMenu />
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 py-12">
          <div className="flex flex-col gap-3">
            <span className="label-mono text-muted-foreground">{kicker}</span>
            <h1 className="font-display text-[56px] font-extrabold leading-[0.9]">{title}</h1>
            {sub && <p className="text-muted-foreground">{sub}</p>}
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" className="text-[13px] text-danger-fg">
      {message}
    </span>
  );
}

export function FormBanner({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={
        tone === 'error'
          ? 'rounded-[14px] border border-danger-line bg-danger-bg px-4 py-3 text-sm text-danger-fg'
          : 'rounded-[14px] bg-sage px-4 py-3 text-sm text-ink'
      }
    >
      {children}
    </div>
  );
}

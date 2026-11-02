'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { Logo } from '@/components/brand/signal-mark';
import { LocaleSwitcher } from '@/components/brand/switchers';
import { useI18n } from '@/lib/i18n/provider';

/** Split layout from w-00-auth: editorial left, form right. */
export function AuthShell({ kicker, title, sub, children }: { kicker: string; title: string; sub?: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative isolate hidden flex-col justify-between overflow-hidden border-e border-line p-12 lg:flex">
        <Image src="/images/scenes/auth.jpg" alt="" fill priority sizes="55vw" className="-z-20 object-cover object-top opacity-70" />
        <span aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-ink via-ink/70 to-ink/20" />
        <Logo />
        <div>
          <h2 className="font-display text-[clamp(72px,8vw,140px)] font-extrabold leading-[0.82]">
            <span className="block">{t.auth.heroLine1}</span>
            <span className="block font-light">{t.auth.heroLine2}</span>
            <span className="block">
              {t.auth.heroLine3.replace(/\.$/, '')}
              <span className="text-onair">.</span>
            </span>
          </h2>
          <p className="mt-8 max-w-md text-lg text-stone">{t.auth.heroBody}</p>
        </div>
        <span className="label-mono text-stone">B07·S05 · 00:42:17</span>
      </section>
      <section className="flex flex-col p-6 sm:p-12">
        <div className="flex items-center justify-between">
          <span className="lg:hidden">
            <Logo />
          </span>
          <LocaleSwitcher className="ms-auto" />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 py-12">
          <div className="flex flex-col gap-3">
            <span className="label-mono text-stone">{kicker}</span>
            <h1 className="font-display text-[56px] font-extrabold leading-[0.9]">{title}</h1>
            {sub && <p className="text-stone">{sub}</p>}
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

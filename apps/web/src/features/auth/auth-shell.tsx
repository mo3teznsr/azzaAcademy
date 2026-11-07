'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { Logo } from '@/components/brand/signal-mark';
import { LocaleSwitcher } from '@/components/brand/switchers';
import { ThemeMenu } from '@/components/brand/theme-switcher';
import { useI18n } from '@/lib/i18n/provider';

/**
 * The auth frame (docs/BRAND.md): one 28px card on the tinted page. The photo panel carries the
 * inkDeep wash and a short value line; the form side stays clean. Below lg the photo panel is hidden.
 */
export function AuthShell({ kicker, title, sub, children }: { kicker: string; title: string; sub?: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh items-stretch justify-center bg-background p-3 sm:p-6 lg:items-center lg:p-10">
      <div className="grid w-full max-w-[1180px] overflow-hidden rounded-[28px] border border-border bg-card shadow-card lg:min-h-[min(760px,calc(100dvh-5rem))] lg:grid-cols-[1fr_1.05fr]">
        {/* Photo panel: inkDeep wash over the photo, with its own copy (allowed for the auth panel). */}
        <section className="theme-ink relative isolate hidden overflow-hidden bg-ink-deep text-foreground lg:flex lg:flex-col lg:justify-between lg:p-10">
          <Image src="/images/scenes/auth.jpg" alt="" fill priority sizes="(min-width: 1024px) 560px, 0px" className="-z-20 object-cover object-[center_68%]" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(7_17_13/0.82)_0%,rgb(7_17_13/0.35)_42%,rgb(7_17_13/0.92)_100%)]" />
          <Logo className="self-start" />
          <div className="flex flex-col gap-6">
            <span className="label-mono text-mint">{t.auth.panelKicker}</span>
            <p className="max-w-md font-display text-[clamp(30px,2.8vw,40px)] font-extrabold leading-[1.1]">{t.auth.panelQuote}</p>
            <ul className="flex flex-col gap-2.5 text-[15px] text-soft-foreground">
              {t.auth.panelPoints.map((p) => (
                <li key={p} className="flex items-center gap-2.5">
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-green text-ink-deep">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Form side. */}
        <section className="flex flex-col p-5 sm:p-10">
          <div className="flex items-center justify-between gap-3">
            <span className="lg:hidden">
              <Logo />
            </span>
            <div className="ms-auto flex items-center gap-2">
              <LocaleSwitcher />
              <ThemeMenu />
            </div>
          </div>
          <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-7 py-10">
            <div className="flex flex-col gap-2.5">
              <span className="label-mono text-muted-foreground">{kicker}</span>
              <h1 className="font-display text-[clamp(34px,4.5vw,46px)] font-extrabold leading-[1.05]">{title}</h1>
              {sub && <p className="text-[15px] text-muted-foreground">{sub}</p>}
            </div>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <span id={id} role="alert" className="text-[13px] text-danger-fg">
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

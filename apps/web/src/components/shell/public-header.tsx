'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/signal-mark';
import { CurrencySwitcher, LocaleSwitcher } from '@/components/brand/switchers';
import { useAuth } from '@/lib/auth/use-auth';
import { homeFor } from '@/lib/auth/roles';
import { useI18n } from '@/lib/i18n/provider';

export function PublicHeader() {
  const { t } = useI18n();
  const { user, role } = useAuth();
  return (
    <header className="mx-auto flex w-full max-w-[1360px] flex-wrap items-center gap-x-8 gap-y-3 px-4 py-5 sm:px-6 lg:px-10">
      <Logo />
      <nav aria-label={t.nav.primary} className="hidden items-center gap-6 text-[15px] font-medium text-stone md:flex">
        <Link href="/#catalog" className="hover:text-ivory">
          {t.nav.public.courses}
        </Link>
        <Link href="/#starting" className="hover:text-ivory">
          {t.nav.public.startingSoon}
        </Link>
        <Link href="/#how" className="hover:text-ivory">
          {t.nav.public.howItWorks}
        </Link>
      </nav>
      <div className="ms-auto flex items-center gap-2">
        <LocaleSwitcher />
        <CurrencySwitcher className="hidden sm:flex" />
        {user ? (
          <Button asChild size="sm">
            <Link href={homeFor(role)}>{t.nav.public.myLearning}</Link>
          </Button>
        ) : (
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">{t.nav.public.signIn}</Link>
            </Button>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/#catalog">{t.nav.public.findBatch}</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

export function PublicFooter() {
  const { t } = useI18n();
  const { user, role } = useAuth();
  const cols: Array<{ title: string; links: Array<{ href: string; label: string; external?: boolean }> }> = [
    {
      title: t.landing.footerLearn,
      links: [
        { href: '/#catalog', label: t.nav.public.courses },
        { href: '/#starting', label: t.nav.public.startingSoon },
        { href: '/#how', label: t.nav.public.howItWorks },
        { href: '/#pricing', label: t.landing.footerPricing },
      ],
    },
    {
      title: t.landing.footerAccount,
      links: user
        ? [{ href: homeFor(role), label: t.nav.public.myLearning }]
        : [
            { href: '/sign-in', label: t.nav.public.signIn },
            { href: '/sign-up', label: t.landing.footerSignUp },
          ],
    },
    {
      title: t.landing.footerCompany,
      links: [
        { href: '/verify', label: t.landing.footerVerify },
        { href: 'mailto:teach@azza.live', label: t.catalog.teach, external: true },
        { href: 'mailto:support@azza.live', label: t.catalog.help, external: true },
      ],
    },
  ];
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid w-full max-w-[1360px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-10">
        <div className="flex flex-col gap-4">
          <span className="font-display text-[clamp(64px,10vw,140px)] font-extrabold leading-[0.8]" dir="ltr">
            azza<span className="text-onair">.</span>
          </span>
          <p className="max-w-xs text-sm text-stone">{t.landing.footerTagline}</p>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title} className="flex flex-col gap-1">
            <span className="label-mono pb-2 text-stone">{c.title}</span>
            {c.links.map((l) =>
              l.external ? (
                <a key={l.href} href={l.href} className="flex min-h-11 items-center text-[15px] text-cream-2 no-underline hover:text-ivory">
                  {l.label}
                </a>
              ) : (
                <Link key={l.href} href={l.href} className="flex min-h-11 items-center text-[15px] text-cream-2 no-underline hover:text-ivory">
                  {l.label}
                </Link>
              ),
            )}
          </nav>
        ))}
      </div>
      <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-center justify-between gap-4 border-t border-line px-4 py-6 text-sm text-stone sm:px-6 lg:px-10">
        <span>{t.catalog.footerRights}</span>
        <span className="flex gap-6">
          <span>{t.catalog.terms}</span>
          <span>{t.catalog.privacy}</span>
        </span>
      </div>
    </footer>
  );
}

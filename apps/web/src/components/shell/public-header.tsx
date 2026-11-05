'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/signal-mark';
import { CurrencySwitcher, LocaleSwitcher } from '@/components/brand/switchers';
import { ThemeMenu } from '@/components/brand/theme-switcher';
import { useAuth } from '@/lib/auth/use-auth';
import { homeFor } from '@/lib/auth/roles';
import { useI18n } from '@/lib/i18n/provider';

export function PublicHeader() {
  const { t } = useI18n();
  const { user, role } = useAuth();
  return (
    <header className="mx-auto flex w-full max-w-[1360px] flex-wrap items-center gap-x-8 gap-y-3 px-4 py-5 sm:px-6 lg:px-10">
      <Logo />
      <nav aria-label={t.nav.primary} className="hidden items-center gap-6 text-[15px] font-medium text-muted-foreground md:flex">
        <Link href="/#catalog" className="hover:text-foreground">
          {t.nav.public.courses}
        </Link>
        <Link href="/#starting" className="hover:text-foreground">
          {t.nav.public.startingSoon}
        </Link>
        <Link href="/#how" className="hover:text-foreground">
          {t.nav.public.howItWorks}
        </Link>
      </nav>
      <div className="ms-auto flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeMenu />
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
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid w-full max-w-[1360px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-10">
        <div className="flex flex-col gap-4">
          <span className="font-display text-[clamp(64px,10vw,140px)] font-extrabold leading-[0.8]" dir="ltr">
            azza<span className="text-onair-fg">.</span>
          </span>
          <p className="max-w-xs text-sm text-muted-foreground">{t.landing.footerTagline}</p>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title} className="flex flex-col gap-1">
            <span className="label-mono pb-2 text-muted-foreground">{c.title}</span>
            {c.links.map((l) =>
              l.external ? (
                <a key={l.href} href={l.href} className="flex min-h-11 items-center text-[15px] text-soft-foreground no-underline hover:text-foreground">
                  {l.label}
                </a>
              ) : (
                <Link key={l.href} href={l.href} className="flex min-h-11 items-center text-[15px] text-soft-foreground no-underline hover:text-foreground">
                  {l.label}
                </Link>
              ),
            )}
          </nav>
        ))}
      </div>
      <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-center justify-between gap-4 border-t border-border px-4 py-6 text-sm text-muted-foreground sm:px-6 lg:px-10">
        <span>{t.catalog.footerRights}</span>
        <nav aria-label={t.landing.footerCompany} className="flex flex-wrap gap-x-6">
          <Link href="/terms" className="flex min-h-11 items-center text-muted-foreground no-underline hover:text-foreground">
            {t.legal.footer.terms}
          </Link>
          <Link href="/privacy" className="flex min-h-11 items-center text-muted-foreground no-underline hover:text-foreground">
            {t.legal.footer.privacy}
          </Link>
          <Link href="/account/delete" className="flex min-h-11 items-center text-muted-foreground no-underline hover:text-foreground">
            {t.legal.footer.deleteAccount}
          </Link>
        </nav>
      </div>
    </footer>
  );
}

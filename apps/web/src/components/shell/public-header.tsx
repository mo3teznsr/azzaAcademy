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
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-end justify-between gap-6 px-4 py-10 sm:px-6 lg:px-10">
        <div>
          <span className="font-display text-[clamp(64px,12vw,160px)] font-extrabold leading-[0.8]" dir="ltr">
            azza<span className="text-onair">.</span>
          </span>
          <p className="mt-4 text-sm text-stone">{t.catalog.footerRights}</p>
        </div>
        <nav className="flex flex-wrap gap-6 text-sm text-stone" aria-label="Footer">
          <a href="mailto:teach@azza.live" className="hover:text-ivory">
            {t.catalog.teach}
          </a>
          <a href="mailto:support@azza.live" className="hover:text-ivory">
            {t.catalog.help}
          </a>
          <span>{t.catalog.terms}</span>
          <span>{t.catalog.privacy}</span>
        </nav>
      </div>
    </footer>
  );
}

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { readAttribution } from '@/lib/analytics';
import { authProvidersApi } from '@/lib/api/auth-providers';
import { authClient } from '@/lib/auth/client';
import { socialCallbackURLs } from '@/lib/auth/social-redirects';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

type Provider = 'google' | 'apple';

/** Google's "G", in its four brand colours (never recoloured). */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-[18px]">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** The Apple logo; takes the button's text colour (black on white, white on black). */
function AppleMark() {
  return (
    <svg viewBox="0 0 384 512" aria-hidden className="size-[18px]" fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

/**
 * "Continue with Google / Apple", shown only for providers the API has configured, above the email form with an "or" rule.
 * Brand rules: Google's button is white with its colour mark (dark theme: #131314), Apple's is black with the white logo (dark
 * theme: white with the black logo). Both keep the design system's pill shape and height.
 */
export function SocialButtons({ next, from }: { next: string | null; from: '/sign-in' | '/sign-up' }) {
  const { t, fill, locale } = useI18n();
  const money = useMoney();
  const providers = useQuery({ queryKey: ['auth-providers'], queryFn: authProvidersApi.get, staleTime: 5 * 60_000, retry: false });
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState(false);
  const enabled = (['google', 'apple'] as const).filter((p) => providers.data?.[p]);
  if (enabled.length === 0) return null;

  const start = async (provider: Provider) => {
    setBusy(provider);
    setError(false);
    try {
      const { callbackURL, errorCallbackURL } = socialCallbackURLs(window.location.origin, next, from);
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Locale, timezone, currency and first-touch attribution ride along so a new account starts with this page's choices
      // and its acquisition source, like the email sign-up (all checked by the API; ignored for an existing account).
      const { error: err } = await authClient.signIn.social({
        provider,
        callbackURL,
        newUserCallbackURL: callbackURL,
        errorCallbackURL,
        additionalData: { locale, timezone, displayCurrency: money.currency, acquisition: readAttribution() ?? undefined },
      });
      if (err) throw err;
      // On success the browser is already leaving for the provider; keep the spinner.
    } catch {
      setBusy(null);
      setError(true);
    }
  };

  const label = { google: t.auth.social.google, apple: t.auth.social.apple } as const;
  const name = { google: 'Google', apple: 'Apple' } as const;

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p role="alert" className="text-[13px] text-danger-fg">
          {t.auth.social.failed}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {enabled.map((p) => (
          <Button
            key={p}
            type="button"
            size="lg"
            variant="outline"
            disabled={busy !== null}
            aria-busy={busy === p}
            onClick={() => void start(p)}
            className={cn(
              'w-full gap-3 font-semibold hover:-translate-y-px',
              p === 'google' &&
                'border-[#747775] bg-white text-[#1F1F1F] hover:border-[#747775] hover:bg-[#F8F9FA] dark:border-[#8E918F] dark:bg-[#131314] dark:text-[#E3E3E3] dark:hover:bg-[#1F1F20]',
              p === 'apple' && 'border-black bg-black text-white hover:border-black hover:bg-[#1d1d1f] dark:border-white dark:bg-white dark:text-black dark:hover:bg-[#f2f2f2]',
            )}
          >
            {busy === p ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : p === 'google' ? <GoogleMark /> : <AppleMark />}
            <span>{busy === p ? fill(t.auth.social.redirecting, { provider: name[p] }) : label[p]}</span>
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
        <Separator className="flex-1 data-horizontal:w-auto" />
        <span>{t.auth.social.or}</span>
        <Separator className="flex-1 data-horizontal:w-auto" />
      </div>
    </div>
  );
}

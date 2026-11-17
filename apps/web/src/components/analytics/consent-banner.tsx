'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/provider';
import { onConsentOpen, useConsent, writeConsent, type Consent } from '@/lib/consent';

/**
 * First-visit choice between analytics cookies and only the necessary ones. A non-modal region at the bottom
 * of the page (it never blocks reading or traps focus); reopened from the footer's "Cookie settings".
 * Both choices are equally prominent, as consent rules expect.
 */
export function ConsentBanner() {
  const { t } = useI18n();
  const consent = useConsent();
  const [reopened, setReopened] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => onConsentOpen(() => setReopened(true)), []);
  useEffect(() => {
    if (reopened) heading.current?.focus();
  }, [reopened]);

  // Server render and the first client paint: the choice is unknown, show nothing.
  if (consent === undefined || (consent !== null && !reopened)) return null;

  const choose = (choice: Consent) => {
    setReopened(false);
    writeConsent(choice);
  };

  return (
    <section
      aria-labelledby="consent-title"
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6"
    >
      <Card className="rise flex w-full max-w-3xl flex-col gap-4 rounded-[24px] p-5 shadow-lg sm:flex-row sm:items-end sm:gap-6 sm:p-6">
        <div className="flex flex-1 flex-col gap-1.5 text-start">
          <h2 id="consent-title" ref={heading} tabIndex={-1} className="font-display text-lg font-extrabold outline-none">
            {t.consent.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.consent.body}{' '}
            <Link href="/privacy" className="text-link underline decoration-green underline-offset-4">
              {t.consent.more}
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => choose('necessary')} aria-pressed={consent === 'necessary'}>
            {t.consent.reject}
          </Button>
          <Button onClick={() => choose('analytics')} aria-pressed={consent === 'analytics'}>
            {t.consent.accept}
          </Button>
        </div>
      </Card>
    </section>
  );
}

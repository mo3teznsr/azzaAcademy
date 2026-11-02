'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/provider';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-[60dvh] place-items-center p-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="font-display text-5xl font-extrabold">{t.common.errorTitle}</h1>
        <p className="text-stone">{t.common.errorBody}</p>
        <Button onClick={reset}>{t.common.retry}</Button>
      </div>
    </main>
  );
}

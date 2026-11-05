'use client';

import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { Locale } from '@azza/shared';
import { I18nProvider } from '@/lib/i18n/provider';
import { MoneyProvider } from '@/lib/money';
import { makeQueryClient } from '@/lib/query-client';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/lib/theme/provider';

export function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <I18nProvider initialLocale={locale}>
          <MoneyProvider>
            <TooltipProvider delayDuration={200}>
              {children}
              <Toaster position="bottom-center" />
            </TooltipProvider>
          </MoneyProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

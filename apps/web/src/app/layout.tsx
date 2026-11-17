import type { Metadata, Viewport } from 'next';
import { Almarai, JetBrains_Mono } from 'next/font/google';
import { getLocale } from '@/lib/i18n/server';
import { dirOf } from '@/lib/i18n/config';
import en from '@/lib/i18n/dictionaries/en';
import ar from '@/lib/i18n/dictionaries/ar';
import { THEME_SCRIPT } from '@/lib/theme/config';
import { SITE_URL } from '@/lib/site';
import { Providers } from './providers';
import './globals.css';

// Almarai carries display and body in Arabic and English (docs/BRAND.md); JetBrains Mono is for code and timecodes only.
const almarai = Almarai({ subsets: ['arabic', 'latin'], weight: ['300', '400', '700', '800'], variable: '--font-almarai', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = locale === 'ar' ? ar : en;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.meta.title, template: locale === 'ar' ? '%s · عازة' : '%s · Azza' },
    description: t.meta.description,
    openGraph: { type: 'website', siteName: locale === 'ar' ? 'عازة' : 'Azza', locale: locale === 'ar' ? 'ar_AE' : 'en_AE', title: t.meta.title, description: t.meta.description, url: SITE_URL },
    twitter: { card: 'summary_large_image', title: t.meta.title, description: t.meta.description },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7f3' },
    { media: '(prefers-color-scheme: dark)', color: '#07110d' },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      className={`${almarai.variable} ${jetbrains.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Sets <html data-theme> from the saved preference / OS before first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}

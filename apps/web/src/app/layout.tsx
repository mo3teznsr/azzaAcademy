import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, IBM_Plex_Sans_Arabic, Inter_Tight, JetBrains_Mono, Readex_Pro } from 'next/font/google';
import { getLocale } from '@/lib/i18n/server';
import { dirOf } from '@/lib/i18n/config';
import en from '@/lib/i18n/dictionaries/en';
import ar from '@/lib/i18n/dictionaries/ar';
import { Providers } from './providers';
import './globals.css';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage', display: 'swap' });
const interTight = Inter_Tight({ subsets: ['latin'], variable: '--font-inter-tight', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });
const readex = Readex_Pro({ subsets: ['arabic', 'latin'], variable: '--font-readex', display: 'swap' });
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ['arabic'], weight: ['400', '500', '600', '700'], variable: '--font-plex-arabic', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = locale === 'ar' ? ar : en;
  return { title: { default: t.meta.title, template: '%s · Azza' }, description: t.meta.description };
}

export const viewport: Viewport = { themeColor: '#121110' };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      className={`${bricolage.variable} ${interTight.variable} ${jetbrains.variable} ${readex.variable} ${plexArabic.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}

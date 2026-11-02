import Link from 'next/link';
import { getLocale } from '@/lib/i18n/server';
import en from '@/lib/i18n/dictionaries/en';
import ar from '@/lib/i18n/dictionaries/ar';

export default async function NotFound() {
  const t = (await getLocale()) === 'ar' ? ar : en;
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <span className="label-mono text-stone">404</span>
        <h1 className="font-display text-6xl font-extrabold">{t.common.notFoundTitle}</h1>
        <p className="text-stone">{t.common.notFoundBody}</p>
        <Link href="/" className="link-sun">
          {t.common.goHome}
        </Link>
      </div>
    </main>
  );
}

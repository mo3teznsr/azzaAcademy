import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n/server';
import en from '@/lib/i18n/dictionaries/en';
import ar from '@/lib/i18n/dictionaries/ar';
import { VerifyPage } from '@/features/certificates/verify-page';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const [{ code }, locale] = await Promise.all([params, getLocale()]);
  const t = locale === 'ar' ? ar : en;
  return { title: `${t.verify.title} · ${code.toUpperCase()}`, robots: { index: false } };
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <VerifyPage code={code} />;
}

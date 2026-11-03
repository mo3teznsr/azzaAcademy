import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n/server';
import en from '@/lib/i18n/dictionaries/en';
import ar from '@/lib/i18n/dictionaries/ar';
import { VerifyPage } from '@/features/certificates/verify-page';

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getLocale()) === 'ar' ? ar : en;
  return { title: t.verify.title };
}

export default function Page() {
  return <VerifyPage />;
}

import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n/server';
import { pageAlternates } from '@/lib/site';
import en from '@/lib/i18n/dictionaries/en';
import ar from '@/lib/i18n/dictionaries/ar';
import { AllAccessPage } from '@/features/subscriptions/all-access';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = locale === 'ar' ? ar : en;
  return { title: t.allAccess.title, description: t.allAccess.body, alternates: pageAlternates(locale, '/all-access') };
}

export default function Page() {
  return <AllAccessPage />;
}

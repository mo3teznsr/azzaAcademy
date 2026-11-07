import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n/server';
import en from '@/lib/i18n/dictionaries/en';
import ar from '@/lib/i18n/dictionaries/ar';
import { TeachPage } from '@/features/instructors/teach-page';

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getLocale()) === 'ar' ? ar : en;
  return { title: t.instructors.apply.kicker, description: t.instructors.apply.body };
}

export default function Page() {
  return <TeachPage />;
}

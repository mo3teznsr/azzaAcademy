import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n/server';
import en from '@/lib/i18n/dictionaries/en';
import ar from '@/lib/i18n/dictionaries/ar';
import { InstructorsDirectory } from '@/features/instructors/directory';

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getLocale()) === 'ar' ? ar : en;
  return { title: t.instructors.directory.kicker, description: t.instructors.directory.body };
}

export default function Page() {
  return <InstructorsDirectory />;
}

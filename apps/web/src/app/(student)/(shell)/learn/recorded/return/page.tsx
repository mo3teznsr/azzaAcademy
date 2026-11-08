import { RecordedReturn } from '@/features/subscriptions/recorded-return';

/** Stripe Checkout for a plan lands here: `?ref=<subscription reference>`. */
export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const sp = await searchParams;
  const ref = typeof sp.ref === 'string' && sp.ref.trim() ? sp.ref.trim() : null;
  return <RecordedReturn reference={ref} />;
}

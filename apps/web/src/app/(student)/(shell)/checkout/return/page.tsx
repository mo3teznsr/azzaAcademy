import { CheckoutReturn } from '@/features/checkout/checkout-return';

/** Stripe Checkout lands here: `?ref=<order reference>` and `&cancelled=1` when the student backed out. */
export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const sp = await searchParams;
  const ref = typeof sp.ref === 'string' && sp.ref.trim() ? sp.ref.trim() : null;
  return <CheckoutReturn reference={ref} cancelled={sp.cancelled === '1'} />;
}

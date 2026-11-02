import { CheckoutPage } from '@/features/checkout/checkout-page';

export default async function Page({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  return <CheckoutPage batchId={batchId} />;
}

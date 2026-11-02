import { OrderPage } from '@/features/checkout/order-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderPage id={id} />;
}

import { TicketView } from '@/features/comms/support';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TicketView id={id} />;
}

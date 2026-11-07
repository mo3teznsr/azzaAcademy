import { AdminTicketView } from '@/features/comms/support';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminTicketView id={id} />;
}

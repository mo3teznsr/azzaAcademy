import { AdminSeatPack } from '@/features/organizations/admin-seat-pack';

export default async function Page({ params }: { params: Promise<{ id: string; packId: string }> }) {
  const { id, packId } = await params;
  return <AdminSeatPack organizationId={id} packId={packId} />;
}

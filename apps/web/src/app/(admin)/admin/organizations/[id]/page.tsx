import { AdminOrganization } from '@/features/organizations/admin-organization';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminOrganization id={id} />;
}

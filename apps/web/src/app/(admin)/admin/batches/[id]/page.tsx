import { AdminBatchDetail } from '@/features/admin/batch-detail';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminBatchDetail batchId={id} />;
}

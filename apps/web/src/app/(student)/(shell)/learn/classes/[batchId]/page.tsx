import { StudentClassPage } from '@/features/comms/class-page';

export default async function Page({ params, searchParams }: { params: Promise<{ batchId: string }>; searchParams: Promise<{ tab?: string | string[] }> }) {
  const { batchId } = await params;
  const { tab } = await searchParams;
  return <StudentClassPage batchId={batchId} initialTab={typeof tab === 'string' ? tab : undefined} />;
}

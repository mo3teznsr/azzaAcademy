import { BatchWorkspace } from '@/features/studio/batch-workspace';

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string | string[] }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  return <BatchWorkspace batchId={id} initialTab={typeof tab === 'string' ? tab : undefined} />;
}

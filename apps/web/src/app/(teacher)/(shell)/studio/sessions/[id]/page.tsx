import { SessionPrep } from '@/features/studio/session-prep';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionPrep sessionId={id} />;
}

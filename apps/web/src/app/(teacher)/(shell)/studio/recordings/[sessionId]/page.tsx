import { RecordingPlayer } from '@/features/library/recording-player';

export default async function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <RecordingPlayer sessionId={sessionId} base="/studio/recordings" />;
}

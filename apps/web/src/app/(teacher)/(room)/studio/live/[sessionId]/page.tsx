import { LiveRoomScreen } from '@/features/live/live-room';

export default async function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <LiveRoomScreen sessionId={sessionId} mode="host" />;
}

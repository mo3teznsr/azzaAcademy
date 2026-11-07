import { Suspense } from 'react';
import { MessagesInbox } from '@/features/comms/chat';

export default function Page() {
  return (
    <Suspense>
      <MessagesInbox />
    </Suspense>
  );
}

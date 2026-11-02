import { Suspense } from 'react';
import { SchedulePage } from '@/features/schedule/schedule-page';

export default function Page() {
  return (
    <Suspense>
      <SchedulePage />
    </Suspense>
  );
}

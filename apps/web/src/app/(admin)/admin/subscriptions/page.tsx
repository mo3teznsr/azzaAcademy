import { Suspense } from 'react';
import { AdminSubscriptions } from '@/features/admin/subscriptions';

export default function Page() {
  return (
    <Suspense>
      <AdminSubscriptions />
    </Suspense>
  );
}

import { Suspense } from 'react';
import { BatchBuilder } from '@/features/admin/batch-builder';

export default function Page() {
  return (
    <Suspense>
      <BatchBuilder mode="teacher" />
    </Suspense>
  );
}

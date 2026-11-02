import { Suspense } from 'react';
import { ResetForm } from '@/features/auth/reset-form';

export default function Page() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}

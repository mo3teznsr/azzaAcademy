import { Suspense } from 'react';
import { ForgotForm } from '@/features/auth/forgot-form';

export default function Page() {
  return (
    <Suspense>
      <ForgotForm />
    </Suspense>
  );
}

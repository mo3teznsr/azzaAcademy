'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth/client';
import { useI18n } from '@/lib/i18n/provider';
import { AuthShell, FormBanner } from './auth-shell';
import { Field, IconInput } from './fields';
import { forgotSchema, type ForgotValues } from './schemas';

export function ForgotForm() {
  const { t, fill } = useI18n();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } });
  const { errors, isSubmitting } = form.formState;
  const emailValue = useWatch({ control: form.control, name: 'email' });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setError(null);
    try {
      const { error: err } = await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/reset-password` });
      if (err) setError(err.message ?? t.auth.errors.generic);
      else setSentTo(email);
    } catch {
      setError(t.common.networkError);
    }
  });

  return (
    <AuthShell kicker={t.auth.forgot.kicker} title={t.auth.forgot.title} sub={t.auth.forgot.sub}>
      {sentTo ? (
        <FormBanner tone="success">{fill(t.auth.forgot.sent, { email: sentTo })}</FormBanner>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          {error && <FormBanner tone="error">{error}</FormBanner>}
          <Field id="email" label={t.auth.signIn.email} error={errors.email && t.auth.errors.email}>
            <IconInput
              id="email"
              icon={Mail}
              type="email"
              inputMode="email"
              dir="ltr"
              autoComplete="email"
              placeholder={t.auth.placeholders.email}
              invalid={!!errors.email}
              hasValue={!!emailValue}
              onClear={() => form.setValue('email', '', { shouldValidate: form.formState.isSubmitted })}
              {...form.register('email')}
            />
          </Field>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {t.auth.forgot.submit}
          </Button>
        </form>
      )}
      <Link href="/sign-in" className="link-sun self-center text-sm">
        {t.auth.forgot.back}
      </Link>
    </AuthShell>
  );
}

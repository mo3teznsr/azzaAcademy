'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth/client';
import { useI18n } from '@/lib/i18n/provider';
import { AuthShell, FieldError, FormBanner } from './auth-shell';
import { forgotSchema, type ForgotValues } from './schemas';

export function ForgotForm() {
  const { t, fill } = useI18n();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } });
  const { errors, isSubmitting } = form.formState;

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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-[13px] text-muted-foreground">
              {t.auth.signIn.email}
            </Label>
            <Input id="email" type="email" dir="ltr" autoComplete="email" aria-invalid={!!errors.email} {...form.register('email')} />
            <FieldError message={errors.email && t.auth.errors.email} />
          </div>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {t.auth.forgot.submit}
          </Button>
        </form>
      )}
      <Link href="/sign-in" className="link-sun text-sm">
        {t.auth.forgot.back}
      </Link>
    </AuthShell>
  );
}

'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth/client';
import { useI18n } from '@/lib/i18n/provider';
import { AuthShell, FieldError, FormBanner } from './auth-shell';
import { resetSchema, type ResetValues } from './schemas';

export function ResetForm() {
  const { t } = useI18n();
  const token = useSearchParams().get('token');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : t.auth.reset.invalid);
  const form = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { password: '', confirm: '' } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ password }) => {
    if (!token) return;
    setError(null);
    try {
      const { error: err } = await authClient.resetPassword({ newPassword: password, token });
      if (err) setError(err.message ?? t.auth.reset.invalid);
      else setDone(true);
    } catch {
      setError(t.common.networkError);
    }
  });

  return (
    <AuthShell kicker={t.auth.reset.kicker} title={t.auth.reset.title}>
      {done ? (
        <FormBanner tone="success">{t.auth.reset.done}</FormBanner>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          {error && <FormBanner tone="error">{error}</FormBanner>}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="text-[13px] text-stone">
              {t.auth.reset.password}
            </Label>
            <Input id="password" type="password" autoComplete="new-password" {...form.register('password')} />
            <FieldError message={errors.password && t.auth.errors.minPassword} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm" className="text-[13px] text-stone">
              {t.auth.reset.confirm}
            </Label>
            <Input id="confirm" type="password" autoComplete="new-password" {...form.register('confirm')} />
            <FieldError message={errors.confirm && t.auth.errors.mismatch} />
          </div>
          <Button type="submit" size="lg" disabled={isSubmitting || !token}>
            {t.auth.reset.submit}
          </Button>
        </form>
      )}
      <Link href="/sign-in" className="link-sun text-sm">
        {t.auth.forgot.back}
      </Link>
    </AuthShell>
  );
}

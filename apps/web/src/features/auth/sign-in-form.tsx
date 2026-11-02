'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { authClient } from '@/lib/auth/client';
import { homeFor, safeNext, rolesForPath } from '@/lib/auth/roles';
import { useI18n } from '@/lib/i18n/provider';
import { AuthShell, FieldError, FormBanner } from './auth-shell';
import { signInSchema, type SignInValues } from './schemas';

export function SignInForm() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '', remember: true } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const { data, error: err } = await authClient.signIn.email({ email: values.email, password: values.password, rememberMe: values.remember });
      if (err || !data) {
        setError(err?.status === 401 || err?.status === 400 ? t.auth.errors.invalid : (err?.message ?? t.auth.errors.generic));
        return;
      }
      const role = (data.user as { role?: string }).role;
      const next = safeNext(params.get('next'));
      const allowed = next ? rolesForPath(next) : null;
      const target = next && (!allowed || allowed.includes((role ?? 'STUDENT') as never)) ? next : homeFor(role);
      router.replace(target);
      router.refresh();
    } catch {
      setError(t.common.networkError);
    }
  });

  return (
    <AuthShell kicker={t.auth.signIn.kicker} title={t.auth.signIn.title} sub={t.auth.signIn.sub}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {error && <FormBanner tone="error">{error}</FormBanner>}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-[13px] text-stone">
            {t.auth.signIn.email}
          </Label>
          <Input id="email" type="email" autoComplete="email" dir="ltr" aria-invalid={!!errors.email} {...form.register('email')} />
          <FieldError message={errors.email && t.auth.errors.email} />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-[13px] text-stone">
              {t.auth.signIn.password}
            </Label>
            <Link href="/forgot-password" className="link-sun text-[13px]">
              {t.auth.signIn.forgot}
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...form.register('password')} />
        </div>
        <label className="flex items-center gap-2.5 text-sm">
          <Checkbox checked={form.watch('remember')} onCheckedChange={(v) => form.setValue('remember', v === true)} />
          {t.auth.signIn.keep}
        </label>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? t.auth.signIn.submitting : t.auth.signIn.submit}
        </Button>
        <p className="text-center text-sm text-stone">
          {t.auth.signIn.newHere}{' '}
          <Link href="/sign-up" className="link-sun">
            {t.auth.signIn.create}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

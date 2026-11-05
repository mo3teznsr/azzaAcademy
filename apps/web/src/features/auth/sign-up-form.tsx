'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth/client';
import { homeFor } from '@/lib/auth/roles';
import { useI18n } from '@/lib/i18n/provider';
import { AuthShell, FieldError, FormBanner } from './auth-shell';
import { signUpSchema, type SignUpValues } from './schemas';

export function SignUpForm() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema), defaultValues: { name: '', email: '', password: '' } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { data, error: err } = await authClient.signUp.email({ ...values, locale, timezone });
      if (err || !data) {
        setError(err?.message ?? t.auth.errors.generic);
        return;
      }
      router.replace(homeFor((data.user as { role?: string }).role));
      router.refresh();
    } catch {
      setError(t.common.networkError);
    }
  });

  return (
    <AuthShell kicker={t.auth.signUp.kicker} title={t.auth.signUp.title} sub={t.auth.signUp.sub}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {error && <FormBanner tone="error">{error}</FormBanner>}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name" className="text-[13px] text-muted-foreground">
            {t.auth.signUp.name}
          </Label>
          <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...form.register('name')} />
          <FieldError message={errors.name && t.auth.errors.name} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-[13px] text-muted-foreground">
            {t.auth.signIn.email}
          </Label>
          <Input id="email" type="email" dir="ltr" autoComplete="email" aria-invalid={!!errors.email} {...form.register('email')} />
          <FieldError message={errors.email && t.auth.errors.email} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password" className="text-[13px] text-muted-foreground">
            {t.auth.signIn.password}
          </Label>
          <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register('password')} />
          <FieldError message={errors.password && t.auth.errors.minPassword} />
        </div>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? t.auth.signUp.submitting : t.auth.signUp.submit}
        </Button>
        <p className="text-center text-[13px] text-muted-foreground">
          {t.legal.agreePrefix}{' '}
          <Link href="/terms" className="link-sun">
            {t.legal.agreeTerms}
          </Link>{' '}
          {t.legal.agreeAnd}{' '}
          <Link href="/privacy" className="link-sun">
            {t.legal.agreePrivacy}
          </Link>
          .
        </p>
        <p className="text-center text-sm text-muted-foreground">
          {t.auth.signUp.haveAccount}{' '}
          <Link href="/sign-in" className="link-sun">
            {t.auth.signUp.signIn}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

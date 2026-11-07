'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { authClient } from '@/lib/auth/client';
import { homeFor, safeNext, rolesForPath } from '@/lib/auth/roles';
import { useI18n } from '@/lib/i18n/provider';
import { AuthShell, FormBanner } from './auth-shell';
import { Field, IconInput, PasswordInput } from './fields';
import { signInSchema, type SignInValues } from './schemas';

export function SignInForm() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '', remember: true } });
  const { errors, isSubmitting } = form.formState;
  const emailValue = useWatch({ control: form.control, name: 'email' });
  const remember = useWatch({ control: form.control, name: 'remember' });
  const nextParam = safeNext(params.get('next'));
  const signUpHref = nextParam ? `/sign-up?next=${encodeURIComponent(nextParam)}` : '/sign-up';

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
        <Field id="email" label={t.auth.signIn.email} error={errors.email && t.auth.errors.email}>
          <IconInput
            id="email"
            icon={Mail}
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            placeholder={t.auth.placeholders.email}
            invalid={!!errors.email}
            hasValue={!!emailValue}
            onClear={() => form.setValue('email', '', { shouldValidate: form.formState.isSubmitted })}
            {...form.register('email')}
          />
        </Field>
        <Field
          id="password"
          label={t.auth.signIn.password}
          aside={
            <Link href="/forgot-password" className="link-sun text-[13px]">
              {t.auth.signIn.forgot}
            </Link>
          }
        >
          <PasswordInput id="password" autoComplete="current-password" placeholder={t.auth.placeholders.password} invalid={!!errors.password} {...form.register('password')} />
        </Field>
        <label className="flex items-center gap-2.5 text-sm">
          <Checkbox checked={remember} onCheckedChange={(v) => form.setValue('remember', v === true)} />
          {t.auth.signIn.keep}
        </label>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? t.auth.signIn.submitting : t.auth.signIn.submit}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {t.auth.signIn.newHere}{' '}
          <Link href={signUpHref} className="link-sun">
            {t.auth.signIn.create}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

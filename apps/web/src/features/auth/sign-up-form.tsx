'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GraduationCap, Mail, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/brand/phone-input';
import { authClient } from '@/lib/auth/client';
import { homeFor, rolesForPath, safeNext } from '@/lib/auth/roles';
import { useI18n } from '@/lib/i18n/provider';
import { useApiError } from '@/lib/api-errors';
import { AuthShell, FormBanner } from './auth-shell';
import { Field, IconInput, PasswordInput } from './fields';
import { signUpSchema, type SignUpValues } from './schemas';

export function SignUpForm() {
  const { t, locale } = useI18n();
  const apiError = useApiError();
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema), defaultValues: { name: '', email: '', phone: '', password: '' } });
  const { errors, isSubmitting } = form.formState;
  const nameValue = useWatch({ control: form.control, name: 'name' });
  const emailValue = useWatch({ control: form.control, name: 'email' });
  const nextParam = safeNext(params.get('next'));
  const signInHref = nextParam ? `/sign-in?next=${encodeURIComponent(nextParam)}` : '/sign-in';

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { data, error: err } = await authClient.signUp.email({ ...values, locale, timezone });
      if (err || !data) {
        setError(err ? apiError(err) : t.auth.errors.generic);
        return;
      }
      // Same `next` rule as sign-in: only same-origin paths the new role may open (e.g. /teach).
      const role = (data.user as { role?: string }).role;
      const allowed = nextParam ? rolesForPath(nextParam) : null;
      const target = nextParam && (!allowed || allowed.includes((role ?? 'STUDENT') as never)) ? nextParam : homeFor(role);
      router.replace(target);
      router.refresh();
    } catch {
      setError(t.common.networkError);
    }
  });

  return (
    <AuthShell kicker={t.auth.signUp.kicker} title={t.auth.signUp.title} sub={t.auth.signUp.sub}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {error && <FormBanner tone="error">{error}</FormBanner>}
        <Field id="name" label={t.auth.signUp.name} error={errors.name && t.auth.errors.name}>
          <IconInput
            id="name"
            icon={UserRound}
            autoComplete="name"
            dir="auto"
            placeholder={t.auth.placeholders.name}
            invalid={!!errors.name}
            hasValue={!!nameValue}
            onClear={() => form.setValue('name', '', { shouldValidate: form.formState.isSubmitted })}
            {...form.register('name')}
          />
        </Field>
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
        <Field id="phone" label={t.auth.signUp.phone} error={errors.phone && (form.getValues('phone') ? undefined : t.phone.required)}>
          <Controller
            control={form.control}
            name="phone"
            render={({ field }) => (
              <PhoneInput id="phone" value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={!!errors.phone} autoComplete="tel-national" aria-describedby={errors.phone ? 'phone-error' : undefined} />
            )}
          />
        </Field>
        <Field id="password" label={t.auth.signIn.password} error={errors.password && t.auth.errors.minPassword}>
          <PasswordInput id="password" autoComplete="new-password" placeholder={t.auth.placeholders.newPassword} invalid={!!errors.password} {...form.register('password')} />
        </Field>
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
          <Link href={signInHref} className="link-sun">
            {t.auth.signUp.signIn}
          </Link>
        </p>
        <p className="flex items-center justify-center gap-2 border-t border-border pt-5 text-[13px] text-muted-foreground">
          <GraduationCap className="size-4" aria-hidden />
          {t.auth.wantToTeach}{' '}
          <Link href="/teach" className="link-sun">
            {t.auth.applyToTeach}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

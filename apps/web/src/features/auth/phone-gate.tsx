'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isValidPhone } from '@azza/shared';
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/brand/phone-input';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { meApi, type Me } from '@/lib/api';
import { useApiError } from '@/lib/api-errors';
import { authClient } from '@/lib/auth/client';
import { useI18n } from '@/lib/i18n/provider';
import { qk } from '@/lib/query-keys';
import { FormBanner } from './auth-shell';
import { Field } from './fields';

/**
 * Before a first purchase: accounts made with Google or Apple (and older accounts) may have no phone, which email sign-up
 * always collects. This asks for it once, in place, then shows the checkout. The API validates it like any profile phone.
 */
export function PhoneGate({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const me = useQuery({ queryKey: qk.me, queryFn: meApi.get });
  if (me.isPending) return compact ? <LoadingBlock rows={1} height={52} /> : <LoadingBlock rows={2} height={120} />;
  if (me.isError) return <ErrorState compact={compact} error={me.error} onRetry={() => void me.refetch()} />;
  if (me.data.phone) return <>{children}</>;
  return <PhoneStep compact={compact} />;
}

/** `compact`: inline inside a purchase card (plan picker) instead of a page-level card. */
function PhoneStep({ compact }: { compact: boolean }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const apiError = useApiError();
  const [phone, setPhone] = useState('');
  const [invalid, setInvalid] = useState(false);
  const save = useMutation({
    mutationFn: (value: string) => meApi.update({ phone: value }),
    onSuccess: (updated: Me) => {
      qc.setQueryData(qk.me, updated);
      void authClient.getSession();
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidPhone(phone)) return setInvalid(true);
    save.mutate(phone);
  };

  const Title = compact ? 'h3' : 'h1';
  return (
    <section
      aria-labelledby="phone-gate-title"
      className={
        compact
          ? 'flex w-full flex-col gap-4'
          : 'mx-auto flex w-full max-w-[480px] flex-col gap-6 rounded-[28px] border border-border bg-card p-6 shadow-card sm:p-8'
      }
    >
      <div className="flex flex-col gap-2">
        {!compact && <span className="label-mono text-muted-foreground">{t.auth.phoneGate.kicker}</span>}
        <Title id="phone-gate-title" className={compact ? 'font-bold' : 'font-display text-[clamp(28px,4vw,36px)] font-extrabold leading-[1.05]'}>
          {t.auth.phoneGate.title}
        </Title>
        <p className={compact ? 'text-[13px] opacity-80' : 'text-[15px] text-muted-foreground'}>{t.auth.phoneGate.body}</p>
      </div>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {save.isError && <FormBanner tone="error">{apiError(save.error)}</FormBanner>}
        <Field id="gate-phone" label={t.auth.phoneGate.label} error={invalid && !phone ? t.phone.required : undefined}>
          <PhoneInput
            id="gate-phone"
            value={phone}
            onChange={(v) => {
              setInvalid(false);
              setPhone(v);
            }}
            invalid={invalid}
            autoComplete="tel-national"
            aria-describedby={invalid ? 'gate-phone-error' : undefined}
          />
        </Field>
        <Button type="submit" size="lg" variant={compact ? 'ink' : 'default'} className={compact ? 'w-full' : undefined} disabled={save.isPending}>
          {save.isPending ? t.auth.phoneGate.saving : t.auth.phoneGate.save}
        </Button>
      </form>
    </section>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { isValidPhone, updateProfileInput, type UpdateProfileInput } from '@azza/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhoneInput } from '@/components/brand/phone-input';
import { Panel, SectionHeader } from '@/components/brand/section';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { meApi } from '@/lib/api';
import { useApiError } from '@/lib/api-errors';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { authClient } from '@/lib/auth/client';

const ZONES = ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Kuwait', 'Asia/Bahrain', 'Asia/Muscat', 'Africa/Cairo', 'Asia/Amman', 'Europe/London', 'UTC'];

/** Profile (shared by student + teacher settings) — validates with `updateProfileInput`. */
export function ProfileForm() {
  const { t, setLocale, pick } = useI18n();
  const money = useMoney();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: qk.me, queryFn: meApi.get });
  const apiError = useApiError();
  // The phone is checked on submit, and only when it was edited, so a stored legacy number never blocks the rest.
  const schema = useMemo(() => updateProfileInput.omit({ phone: true }), []);
  const form = useForm<UpdateProfileInput>({ resolver: zodResolver(schema) as unknown as Resolver<UpdateProfileInput> });
  const { dirtyFields } = form.formState;
  const [phoneBad, setPhoneBad] = useState(false);
  const knownCurrency = (code: string | undefined) => (code && money.currencies.some((c) => c.code === code) ? code : 'AED');

  useEffect(() => {
    if (me.data)
      form.reset({
        name: me.data.name,
        phone: me.data.phone ?? '',
        locale: me.data.locale,
        timezone: me.data.timezone,
        displayCurrency: me.data.displayCurrency,
      });
    // Seed once per loaded profile; a currency list arriving later must not wipe edits.
  }, [me.data, form]);

  const save = useMutation({
    mutationFn: meApi.update,
    onSuccess: (_, v) => {
      toast.success(t.settings.saved);
      void qc.invalidateQueries({ queryKey: qk.me });
      void authClient.getSession();
      if (v.locale) setLocale(v.locale);
      if (v.displayCurrency) money.setCurrency(v.displayCurrency);
    },
    onError: (e: Error) => toast.error(apiError(e)),
  });

  const submit = form.handleSubmit((v) => {
    const { phone, ...rest } = v;
    // A currency that was removed or disabled falls back to AED.
    const body: UpdateProfileInput = { ...rest, displayCurrency: knownCurrency(rest.displayCurrency) };
    if (dirtyFields.phone) {
      if (phone && !isValidPhone(phone)) return setPhoneBad(true);
      body.phone = phone || null;
    }
    setPhoneBad(false);
    save.mutate(body);
  });

  return (
    <Panel aria-labelledby="profile">
      <SectionHeader title={<span id="profile">{t.settings.profile}</span>} />
      {me.isPending ? (
        <LoadingBlock rows={4} height={48} />
      ) : me.isError ? (
        <ErrorState error={me.error} onRetry={() => void me.refetch()} />
      ) : (
        <form className="grid gap-5 md:grid-cols-2" onSubmit={submit} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t.settings.name}</Label>
            <Input id="name" {...form.register('name')} aria-invalid={!!form.formState.errors.name} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t.settings.email}</Label>
            <Input id="email" value={me.data.email} disabled dir="ltr" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">{t.settings.phone}</Label>
            <Controller control={form.control} name="phone" render={({ field }) => <PhoneInput id="phone" value={field.value} onChange={(v) => (setPhoneBad(false), field.onChange(v))} onBlur={field.onBlur} invalid={phoneBad} />} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t.settings.appLanguage}</Label>
            <Controller
              control={form.control}
              name="locale"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t.settings.timezone}</Label>
            <Controller
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set([field.value ?? 'Asia/Dubai', ...ZONES])).map((z) => (
                      <SelectItem key={z} value={z}>
                        {z}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t.settings.displayCurrency}</Label>
            <Controller
              control={form.control}
              name="displayCurrency"
              render={({ field }) => (
                <Select value={knownCurrency(field.value)} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {money.currencies.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} · {pick(c.nameEn, c.nameAr).text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <span className="text-[13px] text-muted-foreground">{t.settings.currencyNote}</span>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t.common.saving : t.common.save}
            </Button>
          </div>
        </form>
      )}
    </Panel>
  );
}

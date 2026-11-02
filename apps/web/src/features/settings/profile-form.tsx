'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DISPLAY_CURRENCIES, updateProfileInput, type UpdateProfileInput } from '@azza/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Panel, SectionHeader } from '@/components/brand/section';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { meApi } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { authClient } from '@/lib/auth/client';

const ZONES = ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Kuwait', 'Asia/Bahrain', 'Asia/Muscat', 'Africa/Cairo', 'Asia/Amman', 'Europe/London', 'UTC'];

/** Profile (shared by student + teacher settings) — validates with `updateProfileInput`. */
export function ProfileForm() {
  const { t, setLocale } = useI18n();
  const money = useMoney();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: qk.me, queryFn: meApi.get });
  const form = useForm<UpdateProfileInput>({ resolver: zodResolver(updateProfileInput) });

  useEffect(() => {
    if (me.data)
      form.reset({
        name: me.data.name,
        phone: me.data.phone ?? '',
        locale: me.data.locale,
        timezone: me.data.timezone,
        displayCurrency: me.data.displayCurrency,
      });
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
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Panel aria-labelledby="profile">
      <SectionHeader title={<span id="profile">{t.settings.profile}</span>} />
      {me.isPending ? (
        <LoadingBlock rows={4} height={48} />
      ) : me.isError ? (
        <ErrorState error={me.error} onRetry={() => void me.refetch()} />
      ) : (
        <form className="grid gap-5 md:grid-cols-2" onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate>
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
            <Input id="phone" type="tel" dir="ltr" {...form.register('phone')} />
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
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISPLAY_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
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

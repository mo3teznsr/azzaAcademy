'use client';

import { useId } from 'react';
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Link2, Sparkles, X } from 'lucide-react';
import { instructorApplicationInput, SESSION_LANGUAGES, type InstructorApplicationInput } from '@azza/shared';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PhoneInput } from '@/components/brand/phone-input';
import { CategoryIcon, useCategories } from '@/components/brand/category';
import { LoadingBlock } from '@/components/brand/states';
import { instructorsApi, type InstructorApplication } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { FieldError, FormBanner } from '@/features/auth/auth-shell';
import { useInstructorError } from './errors';

const CHIP =
  'h-10 min-w-0 rounded-full border border-input bg-card px-4 text-sm font-bold text-foreground hover:bg-accent data-[state=on]:border-green data-[state=on]:bg-green data-[state=on]:text-ink-deep';

/** Empty optional fields go to the API as undefined, not "". */
const optional = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

/** The join-as-instructor application. Prefills from a declined application so the applicant can revise it. */
export function ApplicationForm({ previous }: { previous?: InstructorApplication | null }) {
  const { t, pick } = useI18n();
  const c = t.instructors.apply;
  const id = useId();
  const qc = useQueryClient();
  const toMessage = useInstructorError();
  const categories = useCategories();
  const form = useForm<InstructorApplicationInput>({
    resolver: zodResolver(instructorApplicationInput) as Resolver<InstructorApplicationInput>,
    defaultValues: {
      headline: previous?.headline ?? '',
      bio: previous?.bio ?? '',
      categories: previous?.categories ?? [],
      languages: previous?.languages ?? [],
      experience: previous?.experience ?? '',
      sampleUrl: previous?.sampleUrl ?? undefined,
      phone: previous?.phone ?? undefined,
    },
  });
  const { errors } = form.formState;
  const apply = useMutation({
    mutationFn: instructorsApi.apply,
    onSuccess: (application) => {
      qc.setQueryData(qk.myInstructorApplication, application);
      toast.success(c.sent);
    },
  });
  const onSubmit = form.handleSubmit((values) => apply.mutate(values));
  const fid = (name: string) => `${id}-${name}`;
  const described = (name: keyof InstructorApplicationInput) => (errors[name] ? `${fid(name)}-error` : undefined);
  const bioLen = useWatch({ control: form.control, name: 'bio' })?.length ?? 0;
  const expLen = useWatch({ control: form.control, name: 'experience' })?.length ?? 0;
  const headline = useWatch({ control: form.control, name: 'headline' });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {apply.isError && <FormBanner tone="error">{toMessage(apply.error)}</FormBanner>}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fid('headline')} className="text-[13px] font-bold">
          {c.headline}
        </Label>
        <InputGroup>
          <InputGroupAddon>
            <Sparkles aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            id={fid('headline')}
            dir="auto"
            maxLength={120}
            placeholder={c.headlinePh}
            aria-invalid={!!errors.headline || undefined}
            aria-describedby={described('headline')}
            {...form.register('headline')}
          />
          {headline && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" aria-label={t.auth.clear} onClick={() => form.setValue('headline', '', { shouldValidate: form.formState.isSubmitted })}>
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
        <FieldError id={`${fid('headline')}-error`} message={errors.headline && c.errors.headline} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fid('bio')} className="text-[13px] font-bold">
          {c.bio}
        </Label>
        <InputGroup>
          <InputGroupTextarea
            id={fid('bio')}
            dir="auto"
            rows={5}
            maxLength={2000}
            placeholder={c.bioPh}
            aria-invalid={!!errors.bio || undefined}
            aria-describedby={described('bio')}
            {...form.register('bio')}
          />
          <InputGroupAddon align="block-end">
            <InputGroupText className="ms-auto font-mono text-xs" dir="ltr">
              {bioLen} / 2000
            </InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <FieldError id={`${fid('bio')}-error`} message={errors.bio && c.errors.bio} />
      </div>

      <fieldset className="flex flex-col gap-2" aria-describedby={described('categories')}>
        <legend className="mb-2 flex w-full items-baseline justify-between gap-3 text-[13px] font-bold">
          {c.categories}
          <span className="font-normal text-muted-foreground">{c.categoriesHint}</span>
        </legend>
        {categories.isPending ? (
          <LoadingBlock rows={1} height={40} />
        ) : (
          <Controller
            control={form.control}
            name="categories"
            render={({ field }) => (
              <ToggleGroup type="multiple" value={field.value} onValueChange={(v) => field.onChange(v.slice(0, 5))} className="w-full flex-wrap">
                {(categories.data ?? []).map((cat) => (
                  <ToggleGroupItem key={cat.slug} value={cat.slug} className={CHIP} disabled={!field.value.includes(cat.slug) && field.value.length >= 5}>
                    <CategoryIcon name={cat.icon} />
                    {pick(cat.nameEn, cat.nameAr).text}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          />
        )}
        <FieldError id={`${fid('categories')}-error`} message={errors.categories && c.errors.categories} />
      </fieldset>

      <fieldset className="flex flex-col gap-2" aria-describedby={described('languages')}>
        <legend className="mb-2 text-[13px] font-bold">{c.languages}</legend>
        <Controller
          control={form.control}
          name="languages"
          render={({ field }) => (
            <ToggleGroup type="multiple" value={field.value} onValueChange={(v) => field.onChange(v as InstructorApplicationInput['languages'])} className="flex-wrap">
              {SESSION_LANGUAGES.map((l) => (
                <ToggleGroupItem key={l} value={l} className={CHIP}>
                  {field.value.includes(l) && <Check aria-hidden />}
                  {t.status.sessionLanguage[l]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        />
        <FieldError id={`${fid('languages')}-error`} message={errors.languages && c.errors.languages} />
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fid('experience')} className="text-[13px] font-bold">
          {c.experience}
        </Label>
        <InputGroup>
          <InputGroupTextarea
            id={fid('experience')}
            dir="auto"
            rows={4}
            maxLength={1500}
            placeholder={c.experiencePh}
            aria-invalid={!!errors.experience || undefined}
            aria-describedby={described('experience')}
            {...form.register('experience')}
          />
          <InputGroupAddon align="block-end">
            <InputGroupText className="ms-auto font-mono text-xs" dir="ltr">
              {expLen} / 1500
            </InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <FieldError id={`${fid('experience')}-error`} message={errors.experience && c.errors.experience} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={fid('sampleUrl')} className="text-[13px] font-bold">
            {c.sampleUrl} <span className="font-normal text-muted-foreground">· {c.optional}</span>
          </Label>
          <InputGroup>
            <InputGroupAddon>
              <Link2 aria-hidden />
            </InputGroupAddon>
            <InputGroupInput
              id={fid('sampleUrl')}
              type="url"
              inputMode="url"
              dir="ltr"
              placeholder={c.sampleUrlPh}
              aria-invalid={!!errors.sampleUrl || undefined}
              aria-describedby={described('sampleUrl')}
              {...form.register('sampleUrl', { setValueAs: optional })}
            />
          </InputGroup>
          <FieldError id={`${fid('sampleUrl')}-error`} message={errors.sampleUrl && c.errors.sampleUrl} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={fid('phone')} className="text-[13px] font-bold">
            {c.phone} <span className="font-normal text-muted-foreground">· {c.optional}</span>
          </Label>
          <Controller
            control={form.control}
            name="phone"
            render={({ field }) => (
              <PhoneInput id={fid('phone')} value={field.value} onChange={(v) => field.onChange(v || undefined)} onBlur={field.onBlur} invalid={!!errors.phone} aria-describedby={described('phone')} />
            )}
          />
          <FieldError id={`${fid('phone')}-error`} message={errors.phone && c.errors.phone} />
        </div>
      </div>

      <Button type="submit" size="lg" className="self-start" disabled={apply.isPending}>
        {apply.isPending ? c.submitting : c.submit}
      </Button>
    </form>
  );
}

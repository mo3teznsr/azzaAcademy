'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { COUNTRIES, DEFAULT_COUNTRY_ISO2, countriesForPhone, isValidPhone, toE164 } from '@azza/shared';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

type Country = (typeof COUNTRIES)[number];
const GCC = ['AE', 'SA', 'QA', 'KW', 'BH', 'OM'];

/** Shared dial codes belong to one main country (+1 is the US, +7 Russia, +44 the UK …). */
const PRIMARY: Record<string, string> = { '1': 'US', '7': 'RU', '44': 'GB', '61': 'AU', '47': 'NO', '358': 'FI', '212': 'MA', '262': 'RE', '590': 'GP', '599': 'CW', '290': 'SH' };

/** The country behind an E.164 number: the dial code's main country, else the first whose length fits. */
function countryOf(e164: string): Country | undefined {
  const matches = countriesForPhone(e164);
  if (matches.length === 0) return undefined;
  const dial = matches[0].dialCode;
  const primary = matches.find((c) => c.iso2 === PRIMARY[dial]);
  const national = e164.length - 1 - dial.length;
  return primary ?? matches.find((c) => national >= c.minLen && national <= c.maxLen) ?? matches[0];
}

/** Starting state for a stored value. A stored number that isn't E.164 is shown so it can be fixed, never dropped. */
function seedOf(value: string | null | undefined, fallbackIso: string): { iso: string; national: string } {
  if (!value) return { iso: fallbackIso, national: '' };
  const c = isValidPhone(value) ? countryOf(value) : undefined;
  if (c) return { iso: c.iso2, national: value.slice(c.dialCode.length + 1) };
  const guess = toE164(fallbackIso, value);
  const g = isValidPhone(guess) ? countryOf(guess) : undefined;
  if (g) return { iso: g.iso2, national: guess.slice(g.dialCode.length + 1) };
  return { iso: fallbackIso, national: value.replace(/[^\d\s\-()]/g, '') };
}

/**
 * Mobile number with a searchable country picker (flag, name, dial code) and a `tel` field.
 * `value` and `onChange` are E.164 (`+971501234567`); empty string when nothing is typed.
 * Always LTR so digits and the dial code read the same in Arabic.
 */
export function PhoneInput({
  id,
  value,
  onChange,
  onBlur,
  defaultCountry = DEFAULT_COUNTRY_ISO2,
  invalid,
  disabled,
  autoComplete = 'tel-national',
  'aria-describedby': describedBy,
}: {
  id: string;
  value: string | null | undefined;
  onChange: (e164: string) => void;
  onBlur?: () => void;
  defaultCountry?: string;
  invalid?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  'aria-describedby'?: string;
}) {
  const { t, locale, fill } = useI18n();
  const byIso = useMemo(() => new Map(COUNTRIES.map((c) => [c.iso2, c])), []);
  const [seed] = useState(() => seedOf(value, defaultCountry));
  const [iso, setIso] = useState(seed.iso);
  const [national, setNational] = useState(seed.national);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [touched, setTouched] = useState(false);
  const last = useRef(value ?? '');
  const country = byIso.get(iso) ?? COUNTRIES[0];
  const name = (c: Country) => (locale === 'ar' ? c.nameAr : c.nameEn);

  // Follow outside changes (a form reset or a saved value arriving), but not our own emissions.
  useEffect(() => {
    const v = value ?? '';
    if (v === last.current) return;
    last.current = v;
    const s = seedOf(v, defaultCountry);
    setIso(s.iso);
    setNational(s.national);
  }, [value, defaultCountry]);

  const emit = (nextIso: string, nextNational: string) => {
    const out = nextNational.replace(/\D/g, '') ? toE164(nextIso, nextNational) : '';
    last.current = out;
    onChange(out);
  };

  const sorted = useMemo(() => {
    const first = GCC.map((i) => byIso.get(i)).filter((c): c is Country => !!c);
    const rest = COUNTRIES.filter((c) => !GCC.includes(c.iso2)).sort((a, b) => (locale === 'ar' ? a.nameAr.localeCompare(b.nameAr, 'ar') : a.nameEn.localeCompare(b.nameEn, 'en')));
    return [...first, ...rest];
  }, [byIso, locale]);
  const q = query.trim().toLowerCase().replace(/^\+/, '');
  const shown = q ? sorted.filter((c) => c.nameEn.toLowerCase().includes(q) || c.nameAr.includes(query.trim()) || c.dialCode.startsWith(q) || c.iso2.toLowerCase() === q) : sorted;

  const e164 = value ?? '';
  const wrong = (touched || !!invalid) && e164 !== '' && !isValidPhone(e164);
  const bad = !!invalid || wrong;
  const pick = (c: Country) => {
    setIso(c.iso2);
    setOpen(false);
    setQuery('');
    emit(c.iso2, national);
  };

  return (
    <div className="flex flex-col gap-1.5" dir="ltr">
      <InputGroup>
        <InputGroupAddon>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <InputGroupButton
                type="button"
                disabled={disabled}
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-label={`${t.phone.country}: ${name(country)} +${country.dialCode}`}
                className="gap-1.5 px-2"
              >
                <span aria-hidden className="text-base leading-none">{country.flag}</span>
                <span className="tabular-nums">+{country.dialCode}</span>
                <ChevronsUpDown aria-hidden className="size-3.5 opacity-60" />
              </InputGroupButton>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
              <div className="flex items-center gap-2 border-b border-border px-3">
                <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      listRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
                    }
                    if (e.key === 'Enter' && shown[0]) {
                      e.preventDefault();
                      pick(shown[0]);
                    }
                  }}
                  aria-label={t.phone.search}
                  placeholder={t.phone.search}
                  className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <ul
                ref={listRef}
                role="listbox"
                aria-label={t.phone.country}
                className="max-h-64 overflow-y-auto p-1"
                onKeyDown={(e) => {
                  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
                  e.preventDefault();
                  const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
                  const at = items.indexOf(document.activeElement as HTMLButtonElement);
                  if (e.key === 'ArrowUp' && at <= 0) return searchRef.current?.focus();
                  const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : at + (e.key === 'ArrowDown' ? 1 : -1);
                  items[Math.max(0, Math.min(items.length - 1, next))]?.focus();
                }}
              >
                {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">{t.phone.noMatch}</li>}
                {shown.map((c) => (
                  <li key={c.iso2} role="option" aria-selected={c.iso2 === iso}>
                    <button
                      type="button"
                      onClick={() => pick(c)}
                      className={cn('flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-start text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none', c.iso2 === iso && 'bg-accent')}
                    >
                      <span aria-hidden className="text-base">{c.flag}</span>
                      <span className="min-w-0 flex-1 truncate">{name(c)}</span>
                      <span className="tabular-nums text-muted-foreground" dir="ltr">+{c.dialCode}</span>
                      {c.iso2 === iso && <Check aria-hidden className="size-4" />}
                    </button>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete={autoComplete}
          dir="ltr"
          disabled={disabled}
          value={national}
          aria-invalid={bad || undefined}
          aria-describedby={[wrong ? `${id}-phone-error` : null, describedBy].filter(Boolean).join(' ') || undefined}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d\s\-()]/g, '');
            setNational(v);
            emit(iso, v);
          }}
          onBlur={() => (setTouched(true), onBlur?.())}
        />
      </InputGroup>
      {wrong && (
        <span id={`${id}-phone-error`} role="alert" className="text-[13px] text-destructive" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
          {fill(t.phone.invalid, { country: name(country) })}
        </span>
      )}
    </div>
  );
}

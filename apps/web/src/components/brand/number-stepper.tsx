'use client';

import { Minus, Plus } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { cn } from '@/lib/utils';

/** Whole-number input group with −/+ buttons (seats, counts). Empty input reports NaN so the schema flags it. */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  id,
  invalid,
  disabled,
  decLabel,
  incLabel,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  decLabel: string;
  incLabel: string;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}) {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : min;
  const clamp = (v: number) => Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, v));
  return (
    <InputGroup className={cn('w-full', className)} data-disabled={disabled || undefined}>
      <InputGroupAddon>
        <InputGroupButton size="icon-sm" aria-label={decLabel} disabled={disabled || n <= min} onClick={() => onChange(clamp(n - step))}>
          <Minus />
        </InputGroupButton>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        type="number"
        inputMode="numeric"
        dir="ltr"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className="text-center tabular-nums"
        value={typeof value === 'number' && Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(e.target.value === '' ? Number.NaN : Number(e.target.value))}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-sm" aria-label={incLabel} disabled={disabled || (max !== undefined && n >= max)} onClick={() => onChange(clamp(n + step))}>
          <Plus />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

/** Amount input group with a trailing currency addon ("AED"). */
export function MoneyInput({
  id,
  currency = 'AED',
  invalid,
  className,
  ...props
}: React.ComponentProps<'input'> & { currency?: string; invalid?: boolean }) {
  return (
    <InputGroup className={className}>
      <InputGroupInput id={id} type="number" inputMode="decimal" step="0.01" min={0} dir="ltr" aria-invalid={invalid || undefined} className="tabular-nums" {...props} />
      <InputGroupAddon align="inline-end">
        <span className="font-mono text-xs">{currency}</span>
      </InputGroupAddon>
    </InputGroup>
  );
}

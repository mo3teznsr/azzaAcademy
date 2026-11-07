'use client';

import { useState, type ComponentProps, type ReactNode } from 'react';
import { Eye, EyeOff, Lock, X, type LucideIcon } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/lib/i18n/provider';
import { FieldError } from './auth-shell';

/** Label above, the input group, then the validation message under it. */
export function Field({ id, label, error, aside, children }: { id: string; label: string; error?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-[13px] font-bold">
          {label}
        </Label>
        {aside}
      </div>
      {children}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

type InputProps = Omit<ComponentProps<'input'>, 'size'> & { id: string; invalid?: boolean };

/** Text field with a leading icon and, when it has a value, a clear button. */
export function IconInput({ icon: Icon, invalid, onClear, hasValue, ...props }: InputProps & { icon: LucideIcon; onClear?: () => void; hasValue?: boolean }) {
  const { t } = useI18n();
  return (
    <InputGroup>
      <InputGroupAddon>
        <Icon aria-hidden />
      </InputGroupAddon>
      <InputGroupInput aria-invalid={invalid || undefined} aria-describedby={invalid ? `${props.id}-error` : undefined} {...props} />
      {onClear && hasValue && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" aria-label={t.auth.clear} onClick={onClear}>
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}

/** Password field: lock icon, then the field, then show/hide. */
export function PasswordInput({ invalid, ...props }: InputProps) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  return (
    <InputGroup>
      <InputGroupAddon>
        <Lock aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        type={shown ? 'text' : 'password'}
        dir="ltr"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${props.id}-error` : undefined}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs" aria-label={shown ? t.auth.hidePassword : t.auth.showPassword} aria-pressed={shown} onClick={() => setShown((s) => !s)}>
          {shown ? <EyeOff /> : <Eye />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

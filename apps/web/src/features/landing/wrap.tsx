import type { ComponentPropsWithoutRef, ElementType } from 'react';
import { cn } from '@/lib/utils';

/** The site column (same width and gutters as the public header). Full-bleed bands put it inside. */
export function Wrap<T extends ElementType = 'div'>({ as, className, ...rest }: { as?: T; className?: string } & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>) {
  const Tag = (as ?? 'div') as ElementType;
  return <Tag className={cn('mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-10', className)} {...rest} />;
}

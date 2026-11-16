'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Accordion as Root, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

/**
 * `mountAll` keeps closed answers in the HTML (with the `hidden` attribute) so search engines read every
 * answer; Radix would otherwise render only the open one.
 */
export function Accordion({ items, className, mountAll = false }: { items: Array<{ q: string; a: string }>; className?: string; mountAll?: boolean }) {
  const [open, setOpen] = useState('');
  return (
    <Root type="single" collapsible value={open} onValueChange={setOpen} className={cn('border-t border-border', className)}>
      {items.map((item, i) => (
        <AccordionItem key={i} value={String(i)} className="border-border">
          <AccordionTrigger className="py-6 text-start text-xl font-semibold hover:no-underline">{item.q}</AccordionTrigger>
          <AccordionContent
            className="pb-6 text-base text-muted-foreground"
            {...(mountAll && { forceMount: true as const, hidden: open !== String(i) })}
          >
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Root>
  );
}

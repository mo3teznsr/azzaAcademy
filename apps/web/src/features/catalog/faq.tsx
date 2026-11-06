'use client';

import { cn } from '@/lib/utils';
import { Accordion as Root, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function Accordion({ items, className }: { items: Array<{ q: string; a: string }>; className?: string }) {
  return (
    <Root type="single" collapsible className={cn('border-t border-border', className)}>
      {items.map((item, i) => (
        <AccordionItem key={i} value={String(i)} className="border-border">
          <AccordionTrigger className="py-6 text-start text-xl font-semibold hover:no-underline">{item.q}</AccordionTrigger>
          <AccordionContent className="pb-6 text-base text-muted-foreground">{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Root>
  );
}

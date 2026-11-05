'use client';

import { Accordion as Root, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function Accordion({ items }: { items: Array<{ q: string; a: string }> }) {
  return (
    <Root type="single" collapsible className="border-t border-border">
      {items.map((item, i) => (
        <AccordionItem key={i} value={String(i)} className="border-border">
          <AccordionTrigger className="py-6 text-start text-xl font-semibold hover:no-underline">{item.q}</AccordionTrigger>
          <AccordionContent className="pb-6 text-base text-muted-foreground">{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Root>
  );
}

'use client';

import { Accordion as Root, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function Accordion({ items }: { items: Array<{ q: string; a: string }> }) {
  return (
    <Root type="single" collapsible className="border-t border-line">
      {items.map((item, i) => (
        <AccordionItem key={i} value={String(i)} className="border-line">
          <AccordionTrigger className="py-6 text-start text-xl font-semibold hover:no-underline">{item.q}</AccordionTrigger>
          <AccordionContent className="pb-6 text-base text-stone">{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Root>
  );
}

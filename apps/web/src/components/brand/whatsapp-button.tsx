'use client';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/provider';
import { useSiteSettings, whatsappLink } from '@/lib/site-settings';
import { cn } from '@/lib/utils';

/** The WhatsApp mark (lucide has no brand icons). */
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={cn('size-4', className)}>
      <path d="M12.04 2a9.9 9.9 0 0 0-8.4 15.1L2 22l5.05-1.6A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3 .95.98-2.9-.2-.31a8.2 8.2 0 1 1 6.72 3.6Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.22-.09-.39-.12-.55.12-.17.25-.63.8-.77.96-.14.17-.28.19-.53.06-.25-.12-1.04-.38-1.97-1.22-.73-.65-1.22-1.45-1.36-1.7-.14-.24-.02-.38.1-.5.11-.11.25-.28.37-.42.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47c-.17 0-.43.06-.65.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.55c.12.16 1.73 2.64 4.2 3.7.59.26 1.05.41 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.14-1.17-.06-.1-.22-.17-.47-.29Z" />
    </svg>
  );
}

/**
 * "Ask on WhatsApp": opens wa.me with a prefilled message in a new tab. A secondary button so it
 * supports the page's main call to action. Renders nothing until a valid number is set.
 */
export function WhatsAppButton({
  course,
  batchCode,
  className,
  size = 'default',
}: {
  /** Localised course title for the prefilled message. */
  course: string;
  /** Adds the class code to the message (class pages). */
  batchCode?: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg';
}) {
  const { t, fill } = useI18n();
  const site = useSiteSettings();
  const text = batchCode ? fill(t.whatsapp.batchMessage, { course, batchCode }) : fill(t.whatsapp.courseMessage, { course });
  const href = whatsappLink(site.data?.whatsappNumber, text);
  if (!href) return null;
  return (
    <Button asChild variant="secondary" size={size} className={className}>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <WhatsAppIcon /> {t.whatsapp.ask}
        <span className="sr-only"> {t.whatsapp.newTab}</span>
      </a>
    </Button>
  );
}

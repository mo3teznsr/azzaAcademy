'use client';

import { Mail, MapPin, Phone } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { useSiteSettings, whatsappLink } from '@/lib/site-settings';
import { SOCIAL_KEYS, SocialIcon } from './social-icons';
import { WhatsAppIcon } from './whatsapp-button';
import { cn } from '@/lib/utils';

const LINK = 'flex min-h-11 items-center gap-2.5 text-[15px] text-soft-foreground no-underline hover:text-foreground';

/**
 * Contact details, WhatsApp and social links from GET /site-settings. Anything the admin hasn't set
 * is left out; with nothing set the component renders nothing.
 */
export function ContactDetails({ className, showAddress = true }: { className?: string; showAddress?: boolean }) {
  const { t, pick } = useI18n();
  const site = useSiteSettings();
  const s = site.data;
  if (!s) return null;
  const wa = whatsappLink(s.whatsappNumber);
  const address = pick(s.addressEn ?? '', s.addressAr ?? '').text;
  const socials = SOCIAL_KEYS.filter((k) => !!s.socials[k]);
  if (!s.contactEmail && !s.contactPhone && !wa && !(showAddress && address) && socials.length === 0) return null;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {s.contactEmail && (
        <a href={`mailto:${s.contactEmail}`} className={LINK}>
          <Mail className="size-4 shrink-0" aria-hidden />
          <bdi dir="ltr">{s.contactEmail}</bdi>
        </a>
      )}
      {s.contactPhone && (
        <a href={`tel:${s.contactPhone.replace(/[^\d+]/g, '')}`} className={LINK}>
          <Phone className="size-4 shrink-0" aria-hidden />
          <bdi dir="ltr">{s.contactPhone}</bdi>
        </a>
      )}
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className={LINK}>
          <WhatsAppIcon className="shrink-0" />
          {t.whatsapp.chat}
          <span className="sr-only"> {t.whatsapp.newTab}</span>
        </a>
      )}
      {showAddress && address && (
        <span className="flex items-start gap-2.5 py-2 text-[15px] text-soft-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{address}</span>
        </span>
      )}
      {socials.length > 0 && (
        <ul className="flex flex-wrap gap-1 pt-1" aria-label={t.whatsapp.followUs}>
          {socials.map((k) => (
            <li key={k}>
              <a
                href={s.socials[k]}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t.whatsapp.socials[k]}
                className="grid size-11 place-items-center rounded-full text-soft-foreground no-underline hover:bg-accent hover:text-foreground"
              >
                <SocialIcon name={k} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

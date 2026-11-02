'use client';

import { CalendarPlus } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { meApi } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';

/** Copies the signed ICS feed URL and offers to open it in the system calendar (webcal://). */
export function CalendarSubscribe() {
  const { t } = useI18n();
  const m = useMutation({
    mutationFn: meApi.calendar,
    onSuccess: async (feed) => {
      await navigator.clipboard?.writeText(feed.url).catch(() => undefined);
      toast.success(t.schedule.calendarCopied, {
        description: feed.url,
        action: { label: t.schedule.calendarOpen, onClick: () => window.open(feed.webcalUrl, '_self') },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Button variant="outline" onClick={() => m.mutate()} disabled={m.isPending}>
      <CalendarPlus /> {t.schedule.calendarSubscribe}
    </Button>
  );
}

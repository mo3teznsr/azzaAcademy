'use client';

import { Bell } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SOCKET_EVENTS, type NotificationEvent } from '@azza/shared';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { meApi } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useSocketEvent } from '@/lib/realtime/socket';
import { cn } from '@/lib/utils';

export function NotificationsBell() {
  const { t, f, fill } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: qk.notifications, queryFn: () => meApi.notifications(), retry: false });
  const items = q.data?.items ?? [];
  const unread = q.data?.unread ?? 0;
  const readAll = useMutation({
    mutationFn: meApi.readAllNotifications,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });

  useSocketEvent<NotificationEvent>(SOCKET_EVENTS.NOTIFICATION, (n) => {
    toast(n.title, { description: n.body });
    void qc.invalidateQueries({ queryKey: qk.notifications });
  });

  const label = unread ? `${t.common.notifications}, ${unread}` : t.common.notifications;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="icon" aria-label={label} className="relative bg-card">
          <Bell />
          {unread > 0 && <span className="absolute end-2.5 top-2.5 size-2 rounded-full bg-onair" aria-hidden />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <b className="text-sm">{t.common.notifications}</b>
          {unread > 0 && (
            <Button variant="ghost" size="xs" onClick={() => readAll.mutate()}>
              {t.common.markAllRead}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {q.isError ? (
            <p className="p-4 text-sm text-muted-foreground">{t.common.errorBody}</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{q.isPending ? t.common.loading : t.common.noNotifications}</p>
          ) : (
            <ul>
              {items.slice(0, 20).map((n) => (
                <li key={n.id} className={cn('border-b border-border px-4 py-3 text-sm last:border-0', !n.readAt && 'bg-muted/60')}>
                  <b className="block">{n.title}</b>
                  <span className="text-muted-foreground">{n.body}</span>
                  <span className="label-mono mt-1 block text-muted-foreground">{f.dateTime(n.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <span className="sr-only">{fill(t.common.showing, { n: items.length, total: items.length })}</span>
      </PopoverContent>
    </Popover>
  );
}

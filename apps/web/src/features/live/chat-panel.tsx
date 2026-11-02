'use client';

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/api/types';

/** Chat bubbles: own on the reading-end side, dir="auto" per message (i18n-00-system). */
export function ChatPanel({ messages, onSend, meId }: { messages: ChatMessage[]; onSend: (body: string) => void; meId?: string }) {
  const { t, f } = useI18n();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pe-1" aria-live="polite">
        {messages.length === 0 && <p className="text-sm text-muted-foreground">{t.live.noChat}</p>}
        {messages.map((m) => {
          const mine = m.user.id === meId;
          const host = m.user.role === 'TEACHER' || m.user.role === 'ADMIN';
          return (
            <div key={m.id} className={cn('flex max-w-[85%] flex-col gap-1 text-sm', mine ? 'self-end text-end' : 'self-start')}>
              <span className="label-mono text-muted-foreground">
                <bdi className={cn(host && !mine && 'text-sun')}>{mine ? t.common.you : m.user.name}</bdi>
                {host && !mine ? ` · ${t.live.hostLabel}` : ''} · {f.time(m.createdAt)}
              </span>
              <div
                dir="auto"
                className={cn(
                  'px-3 py-2.5 break-words',
                  mine ? 'rounded-[14px_4px_14px_14px] bg-ivory text-ink rtl:rounded-[4px_14px_14px_14px]' : 'rounded-[4px_14px_14px_14px] bg-ink-2 rtl:rounded-[14px_4px_14px_14px]',
                  m.pinned && 'border border-sun',
                )}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const body = draft.trim();
          if (!body) return;
          onSend(body);
          setDraft('');
        }}
      >
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t.live.message} aria-label={t.live.message} dir="auto" maxLength={2000} />
        <Button type="submit" size="icon" aria-label={t.live.send}>
          <Send className="rtl:-scale-x-100" />
        </Button>
      </form>
    </div>
  );
}

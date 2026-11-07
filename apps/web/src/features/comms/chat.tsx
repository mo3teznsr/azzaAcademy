'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import {
  SOCKET_EVENTS,
  type ConversationMessageDeletedEvent,
  type ConversationMessageEvent,
} from '@azza/shared';
import { ChevronLeft, Lock, MessageCircle, MoreHorizontal, Search, SendHorizontal, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea } from '@/components/ui/input-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip } from '@/components/brand/status-chip';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { EmptyState, ErrorState } from '@/components/brand/states';
import { SignalMark } from '@/components/brand/signal-mark';
import { conversationsApi, type Conversation, type ConversationList, type ConversationMessage, type MessagePage } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useAuth } from '@/lib/auth/use-auth';
import { useI18n } from '@/lib/i18n/provider';
import { useSocketEvent } from '@/lib/realtime/socket';
import { cn } from '@/lib/utils';
import { useCommsError, useDayLabel } from './errors';
import { messagesHref } from './links';

const BODY_MAX = 2000;
const PAGE = 50;

// ───────── conversations + unread ─────────

/** My conversations (students and teachers; admins get none). Shared by the header badge and the inbox. */
export function useConversations(enabled = true) {
  const { role } = useAuth();
  return useQuery({
    queryKey: qk.conversations,
    queryFn: conversationsApi.mine,
    enabled: enabled && !!role && role !== 'ADMIN',
    retry: false,
    refetchInterval: 120_000,
  });
}

/** Header icon next to the bell: opens /messages, shows the total unread and updates live. */
export function MessagesButton() {
  const { t, f, fill } = useI18n();
  const qc = useQueryClient();
  const q = useConversations();
  const unread = q.data?.unreadTotal ?? 0;
  useSocketEvent<ConversationMessageEvent>(SOCKET_EVENTS.CONVERSATION_MESSAGE, () => void qc.invalidateQueries({ queryKey: qk.conversations }));
  useSocketEvent<ConversationMessageDeletedEvent>(SOCKET_EVENTS.CONVERSATION_MESSAGE_DELETED, () => void qc.invalidateQueries({ queryKey: qk.conversations }));
  return (
    <Button asChild variant="secondary" size="icon" className="relative bg-card">
      <Link href="/messages" aria-label={unread ? fill(t.comms.chat.unreadLabel, { n: f.number(unread) }) : t.comms.chat.openMessages}>
        <MessageCircle />
        {unread > 0 && (
          <Badge aria-hidden className="absolute -end-1 -top-1 h-5 min-w-5 justify-center rounded-full bg-onair px-1 font-mono text-[11px] text-onair-ink tabular-nums">
            {unread > 99 ? '99+' : f.number(unread)}
          </Badge>
        )}
      </Link>
    </Button>
  );
}

function setUnread(qc: ReturnType<typeof useQueryClient>, conversationId: string, unread: number) {
  qc.setQueryData<ConversationList>(qk.conversations, (old) => {
    if (!old) return old;
    const items = old.items.map((c) => (c.id === conversationId ? { ...c, unread } : c));
    return { items, unreadTotal: items.reduce((n, c) => n + c.unread, 0) };
  });
}

// ───────── titles ─────────

function useConversationTitle() {
  const { t, fill, pick } = useI18n();
  return (c: Conversation) => {
    const course = pick(c.batch.courseTitle, c.batch.courseTitleAr).text;
    if (c.type === 'CLASS') return { title: course, sub: t.comms.chat.classChat };
    return { title: c.counterpart?.name ?? '—', sub: fill(t.comms.chat.privateWith, { name: course }) };
  };
}

// ───────── thread ─────────

type Pages = InfiniteData<MessagePage, string | undefined>;

function patchPages(qc: ReturnType<typeof useQueryClient>, id: string, fn: (pages: MessagePage[]) => MessagePage[]) {
  qc.setQueryData<Pages>(qk.conversationMessages(id), (old) => (old ? { ...old, pages: fn(old.pages) } : old));
}

/** The message list + composer of one conversation. Live over the socket; marks read while open. */
export function ChatThread({
  conversation,
  onBack,
  className,
  header = true,
}: {
  conversation: Conversation;
  onBack?: () => void;
  className?: string;
  header?: boolean;
}) {
  const { t, f, fill } = useI18n();
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const errorText = useCommsError();
  const dayLabel = useDayLabel();
  const titleOf = useConversationTitle();
  const id = conversation.id;
  const wrapRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const prevHeight = useRef<number | null>(null);
  const [draft, setDraft] = useState('');
  const [deleting, setDeleting] = useState<ConversationMessage | null>(null);

  const q = useInfiniteQuery({
    queryKey: qk.conversationMessages(id),
    queryFn: ({ pageParam, signal }) => conversationsApi.messages(id, { before: pageParam, limit: PAGE }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.items[0]?.createdAt : undefined),
    staleTime: 30_000,
  });
  // Pages arrive newest first; each page is oldest → newest.
  const messages = useMemo(() => (q.data ? [...q.data.pages].reverse().flatMap((p) => p.items) : []), [q.data]);

  const markRead = useMutation({
    mutationFn: () => conversationsApi.read(id),
    onSuccess: () => {
      setUnread(qc, id, 0);
      void qc.invalidateQueries({ queryKey: qk.conversations });
    },
  });
  const markReadRef = useRef(markRead.mutate);
  useEffect(() => {
    markReadRef.current = markRead.mutate;
  });
  useEffect(() => {
    if (role !== 'ADMIN') markReadRef.current();
  }, [id, role]);

  useSocketEvent<ConversationMessageEvent>(SOCKET_EVENTS.CONVERSATION_MESSAGE, (e) => {
    if (e.conversationId !== id) return;
    patchPages(qc, id, (pages) => {
      if (pages.some((p) => p.items.some((m) => m.id === e.message.id))) return pages;
      const [first, ...rest] = pages;
      return first ? [{ ...first, items: [...first.items, e.message] }, ...rest] : [{ items: [e.message], hasMore: false }];
    });
    if (role !== 'ADMIN' && document.visibilityState === 'visible') markReadRef.current();
  });
  useSocketEvent<ConversationMessageDeletedEvent>(SOCKET_EVENTS.CONVERSATION_MESSAGE_DELETED, (e) => {
    if (e.conversationId !== id) return;
    patchPages(qc, id, (pages) => pages.map((p) => ({ ...p, items: p.items.map((m) => (m.id === e.messageId ? { ...m, body: '', deleted: true } : m)) })));
  });

  const send = useMutation({
    mutationFn: (body: string) => conversationsApi.send(id, body),
    onSuccess: (m) => {
      stickToBottom.current = true;
      patchPages(qc, id, (pages) => {
        if (pages.some((p) => p.items.some((x) => x.id === m.id))) return pages;
        const [first, ...rest] = pages;
        return first ? [{ ...first, items: [...first.items, m] }, ...rest] : [{ items: [m], hasMore: false }];
      });
      void qc.invalidateQueries({ queryKey: qk.conversations });
    },
    onError: (e, body) => {
      setDraft((d) => d || body);
      toast.error(errorText(e));
    },
  });
  const remove = useMutation({
    mutationFn: (m: ConversationMessage) => conversationsApi.deleteMessage(m.id),
    onSuccess: (_, m) => {
      patchPages(qc, id, (pages) => pages.map((p) => ({ ...p, items: p.items.map((x) => (x.id === m.id ? { ...x, body: '', deleted: true } : x)) })));
      void qc.invalidateQueries({ queryKey: qk.conversations });
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const viewport = () => wrapRef.current?.querySelector<HTMLDivElement>('[data-slot=scroll-area-viewport]') ?? null;

  // Keep the reader's place when older messages are prepended; otherwise follow new messages if at the bottom.
  const firstId = messages[0]?.id;
  const lastId = messages[messages.length - 1]?.id;
  useLayoutEffect(() => {
    const el = viewport();
    if (!el) return;
    if (prevHeight.current !== null) {
      el.scrollTop = el.scrollHeight - prevHeight.current;
      prevHeight.current = null;
      return;
    }
    if (stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [firstId, lastId]);
  useEffect(() => {
    const el = viewport();
    if (!el) return;
    const onScroll = () => {
      stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [q.isPending]);

  const loadEarlier = () => {
    const el = viewport();
    prevHeight.current = el ? el.scrollHeight - el.scrollTop : null;
    void q.fetchNextPage();
  };

  const canPost = !conversation.closed && !(role === 'ADMIN' && conversation.type === 'DIRECT');
  const canDelete = (m: ConversationMessage) => {
    if (m.deleted || !user) return false;
    if (role === 'ADMIN') return true;
    if (conversation.closed) return false;
    if (m.sender.id === user.id) return true;
    return conversation.type === 'CLASS' && role === 'TEACHER';
  };

  const submit = () => {
    const body = draft.trim();
    if (!body || send.isPending || body.length > BODY_MAX) return;
    setDraft('');
    send.mutate(body);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const { title, sub } = titleOf(conversation);
  const remaining = BODY_MAX - draft.length;

  return (
    <section aria-label={t.comms.chat.thread} className={cn('flex min-h-0 min-w-0 flex-1 flex-col', className)}>
      {header && (
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          {onBack && (
            <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label={t.comms.chat.back} className="md:hidden">
              <ChevronLeft className="rtl:rotate-180" />
            </Button>
          )}
          <ConversationAvatar c={conversation} size={40} />
          <div className="flex min-w-0 flex-1 flex-col">
            <b className="truncate text-[15px]">
              <bdi>{title}</bdi>
            </b>
            <span className="truncate text-[13px] text-muted-foreground">
              {sub} · <bdi dir="ltr">{conversation.batch.code}</bdi>
            </span>
          </div>
          {conversation.closed && (
            <Chip tone="outline">
              <Lock className="size-3" aria-hidden /> {t.comms.chat.closed}
            </Chip>
          )}
        </header>
      )}

      <div ref={wrapRef} className="relative min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-1 px-4 py-4" role="log" aria-live="polite" aria-relevant="additions">
            {q.isPending ? (
              <ThreadSkeleton />
            ) : q.isError ? (
              <ErrorState error={q.error} onRetry={() => void q.refetch()} />
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <SignalMark state="starting" size={36} />
                <b className="font-display text-xl">{t.comms.chat.noMessages}</b>
                {canPost && <span className="text-sm text-muted-foreground">{t.comms.chat.noMessagesBody}</span>}
              </div>
            ) : (
              <>
                {q.hasNextPage && (
                  <Button variant="outline" size="sm" className="mb-3 self-center" disabled={q.isFetchingNextPage} onClick={loadEarlier}>
                    {q.isFetchingNextPage ? t.comms.chat.loadingEarlier : t.comms.chat.loadEarlier}
                  </Button>
                )}
                {messages.map((m, i) => {
                  const prev = messages[i - 1];
                  const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
                  const grouped = !newDay && prev && prev.sender.id === m.sender.id && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000;
                  return (
                    <Fragment key={m.id}>
                      {newDay && (
                        <div className="my-3 flex items-center gap-3" role="separator">
                          <span className="h-px flex-1 bg-border" />
                          <span className="label-mono text-muted-foreground">{dayLabel(m.createdAt)}</span>
                          <span className="h-px flex-1 bg-border" />
                        </div>
                      )}
                      <Bubble
                        m={m}
                        own={m.sender.id === user?.id}
                        grouped={!!grouped}
                        showSender={conversation.type === 'CLASS' || role === 'ADMIN'}
                        canDelete={canDelete(m)}
                        onDelete={() => setDeleting(m)}
                      />
                    </Fragment>
                  );
                })}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      <footer className="border-t border-border p-3">
        {canPost ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex flex-col gap-1.5"
          >
            <InputGroup>
              <InputGroupTextarea
                aria-label={t.comms.chat.placeholder}
                placeholder={conversation.type === 'CLASS' ? t.comms.chat.placeholderClass : t.comms.chat.placeholder}
                value={draft}
                rows={1}
                maxLength={BODY_MAX}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                className="max-h-40 min-h-12 py-3 [field-sizing:content]"
              />
              <InputGroupAddon align="inline-end" className="self-end pb-2">
                {remaining < 200 && <InputGroupText className={cn('tabular-nums', remaining < 0 && 'text-danger-fg')}>{f.number(remaining)}</InputGroupText>}
                <InputGroupButton
                  type="submit"
                  variant="default"
                  size="icon-sm"
                  className="rounded-full text-primary-foreground hover:text-primary-foreground"
                  disabled={!draft.trim() || send.isPending}
                  aria-label={send.isPending ? t.comms.chat.sending : t.comms.chat.send}
                >
                  <SendHorizontal className="rtl:-scale-x-100" />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <span className="hidden px-1 text-[12px] text-muted-foreground sm:block">{t.comms.chat.composerHint}</span>
          </form>
        ) : (
          <p className="flex items-center gap-2 rounded-[14px] bg-muted px-4 py-3 text-sm text-muted-foreground">
            <Lock className="size-4 shrink-0" aria-hidden />
            {conversation.closed ? t.comms.chat.closedNote : t.comms.errors.DM_NOT_ALLOWED}
          </p>
        )}
      </footer>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.comms.chat.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.comms.chat.deleteBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) remove.mutate(deleting);
                setDeleting(null);
              }}
            >
              {t.comms.chat.deleteMessage}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <span className="sr-only" aria-live="polite">
        {fill(t.common.showing, { n: messages.length, total: messages.length })}
      </span>
    </section>
  );
}

/** One message. Own messages sit on the end side (right in LTR, left in RTL) — flex `justify-end` mirrors with `dir`. */
function Bubble({
  m,
  own,
  grouped,
  showSender,
  canDelete,
  onDelete,
}: {
  m: ConversationMessage;
  own: boolean;
  grouped: boolean;
  showSender: boolean;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const { t, f } = useI18n();
  const roleTag = m.sender.role === 'TEACHER' ? t.comms.chat.teacher : m.sender.role === 'ADMIN' ? t.comms.chat.admin : null;
  return (
    <div className={cn('group/msg flex items-end gap-2', own ? 'justify-end' : 'justify-start', grouped ? 'mt-0.5' : 'mt-2.5')}>
      {!own && <span className="w-8 shrink-0">{!grouped && <InitialsAvatar name={m.sender.name} src={m.sender.image} size={32} />}</span>}
      <div className={cn('flex max-w-[min(78%,560px)] flex-col gap-1', own ? 'items-end' : 'items-start')}>
        {!own && !grouped && showSender && (
          <span className="flex items-center gap-1.5 px-1 text-[12px] font-semibold text-muted-foreground">
            <bdi>{m.sender.name}</bdi>
            {roleTag && <span className="rounded-full bg-green/20 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-sun-fg">{roleTag}</span>}
          </span>
        )}
        <div className={cn('flex items-center gap-1', own && 'flex-row-reverse')}>
          <div
            className={cn(
              'rounded-[18px] px-3.5 py-2 text-[15px] leading-relaxed break-words whitespace-pre-wrap',
              m.deleted
                ? 'border border-dashed border-border bg-transparent text-muted-foreground italic'
                : own
                  ? 'rounded-ee-md bg-primary text-primary-foreground'
                  : 'rounded-es-md bg-secondary text-secondary-foreground',
            )}
          >
            {m.deleted ? t.comms.chat.deleted : <bdi>{m.body}</bdi>}
            <time dateTime={m.createdAt} className={cn('ms-2 inline-block align-bottom text-[11px] tabular-nums', own && !m.deleted ? 'opacity-70' : 'text-muted-foreground')}>
              {f.time(m.createdAt)}
            </time>
          </div>
          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t.comms.chat.messageActions}
                  className="opacity-0 transition-opacity group-hover/msg:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 pointer-coarse:opacity-100"
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={own ? 'end' : 'start'}>
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <Trash2 /> {t.comms.chat.deleteMessage}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}

function ThreadSkeleton() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3" role="status">
      <span className="sr-only">{t.common.loading}</span>
      {[60, 40, 72, 35, 55].map((w, i) => (
        <div key={i} className={cn('flex', i % 2 ? 'justify-end' : 'justify-start')}>
          <Skeleton className="h-10 rounded-[18px] bg-muted" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}

function ConversationAvatar({ c, size = 40 }: { c: Conversation; size?: number }) {
  if (c.type === 'DIRECT' && c.counterpart) return <InitialsAvatar name={c.counterpart.name} src={c.counterpart.image} size={size} />;
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-green text-ink-deep" style={{ width: size, height: size }} aria-hidden>
      <Users className="size-[45%]" />
    </span>
  );
}

// ───────── class chat (class page / studio) ─────────

/** The class chat of a batch, embedded in a panel. */
export function ClassChat({ batchId, className }: { batchId: string; className?: string }) {
  const q = useQuery({ queryKey: qk.classConversation(batchId), queryFn: () => conversationsApi.forBatch(batchId), retry: false });
  return (
    <div className={cn('flex h-[min(680px,75dvh)] min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-card', className)}>
      {q.isPending ? (
        <div className="p-4">
          <ThreadSkeleton />
        </div>
      ) : q.isError ? (
        <div className="p-4">
          <ClassChatError error={q.error} onRetry={() => void q.refetch()} />
        </div>
      ) : (
        <ChatThread conversation={q.data} />
      )}
    </div>
  );
}

function ClassChatError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const errorText = useCommsError();
  const { t } = useI18n();
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-[14px] border border-danger-line bg-danger-bg p-4 text-sm text-danger-fg">
      {errorText(error)}
      <Button variant="destructive" size="sm" onClick={onRetry}>
        {t.common.retry}
      </Button>
    </div>
  );
}

/** Studio: the private chats students opened with the teacher in this class. */
export function BatchPrivateChats({ batchId }: { batchId: string }) {
  const { t, f } = useI18n();
  const q = useConversations();
  const list = (q.data?.items ?? []).filter((c) => c.type === 'DIRECT' && c.batch.id === batchId);
  return (
    <Panel aria-labelledby={`dm-${batchId}`} className="gap-3 p-5">
      <SectionHeader size="sm" title={<span id={`dm-${batchId}`}>{t.comms.chat.privateTitle}</span>} href="/messages" linkLabel={t.comms.chat.openInbox} />
      {q.isPending ? (
        <div className="flex flex-col gap-2" role="status">
          <Skeleton className="h-14 rounded-[14px] bg-muted" />
          <Skeleton className="h-14 rounded-[14px] bg-muted" />
        </div>
      ) : q.isError ? (
        <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.comms.chat.privateEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={messagesHref(c.id)} className="flex items-center gap-3 rounded-[14px] p-2.5 text-foreground no-underline hover:bg-accent">
                <ConversationAvatar c={c} size={36} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="truncate text-sm">
                    <bdi>{c.counterpart?.name}</bdi>
                  </b>
                  <span className="truncate text-[13px] text-muted-foreground">{c.lastMessage ? <bdi>{c.lastMessage.body || t.comms.chat.deleted}</bdi> : t.comms.chat.noMessages}</span>
                </span>
                {c.unread > 0 && <Badge className="rounded-full bg-green text-ink-deep tabular-nums">{f.number(c.unread)}</Badge>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Student: opens (or creates) the private chat with the class teacher and goes to it. */
export function MessageTeacherButton({ batchId, size = 'sm', variant = 'outline', className }: { batchId: string; size?: 'sm' | 'default'; variant?: 'outline' | 'default' | 'ghost'; className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const errorText = useCommsError();
  const open = useMutation({
    mutationFn: () => conversationsApi.openDirect(batchId),
    onSuccess: (c) => {
      void qc.invalidateQueries({ queryKey: qk.conversations });
      router.push(messagesHref(c.id));
    },
    onError: (e) => toast.error(errorText(e)),
  });
  return (
    <Button size={size} variant={variant} className={className} disabled={open.isPending} onClick={() => open.mutate()}>
      <MessageCircle aria-hidden /> {open.isPending ? t.comms.chat.opening : t.comms.chat.messageTeacher}
    </Button>
  );
}

// ───────── inbox ─────────

/** `/messages`: the list on the start side, the thread on the other; stacks on narrow screens. `?c=` selects. */
export function MessagesInbox() {
  const { t, f, pick } = useI18n();
  const { role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedId = params.get('c');
  const q = useConversations();
  const [filter, setFilter] = useState('');
  const titleOf = useConversationTitle();

  const all = q.data?.items ?? [];
  const needle = filter.trim().toLowerCase();
  const list = needle
    ? all.filter((c) => [titleOf(c).title, c.batch.code, pick(c.batch.courseTitle, c.batch.courseTitleAr).text].some((s) => s.toLowerCase().includes(needle)))
    : all;
  const selected = all.find((c) => c.id === selectedId) ?? null;

  const select = (id: string | null) => router.replace(id ? `${pathname}?c=${encodeURIComponent(id)}` : pathname, { scroll: false });

  if (role === 'ADMIN') {
    return (
      <>
        <PageTitle kicker={t.comms.chat.kicker} title={t.comms.chat.messages} />
        <EmptyState title={t.comms.chat.empty} body={t.comms.chat.emptyAdmin} action={{ label: t.nav.admin.batches, href: '/admin/batches' }} />
      </>
    );
  }

  return (
    <>
      <PageTitle kicker={t.comms.chat.kicker} title={t.comms.chat.messages} />
      <div className="flex h-[calc(100dvh-14rem)] min-h-[520px] overflow-hidden rounded-xl border border-border bg-card">
        <aside className={cn('flex w-full min-w-0 flex-col border-border md:w-80 md:shrink-0 md:border-e lg:w-96', selected && 'hidden md:flex')} aria-label={t.comms.chat.messages}>
          <div className="border-b border-border p-3">
            <InputGroup className="h-11">
              <InputGroupAddon>
                <Search aria-hidden />
              </InputGroupAddon>
              <InputGroupInput type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t.comms.chat.search} aria-label={t.comms.chat.search} />
            </InputGroup>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {q.isPending ? (
              <div className="flex flex-col gap-1 p-2" role="status">
                <span className="sr-only">{t.common.loading}</span>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5">
                    <Skeleton className="size-11 shrink-0 rounded-full bg-muted" />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Skeleton className="h-3.5 w-2/3 bg-muted" />
                      <Skeleton className="h-3 w-full bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : q.isError ? (
              <div className="p-3">
                <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />
              </div>
            ) : all.length === 0 ? (
              <div className="p-3">
                <EmptyState
                  title={t.comms.chat.empty}
                  body={role === 'TEACHER' ? t.comms.chat.emptyTeacher : t.comms.chat.emptyBody}
                  action={role === 'STUDENT' ? { label: t.learn.browse, href: '/#catalog' } : undefined}
                  className="border-0"
                />
              </div>
            ) : list.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">{t.comms.chat.noMatch}</p>
            ) : (
              <ul className="flex flex-col gap-0.5 p-2">
                {list.map((c) => {
                  const { title, sub } = titleOf(c);
                  const active = c.id === selectedId;
                  const when = c.lastMessage?.createdAt ?? c.lastMessageAt;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => select(c.id)}
                        aria-current={active ? 'true' : undefined}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-[14px] p-2.5 text-start transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                          active ? 'bg-accent' : 'hover:bg-accent/60',
                        )}
                      >
                        <ConversationAvatar c={c} size={44} />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex items-baseline gap-2">
                            <b className={cn('min-w-0 flex-1 truncate text-[15px]', c.unread > 0 ? 'text-foreground' : 'font-semibold')}>
                              <bdi>{title}</bdi>
                            </b>
                            {when && <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{shortWhen(when, f)}</span>}
                          </span>
                          <span className="truncate text-[12px] text-muted-foreground">
                            {sub} · <bdi dir="ltr">{c.batch.code}</bdi>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className={cn('min-w-0 flex-1 truncate text-[13px]', c.unread > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                              {c.lastMessage ? (
                                <>
                                  {c.type === 'CLASS' && <bdi>{c.lastMessage.senderName}: </bdi>}
                                  <bdi>{c.lastMessage.body || t.comms.chat.deleted}</bdi>
                                </>
                              ) : (
                                t.comms.chat.noMessages
                              )}
                            </span>
                            {c.closed && <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label={t.comms.chat.closed} />}
                            {c.unread > 0 && (
                              <Badge className="h-5 min-w-5 justify-center rounded-full bg-green px-1.5 text-ink-deep tabular-nums" aria-label={f.plural(c.unread, t.comms.chat.unread)}>
                                {f.number(c.unread)}
                              </Badge>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </aside>
        <div className={cn('min-w-0 flex-1 flex-col', selected ? 'flex' : 'hidden md:flex')}>
          {selected ? (
            <ChatThread key={selected.id} conversation={selected} onBack={() => select(null)} />
          ) : selectedId && (q.isPending || q.isFetching) ? (
            <div className="p-4">
              <ThreadSkeleton />
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <SignalMark state="ended" size={40} />
              <b className="font-display text-2xl">{t.comms.chat.selectTitle}</b>
              <span className="max-w-xs text-sm text-muted-foreground">{t.comms.chat.selectBody}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function shortWhen(iso: string, f: ReturnType<typeof useI18n>['f']) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? f.time(d) : f.dayMonth(d);
}

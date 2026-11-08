'use client';

import { ContactDetails } from '@/components/brand/contact-details';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SUPPORT_CATEGORIES, SUPPORT_STATUSES, type SupportCategory, type SupportStatus } from '@azza/shared';
import { CheckCircle2, ChevronLeft, LifeBuoy, Plus, Receipt, SendHorizontal, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip, OrderStatusChip, type ChipTone } from '@/components/brand/status-chip';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { PageTitle, Panel } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { Price } from '@/components/brand/price';
import { adminApi, meApi, supportApi, type SupportTicket, type SupportTicketItem, type SupportTicketsParams } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useAuth } from '@/lib/auth/use-auth';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { useEnrollments } from '../learn/hooks';
import { useCommsError } from './errors';
import { classHref } from './links';

const SUBJECT_MAX = 140;
const BODY_MAX = 4000;
const NONE = '__none';
const PAGE_SIZE = 20;

const STATUS_TONE: Record<SupportStatus, ChipTone> = { OPEN: 'sun', AWAITING_USER: 'sky', RESOLVED: 'outline' };

export function TicketStatusChip({ status, staff }: { status: SupportStatus; staff?: boolean }) {
  const { t } = useI18n();
  return <Chip tone={STATUS_TONE[status]}>{staff ? t.comms.support.status[status] : t.comms.support.statusUser[status]}</Chip>;
}

function useRefreshTickets() {
  const qc = useQueryClient();
  return (ticket?: SupportTicket) => {
    void qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
    if (ticket) qc.setQueryData(qk.ticket(ticket.id), ticket);
  };
}

// ───────── user: /support ─────────

/** `/support`: my tickets plus "New ticket". `?new=1&order=<id>` opens the form prefilled. */
export function SupportHome({ openNew, orderId, batchId }: { openNew?: boolean; orderId?: string; batchId?: string }) {
  const { t, f, fill } = useI18n();
  const { role } = useAuth();
  const [open, setOpen] = useState(!!openNew || !!orderId || !!batchId);
  const [page, setPage] = useState(1);
  const params: SupportTicketsParams = { page, pageSize: PAGE_SIZE };
  const q = useQuery({ queryKey: qk.tickets({ mine: true, ...params }), queryFn: () => supportApi.list(params) });
  const pages = q.data ? Math.max(1, Math.ceil(q.data.total / q.data.pageSize)) : 1;
  return (
    <>
      <PageTitle
        kicker={t.comms.support.kicker}
        title={t.comms.support.title}
        aside={
          <Button onClick={() => setOpen(true)}>
            <Plus aria-hidden /> {t.comms.support.newTicket}
          </Button>
        }
      />
      <p className="max-w-2xl text-muted-foreground">{t.comms.support.intro}</p>
      <ContactDetails className="max-w-md" />
      {role === 'ADMIN' && (
        <Link href="/admin/support" className="link-sun self-start text-sm">
          {t.comms.support.adminInbox}
        </Link>
      )}
      <section aria-labelledby="my-tickets" className="flex max-w-3xl flex-col gap-3">
        <h2 id="my-tickets" className="font-display text-2xl font-extrabold">
          {t.comms.support.myTickets}
        </h2>
        {q.isPending ? (
          <LoadingBlock rows={3} height={76} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : q.data.items.length === 0 ? (
          <EmptyState title={t.comms.support.empty} body={t.comms.support.emptyBody} action={{ label: t.comms.support.newTicket, onClick: () => setOpen(true) }} />
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {q.data.items.map((tk) => (
                <li key={tk.id}>
                  <Link
                    href={`/support/${tk.id}`}
                    className="flex flex-wrap items-center gap-3 rounded-[14px] border border-border bg-card p-4 text-foreground no-underline transition-colors hover:border-green-deep hover:bg-accent"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-center gap-2">
                        {tk.unreadForMe && <span className="size-2 shrink-0 rounded-full bg-onair" aria-label={t.comms.support.newReply} />}
                        <b className="truncate text-[15px]">{tk.subject}</b>
                      </span>
                      <span className="text-[13px] text-muted-foreground">
                        {t.comms.support.categories[tk.category]} · {fill(t.comms.support.lastActivity, { d: f.dateTime(tk.lastMessageAt) })}
                      </span>
                    </span>
                    <TicketStatusChip status={tk.status} />
                  </Link>
                </li>
              ))}
            </ul>
            <Pager page={page} pages={pages} onPage={setPage} />
          </>
        )}
      </section>
      <NewTicketDialog open={open} onOpenChange={setOpen} orderId={orderId} batchId={batchId} />
    </>
  );
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  const { t, f, fill } = useI18n();
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {t.comms.support.admin.prev}
      </Button>
      <span>{fill(t.common.pageOf, { page: f.number(page), count: f.number(pages) })}</span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {t.comms.support.admin.next}
      </Button>
    </div>
  );
}

/** The new-ticket form: subject, topic, an optional order or class, and the message. */
export function NewTicketDialog({ open, onOpenChange, orderId, batchId }: { open: boolean; onOpenChange: (o: boolean) => void; orderId?: string; batchId?: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">{open && <NewTicketForm orderId={orderId} batchId={batchId} onCancel={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function NewTicketForm({ orderId, batchId, onCancel }: { orderId?: string; batchId?: string; onCancel: () => void }) {
  const { t, f, fill, pick } = useI18n();
  const router = useRouter();
  const { role } = useAuth();
  const errorText = useCommsError();
  const refresh = useRefreshTickets();
  const isStudent = role === 'STUDENT';
  const orders = useQuery({ queryKey: qk.myOrders, queryFn: meApi.orders, enabled: isStudent, retry: false });
  const enrollments = useEnrollments();
  const prefilled = orders.data?.find((o) => o.id === orderId);
  const [subject, setSubject] = useState<string | null>(null);
  const [category, setCategory] = useState<SupportCategory>(orderId ? 'PAYMENT' : batchId ? 'CLASS' : 'OTHER');
  const [order, setOrder] = useState(orderId ?? NONE);
  const [klass, setKlass] = useState(batchId ?? NONE);
  const [body, setBody] = useState('');
  // Until the user types, an order link suggests "Order <ref>" as the subject.
  const subjectValue = subject ?? (prefilled ? fill(t.comms.support.orderSubject, { ref: prefilled.reference }) : '');
  const ready = !!subjectValue.trim() && !!body.trim();

  const create = useMutation({
    mutationFn: () =>
      supportApi.open({
        subject: subjectValue.trim(),
        category,
        body: body.trim(),
        orderId: order !== NONE ? order : undefined,
        batchId: klass !== NONE ? klass : undefined,
      }),
    onSuccess: (ticket) => {
      toast.success(t.comms.support.created);
      refresh(ticket);
      router.push(`/support/${ticket.id}`);
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (ready && !create.isPending) create.mutate();
  };

  const classes = isStudent ? (enrollments.data ?? []).filter((e) => e.status !== 'WAITLISTED') : [];

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>{t.comms.support.newTitle}</DialogTitle>
        <DialogDescription>{t.comms.support.newBody}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tk-subject">{t.comms.support.subject}</Label>
        <InputGroup>
          <InputGroupInput id="tk-subject" required maxLength={SUBJECT_MAX} value={subjectValue} placeholder={t.comms.support.subjectPlaceholder} onChange={(e) => setSubject(e.target.value)} />
          <InputGroupAddon align="inline-end">
            <InputGroupText className="tabular-nums">
              {f.number(subjectValue.length)}/{f.number(SUBJECT_MAX)}
            </InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tk-category">{t.comms.support.category}</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as SupportCategory)}>
          <SelectTrigger id="tk-category" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {t.comms.support.categories[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isStudent && (
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">{t.comms.support.linkHint}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tk-order">
                {t.comms.support.order} <span className="font-normal text-muted-foreground">({t.common.optional})</span>
              </Label>
              <Select value={order} onValueChange={setOrder}>
                <SelectTrigger id="tk-order" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t.comms.support.orderNone}</SelectItem>
                  {(orders.data ?? []).map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      <bdi dir="ltr">{o.reference}</bdi> · {f.dayMonth(o.createdAt)}
                    </SelectItem>
                  ))}
                  {orderId && !orders.data?.some((o) => o.id === orderId) && (
                    <SelectItem value={orderId}>
                      <bdi dir="ltr">{orderId.slice(0, 8)}</bdi>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tk-class">
                {t.comms.support.klass} <span className="font-normal text-muted-foreground">({t.common.optional})</span>
              </Label>
              <Select value={klass} onValueChange={setKlass}>
                <SelectTrigger id="tk-class" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t.comms.support.classNone}</SelectItem>
                  {classes.map((e) => (
                    <SelectItem key={e.batchId} value={e.batchId}>
                      <bdi dir="ltr">{e.batch.code}</bdi> · {pick(e.batch.course.titleEn, e.batch.course.titleAr).text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <span className="text-[13px] text-muted-foreground">{t.comms.support.linkHint}</span>
        </fieldset>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tk-body">{t.comms.support.message}</Label>
        <InputGroup>
          <InputGroupTextarea id="tk-body" required rows={6} maxLength={BODY_MAX} value={body} placeholder={t.comms.support.messagePlaceholder} onChange={(e) => setBody(e.target.value)} />
          <InputGroupAddon align="block-end" className="justify-end">
            <InputGroupText className="tabular-nums">
              {f.number(body.length)}/{f.number(BODY_MAX)}
            </InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t.common.cancel}
        </Button>
        <Button type="submit" disabled={!ready || create.isPending}>
          {create.isPending ? t.comms.support.sending : t.comms.support.send}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ───────── thread (user + admin) ─────────

function useTicket(id: string) {
  return useQuery({ queryKey: qk.ticket(id), queryFn: () => supportApi.get(id), refetchInterval: 60_000 });
}

/** The messages of a ticket plus the reply box. Staff messages are "Azza team". */
function TicketMessages({ ticket, staffView }: { ticket: SupportTicket; staffView: boolean }) {
  const { t, f } = useI18n();
  const errorText = useCommsError();
  const refresh = useRefreshTickets();
  const [draft, setDraft] = useState('');
  const reply = useMutation({
    mutationFn: (body: string) => supportApi.reply(ticket.id, body),
    onSuccess: (tk) => {
      setDraft('');
      toast.success(t.comms.support.replySent);
      refresh(tk);
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const submit = () => {
    const body = draft.trim();
    if (body && !reply.isPending) reply.mutate(body);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-3" aria-live="polite">
        {ticket.messages.map((m) => {
          // "Own side" is staff for admins, the owner otherwise; own side sits on the end.
          const own = staffView ? m.fromStaff : !m.fromStaff;
          const name = m.fromStaff && !staffView ? t.comms.support.team : (m.author?.name ?? t.comms.support.team);
          return (
            <li key={m.id} className={cn('flex gap-3', own && 'flex-row-reverse')}>
              {m.fromStaff && !staffView ? (
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-green text-ink-deep" aria-hidden>
                  <LifeBuoy className="size-4" />
                </span>
              ) : (
                <InitialsAvatar name={name} src={m.author?.image} size={36} />
              )}
              <div className={cn('flex max-w-[min(85%,640px)] flex-col gap-1', own && 'items-end')}>
                <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <b className="text-foreground">
                    <bdi>{name}</bdi>
                  </b>
                  {staffView && m.fromStaff && <span>· {t.comms.support.team}</span>}
                  <time dateTime={m.createdAt}>{f.dateTime(m.createdAt)}</time>
                </span>
                <div
                  className={cn(
                    'rounded-[18px] px-4 py-3 text-[15px] leading-relaxed break-words whitespace-pre-wrap',
                    own ? 'rounded-se-md bg-primary text-primary-foreground' : 'rounded-ss-md border border-border bg-secondary text-secondary-foreground',
                  )}
                >
                  <bdi>{m.body}</bdi>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {ticket.status === 'RESOLVED' && !staffView && <p className="rounded-[14px] bg-muted px-4 py-3 text-sm text-muted-foreground">{t.comms.support.resolvedNote}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Label htmlFor={`reply-${ticket.id}`} className="sr-only">
          {t.comms.support.reply}
        </Label>
        <InputGroup>
          <InputGroupTextarea
            id={`reply-${ticket.id}`}
            rows={3}
            maxLength={BODY_MAX}
            value={draft}
            placeholder={t.comms.support.replyPlaceholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            className="min-h-24"
          />
          <InputGroupAddon align="block-end" className="justify-between border-t border-border">
            <InputGroupText className="tabular-nums">
              {f.number(draft.length)}/{f.number(BODY_MAX)}
            </InputGroupText>
            <InputGroupButton type="submit" variant="default" size="sm" className="rounded-full text-primary-foreground hover:text-primary-foreground" disabled={!draft.trim() || reply.isPending}>
              <SendHorizontal className="rtl:-scale-x-100" aria-hidden /> {reply.isPending ? t.comms.support.sending : t.comms.support.reply}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </div>
  );
}

function LinkedItems({ ticket, staffView }: { ticket: SupportTicket; staffView: boolean }) {
  const { t, fill, pick } = useI18n();
  const { role } = useAuth();
  if (!ticket.order && !ticket.batch) return null;
  return (
    <div className="flex flex-col gap-2">
      {ticket.order && (
        <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-border p-3 text-sm">
          <Receipt className="size-4 text-muted-foreground" aria-hidden />
          {staffView ? (
            <b dir="ltr">{ticket.order.reference}</b>
          ) : (
            <Link href={`/orders/${ticket.order.id}`} className="link-sun">
              {fill(t.comms.support.linkedOrder, { ref: ticket.order.reference })}
            </Link>
          )}
          <OrderStatusChip status={ticket.order.status} />
          <span className="ms-auto">
            <Price fils={ticket.order.totalFils} />
          </span>
        </div>
      )}
      {ticket.batch && (
        <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-border p-3 text-sm">
          <Users className="size-4 text-muted-foreground" aria-hidden />
          <Link href={classHref(role, ticket.batch.id)} className="link-sun">
            {fill(t.comms.support.linkedClass, { code: ticket.batch.code })}
          </Link>
          <span className="text-muted-foreground">{pick(ticket.batch.courseTitle, ticket.batch.courseTitleAr).text}</span>
        </div>
      )}
    </div>
  );
}

function TicketSkeleton() {
  return (
    <div className="flex max-w-3xl flex-col gap-4" role="status">
      <Skeleton className="h-10 w-2/3 bg-muted" />
      <Skeleton className="h-24 rounded-[18px] bg-muted" />
      <Skeleton className="ms-auto h-20 w-3/4 rounded-[18px] bg-muted" />
    </div>
  );
}

/** `/support/<id>`: the owner's view of a ticket. */
export function TicketView({ id }: { id: string }) {
  const { t, f, fill } = useI18n();
  const errorText = useCommsError();
  const refresh = useRefreshTickets();
  const q = useTicket(id);
  const resolve = useMutation({
    mutationFn: () => supportApi.update(id, { status: 'RESOLVED' }),
    onSuccess: (tk) => {
      toast.success(t.comms.support.resolvedToast);
      refresh(tk);
    },
    onError: (e) => toast.error(errorText(e)),
  });
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/support">
          <ChevronLeft className="rtl:rotate-180" aria-hidden /> {t.comms.support.back}
        </Link>
      </Button>
      {q.isPending ? (
        <TicketSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <TicketStatusChip status={q.data.status} />
                <Chip tone="outline">{t.comms.support.categories[q.data.category]}</Chip>
              </div>
              <h1 className="font-display text-[clamp(28px,4vw,44px)] font-extrabold leading-[0.95]">{q.data.subject}</h1>
              <span className="text-sm text-muted-foreground">{fill(t.comms.support.openedOn, { d: f.dateTime(q.data.createdAt) })}</span>
            </div>
            {q.data.status !== 'RESOLVED' && (
              <Button variant="outline" disabled={resolve.isPending} onClick={() => resolve.mutate()}>
                <CheckCircle2 aria-hidden /> {t.comms.support.markResolved}
              </Button>
            )}
          </header>
          <LinkedItems ticket={q.data} staffView={false} />
          <Panel>
            <TicketMessages ticket={q.data} staffView={false} />
          </Panel>
        </>
      )}
    </div>
  );
}

// ───────── admin ─────────

type StatusFilter = SupportStatus | 'ALL';

/** Open tickets, for the admin nav badge. Shares the inbox cache. */
export function useOpenTicketCount(enabled = true) {
  const params: SupportTicketsParams = { status: 'OPEN', page: 1, pageSize: 1 };
  const q = useQuery({ queryKey: qk.tickets(params), queryFn: () => supportApi.list(params), enabled, refetchInterval: 60_000, retry: false });
  return q.data?.total ?? 0;
}

/** `/admin/support`: filters (status, topic) and the ticket list. */
export function AdminSupportInbox() {
  const { t, f } = useI18n();
  const [status, setStatus] = useState<StatusFilter>('OPEN');
  const [category, setCategory] = useState<SupportCategory | typeof NONE>(NONE);
  const [page, setPage] = useState(1);
  const params: SupportTicketsParams = { status: status === 'ALL' ? undefined : status, category: category === NONE ? undefined : category, page, pageSize: PAGE_SIZE };
  const q = useQuery({ queryKey: qk.tickets(params), queryFn: () => supportApi.list(params), refetchInterval: 60_000 });
  const pages = q.data ? Math.max(1, Math.ceil(q.data.total / q.data.pageSize)) : 1;
  return (
    <>
      <PageTitle kicker={t.comms.support.admin.kicker} title={t.comms.support.admin.title} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={status}
          onValueChange={(v) => {
            setStatus(v as StatusFilter);
            setPage(1);
          }}
        >
          <TabsList>
            {SUPPORT_STATUSES.map((s) => (
              <TabsTrigger key={s} value={s}>
                {t.comms.support.status[s]}
              </TabsTrigger>
            ))}
            <TabsTrigger value="ALL">{t.comms.support.admin.all}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v as SupportCategory | typeof NONE);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-56" aria-label={t.comms.support.category}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t.comms.support.admin.anyCategory}</SelectItem>
            {SUPPORT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {t.comms.support.categories[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {q.isPending ? (
        <LoadingBlock rows={5} height={72} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.items.length === 0 ? (
        <EmptyState title={t.comms.support.admin.empty} body={t.comms.support.admin.emptyBody} />
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {q.data.items.map((tk) => (
              <AdminTicketRow key={tk.id} tk={tk} />
            ))}
          </ul>
          <Pager page={page} pages={pages} onPage={setPage} />
          <span className="sr-only">{f.number(q.data.total)}</span>
        </div>
      )}
    </>
  );
}

function AdminTicketRow({ tk }: { tk: SupportTicketItem }) {
  const { t, f, fill } = useI18n();
  const { user } = useAuth();
  return (
    <li>
      <Link
        href={`/admin/support/${tk.id}`}
        className="grid grid-cols-1 items-center gap-3 rounded-[14px] border border-border bg-card p-4 text-foreground no-underline transition-colors hover:border-green-deep hover:bg-accent md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_auto_auto]"
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className="flex items-center gap-2">
            {tk.unreadForMe && (
              <Badge className="rounded-full bg-onair text-onair-ink" aria-label={t.comms.support.admin.needsReply}>
                {t.comms.support.admin.needsReply}
              </Badge>
            )}
            <b className="truncate text-[15px]">{tk.subject}</b>
          </span>
          <span className="text-[13px] text-muted-foreground">{t.comms.support.categories[tk.category]}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <InitialsAvatar name={tk.user.name} size={28} />
          <span className="flex min-w-0 flex-col">
            <bdi className="truncate text-sm font-semibold">{tk.user.name}</bdi>
            <bdi className="truncate text-[12px] text-muted-foreground">{tk.user.email}</bdi>
          </span>
        </span>
        <span className="flex items-center gap-2">
          <TicketStatusChip status={tk.status} staff />
          {tk.assigneeId && tk.assigneeId === user?.id && <Chip tone="outline">{t.comms.support.admin.assignedToMe}</Chip>}
        </span>
        <span className="text-[13px] text-muted-foreground tabular-nums md:text-end">{fill(t.comms.support.lastActivity, { d: f.dateTime(tk.lastMessageAt) })}</span>
      </Link>
    </li>
  );
}

/** `/admin/support/<id>`: thread, reply, status, assignee and the linked order / class. */
export function AdminTicketView({ id }: { id: string }) {
  const { t, f, fill } = useI18n();
  const errorText = useCommsError();
  const refresh = useRefreshTickets();
  const q = useTicket(id);
  const admins = useQuery({ queryKey: qk.admin.admins, queryFn: () => adminApi.users({ role: 'ADMIN', pageSize: 100 }), retry: false });
  const update = useMutation({
    mutationFn: (input: { status?: SupportStatus; assigneeId?: string | null }) => supportApi.update(id, input),
    onSuccess: (tk) => {
      toast.success(t.comms.support.admin.updated);
      refresh(tk);
    },
    onError: (e) => toast.error(errorText(e)),
  });
  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/admin/support">
          <ChevronLeft className="rtl:rotate-180" aria-hidden /> {t.comms.support.back}
        </Link>
      </Button>
      {q.isPending ? (
        <TicketSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-5">
            <header className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <TicketStatusChip status={q.data.status} staff />
                <Chip tone="outline">{t.comms.support.categories[q.data.category]}</Chip>
              </div>
              <h1 className="font-display text-[clamp(28px,4vw,44px)] font-extrabold leading-[0.95]">{q.data.subject}</h1>
              <span className="text-sm text-muted-foreground">{fill(t.comms.support.openedOn, { d: f.dateTime(q.data.createdAt) })}</span>
            </header>
            <Panel>
              <TicketMessages ticket={q.data} staffView />
            </Panel>
          </div>
          <Panel as="div" className="gap-5 lg:sticky lg:top-6">
            <h2 className="label-mono text-muted-foreground">{t.comms.support.admin.details}</h2>
            {q.data.user && (
              <div className="flex items-center gap-3">
                <InitialsAvatar name={q.data.user.name} size={40} />
                <div className="flex min-w-0 flex-col">
                  <bdi className="truncate font-semibold">{q.data.user.name}</bdi>
                  <a href={`mailto:${q.data.user.email}`} className="link-sun truncate text-sm">
                    <bdi>{q.data.user.email}</bdi>
                  </a>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tk-status">{t.comms.support.admin.changeStatus}</Label>
              <Select value={q.data.status} disabled={update.isPending} onValueChange={(v) => update.mutate({ status: v as SupportStatus })}>
                <SelectTrigger id="tk-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t.comms.support.status[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tk-assignee">{t.comms.support.admin.assignee}</Label>
              <Select
                value={q.data.assigneeId ?? NONE}
                disabled={update.isPending || admins.isPending}
                onValueChange={(v) => update.mutate({ assigneeId: v === NONE ? null : v })}
              >
                <SelectTrigger id="tk-assignee" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t.comms.support.admin.unassigned}</SelectItem>
                  {(admins.data?.items ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <bdi>{a.name}</bdi>
                    </SelectItem>
                  ))}
                  {q.data.assigneeId && !admins.data?.items.some((a) => a.id === q.data.assigneeId) && (
                    <SelectItem value={q.data.assigneeId}>{q.data.assigneeId.slice(0, 8)}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <LinkedItems ticket={q.data} staffView />
          </Panel>
        </div>
      )}
    </div>
  );
}

/** Small "Problem with this order?" link for the order page. */
export function OrderHelpLink({ orderId }: { orderId: string }) {
  const { t } = useI18n();
  return (
    <Link href={`/support?new=1&order=${encodeURIComponent(orderId)}`} className="link-sun inline-flex items-center gap-1.5 self-start text-sm">
      <LifeBuoy className="size-4" aria-hidden /> {t.comms.support.problemWithOrder}
    </Link>
  );
}


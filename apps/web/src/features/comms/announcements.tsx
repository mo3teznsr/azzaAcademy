'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ANNOUNCEMENT_AUDIENCES, type AnnouncementAudience } from '@azza/shared';
import { Megaphone, MoreHorizontal, Pencil, Pin, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText, InputGroupTextarea } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Chip } from '@/components/brand/status-chip';
import { Markdown } from '@/components/brand/markdown';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { announcementsApi, type Announcement, type AnnouncementPage } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useAuth } from '@/lib/auth/use-auth';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { useCommsError } from './errors';
import { classHref } from './links';

const TITLE_MAX = 120;
const BODY_MAX = 4000;
const COLLAPSE_AT = 420;

function useRefreshAnnouncements() {
  const qc = useQueryClient();
  return (batchId?: string | null) => {
    void qc.invalidateQueries({ queryKey: ['me', 'announcements'] });
    if (batchId) void qc.invalidateQueries({ queryKey: qk.batchAnnouncements(batchId) });
  };
}

// ───────── form ─────────

interface FormValues {
  title: string;
  body: string;
  pinned: boolean;
  notify: boolean;
  audience: AnnouncementAudience;
}

const blank: FormValues = { title: '', body: '', pinned: false, notify: true, audience: 'ALL' };

/** Title, markdown body, pin, notify (new only) and audience (platform only). Every text field is an input group. */
function AnnouncementFields({ id, values, onChange, platform, isNew }: { id: string; values: FormValues; onChange: (v: FormValues) => void; platform: boolean; isNew: boolean }) {
  const { t, f } = useI18n();
  const set = <K extends keyof FormValues>(k: K, v: FormValues[K]) => onChange({ ...values, [k]: v });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-title`}>{t.comms.announcements.fieldTitle}</Label>
        <InputGroup>
          <InputGroupInput
            id={`${id}-title`}
            required
            maxLength={TITLE_MAX}
            value={values.title}
            placeholder={t.comms.announcements.fieldTitlePlaceholder}
            onChange={(e) => set('title', e.target.value)}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText className="tabular-nums">
              {f.number(values.title.length)}/{f.number(TITLE_MAX)}
            </InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-body`}>{t.comms.announcements.fieldBody}</Label>
        <InputGroup>
          <InputGroupTextarea
            id={`${id}-body`}
            required
            rows={6}
            maxLength={BODY_MAX}
            value={values.body}
            placeholder={t.comms.announcements.fieldBodyPlaceholder}
            onChange={(e) => set('body', e.target.value)}
          />
          <InputGroupAddon align="block-end" className="justify-between border-t border-border">
            <InputGroupText>{t.comms.announcements.markdownHint}</InputGroupText>
            <InputGroupText className="tabular-nums">
              {f.number(values.body.length)}/{f.number(BODY_MAX)}
            </InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </div>
      {platform && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-audience`}>{t.comms.announcements.fieldAudience}</Label>
          <Select value={values.audience} onValueChange={(v) => set('audience', v as AnnouncementAudience)}>
            <SelectTrigger id={`${id}-audience`} className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANNOUNCEMENT_AUDIENCES.map((a) => (
                <SelectItem key={a} value={a}>
                  {t.comms.announcements.audience[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex flex-col gap-3 rounded-[14px] border border-border p-4">
        <label className="flex items-center justify-between gap-4 text-sm font-medium">
          <span className="flex items-center gap-2">
            <Pin className="size-4 text-muted-foreground" aria-hidden /> {t.comms.announcements.fieldPinned}
          </span>
          <Switch checked={values.pinned} onCheckedChange={(v) => set('pinned', v)} />
        </label>
        {isNew && (
          <label className="flex items-center justify-between gap-4 text-sm font-medium">
            <span className="flex flex-col">
              {t.comms.announcements.fieldNotify}
              <span className="text-[13px] font-normal text-muted-foreground">{platform ? t.comms.announcements.notifyHintPlatform : t.comms.announcements.notifyHint}</span>
            </span>
            <Switch checked={values.notify} onCheckedChange={(v) => set('notify', v)} />
          </label>
        )}
      </div>
    </div>
  );
}

/** New (batch / platform) or edit announcement, in a dialog. */
export function AnnouncementDialog({
  open,
  onOpenChange,
  batchId,
  announcement,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set for a class announcement; omit for a platform one. */
  batchId?: string;
  announcement?: Announcement;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        {open && <AnnouncementDialogBody batchId={batchId} announcement={announcement} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function AnnouncementDialogBody({ batchId, announcement, onDone }: { batchId?: string; announcement?: Announcement; onDone: () => void }) {
  const { t } = useI18n();
  const errorText = useCommsError();
  const refresh = useRefreshAnnouncements();
  const platform = announcement ? announcement.scope === 'PLATFORM' : !batchId;
  const [values, setValues] = useState<FormValues>(
    announcement ? { title: announcement.title, body: announcement.body, pinned: announcement.pinned, notify: false, audience: announcement.audience } : blank,
  );
  const save = useMutation({
    mutationFn: () => {
      const title = values.title.trim();
      const body = values.body.trim();
      if (announcement) return announcementsApi.update(announcement.id, { title, body, pinned: values.pinned, ...(platform ? { audience: values.audience } : {}) });
      if (batchId) return announcementsApi.postToBatch(batchId, { title, body, pinned: values.pinned, notify: values.notify });
      return announcementsApi.postToPlatform({ title, body, pinned: values.pinned, notify: values.notify, audience: values.audience });
    },
    onSuccess: (a) => {
      toast.success(announcement ? t.comms.announcements.updated : t.comms.announcements.posted);
      refresh(a.batch?.id ?? batchId);
      onDone();
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!values.title.trim() || !values.body.trim()) return;
    save.mutate();
  };
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>{announcement ? t.comms.announcements.editTitle : t.comms.announcements.newTitle}</DialogTitle>
        <DialogDescription>{platform ? t.comms.announcements.admin.composeBody : t.comms.announcements.newBody}</DialogDescription>
      </DialogHeader>
      <AnnouncementFields id={announcement ? `ann-${announcement.id}` : 'ann-new'} values={values} onChange={setValues} platform={platform} isNew={!announcement} />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t.common.cancel}
        </Button>
        <Button type="submit" disabled={save.isPending || !values.title.trim() || !values.body.trim()}>
          {save.isPending ? (announcement ? t.common.saving : t.comms.announcements.posting) : announcement ? t.common.save : t.comms.announcements.post}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Teacher / admin: "New announcement" for a class. */
export function NewAnnouncementButton({ batchId, className }: { batchId: string; className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className={className} onClick={() => setOpen(true)}>
        <Plus aria-hidden /> {t.comms.announcements.new}
      </Button>
      <AnnouncementDialog open={open} onOpenChange={setOpen} batchId={batchId} />
    </>
  );
}

// ───────── card ─────────

export function AnnouncementCard({ a, showSource, compact }: { a: Announcement; showSource?: boolean; compact?: boolean }) {
  const { t, f, pick } = useI18n();
  const { user, role } = useAuth();
  const errorText = useCommsError();
  const refresh = useRefreshAnnouncements();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const canManage = !!user && (a.author.id === user.id || role === 'ADMIN');
  const long = a.body.length > COLLAPSE_AT;
  const edited = new Date(a.updatedAt).getTime() - new Date(a.createdAt).getTime() > 60_000;
  const remove = useMutation({
    mutationFn: () => announcementsApi.remove(a.id),
    onSuccess: () => {
      toast.success(t.comms.announcements.deleted);
      refresh(a.batch?.id);
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const source = a.batch ? (
    <Link href={classHref(role, a.batch.id)} className="link-sun">
      <bdi dir="ltr">{a.batch.code}</bdi> · {pick(a.batch.courseTitle, a.batch.courseTitleAr).text}
    </Link>
  ) : (
    <span>{t.comms.announcements.fromAzza}</span>
  );

  return (
    <article className={cn('flex flex-col gap-3 rounded-[14px] border bg-card p-5', a.pinned ? 'border-green/60' : 'border-border')}>
      <header className="flex items-start gap-3">
        <InitialsAvatar name={a.author.name} src={a.author.image} size={36} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold">{a.title}</h3>
            {a.pinned && (
              <Chip tone="sun">
                <Pin className="size-3" aria-hidden /> {t.comms.announcements.pinned}
              </Chip>
            )}
            {a.scope === 'PLATFORM' && role === 'ADMIN' && <Chip tone="outline">{t.comms.announcements.audience[a.audience]}</Chip>}
          </div>
          <span className="text-[13px] text-muted-foreground">
            <bdi>{a.author.name}</bdi> · <time dateTime={a.createdAt}>{f.dateTime(a.createdAt)}</time>
            {edited && <> · {t.comms.announcements.edited}</>}
            {showSource && <> · {source}</>}
          </span>
        </div>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t.comms.announcements.actions}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil /> {t.common.edit}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirming(true)}>
                <Trash2 /> {t.comms.announcements.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      <div className={cn('relative', long && !expanded && (compact ? 'max-h-24 overflow-hidden' : 'max-h-44 overflow-hidden'))}>
        <Markdown source={a.body} className="text-[15px]" />
        {long && !expanded && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />}
      </div>
      {long && (
        <Button variant="link" size="xs" className="self-start" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          {expanded ? t.comms.announcements.showLess : t.comms.announcements.readMore}
        </Button>
      )}
      {canManage && (
        <>
          <AnnouncementDialog open={editing} onOpenChange={setEditing} announcement={a} />
          <AlertDialog open={confirming} onOpenChange={setConfirming}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.comms.announcements.deleteTitle}</AlertDialogTitle>
                <AlertDialogDescription>{t.comms.announcements.deleteBody}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={() => remove.mutate()}>{t.comms.announcements.delete}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </article>
  );
}

// ───────── lists ─────────

const PAGE = 20;
const nextPage = (last: AnnouncementPage) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined);

function AnnouncementList({
  pages,
  isPending,
  isError,
  error,
  refetch,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  empty,
  showSource,
  filter,
}: {
  pages: AnnouncementPage[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
  hasNextPage: boolean;
  fetchNextPage: () => unknown;
  isFetchingNextPage: boolean;
  empty: React.ReactNode;
  showSource?: boolean;
  filter?: (a: Announcement) => boolean;
}) {
  const { t } = useI18n();
  if (isPending) return <LoadingBlock rows={3} height={120} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const items = (pages ?? []).flatMap((p) => p.items).filter((a) => (filter ? filter(a) : true));
  if (items.length === 0 && !hasNextPage) return <>{empty}</>;
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {items.map((a) => (
          <li key={a.id}>
            <AnnouncementCard a={a} showSource={showSource} />
          </li>
        ))}
      </ul>
      {hasNextPage && (
        <Button variant="outline" className="self-center" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
          {isFetchingNextPage ? t.common.loading : t.comms.announcements.loadMore}
        </Button>
      )}
    </div>
  );
}

/** A class's announcements, pinned first. Teachers and admins get "New announcement". */
export function AnnouncementsPanel({ batchId, canPost, className }: { batchId: string; canPost?: boolean; className?: string }) {
  const { t } = useI18n();
  const q = useInfiniteQuery({
    queryKey: qk.batchAnnouncements(batchId),
    queryFn: ({ pageParam }) => announcementsApi.forBatch(batchId, { page: pageParam, pageSize: PAGE }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
  return (
    <Panel aria-labelledby={`ann-${batchId}`} className={className}>
      <SectionHeader title={<span id={`ann-${batchId}`}>{t.comms.announcements.title}</span>} aside={canPost ? <NewAnnouncementButton batchId={batchId} /> : undefined} />
      <AnnouncementList
        pages={q.data?.pages}
        isPending={q.isPending}
        isError={q.isError}
        error={q.error}
        refetch={q.refetch}
        hasNextPage={q.hasNextPage}
        fetchNextPage={q.fetchNextPage}
        isFetchingNextPage={q.isFetchingNextPage}
        empty={<EmptyState title={t.comms.announcements.empty} body={canPost ? t.comms.announcements.emptyTeacher : t.comms.announcements.emptyBody} />}
      />
    </Panel>
  );
}

function useMyAnnouncementsInfinite() {
  return useInfiniteQuery({
    queryKey: qk.myAnnouncements(0, PAGE),
    queryFn: ({ pageParam }) => announcementsApi.mine({ page: pageParam, pageSize: PAGE }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
}

/** `/announcements`: platform news for my role plus my classes'. */
export function AnnouncementsFeed() {
  const { t } = useI18n();
  const q = useMyAnnouncementsInfinite();
  return (
    <>
      <PageTitle kicker={t.comms.announcements.kicker} title={t.comms.announcements.pageTitle} />
      <div className="max-w-3xl">
        <AnnouncementList
          pages={q.data?.pages}
          isPending={q.isPending}
          isError={q.isError}
          error={q.error}
          refetch={q.refetch}
          hasNextPage={q.hasNextPage}
          fetchNextPage={q.fetchNextPage}
          isFetchingNextPage={q.isFetchingNextPage}
          showSource
          empty={<EmptyState title={t.comms.announcements.empty} body={t.comms.announcements.emptyBody} />}
        />
      </div>
    </>
  );
}

/** Learner home: the newest few announcements as a horizontal strip. */
export function LatestFromClasses() {
  const { t, f, pick } = useI18n();
  const q = useQuery({ queryKey: qk.myAnnouncements(1, 6), queryFn: () => announcementsApi.mine({ page: 1, pageSize: 6 }), retry: false });
  return (
    <section aria-labelledby="latest-news" className="flex flex-col gap-4">
      <SectionHeader title={<span id="latest-news">{t.comms.announcements.latestTitle}</span>} href="/announcements" linkLabel={t.common.seeAll} />
      {q.isPending ? (
        <div className="flex gap-3 overflow-hidden" role="status">
          <span className="sr-only">{t.common.loading}</span>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 w-72 shrink-0 animate-pulse rounded-[14px] bg-muted" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.items.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-border p-5 text-sm text-muted-foreground">{t.comms.announcements.latestEmpty}</p>
      ) : (
        <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
          {q.data.items.map((a) => (
            <li key={a.id} className="w-[min(300px,82vw)] shrink-0 snap-start">
              <Link
                href={a.batch ? `/learn/classes/${a.batch.id}` : '/announcements'}
                className="flex h-full flex-col gap-2 rounded-[14px] border border-border bg-card p-4 text-foreground no-underline transition-colors hover:border-green-deep hover:bg-accent"
              >
                <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Megaphone className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">
                    {a.batch ? (
                      <>
                        <bdi dir="ltr">{a.batch.code}</bdi> · {pick(a.batch.courseTitle, a.batch.courseTitleAr).text}
                      </>
                    ) : (
                      t.comms.announcements.fromAzza
                    )}
                  </span>
                  {a.pinned && <Pin className="ms-auto size-3.5 shrink-0 text-green-deep" aria-label={t.comms.announcements.pinned} />}
                </span>
                <b className="line-clamp-2 text-[15px]">{a.title}</b>
                <span className="line-clamp-2 text-[13px] text-muted-foreground">{plain(a.body)}</span>
                <time dateTime={a.createdAt} className="label-mono mt-auto text-muted-foreground">
                  {f.dayMonth(a.createdAt)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Markdown → a one-line preview. */
export function plain(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_`~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ───────── admin ─────────

/** `/admin/announcements`: compose by audience, list, edit, delete. */
export function AdminAnnouncements() {
  const { t } = useI18n();
  const errorText = useCommsError();
  const refresh = useRefreshAnnouncements();
  const [values, setValues] = useState<FormValues>(blank);
  const q = useMyAnnouncementsInfinite();
  const post = useMutation({
    mutationFn: () => announcementsApi.postToPlatform({ title: values.title.trim(), body: values.body.trim(), audience: values.audience, pinned: values.pinned, notify: values.notify }),
    onSuccess: () => {
      toast.success(t.comms.announcements.posted);
      setValues(blank);
      refresh();
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const ready = !!values.title.trim() && !!values.body.trim();
  return (
    <>
      <PageTitle kicker={t.comms.announcements.admin.kicker} title={t.comms.announcements.admin.title} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Panel as="section" aria-labelledby="compose" className="xl:sticky xl:top-6">
          <div className="flex flex-col gap-1">
            <h2 id="compose" className="font-display text-2xl font-extrabold">
              {t.comms.announcements.admin.compose}
            </h2>
            <p className="text-sm text-muted-foreground">{t.comms.announcements.admin.composeBody}</p>
          </div>
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (ready) post.mutate();
            }}
          >
            <AnnouncementFields id="platform-new" values={values} onChange={setValues} platform isNew />
            <Button type="submit" className="self-start" disabled={!ready || post.isPending}>
              <Megaphone aria-hidden /> {post.isPending ? t.comms.announcements.posting : t.comms.announcements.post}
            </Button>
          </form>
        </Panel>
        <section aria-labelledby="posted" className="flex flex-col gap-4">
          <SectionHeader title={<span id="posted">{t.comms.announcements.admin.list}</span>} />
          <AnnouncementList
            pages={q.data?.pages}
            isPending={q.isPending}
            isError={q.isError}
            error={q.error}
            refetch={q.refetch}
            hasNextPage={q.hasNextPage}
            fetchNextPage={q.fetchNextPage}
            isFetchingNextPage={q.isFetchingNextPage}
            filter={(a) => a.scope === 'PLATFORM'}
            empty={<EmptyState title={t.comms.announcements.admin.empty} body={t.comms.announcements.admin.emptyBody} />}
          />
        </section>
      </div>
    </>
  );
}

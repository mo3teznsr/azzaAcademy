'use client';

import { WhatsAppButton } from '@/components/brand/whatsapp-button';
import Link from 'next/link';
import { BookOpen, CalendarDays, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Chip } from '@/components/brand/status-chip';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { useI18n } from '@/lib/i18n/provider';
import { describeRule } from '@/lib/schedule';
import { useEnrollments } from '../learn/hooks';
import { AnnouncementsPanel } from './announcements';
import { ClassChat, MessageTeacherButton, useConversations } from './chat';

/** `/learn/classes/<batchId>`: the student's class space — announcements, class chat, and a line to the teacher. */
export function StudentClassPage({ batchId, initialTab }: { batchId: string; initialTab?: string }) {
  const { t, f, fill, pick } = useI18n();
  const q = useEnrollments();
  const conversations = useConversations();
  const classUnread = conversations.data?.items.find((c) => c.type === 'CLASS' && c.batch.id === batchId)?.unread ?? 0;

  if (q.isPending) return <LoadingBlock rows={3} height={140} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const e = q.data.find((x) => x.batchId === batchId && x.status === 'ACTIVE');
  if (!e) return <EmptyState title={t.comms.classPage.notMemberTitle} body={t.comms.classPage.notMemberBody} action={{ label: t.comms.classPage.backHome, href: '/learn' }} />;
  const b = e.batch;
  const course = pick(b.course.titleEn, b.course.titleAr).text;

  return (
    <>
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/learn" className="hover:text-foreground">
          {t.nav.student.home}
        </Link>
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        <span className="text-foreground">
          {course} · <bdi dir="ltr">{b.code}</bdi>
        </span>
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          <span className="label-mono text-muted-foreground">{t.comms.classPage.kicker}</span>
          <div className="flex flex-wrap items-center gap-3">
            <b className="font-display text-6xl font-extrabold leading-none" dir="ltr">
              {b.code}
            </b>
            <Chip tone="ivory">{t.status.batch[b.status]}</Chip>
          </div>
          <h1 className="font-display text-3xl font-bold">{course}</h1>
          <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <InitialsAvatar name={b.teacher.name} src={b.teacher.image} size={28} />
            <bdi>{fill(t.comms.classPage.teacher, { name: b.teacher.name })}</bdi> · {describeRule(b, f)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <MessageTeacherButton batchId={batchId} size="default" variant="default" />
          <Button asChild variant="outline">
            <Link href={`/learn/courses/${b.course.id}`}>
              <BookOpen aria-hidden /> {t.comms.classPage.lessons}
            </Link>
          </Button>
          <WhatsAppButton course={course} batchCode={b.code} />
          <Button asChild variant="outline">
            <Link href={`/schedule?batch=${b.id}`}>
              <CalendarDays aria-hidden /> {t.comms.classPage.schedule}
            </Link>
          </Button>
        </div>
      </header>
      <Tabs defaultValue={initialTab === 'chat' ? 'chat' : 'announcements'}>
        <TabsList>
          <TabsTrigger value="announcements">{t.comms.announcements.title}</TabsTrigger>
          <TabsTrigger value="chat">
            {t.comms.chat.classChat}
            {classUnread > 0 && <span className="ms-1.5 rounded-full bg-green px-1.5 text-[11px] font-bold text-ink-deep tabular-nums">{f.number(classUnread)}</span>}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="announcements" className="mt-4 max-w-3xl">
          <AnnouncementsPanel batchId={batchId} />
        </TabsContent>
        <TabsContent value="chat" className="mt-4 max-w-4xl">
          <ClassChat batchId={batchId} />
        </TabsContent>
      </Tabs>
    </>
  );
}

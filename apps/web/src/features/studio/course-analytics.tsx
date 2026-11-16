'use client';

import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { Panel, PageTitle, SectionHeader, StatTile } from '@/components/brand/section';
import { EmptyState, LoadingBlock } from '@/components/brand/states';
import { lessonQaApi, qaKeys, type LessonFunnelRow } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { BackToCourse, InsightError } from './course-questions';

/** Studio: how learners move through one recorded course — lesson funnel, drop-off and learners gone quiet. Author and admins only. */
export function CourseAnalyticsPage({ courseId }: { courseId: string }) {
  const { t, f, fill, pick } = useI18n();
  const c = t.courseInsights;
  const q = useQuery({ queryKey: qaKeys.analytics(courseId), queryFn: () => lessonQaApi.courseAnalytics(courseId), retry: false });

  return (
    <div className="flex flex-col gap-6">
      <BackToCourse courseId={courseId} />
      {q.isPending ? (
        <LoadingBlock rows={4} height={96} />
      ) : q.isError ? (
        <InsightError error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <PageTitle kicker={c.analyticsKicker} title={pick(q.data.course.titleEn, q.data.course.titleAr).text} />
          <p className="-mt-3 text-sm text-muted-foreground">{fill(c.updated, { d: f.dateTime(q.data.generatedAt) })}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile label={c.liveLearners} value={f.number(q.data.liveLearners)} />
            <StatTile label={c.started} value={f.number(q.data.learnersStarted)} />
            <StatTile tone={q.data.inactive.length ? 'ink' : 'default'} label={fill(c.inactiveCount, { n: f.number(q.data.inactiveAfterDays) })} value={f.number(q.data.inactive.length)} />
          </div>
          <Panel className="flex flex-col gap-4">
            <SectionHeader title={c.funnelTitle} size="sm" />
            <p className="max-w-[70ch] text-sm text-muted-foreground">{c.funnelBody}</p>
            {q.data.lessons.length === 0 ? <p className="text-sm text-muted-foreground">{c.noLessons}</p> : <FunnelTable rows={q.data.lessons} />}
          </Panel>
          <Panel className="flex flex-col gap-4">
            <SectionHeader title={c.inactiveTitle} size="sm" />
            <p className="max-w-[70ch] text-sm text-muted-foreground">{fill(c.inactiveBody, { n: f.number(q.data.inactiveAfterDays) })}</p>
            {q.data.inactive.length === 0 ? (
              <EmptyState title={c.inactiveEmpty} className="p-5" />
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {q.data.inactive.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <InitialsAvatar name={l.name} size={32} />
                    <span className="flex min-w-0 flex-col">
                      <b className="truncate text-sm">{l.name}</b>
                      <span className="text-[13px] text-muted-foreground">{l.lastActiveAt ? fill(c.lastActive, { d: f.dayMonth(l.lastActiveAt) }) : c.neverActive}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

/** Per lesson in course order; the heaviest drop-off is flagged so the teacher sees where to look first. */
function FunnelTable({ rows }: { rows: LessonFunnelRow[] }) {
  const { t, f, pick } = useI18n();
  const c = t.courseInsights;
  const pct = (v: number | null) => (v === null ? c.notKnown : f.percent(Math.round(v * 100)));
  const worst = rows.reduce<number | null>((m, r) => (r.dropOff !== null && r.started >= 3 && (m === null || r.dropOff > m) ? r.dropOff : m), null);
  return (
    <div className="-mx-1 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>{c.colLesson}</TableHead>
            <TableHead className="text-end">{c.colStarted}</TableHead>
            <TableHead className="text-end">{c.colCompleted}</TableHead>
            <TableHead className="text-end">{c.colWatched}</TableHead>
            <TableHead className="text-end">{c.colDropOff}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => {
            const flagged = worst !== null && worst > 0 && r.dropOff === worst && r.started >= 3;
            return (
              <TableRow key={r.lessonId}>
                <TableCell className="timecode text-muted-foreground">{f.number(i + 1)}</TableCell>
                <TableCell className="max-w-[28ch] truncate font-medium">{pick(r.titleEn, r.titleAr).text}</TableCell>
                <TableCell className="text-end tabular-nums">{f.number(r.started)}</TableCell>
                <TableCell className="text-end tabular-nums">{f.number(r.completed)}</TableCell>
                <TableCell className="text-end tabular-nums">{pct(r.avgWatchedShare)}</TableCell>
                <TableCell className={cn('text-end tabular-nums', flagged && 'font-bold text-danger-fg')}>{pct(r.dropOff)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

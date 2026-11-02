'use client';

import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal } from 'lucide-react';
import { COURSE_LEVELS, COURSE_STATUSES, type CourseLevel, type CourseStatus } from '@azza/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CourseCover } from '@/components/brand/course-cover';
import { CourseStatusChip } from '@/components/brand/status-chip';
import { PageTitle, Panel } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { coursesApi } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';

export function AdminCourses() {
  const { t, f, fill } = useI18n();
  const money = useMoney();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<CourseStatus | 'all'>('all');
  const [level, setLevel] = useState<CourseLevel | 'all'>('all');
  const [page, setPage] = useState(1);
  const dq = useDeferredValue(q);
  const params = { q: dq || undefined, status: status === 'all' ? undefined : status, level: level === 'all' ? undefined : level, page, pageSize: 20 };
  const list = useQuery({ queryKey: qk.courses(params), queryFn: () => coursesApi.list(params) });
  const setCourseStatus = useMutation({
    mutationFn: ({ id, s }: { id: string; s: CourseStatus }) => coursesApi.update(id, { status: s }),
    onSuccess: () => {
      toast.success(t.admin.editor.saved);
      void qc.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageTitle
        kicker={list.data ? fill(t.admin.courses.count, { c: f.number(list.data.total) }) : undefined}
        title={t.admin.courses.title}
        aside={
          <Button asChild variant="ink">
            <Link href="/admin/courses/new">{t.admin.courses.newCourse}</Link>
          </Button>
        }
      />
      <div className="flex flex-wrap gap-3">
        <Input value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} placeholder={t.common.search} aria-label={t.common.search} className="max-w-xs rounded-full" />
        <Select value={status} onValueChange={(v) => (setStatus(v as CourseStatus | 'all'), setPage(1))}>
          <SelectTrigger aria-label={t.common.status} className="rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t.common.status}: {t.common.any}
            </SelectItem>
            {COURSE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t.status.course[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={level} onValueChange={(v) => (setLevel(v as CourseLevel | 'all'), setPage(1))}>
          <SelectTrigger aria-label={t.admin.courses.level} className="rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t.admin.courses.level}: {t.common.any}
            </SelectItem>
            {COURSE_LEVELS.map((l) => (
              <SelectItem key={l} value={l}>
                {t.status.level[l]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Panel className="p-2">
        {list.isPending ? (
          <LoadingBlock rows={6} height={56} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : list.data.items.length === 0 ? (
          <EmptyState title={t.admin.courses.empty} action={{ label: t.admin.courses.newCourse, href: '/admin/courses/new' }} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.courses.colCourse}</TableHead>
                  <TableHead>{t.admin.courses.level}</TableHead>
                  <TableHead>{t.admin.courses.colPrice}</TableHead>
                  <TableHead>{t.admin.courses.colCreated}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead className="text-end">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/admin/courses/${c.id}`} className="flex items-center gap-3 no-underline">
                        <CourseCover course={c} size="sm" showMeta={false} className="h-12 w-12 shrink-0 rounded-xl p-1.5 [&>span]:text-[11px]" />
                        <span>
                          <b className="block">{c.titleEn}</b>
                          <span className="text-[13px] text-muted-foreground">
                            {c.category} · <span dir="ltr">{c.slug}</span>
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>{t.status.level[c.level]}</TableCell>
                    <TableCell>{money.aed(c.priceFils)}</TableCell>
                    <TableCell>{f.dayMonth(c.createdAt)}</TableCell>
                    <TableCell>
                      <CourseStatusChip status={c.status} />
                    </TableCell>
                    <TableCell className="text-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={t.common.actions}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/courses/${c.id}`}>{t.admin.courses.editCourse}</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/batches/new?courseId=${c.id}`}>{t.admin.courses.createBatch}</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/courses/${c.slug}`} target="_blank">
                              {t.admin.courses.viewPublic}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {c.status !== 'PUBLISHED' && <DropdownMenuItem onSelect={() => setCourseStatus.mutate({ id: c.id, s: 'PUBLISHED' })}>{t.admin.courses.publish}</DropdownMenuItem>}
                          {c.status !== 'ARCHIVED' && <DropdownMenuItem onSelect={() => setCourseStatus.mutate({ id: c.id, s: 'ARCHIVED' })}>{t.admin.courses.archive}</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pager page={list.data.page} pageCount={list.data.pageCount} onPage={setPage} />
          </>
        )}
      </Panel>
    </>
  );
}

export function Pager({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (p: number) => void }) {
  const { t, f, fill } = useI18n();
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-3 text-sm text-muted-foreground">
      <span>{fill(t.common.pageOf, { page: f.number(page), count: f.number(pageCount) })}</span>
      <span className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          {t.common.previous}
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
          {t.common.next}
        </Button>
      </span>
    </div>
  );
}

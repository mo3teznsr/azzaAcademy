'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import type { BlogPostStatus } from '@azza/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Chip } from '@/components/brand/status-chip';
import { PageTitle } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { blogApi, type AdminBlogRow } from '@/lib/api/blog';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';

/** Admin: every article with its status (draft, scheduled, live). */
export function AdminBlogList() {
  const { t } = useI18n();
  const b = t.adminBlog;
  const [status, setStatus] = useState<'all' | BlogPostStatus>('all');
  const [q, setQ] = useState('');
  const params = { status: status === 'all' ? undefined : status, q: q.trim() || undefined, pageSize: 100 };
  const list = useQuery({ queryKey: qk.adminBlog(params), queryFn: () => blogApi.admin.list(params) });

  return (
    <div className="flex flex-col gap-8">
      <PageTitle
        kicker={t.nav.admin.label}
        title={b.title}
        aside={
          <Button asChild variant="ink">
            <Link href="/admin/blog/new">
              <Plus /> {b.newPost}
            </Link>
          </Button>
        }
      />
      <p className="max-w-3xl text-muted-foreground">{b.subtitle}</p>
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup type="single" value={status} onValueChange={(v) => v && setStatus(v as typeof status)} variant="outline">
          <ToggleGroupItem value="all">{b.filterAll}</ToggleGroupItem>
          <ToggleGroupItem value="DRAFT">{b.status.DRAFT}</ToggleGroupItem>
          <ToggleGroupItem value="PUBLISHED">{b.status.PUBLISHED}</ToggleGroupItem>
        </ToggleGroup>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={b.search} aria-label={b.search} className="max-w-xs" />
      </div>
      {list.isPending ? (
        <LoadingBlock rows={4} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState title={b.empty} action={{ label: b.newPost, href: '/admin/blog/new' }} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{b.titleLabel}</TableHead>
              <TableHead>{b.category}</TableHead>
              <TableHead>{b.author}</TableHead>
              <TableHead>{b.publishAt}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data.items.map((p) => (
              <Row key={p.id} post={p} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function Row({ post: p }: { post: AdminBlogRow }) {
  const { t, f, pick, fill } = useI18n();
  const b = t.adminBlog;
  const scheduled = p.status === 'PUBLISHED' && !p.live;
  return (
    <TableRow>
      <TableCell className="max-w-md">
        <Link href={`/admin/blog/${p.id}`} className="flex flex-col gap-1 no-underline hover:underline">
          <b dir="rtl" lang="ar" className="truncate text-foreground">
            {p.titleAr}
          </b>
          <span className="label-mono text-muted-foreground">/{p.slug}</span>
        </Link>
      </TableCell>
      <TableCell>{p.category ? pick(p.category.nameEn, p.category.nameAr).text : '—'}</TableCell>
      <TableCell>{p.author?.name ?? b.authorAzza}</TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          {p.live ? (
            <Chip tone="ink">{b.live}</Chip>
          ) : scheduled ? (
            <Chip>{fill(b.scheduled, { date: f.dateTime(p.publishedAt!) })}</Chip>
          ) : (
            <Chip tone="dashed">{b.status.DRAFT}</Chip>
          )}
          {!p.hasEn && <span className="text-xs text-muted-foreground">{b.noEnglish}</span>}
        </div>
      </TableCell>
    </TableRow>
  );
}

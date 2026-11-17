'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Chip } from '@/components/brand/status-chip';
import { Stars } from '@/components/brand/rating';
import { PageTitle, Panel } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { ApiError } from '@/lib/api';
import { testimonialsApi, type AdminTestimonial } from '@/lib/api/blog';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';

type Filter = 'all' | 'true' | 'false';

/** Admin: reviews whose writers agreed to be quoted; feature or remove them as testimonials. */
export function AdminTestimonials() {
  const { t } = useI18n();
  const a = t.testimonials.admin;
  const [filter, setFilter] = useState<Filter>('all');
  const params = { featured: filter === 'all' ? undefined : filter, pageSize: 100 };
  const q = useQuery({ queryKey: qk.adminTestimonials(params), queryFn: () => testimonialsApi.admin.list(params) });

  return (
    <div className="flex flex-col gap-8">
      <PageTitle kicker={t.nav.admin.label} title={a.title} />
      <p className="max-w-3xl text-muted-foreground">{a.subtitle}</p>
      <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v as Filter)} className="justify-start" variant="outline">
        <ToggleGroupItem value="all">{a.filterAll}</ToggleGroupItem>
        <ToggleGroupItem value="true">{a.filterFeatured}</ToggleGroupItem>
        <ToggleGroupItem value="false">{a.filterNot}</ToggleGroupItem>
      </ToggleGroup>
      {q.isPending ? (
        <LoadingBlock rows={4} height={120} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.items.length === 0 ? (
        <EmptyState title={a.title} body={a.empty} />
      ) : (
        <ul className="flex flex-col gap-3">
          {q.data.items.map((r) => (
            <li key={r.id}>
              <Row review={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ review: r }: { review: AdminTestimonial }) {
  const { t, pick, f } = useI18n();
  const a = t.testimonials.admin;
  const qc = useQueryClient();
  const featured = !!r.featuredAt;
  const toggle = useMutation({
    mutationFn: () => testimonialsApi.admin.setFeatured(r.id, !featured),
    onSuccess: () => {
      toast.success(featured ? a.unfeaturedDone : a.featuredDone);
      void qc.invalidateQueries({ queryKey: ['admin', 'testimonials'] });
      void qc.invalidateQueries({ queryKey: ['testimonials'] });
    },
    onError: (e) => {
      const code = e instanceof ApiError ? (e.code as keyof typeof a.errors) : undefined;
      toast.error((code && a.errors[code]) || (e instanceof Error ? e.message : String(e)));
    },
  });
  return (
    <Panel as="article" className="gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="label-mono text-muted-foreground">{pick(r.course.titleEn, r.course.titleAr).text}</span>
        <Stars value={r.rating} size="size-4" />
        <span className="text-sm text-muted-foreground">{f.dayMonth(r.createdAt)}</span>
        {featured && <Chip tone="ink">{a.featured}</Chip>}
        {!r.quotable && <Chip tone="dashed">{a.notQuotable}</Chip>}
      </div>
      <p dir="auto" className="leading-relaxed whitespace-pre-line">
        {r.body || '—'}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-sm text-muted-foreground">
          {a.shownAs}: <b className="text-foreground">{r.firstName}</b> · <span className="text-xs">{r.user.name}</span>
        </span>
        <Button size="sm" variant={featured ? 'outline' : 'ink'} disabled={toggle.isPending || (!featured && !r.quotable)} onClick={() => toggle.mutate()}>
          {featured ? a.unfeature : a.feature}
        </Button>
      </div>
    </Panel>
  );
}

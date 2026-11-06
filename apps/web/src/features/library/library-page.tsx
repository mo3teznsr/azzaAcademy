'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Download, Play } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CourseCover } from '@/components/brand/course-cover';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock, LoadingGrid } from '@/components/brand/states';
import { useI18n } from '@/lib/i18n/provider';
import { sessionCode } from '@/lib/i18n/format';
import { useMyMaterials, useRecordings } from '../learn/hooks';

/** Student library (`/library`), and with `teacher` the studio's recordings of sessions you taught (`/studio/recordings`). */
export function LibraryPage({ base = '/library', teacher = false }: { base?: string; teacher?: boolean } = {}) {
  const { t, f, pick } = useI18n();
  const recs = useRecordings();
  const mats = useMyMaterials();
  const [batch, setBatch] = useState('all');
  const batchCodes = useMemo(() => Array.from(new Set((recs.data ?? []).map((r) => r.batch.code))), [recs.data]);
  const list = (recs.data ?? []).filter((r) => batch === 'all' || r.batch.code === batch);

  return (
    <>
      <PageTitle title={teacher ? t.studio.recordings.title : t.library.title} />
      {teacher && <p className="-mt-2 max-w-2xl text-muted-foreground">{t.studio.recordings.lede}</p>}
      <section className="flex flex-col gap-4" aria-labelledby="recs">
        <SectionHeader title={<span id="recs">{t.library.recordings}</span>} />
        {batchCodes.length > 1 && (
          <ToggleGroup type="single" value={batch} onValueChange={(v) => setBatch(v || 'all')} className="justify-start gap-2">
            {['all', ...batchCodes].map((c) => (
              <ToggleGroupItem key={c} value={c} className="h-9 rounded-full border border-border px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                {c === 'all' ? t.library.allBatches : c}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        {recs.isPending ? (
          <LoadingGrid count={4} height={220} />
        ) : recs.isError ? (
          <ErrorState error={recs.error} onRetry={() => void recs.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState title={teacher ? t.studio.recordings.empty : t.library.empty} />
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-4">
            {list.map((r) => {
              const durationMin = r.endedAt ? Math.round((new Date(r.endedAt).getTime() - new Date(r.startsAt).getTime()) / 60000) : 0;
              return (
              <li key={r.id}>
                <Link href={`${base}/${r.id}`} className="group flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-3 no-underline transition-shadow duration-200 hover:shadow-card">
                  <div className="relative">
                    <CourseCover course={r.batch.course} size="md" className="h-40" />
                    <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      <span className="grid size-14 place-items-center rounded-full bg-ink text-ivory">
                        <Play />
                      </span>
                    </span>
                  </div>
                  <b className="px-1 text-foreground">{r.title}</b>
                  <span className="px-1 pb-1 text-[13px] text-muted-foreground">
                    <bdi dir="ltr">
                      {r.batch.code}·{sessionCode(r.number)}
                    </bdi>{' '}
                    · {f.dayMonth(r.startsAt)} {durationMin > 0 ? `· ${f.number(durationMin)} min` : ''} · {pick(r.batch.course.titleEn, r.batch.course.titleAr).text}
                  </span>
                </Link>
              </li>
              );
            })}
          </ul>
        )}
      </section>
      {!teacher && (
      <Panel aria-labelledby="mats">
        <SectionHeader title={<span id="mats">{t.library.materials}</span>} />
        {mats.isPending ? (
          <LoadingBlock rows={3} />
        ) : mats.isError ? (
          <ErrorState compact error={mats.error} onRetry={() => void mats.refetch()} />
        ) : mats.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.library.materialsEmpty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.library.file}</TableHead>
                <TableHead>{t.library.type}</TableHead>
                <TableHead>{t.library.session}</TableHead>
                <TableHead className="text-end">{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mats.data.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.title}</TableCell>
                  <TableCell>{t.status.material[m.kind]}</TableCell>
                  <TableCell dir="ltr" className="font-mono text-xs">
                    {m.enrollment.batch.code}
                    {m.session ? `·${sessionCode(m.session.number)}` : ''}
                  </TableCell>
                  <TableCell className="text-end">
                    <a href={m.url} target="_blank" rel="noreferrer" className="link-sun inline-flex items-center gap-1.5 text-sm">
                      <Download className="size-4" /> {t.common.download}
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      )}
    </>
  );
}

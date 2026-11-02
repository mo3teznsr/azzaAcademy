'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SOCKET_EVENTS } from '@azza/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Chip } from '@/components/brand/status-chip';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { adminApi, sessionsApi, type LiveRoomStat } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { sessionCode, timecode } from '@/lib/i18n/format';
import { useSocketEvent } from '@/lib/realtime/socket';
import { useNow } from '@/lib/use-now';
import { cn } from '@/lib/utils';

export function LiveMonitor() {
  const { t, f, fill, pick } = useI18n();
  const qc = useQueryClient();
  const now = useNow();
  const q = useQuery({ queryKey: qk.admin.liveRooms, queryFn: adminApi.liveRooms, refetchInterval: 15_000 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useSocketEvent<unknown>(SOCKET_EVENTS.ROOM_STATS, () => void qc.invalidateQueries({ queryKey: qk.admin.liveRooms }));
  const end = useMutation({
    mutationFn: (id: string) => sessionsApi.end(id),
    onSuccess: () => {
      toast.success(t.common.saved);
      void qc.invalidateQueries({ queryKey: qk.admin.liveRooms });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rooms = (q.data?.items ?? []).map((r) => toRoomRow(r, (en, ar) => pick(en, ar).text));
  const selected = rooms.find((r) => r.sessionId === selectedId) ?? rooms[0];

  return (
    <>
      <PageTitle kicker={<span className="text-onair">● {fill(t.admin.live.onAir, { n: f.number(rooms.length) })}</span>} title={t.admin.live.title} />
      <Panel className="p-2">
        {q.isPending ? (
          <LoadingBlock rows={4} height={52} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : rooms.length === 0 ? (
          <EmptyState title={t.admin.live.empty} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.admin.live.colRoom}</TableHead>
                <TableHead>{t.admin.live.colHost}</TableHead>
                <TableHead>{t.admin.live.colInRoom}</TableHead>
                <TableHead>{t.admin.live.colDuration}</TableHead>
                <TableHead>{t.admin.live.colRecording}</TableHead>
                <TableHead>{t.admin.live.colHealth}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((r) => (
                <TableRow key={r.sessionId} data-state={selected?.sessionId === r.sessionId ? 'selected' : undefined} onClick={() => setSelectedId(r.sessionId)} className="cursor-pointer">
                  <TableCell>
                    <b className="block">{r.title}</b>
                    <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                      {r.roomName} · {r.slate}
                    </span>
                  </TableCell>
                  <TableCell>
                    <bdi>{r.host}</bdi>
                  </TableCell>
                  <TableCell>
                    {f.number(r.participants)} / {f.number(r.capacity)}
                  </TableCell>
                  <TableCell className="timecode">{r.startedAt ? timecode((now - +new Date(r.startedAt)) / 1000) : '—'}</TableCell>
                  <TableCell>{r.recording ? <Chip tone="onair" dot>{t.admin.live.recOn}</Chip> : <Chip>{t.admin.live.recOff}</Chip>}</TableCell>
                  <TableCell>
                    <span className={cn('font-semibold', !r.roomOpen && 'text-[#9a4a1c]')}>{r.roomOpen ? 'GOOD' : '—'}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      {selected && (
        <Panel className="bg-ink text-ivory in-data-[theme=cream]:bg-ink">
          <SectionHeader title={selected.title} size="sm" />
          <p className="text-sm text-stone">
            {selected.courseTitle} · <span dir="ltr">{selected.slate}</span> · <bdi>{selected.host}</bdi>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" className="bg-ink-2 text-ivory">
              <Link href={`/studio/live/${selected.sessionId}`}>{t.admin.live.joinSilently}</Link>
            </Button>
            <Button variant="destructive" disabled={end.isPending} onClick={() => end.mutate(selected.sessionId)}>
              {t.admin.live.endRoom}
            </Button>
          </div>
        </Panel>
      )}
    </>
  );
}

/** View model for one monitored room (flattens the `{ session, … }` API row). */
function toRoomRow(r: LiveRoomStat, title: (en: string, ar: string | null) => string) {
  const b = r.session.batch;
  return {
    sessionId: r.session.id,
    title: r.session.title,
    roomName: r.roomName,
    slate: `${b.code}·${sessionCode(r.session.number)}`,
    courseTitle: title(b.course.titleEn, b.course.titleAr),
    host: b.teacher.name,
    participants: r.participants,
    capacity: b._count.enrollments || b.capacity,
    startedAt: r.session.startedAt,
    recording: r.recording,
    roomOpen: r.roomOpen,
  };
}

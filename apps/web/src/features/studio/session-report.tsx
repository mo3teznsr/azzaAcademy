'use client';

import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Chip } from '@/components/brand/status-chip';
import { PageTitle, Panel, SectionHeader, StatTile } from '@/components/brand/section';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { sessionsApi, type AttendanceRow, type SessionDetail } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { slate } from '@/lib/i18n/format';

type AttendanceState = 'PRESENT' | 'LATE' | 'LEFT_EARLY' | 'ABSENT';
const GRACE_MS = 5 * 60_000;

/** Present / late (joined > 5 min after start) / left early (> 5 min before the end) / absent. */
function attendanceState(r: AttendanceRow, session: Pick<SessionDetail, 'startsAt' | 'endsAt' | 'startedAt' | 'endedAt'>): AttendanceState {
  if (!r.attended || !r.firstJoinedAt) return 'ABSENT';
  const start = +new Date(session.startedAt ?? session.startsAt);
  const end = +new Date(session.endedAt ?? session.endsAt);
  if (+new Date(r.firstJoinedAt) > start + GRACE_MS) return 'LATE';
  if (r.lastLeftAt && +new Date(r.lastLeftAt) < end - GRACE_MS) return 'LEFT_EARLY';
  return 'PRESENT';
}

function toCsv(rows: Array<AttendanceRow & { state: AttendanceState }>) {
  const head = ['name', 'email', 'firstJoinedAt', 'lastLeftAt', 'minutes', 'joins', 'status'];
  const lines = rows.map((r) =>
    [r.user.name, r.user.email ?? '', r.firstJoinedAt ?? '', r.lastLeftAt ?? '', Math.round(r.seconds / 60), r.joins, r.state].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','),
  );
  return [head.join(','), ...lines].join('\n');
}

export function SessionReport({ sessionId }: { sessionId: string }) {
  const { t, f, fill } = useI18n();
  const s = useQuery({ queryKey: qk.session(sessionId), queryFn: () => sessionsApi.get(sessionId) });
  const att = useQuery({ queryKey: qk.attendance(sessionId), queryFn: () => sessionsApi.attendance(sessionId) });
  const chat = useQuery({ queryKey: qk.messages(sessionId), queryFn: () => sessionsApi.messages(sessionId), retry: false });

  if (s.isPending) return <LoadingBlock rows={3} height={120} />;
  if (s.isError) return <ErrorState error={s.error} onRetry={() => void s.refetch()} />;
  const session = s.data;
  const code = slate(session.batch.code, session.number);
  const durationMin = session.startedAt && session.endedAt ? Math.round((+new Date(session.endedAt) - +new Date(session.startedAt)) / 60000) : null;
  const rows = (att.data?.items ?? []).map((r) => ({ ...r, state: attendanceState(r, session) }));
  const label: Record<AttendanceState, string> = {
    PRESENT: t.studio.reportPage.present,
    LATE: t.studio.reportPage.late,
    LEFT_EARLY: t.studio.reportPage.leftEarly,
    ABSENT: t.studio.reportPage.absent,
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${code}-attendance.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageTitle
        kicker={
          <span>
            {session.endedAt ? fill(t.studio.reportPage.ended, { t: f.time(session.endedAt) }) : t.status.session[session.status]}
          </span>
        }
        title={
          <>
            <bdi dir="ltr">{code}</bdi> · {session.title}
          </>
        }
        aside={
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
            <Download /> {t.studio.reportPage.exportCsv}
          </Button>
        }
      />
      <section className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <StatTile label={t.studio.reportPage.attendance} value={att.data ? `${f.number(att.data.present)}/${f.number(att.data.total)}` : '—'}
          sub={att.data ? f.percent(att.data.percent) : undefined} />
        <StatTile label={t.studio.reportPage.duration} value={durationMin === null ? '—' : f.number(durationMin)} sub={durationMin === null ? undefined : t.common.min.replace('{n}', '')} />
        <StatTile label={t.studio.reportPage.chatMessages} value={f.number(chat.data?.length ?? 0)} />
        <StatTile
          label={t.studio.reportPage.recording}
          value={<span className="text-2xl">{session.recordingUrl ? '●' : '…'}</span>}
          sub={session.recordingUrl ? t.studio.reportPage.recordingReady : t.studio.reportPage.recordingProcessing}
        />
      </section>
      <Panel>
        <SectionHeader title={t.studio.reportPage.attendance} />
        {att.isPending ? (
          <LoadingBlock rows={4} height={48} />
        ) : att.isError ? (
          <ErrorState error={att.error} onRetry={() => void att.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title={t.studio.reportPage.noAttendance} />
        ) : (
          ((list) => (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.studio.batch.student}</TableHead>
                  <TableHead>{t.studio.reportPage.joined}</TableHead>
                  <TableHead>{t.studio.reportPage.left}</TableHead>
                  <TableHead>{t.studio.reportPage.minutes}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow key={r.user.id}>
                    <TableCell>
                      <span className="flex items-center gap-2.5">
                        <InitialsAvatar name={r.user.name} size={28} />
                        <bdi>{r.user.name}</bdi>
                      </span>
                    </TableCell>
                    <TableCell className="timecode">{r.firstJoinedAt ? f.time(r.firstJoinedAt) : '—'}</TableCell>
                    <TableCell className="timecode">{r.lastLeftAt ? f.time(r.lastLeftAt) : '—'}</TableCell>
                    <TableCell>{f.number(Math.round(r.seconds / 60))}</TableCell>
                    <TableCell>
                      <Chip tone={r.state === 'PRESENT' ? 'sage' : r.state === 'LATE' ? 'sun' : r.state === 'ABSENT' ? 'danger' : 'outline'}>{label[r.state]}</Chip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ))(rows)
        )}
      </Panel>
      {session.notes && (
        <Panel>
          <SectionHeader title={t.studio.reportPage.notes} size="sm" />
          <p className="whitespace-pre-line text-muted-foreground">{session.notes}</p>
        </Panel>
      )}
    </>
  );
}

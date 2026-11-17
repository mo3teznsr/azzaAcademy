import { certificateProgress } from '../certificates/certificate-eligibility';
import { rate } from '../reports/report-math';
import type { BatchStatus, SessionStatus } from '@azza/shared';

// Pure math behind the organization report: one row per learner on a seat, plus totals. No I/O.

export interface LiveSeatInput {
  kind: 'LIVE';
  learner: { id: string; name: string; email: string };
  packReference: string;
  title: string;
  /** Batch code. */
  code: string;
  batchStatus: BatchStatus;
  sessions: { id: string; status: SessionStatus }[];
  attendedSessionIds: Set<string>;
  certificateCode: string | null;
}

export interface RecordedSeatInput {
  kind: 'RECORDED';
  learner: { id: string; name: string; email: string };
  packReference: string;
  title: string;
  lessonIds: string[];
  completedLessonIds: Set<string>;
  certificateCode: string | null;
}

export interface OrgReportRow {
  learnerId: string;
  name: string;
  email: string;
  kind: 'LIVE' | 'RECORDED';
  packReference: string;
  title: string;
  code: string | null;
  /** Live: sessions attended / non-cancelled sessions held so far. Recorded: lessons completed / lessons. */
  done: number;
  total: number;
  /** Live: attended / sessions that have ENDED (what the learner could have attended so far). Recorded: lessons done / lessons. */
  progressRate: number;
  /** Live only: attended / ended sessions. Null for recorded seats. */
  attendanceRate: number | null;
  /** The class is over (live) or every lesson done (recorded). */
  finished: boolean;
  completed: boolean;
  certificateCode: string | null;
}

export function orgReportRow(seat: LiveSeatInput | RecordedSeatInput): OrgReportRow {
  const base = { learnerId: seat.learner.id, name: seat.learner.name, email: seat.learner.email, kind: seat.kind, packReference: seat.packReference, title: seat.title };
  if (seat.kind === 'LIVE') {
    const p = certificateProgress({ enrollmentStatus: 'ACTIVE', batchStatus: seat.batchStatus, sessions: seat.sessions, attendedSessionIds: seat.attendedSessionIds });
    const ended = seat.sessions.filter((s) => s.status === 'ENDED');
    const attendedEnded = ended.filter((s) => seat.attendedSessionIds.has(s.id)).length;
    const attendance = rate(attendedEnded, ended.length);
    return {
      ...base,
      code: seat.code,
      done: p.attended,
      total: p.total,
      progressRate: attendance,
      attendanceRate: attendance,
      finished: p.finished,
      completed: !!seat.certificateCode || p.eligible,
      certificateCode: seat.certificateCode,
    };
  }
  const done = seat.lessonIds.filter((id) => seat.completedLessonIds.has(id)).length;
  const total = seat.lessonIds.length;
  const finished = total > 0 && done === total;
  return {
    ...base,
    code: null,
    done,
    total,
    progressRate: rate(done, total),
    attendanceRate: null,
    finished,
    completed: !!seat.certificateCode || finished,
    certificateCode: seat.certificateCode,
  };
}

export interface OrgReportSummary {
  learners: number;
  /** Mean attendance of live seats with at least one ended session. */
  attendanceRate: number;
  /** Completed seats over the seats that can be judged: live seats whose class is over, and every recorded seat. */
  completionRate: number;
  certificates: number;
}

export function orgReportSummary(rows: OrgReportRow[]): OrgReportSummary {
  const live = rows.filter((r) => r.kind === 'LIVE' && r.attendanceRate !== null && r.total > 0);
  const judged = rows.filter((r) => r.kind === 'LIVE' ? r.finished : true);
  const meanAttendance = live.length ? live.reduce((s, r) => s + (r.attendanceRate ?? 0), 0) / live.length : 0;
  return {
    learners: new Set(rows.map((r) => r.learnerId)).size,
    attendanceRate: Math.round(meanAttendance * 10_000) / 10_000,
    completionRate: rate(judged.filter((r) => r.completed).length, judged.length),
    certificates: rows.filter((r) => r.certificateCode).length,
  };
}

const esc = (v: unknown) => {
  const s = String(v ?? '');
  // CSV injection: a cell that starts with = + - @ would run as a formula in Excel
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** CSV with a BOM, so Excel opens Arabic names correctly. Rates as percents with one decimal. */
export function orgReportCsv(rows: OrgReportRow[]): string {
  const pct = (r: number | null) => (r === null ? '' : (r * 100).toFixed(1));
  const header = ['name', 'email', 'type', 'pack', 'course', 'class', 'done', 'total', 'progress_percent', 'attendance_percent', 'finished', 'completed', 'certificate'];
  const lines = rows.map((r) =>
    [r.name, r.email, r.kind, r.packReference, r.title, r.code ?? '', r.done, r.total, pct(r.progressRate), pct(r.attendanceRate), r.finished ? 'yes' : 'no', r.completed ? 'yes' : 'no', r.certificateCode ?? '']
      .map(esc)
      .join(','),
  );
  return '﻿' + [header.join(','), ...lines].join('\n') + '\n';
}

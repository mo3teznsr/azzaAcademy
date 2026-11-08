import { passed } from '../quizzes/quiz-grader';
import type { BatchStatus, EnrollmentStatus, SessionStatus } from '@azza/shared';

/** Percent of the non-cancelled sessions a student must attend, rounded up (10 of 12). */
export const CERTIFICATE_ATTENDANCE_PERCENT = 80;

export const requiredSessions = (total: number) => Math.ceil((total * CERTIFICATE_ATTENDANCE_PERCENT) / 100);

export interface CertificateProgress {
  /** Non-cancelled sessions of the batch. */
  total: number;
  /** Non-cancelled sessions the student attended. */
  attended: number;
  /** Sessions to attend for a certificate (80 % of `total`, rounded up). */
  required: number;
  /** Sessions still to attend (0 once reached). */
  needed: number;
  /** Every non-cancelled session has ENDED, or the batch is COMPLETED. */
  finished: boolean;
  /** `needed` still fits in the sessions that have not ended yet. */
  reachable: boolean;
  eligible: boolean;
}

/**
 * Pure rule for issuing a completion certificate. A student with an ACTIVE enrollment is eligible once the batch
 * is over (every non-cancelled session ENDED, or the batch COMPLETED) and they attended ≥ 80 % of the
 * non-cancelled sessions. A batch without sessions never issues certificates.
 */
export function certificateProgress(args: {
  enrollmentStatus: EnrollmentStatus;
  batchStatus: BatchStatus;
  sessions: { id: string; status: SessionStatus }[];
  attendedSessionIds: Set<string>;
}): CertificateProgress {
  const counted = args.sessions.filter((s) => s.status !== 'CANCELLED');
  const total = counted.length;
  const attended = counted.filter((s) => args.attendedSessionIds.has(s.id)).length;
  const required = requiredSessions(total);
  const needed = Math.max(0, required - attended);
  const remaining = counted.filter((s) => s.status !== 'ENDED').length;
  const finished = args.batchStatus === 'COMPLETED' || (total > 0 && remaining === 0);
  const eligible = args.enrollmentStatus === 'ACTIVE' && finished && total > 0 && needed === 0;
  return { total, attended, required, needed, finished, reachable: needed <= (finished ? 0 : remaining), eligible };
}

/**
 * Pure rule for a recorded-course certificate: the course has lessons, every one of them is completed, and every
 * published quiz's best attempt reaches its pass mark. Only lessons and quizzes that exist today are passed in, so a lesson
 * deleted before the learner finished it no longer blocks them. A course without lessons is never eligible.
 */
export function recordedEligible(args: {
  lessonIds: string[];
  completedIds: Set<string>;
  quizzes: Array<{ passPercent: number; bestPercent: number | null }>;
}): boolean {
  return args.lessonIds.length > 0 && args.lessonIds.every((id) => args.completedIds.has(id)) && args.quizzes.every((q) => passed(q.bestPercent, q.passPercent));
}

import type { Role } from '@azza/shared';
import { BusinessRuleError, NotFoundError } from '../../core/errors';
import type { Clock } from '../../core/ports';
import type { BatchAccessPolicy } from '../batches/batch-access';
import type { Notifier } from '../notifications/notification.types';
import type { ContentRepository } from './content.repository';

type Viewer = { id: string; role: Role };

export class ContentService {
  constructor(
    private readonly repo: ContentRepository,
    private readonly access: BatchAccessPolicy,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
  ) {}

  private async assertSessionInBatch(sessionId: string | undefined, batchId: string) {
    if (!sessionId) return;
    const s = await this.repo.sessionBatch(sessionId);
    if (!s || s.batchId !== batchId) throw new BusinessRuleError('Session does not belong to this batch', 'SESSION_NOT_IN_BATCH');
  }

  async materials(batchId: string, viewer: Viewer) {
    await this.access.require(batchId, viewer, ['admin', 'teacher', 'student']);
    return { items: await this.repo.materials(batchId) };
  }

  async addMaterial(batchId: string, input: { sessionId?: string; title: string; url: string; kind: 'SLIDES' | 'FILE' | 'LINK' | 'VIDEO' }, viewer: Viewer) {
    await this.access.require(batchId, viewer, ['admin', 'teacher']);
    await this.assertSessionInBatch(input.sessionId, batchId);
    return this.repo.createMaterial({ batchId, ...input });
  }

  async assignments(batchId: string, viewer: Viewer) {
    const role = await this.access.require(batchId, viewer, ['admin', 'teacher', 'student']);
    const rows = await this.repo.assignments(batchId, role === 'student' ? viewer.id : undefined);
    return {
      items: rows.map(({ _count, ...a }) => {
        const mine = 'submissions' in a ? (a.submissions as unknown[])[0] ?? null : undefined;
        const { submissions: _s, ...rest } = a as typeof a & { submissions?: unknown };
        return { ...rest, submissionCount: _count.submissions, ...(mine !== undefined && { mySubmission: mine }) };
      }),
    };
  }

  async addAssignment(
    batchId: string,
    input: { sessionId?: string; title: string; description: string; dueAt: string; maxScore: number },
    viewer: Viewer,
  ) {
    await this.access.require(batchId, viewer, ['admin', 'teacher']);
    await this.assertSessionInBatch(input.sessionId, batchId);
    const assignment = await this.repo.createAssignment({ batchId, ...input, dueAt: new Date(input.dueAt) });
    return assignment;
  }

  async submissions(assignmentId: string, viewer: Viewer) {
    const a = await this.repo.findAssignment(assignmentId);
    if (!a) throw new NotFoundError('Assignment', assignmentId);
    await this.access.require(a.batchId, viewer, ['admin', 'teacher']);
    return { items: await this.repo.submissions(assignmentId) };
  }

  async submit(assignmentId: string, input: { url?: string; text?: string }, viewer: Viewer) {
    if (!input.url && !input.text) throw new BusinessRuleError('Add a link or some text', 'EMPTY_SUBMISSION');
    const a = await this.repo.findAssignment(assignmentId);
    if (!a) throw new NotFoundError('Assignment', assignmentId);
    await this.access.require(a.batchId, viewer, ['student']);
    const now = this.clock.now();
    const submission = await this.repo.upsertSubmission(assignmentId, viewer.id, input, now);
    return { ...submission, late: now > a.dueAt };
  }

  async grade(submissionId: string, input: { score: number; feedback?: string }, viewer: Viewer) {
    const sub = await this.repo.findSubmission(submissionId);
    if (!sub) throw new NotFoundError('Submission', submissionId);
    await this.access.require(sub.assignment.batchId, viewer, ['admin', 'teacher']);
    if (input.score > sub.assignment.maxScore) {
      throw new BusinessRuleError(`Score cannot exceed ${sub.assignment.maxScore}`, 'SCORE_TOO_HIGH');
    }
    const graded = await this.repo.grade(submissionId, input.score, input.feedback, this.clock.now());
    await this.notifier.notify([sub.userId], {
      type: 'SUBMISSION_GRADED',
      title: `Graded · ${sub.assignment.title}`,
      body: `${input.score}/${sub.assignment.maxScore}`,
      data: { submissionId, assignmentId: sub.assignmentId },
    }, { channels: ['in-app', 'realtime', 'push'] });
    return graded;
  }

  async recordings(viewer: Viewer) {
    return { items: await this.repo.recordings(viewer.id, viewer.role === 'TEACHER') };
  }
}

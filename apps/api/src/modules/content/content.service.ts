import type { Role, SubmissionFileInput, UpdateAssignmentInput } from '@azza/shared';
import { AppError, BusinessRuleError, NotFoundError } from '../../core/errors';
import type { Clock, FileStorage } from '../../core/ports';
import type { BatchAccessPolicy } from '../batches/batch-access';
import type { Notifier } from '../notifications/notification.types';
import type { ContentRepository } from './content.repository';
import { materialFile } from './material-file';
import { DOCUMENT_TYPES, submissionFile, type ContentFile } from './submission-file';

type Viewer = { id: string; role: Role };
type UploadedFile = { type: string; size: number; name: string; bytes: () => Promise<Uint8Array> };
export type StoredContentFile = { url: string; name: string; size: number; type: string };

/** A display name safe to store and echo back: no path, no control characters, ≤ 255 chars. */
export function cleanFileName(name: string, extension: string): string {
  const base = (name.split(/[\\/]/).pop() ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 255);
  return base || `file.${extension}`;
}

export class ContentService {
  constructor(
    private readonly repo: ContentRepository,
    private readonly access: BatchAccessPolicy,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
    private readonly storage?: FileStorage,
  ) {}

  /** Validate → store under `folder/` → `{ url, name, size, type }`. Nothing is stored for a bad file. */
  private async store(folder: string, file: UploadedFile, validate: (f: UploadedFile) => ContentFile): Promise<StoredContentFile> {
    const { extension, contentType } = validate(file);
    if (!this.storage) throw new AppError('File storage is not configured', 500, 'STORAGE_UNAVAILABLE');
    const stored = await this.storage.save({ folder, extension, contentType, bytes: await file.bytes() });
    return { url: stored.url, name: cleanFileName(file.name, extension), size: file.size, type: contentType };
  }

  /** The storage key behind `url` when it is one of our uploads in `folder/`, else `null`. */
  private ownKey(url: string, folder: string): string | null {
    const key = this.storage?.keyFromUrl(url) ?? null;
    return key?.startsWith(`${folder}/`) ? key : null;
  }

  async uploadMaterialFile(batchId: string, file: UploadedFile, viewer: Viewer) {
    await this.access.require(batchId, viewer, ['admin', 'teacher']);
    return this.store('materials', file, materialFile);
  }

  async uploadSubmissionFile(assignmentId: string, file: UploadedFile, viewer: Viewer) {
    const a = await this.repo.findAssignment(assignmentId);
    if (!a) throw new NotFoundError('Assignment', assignmentId);
    await this.access.require(a.batchId, viewer, ['student']);
    return this.store('submissions', file, submissionFile);
  }

  /** Only files this API stored under `submissions/`; the stored type comes from the key, not the client. */
  private submissionFiles(files: SubmissionFileInput[]): StoredContentFile[] {
    return files.map((f) => {
      const key = this.ownKey(f.url, 'submissions');
      const extension = key?.split('.').pop() ?? '';
      const type = DOCUMENT_TYPES[extension];
      if (!key || !type) {
        throw new BusinessRuleError('Attach files uploaded with POST /assignments/:id/submission/file', 'SUBMISSION_FILE_INVALID', { reason: 'FOREIGN_URL', url: f.url });
      }
      return { url: f.url, name: cleanFileName(f.name, extension), size: f.size, type };
    });
  }

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
    if (input.kind === 'FILE' && !this.ownKey(input.url, 'materials')) {
      throw new BusinessRuleError('FILE materials must be uploaded with POST /batches/:id/materials/file', 'MATERIAL_FILE_INVALID', { reason: 'FOREIGN_URL' });
    }
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

  async updateAssignment(assignmentId: string, input: UpdateAssignmentInput, viewer: Viewer) {
    const a = await this.repo.findAssignment(assignmentId);
    if (!a) throw new NotFoundError('Assignment', assignmentId);
    await this.access.require(a.batchId, viewer, ['admin', 'teacher']);
    if (input.sessionId) await this.assertSessionInBatch(input.sessionId, a.batchId);
    if (input.maxScore !== undefined && input.maxScore < a.maxScore) {
      const top = await this.repo.highestScore(assignmentId);
      if (top !== null && top > input.maxScore) {
        throw new BusinessRuleError(`A submission is already graded ${top}; the max score cannot go below it`, 'SCORE_TOO_HIGH', { highestScore: top });
      }
    }
    return this.repo.updateAssignment(assignmentId, {
      ...(input.sessionId !== undefined && { sessionId: input.sessionId }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.dueAt !== undefined && { dueAt: new Date(input.dueAt) }),
      ...(input.maxScore !== undefined && { maxScore: input.maxScore }),
    });
  }

  /** Hard delete (assignments have no soft delete), refused once anyone has submitted. */
  async deleteAssignment(assignmentId: string, viewer: Viewer) {
    const a = await this.repo.findAssignment(assignmentId);
    if (!a) throw new NotFoundError('Assignment', assignmentId);
    await this.access.require(a.batchId, viewer, ['admin', 'teacher']);
    const submissions = await this.repo.submissionCount(assignmentId);
    if (submissions > 0) {
      throw new AppError('Students have already submitted this assignment', 409, 'ASSIGNMENT_HAS_SUBMISSIONS', { submissions });
    }
    await this.repo.deleteAssignment(assignmentId);
    return { ok: true as const };
  }

  async submissions(assignmentId: string, viewer: Viewer) {
    const a = await this.repo.findAssignment(assignmentId);
    if (!a) throw new NotFoundError('Assignment', assignmentId);
    await this.access.require(a.batchId, viewer, ['admin', 'teacher']);
    return { items: await this.repo.submissions(assignmentId) };
  }

  async submit(assignmentId: string, input: { url?: string; text?: string; files?: SubmissionFileInput[] }, viewer: Viewer) {
    if (!input.url && !input.text && !input.files?.length) throw new BusinessRuleError('Add a link, some text or a file', 'EMPTY_SUBMISSION');
    const a = await this.repo.findAssignment(assignmentId);
    if (!a) throw new NotFoundError('Assignment', assignmentId);
    await this.access.require(a.batchId, viewer, ['student']);
    const files = input.files && this.submissionFiles(input.files);
    const now = this.clock.now();
    const submission = await this.repo.upsertSubmission(assignmentId, viewer.id, { url: input.url, text: input.text, ...(files && { files }) }, now);
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

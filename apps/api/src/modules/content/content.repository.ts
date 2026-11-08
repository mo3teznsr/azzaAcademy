import type { Db } from '../../infrastructure/db';

export type SubmissionFileRecord = { url: string; name: string; size: number; type: string };

export class PrismaContentRepository {
  constructor(private readonly db: Db) {}

  sessionBatch(sessionId: string) {
    return this.db.liveSession.findUnique({ where: { id: sessionId }, select: { batchId: true } });
  }

  materials(batchId: string) {
    return this.db.material.findMany({
      where: { batchId },
      orderBy: { createdAt: 'asc' },
      include: { session: { select: { id: true, number: true, title: true } } },
    });
  }

  createMaterial(data: { batchId: string; sessionId?: string; title: string; url: string; kind: 'SLIDES' | 'FILE' | 'LINK' | 'VIDEO' }) {
    return this.db.material.create({ data });
  }

  assignments(batchId: string, studentId?: string) {
    return this.db.assignment.findMany({
      where: { batchId },
      orderBy: { dueAt: 'asc' },
      include: {
        session: { select: { id: true, number: true, title: true } },
        _count: { select: { submissions: true } },
        ...(studentId && { submissions: { where: { userId: studentId } } }),
      },
    });
  }

  createAssignment(data: { batchId: string; sessionId?: string; title: string; description: string; dueAt: Date; maxScore: number }) {
    return this.db.assignment.create({ data });
  }

  findAssignment(id: string) {
    return this.db.assignment.findUnique({ where: { id } });
  }

  updateAssignment(id: string, data: { sessionId?: string | null; title?: string; description?: string; dueAt?: Date; maxScore?: number }) {
    return this.db.assignment.update({ where: { id }, data });
  }

  async deleteAssignment(id: string) {
    await this.db.assignment.delete({ where: { id } });
  }

  submissionCount(assignmentId: string) {
    return this.db.submission.count({ where: { assignmentId } });
  }

  async highestScore(assignmentId: string): Promise<number | null> {
    return (await this.db.submission.aggregate({ where: { assignmentId }, _max: { score: true } }))._max.score;
  }

  submissions(assignmentId: string) {
    return this.db.submission.findMany({
      where: { assignmentId },
      orderBy: { submittedAt: 'asc' },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });
  }

  /** `files` replaces the stored list when given and is left alone otherwise (like `url` / `text`). */
  upsertSubmission(assignmentId: string, userId: string, data: { url?: string; text?: string; files?: SubmissionFileRecord[] }, at: Date) {
    return this.db.submission.upsert({
      where: { assignmentId_userId: { assignmentId, userId } },
      create: { assignmentId, userId, ...data, submittedAt: at },
      update: { ...data, submittedAt: at, score: null, gradedAt: null },
    });
  }

  findSubmission(id: string) {
    return this.db.submission.findUnique({ where: { id }, include: { assignment: true } });
  }

  grade(id: string, score: number, feedback: string | undefined, at: Date) {
    return this.db.submission.update({ where: { id }, data: { score, feedback, gradedAt: at } });
  }

  recordings(userId: string, asTeacher: boolean) {
    return this.db.liveSession.findMany({
      where: {
        recordingUrl: { not: null },
        ...(asTeacher
          ? { OR: [{ hostId: userId }, { batch: { teacherId: userId } }] }
          : { batch: { enrollments: { some: { userId, status: 'ACTIVE' } } } }),
      },
      orderBy: { startsAt: 'desc' },
      select: {
        id: true,
        number: true,
        title: true,
        startsAt: true,
        endedAt: true,
        recordingUrl: true,
        batch: { select: { id: true, code: true, course: { select: { id: true, titleEn: true, titleAr: true, coverStyle: true, coverImageUrl: true, introVideoUrl: true } } } },
      },
    });
  }
}

export type ContentRepository = PrismaContentRepository;

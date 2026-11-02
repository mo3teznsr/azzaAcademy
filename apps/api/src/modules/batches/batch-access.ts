import type { EnrollmentStatus, Role } from '@azza/shared';
import { ForbiddenError, NotFoundError } from '../../core/errors';
import type { Db } from '../../infrastructure/db';

export type BatchRole = 'admin' | 'teacher' | 'student';

export interface BatchAccessRepository {
  /** null when the batch does not exist. */
  teacherOf(batchId: string): Promise<string | null>;
  enrollmentStatus(userId: string, batchId: string): Promise<EnrollmentStatus | null>;
}

export class PrismaBatchAccessRepository implements BatchAccessRepository {
  constructor(private readonly db: Db) {}
  async teacherOf(batchId: string) {
    return (await this.db.batch.findUnique({ where: { id: batchId }, select: { teacherId: true } }))?.teacherId ?? null;
  }
  async enrollmentStatus(userId: string, batchId: string) {
    const row = await this.db.enrollment.findUnique({ where: { userId_batchId: { userId, batchId } }, select: { status: true } });
    return row?.status ?? null;
  }
}

/** Who is this user inside a batch? Shared by sessions, content and roster endpoints. */
export class BatchAccessPolicy {
  constructor(private readonly repo: BatchAccessRepository) {}

  async roleIn(batchId: string, user: { id: string; role: Role }): Promise<BatchRole | null> {
    const teacherId = await this.repo.teacherOf(batchId);
    if (teacherId === null) throw new NotFoundError('Batch', batchId);
    if (user.role === 'ADMIN') return 'admin';
    if (teacherId === user.id) return 'teacher';
    return (await this.repo.enrollmentStatus(user.id, batchId)) === 'ACTIVE' ? 'student' : null;
  }

  async require(batchId: string, user: { id: string; role: Role }, allowed: BatchRole[]): Promise<BatchRole> {
    const role = await this.roleIn(batchId, user);
    if (!role || !allowed.includes(role)) throw new ForbiddenError();
    return role;
  }
}

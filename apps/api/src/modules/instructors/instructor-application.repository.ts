import type { InstructorApplicationInput } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import type { ApplicationRecord, ApplicationRepository, ApplicationStatus } from './instructor-application.service';

const include = { user: { select: { id: true, name: true, email: true, image: true } } };

export class PrismaApplicationRepository implements ApplicationRepository {
  constructor(private readonly db: Db) {}

  latestFor(userId: string) {
    return this.db.instructorApplication.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, include }) as Promise<ApplicationRecord | null>;
  }

  find(id: string) {
    return this.db.instructorApplication.findUnique({ where: { id }, include }) as Promise<ApplicationRecord | null>;
  }

  list(status?: ApplicationStatus) {
    return this.db.instructorApplication.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
      include,
    }) as Promise<ApplicationRecord[]>;
  }

  create(userId: string, input: InstructorApplicationInput) {
    return this.db.instructorApplication.create({ data: { ...input, userId }, include }) as Promise<ApplicationRecord>;
  }

  decide(id: string, d: { approve: boolean; note: string | null; adminId: string; at: Date }) {
    return this.db.$transaction(async (tx) => {
      const app = await tx.instructorApplication.update({
        where: { id },
        data: { status: d.approve ? 'APPROVED' : 'REJECTED', reviewNote: d.note, decidedById: d.adminId, decidedAt: d.at },
        include,
      });
      if (d.approve) {
        const user = await tx.user.findUniqueOrThrow({ where: { id: app.userId }, select: { headline: true, bio: true } });
        await tx.user.update({
          where: { id: app.userId },
          data: { role: 'TEACHER', headline: user.headline ?? app.headline, bio: user.bio ?? app.bio },
        });
      }
      return app as ApplicationRecord;
    });
  }
}

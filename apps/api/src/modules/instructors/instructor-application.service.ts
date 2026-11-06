import type { InstructorApplicationInput, ReviewDecisionInput, Role } from '@azza/shared';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../core/errors';
import type { Notifier } from '../notifications/notification.types';

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApplicationRecord {
  id: string;
  userId: string;
  headline: string;
  bio: string;
  categories: string[];
  languages: string[];
  experience: string;
  sampleUrl: string | null;
  phone: string | null;
  status: ApplicationStatus;
  reviewNote: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  user: { id: string; name: string; email: string; image: string | null };
}

export interface ApplicationRepository {
  latestFor(userId: string): Promise<ApplicationRecord | null>;
  find(id: string): Promise<ApplicationRecord | null>;
  list(status?: ApplicationStatus): Promise<ApplicationRecord[]>;
  create(userId: string, input: InstructorApplicationInput): Promise<ApplicationRecord>;
  /** Marks the decision; on approval also promotes the user to TEACHER and fills an empty public profile. */
  decide(id: string, d: { approve: boolean; note: string | null; adminId: string; at: Date }): Promise<ApplicationRecord>;
}

type Actor = { id: string; role: Role };

/** "Join as instructor": learners apply, admins approve (→ TEACHER) or decline with a note. */
export class InstructorApplicationService {
  constructor(
    private readonly repo: ApplicationRepository,
    private readonly notifier: Notifier,
    private readonly now: () => Date = () => new Date(),
  ) {}

  mine(actor: Actor) {
    return this.repo.latestFor(actor.id);
  }

  async apply(input: InstructorApplicationInput, actor: Actor) {
    if (actor.role !== 'STUDENT') throw new BusinessRuleError('You can already teach on Azza', 'ALREADY_INSTRUCTOR');
    const last = await this.repo.latestFor(actor.id);
    if (last?.status === 'PENDING') throw new ConflictError('Your application is already being reviewed');
    const app = await this.repo.create(actor.id, input);
    await this.notifier.notifyRole('ADMIN', {
      type: 'INSTRUCTOR_APPLIED',
      title: 'New instructor application',
      body: `${app.user.name} — ${app.headline}`,
      data: { applicationId: app.id },
    });
    return app;
  }

  list(status?: ApplicationStatus) {
    return this.repo.list(status).then((items) => ({ items }));
  }

  async review(id: string, decision: ReviewDecisionInput, admin: Actor) {
    const app = await this.repo.find(id);
    if (!app) throw new NotFoundError('Application', id);
    if (app.status !== 'PENDING') throw new BusinessRuleError('This application was already decided', 'APPLICATION_DECIDED');
    const decided = await this.repo.decide(id, { approve: decision.approve, note: decision.note ?? null, adminId: admin.id, at: this.now() });
    await this.notifier.notify([app.userId], decision.approve
      ? { type: 'INSTRUCTOR_APPROVED', title: "You're an instructor on Azza", body: 'Sign in again if needed, then propose your first course from the studio.', data: { applicationId: id } }
      : { type: 'INSTRUCTOR_DECLINED', title: 'About your instructor application', body: decision.note ?? '', data: { applicationId: id } });
    return decided;
  }
}

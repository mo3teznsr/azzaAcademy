import type { InstructorApplicationInput, ReviewDecisionInput, Role } from '@azza/shared';
import { BusinessRuleError, NotFoundError } from '../../core/errors';
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
  /** Marks the decision; on approval also promotes the user to TEACHER and fills an empty public profile. `adminId` is null for a self-serve sign-up. */
  decide(id: string, d: { approve: boolean; note: string | null; adminId: string | null; at: Date }): Promise<ApplicationRecord>;
}

type Actor = { id: string; role: Role };

/**
 * "Join as instructor": self-serve. A learner fills in their teaching profile and becomes a TEACHER at once; quality is
 * gated at the course level instead (every course is reviewed before it opens). Admins are told who joined, and the
 * review path stays for applications sent before sign-up became instant.
 */
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
    // An application left pending from before sign-up became instant is approved as it stands.
    const open = last?.status === 'PENDING' ? last : await this.repo.create(actor.id, input);
    const app = await this.repo.decide(open.id, { approve: true, note: null, adminId: null, at: this.now() });
    await this.notifier.notify([app.userId], {
      type: 'INSTRUCTOR_APPROVED',
      title: 'Welcome to teaching on Azza',
      body: 'Your teacher account is ready. Build your first course in the studio and send it for review.',
      ar: { title: 'أهلًا بك مدرّسًا في عازة', body: 'حساب التدريس جاهز. أنشئ دورتك الأولى في الاستوديو وأرسلها للمراجعة.' },
      data: { applicationId: app.id },
    });
    await this.notifier.notifyRole('ADMIN', {
      type: 'INSTRUCTOR_APPLIED',
      title: 'New teacher joined',
      body: `${app.user.name} — ${app.headline}`,
      ar: { title: 'انضم مدرّس جديد', body: `${app.user.name} — ${app.headline}` },
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
      ? {
          type: 'INSTRUCTOR_APPROVED',
          title: "You're an instructor on Azza",
          body: 'Sign in again if needed, then propose your first course from the studio.',
          ar: { title: 'أصبحت مدرّسًا في عازة', body: 'سجّل الدخول من جديد إن لزم، ثم اقترح دورتك الأولى من الاستوديو.' },
          data: { applicationId: id },
        }
      : {
          type: 'INSTRUCTOR_DECLINED',
          title: 'About your instructor application',
          body: decision.note ?? '',
          ar: { title: 'بخصوص طلبك للتدريس', body: decision.note ?? '' },
          data: { applicationId: id },
        });
    return decided;
  }
}

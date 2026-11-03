import type { DateRangeQuery, RegisterDeviceInput, Role, UpdateProfileInput } from '@azza/shared';
import { ForbiddenError, NotFoundError } from '../../core/errors';
import type { Clock } from '../../core/ports';
import { addDays, isoDay, addHours } from '../../core/time';
import type { MeRepository } from './me.repository';

export class MeService {
  constructor(
    private readonly repo: MeRepository,
    private readonly clock: Clock,
  ) {}

  async profile(userId: string) {
    const user = await this.repo.profile(userId);
    if (!user) throw new NotFoundError('User', userId);
    const now = this.clock.now();
    return { ...user, counts: await this.repo.counts(userId, now, addHours(now, 24 * 7)) };
  }

  /** `headline`/`bio` feed the public teacher profile, so only teachers (and admins) may set them. */
  updateProfile(user: { id: string; role: Role }, input: UpdateProfileInput) {
    if (user.role === 'STUDENT' && (input.headline !== undefined || input.bio !== undefined)) {
      throw new ForbiddenError('Only teachers have a public profile');
    }
    return this.repo.updateProfile(user.id, input);
  }

  registerDevice(userId: string, input: RegisterDeviceInput) {
    return this.repo.upsertDevice(userId, input.token, input.platform);
  }

  async removeDevice(userId: string, token: string) {
    if (!(await this.repo.deleteDevice(userId, token))) throw new NotFoundError('Device', token);
    return { ok: true };
  }

  /** Default window: from the start of today (UTC) for 30 days. */
  async schedule(user: { id: string; role: Role }, range: DateRangeQuery) {
    const now = this.clock.now();
    const from = range.from ? new Date(range.from) : new Date(`${isoDay(now)}T00:00:00.000Z`);
    const to = range.to ? new Date(range.to) : new Date(`${addDays(isoDay(from), 30)}T00:00:00.000Z`);
    const scope = user.role === 'STUDENT' ? 'student' : user.role === 'TEACHER' ? 'teacher' : 'all';
    const items = await this.repo.schedule(user.id, scope, from, to);
    return { from: from.toISOString(), to: to.toISOString(), items };
  }

  enrollments(userId: string) {
    return this.repo.enrollments(userId, this.clock.now());
  }
}

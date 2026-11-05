import type { DateRangeQuery, RegisterDeviceInput, Role, UpdateProfileInput } from '@azza/shared';
import { AppError, ForbiddenError, NotFoundError } from '../../core/errors';
import type { Clock, FileStorage } from '../../core/ports';
import { avatarExtension } from './avatar-file';
import { addDays, isoDay, addHours } from '../../core/time';
import { canDeleteAccount, type AccountDeletionRefusal } from './account-deletion';
import type { MeRepository } from './me.repository';

const REFUSAL_MESSAGES: Record<AccountDeletionRefusal, string> = {
  ADMIN_ACCOUNT: 'Admin accounts cannot be deleted from the app; ask another admin to remove the role first',
  HAS_ACTIVE_TEACHING: 'You are assigned to batches or upcoming sessions; ask an admin to reassign them first',
  HAS_UNPAID_EARNINGS: 'You have earnings or payouts that are not settled yet',
  ORDER_IN_PROGRESS: 'A bank transfer of yours is being reviewed; wait for it to be settled',
};

export class MeService {
  constructor(
    private readonly repo: MeRepository,
    private readonly clock: Clock,
    /** Frees seats of cancelled enrollments (waitlist promotion, FULL → ENROLLING). */
    private readonly seats: { release(batchId: string): Promise<unknown> },
    /** Where profile photos go (local disk in dev, S3 in production). */
    private readonly storage?: FileStorage,
  ) {}

  /** Profile photo: validate → store under `avatars/` → set `User.image`. Teachers see it on rosters and in the room. */
  async uploadAvatar(userId: string, file: { type: string; size: number; bytes: () => Promise<Uint8Array> }) {
    if (!this.storage) throw new AppError('File storage is not configured', 500, 'STORAGE_UNAVAILABLE');
    const extension = avatarExtension(file);
    const stored = await this.storage.save({ folder: 'avatars', extension, contentType: file.type, bytes: await file.bytes() });
    return this.repo.setImage(userId, stored.url);
  }

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

  /** `DELETE /me`: refuse if erasing would break others' data, otherwise erase in one transaction. */
  async deleteAccount(user: { id: string; role: Role }) {
    const verdict = canDeleteAccount({ role: user.role, ...(await this.repo.deletionFacts(user.id, this.clock.now())) });
    if (!verdict.ok) throw new AppError(REFUSAL_MESSAGES[verdict.code], 409, verdict.code);
    const freed = await this.repo.eraseAccount(user.id);
    for (const batchId of freed) await this.seats.release(batchId);
    return { ok: true, deleted: true };
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

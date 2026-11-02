import type { AdminCreateUserInput, AdminUpdateUserInput, Role } from '@azza/shared';
import type { UserProvisioner } from '../../auth/user-provisioner';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../core/errors';
import type { Clock, VideoProvider } from '../../core/ports';
import { addDays, addHours, isoDay, zonedToUtc } from '../../core/time';
import type { AdminRepository } from './admin.repository';

/** Operations dashboards are reported in the platform's home timezone. */
const HOME_TZ = 'Asia/Dubai';

const localDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: HOME_TZ }).format(d);

export class AdminService {
  constructor(
    private readonly repo: AdminRepository,
    private readonly provisioner: UserProvisioner,
    private readonly video: VideoProvider,
    private readonly clock: Clock,
  ) {}

  async dashboard() {
    const now = this.clock.now();
    const today = localDay(now);
    const dayStart = zonedToUtc(today, '00:00', HOME_TZ);
    const dayEnd = zonedToUtc(addDays(today, 1), '00:00', HOME_TZ);
    const monthStart = zonedToUtc(`${today.slice(0, 8)}01`, '00:00', HOME_TZ);
    const c = await this.repo.dashboardCounts(dayStart, dayEnd, monthStart, addHours(now, 6), now);
    const capacity = c.activeBatches.reduce((s, b) => s + b.capacity, 0);
    const sum = c.revenue._sum;

    const alerts = [
      c.transfersToVerify && { type: 'TRANSFERS_TO_VERIFY', severity: 'warning', count: c.transfersToVerify },
      c.holdsExpiringSoon && { type: 'SEAT_HOLDS_EXPIRING', severity: 'info', count: c.holdsExpiringSoon },
      c.bankUnverified && { type: 'TEACHER_BANK_UNVERIFIED', severity: 'warning', count: c.bankUnverified },
      c.heldPayouts && { type: 'PAYOUTS_HELD', severity: 'warning', count: c.heldPayouts },
    ].filter(Boolean);

    return {
      date: today,
      liveRooms: c.liveSessions,
      sessionsToday: { count: c.sessionsToday.length, items: c.sessionsToday },
      activeBatches: c.activeBatches.length,
      seats: { held: c.seatsHeld, capacity, filledPercent: capacity ? Math.round((c.seatsHeld / capacity) * 100) : 0 },
      revenueMonth: {
        grossFils: sum.totalFils ?? 0,
        refundedFils: sum.refundedFils ?? 0,
        vatFils: sum.vatFils ?? 0,
        netFils: (sum.totalFils ?? 0) - (sum.refundedFils ?? 0),
        orders: c.revenue._count,
      },
      alerts,
    };
  }

  listUsers(filter: { role?: Role; q?: string; skip: number; take: number }) {
    return this.repo.listUsers(filter);
  }

  async createUser(input: AdminCreateUserInput) {
    if (await this.repo.findUserByEmail(input.email)) throw new ConflictError(`${input.email} already has an account`);
    const { id } = await this.provisioner.createInvited(input);
    return this.repo.findUser(id);
  }

  async updateUser(id: string, input: AdminUpdateUserInput, actorId: string) {
    if (!(await this.repo.findUser(id))) throw new NotFoundError('User', id);
    if (id === actorId && (input.banned || (input.role && input.role !== 'ADMIN'))) {
      throw new BusinessRuleError('You cannot ban yourself or remove your own admin role', 'SELF_LOCKOUT');
    }
    const user = await this.repo.updateUser(id, input);
    if (input.banned) await this.repo.revokeLogins(id);
    return user;
  }

  /** LiveKit's view of open rooms joined with our sessions (LIVE sessions without a room show 0 participants). */
  async liveRooms() {
    const rooms = await this.video.listRooms().catch((err) => {
      console.error('[admin] listRooms failed', err);
      return [];
    });
    const byName = new Map(rooms.map((r) => [r.name, r]));
    const sessions = await this.repo.sessionsByRoom(rooms.map((r) => r.name));
    const items = sessions.map((s) => {
      const room = byName.get(s.roomName);
      return {
        session: s,
        roomName: s.roomName,
        participants: room?.numParticipants ?? 0,
        recording: room?.recording ?? false,
        roomOpen: !!room,
        roomCreatedAt: room?.createdAt ?? null,
      };
    });
    const known = new Set(sessions.map((s) => s.roomName));
    const orphanRooms = rooms.filter((r) => !known.has(r.name));
    return { items, orphanRooms, at: isoDay(this.clock.now()) };
  }
}

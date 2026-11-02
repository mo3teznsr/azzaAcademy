import type { EnrollmentStatus, Role, SessionStatus } from '@azza/shared';
import { BusinessRuleError, ForbiddenError } from '../../core/errors';
import { addMinutes } from '../../core/time';

export const LOBBY_OPENS_MIN = 15;
/** A SCHEDULED session nobody started is considered over this long after its planned end. */
export const LATE_JOIN_GRACE_MIN = 30;

export type ClassroomRole = 'host' | 'student' | 'observer';

export interface JoinContext {
  session: { status: SessionStatus; startsAt: Date; endsAt: Date; hostId: string | null; batchTeacherId: string };
  user: { id: string; role: Role };
  enrollmentStatus: EnrollmentStatus | null;
  /** The host granted this student the floor earlier in the session. */
  allowedToSpeak?: boolean;
  now: Date;
}

export interface JoinDecision {
  role: ClassroomRole;
  isHost: boolean;
  canPublish: boolean;
  canPublishData: boolean;
  hidden: boolean;
}

/** Pure: who may enter a live room, when, and with which LiveKit permissions. */
export class JoinPolicy {
  /** Classroom role without timing rules (used for chat, history, socket rooms). */
  roleFor(ctx: Omit<JoinContext, 'now'>): ClassroomRole | null {
    const { session, user } = ctx;
    if (user.id === session.hostId || user.id === session.batchTeacherId) return 'host';
    if (user.role === 'ADMIN') return 'observer';
    return ctx.enrollmentStatus === 'ACTIVE' ? 'student' : null;
  }

  decide(ctx: JoinContext): JoinDecision {
    const { session, now } = ctx;
    if (session.status === 'CANCELLED') throw new BusinessRuleError('This session was cancelled', 'SESSION_CANCELLED');
    if (session.status === 'ENDED') throw new BusinessRuleError('This session has ended', 'SESSION_ENDED');

    const role = this.roleFor(ctx);
    if (!role) throw new ForbiddenError('An active enrollment in this batch is required to join');

    if (session.status !== 'LIVE') {
      const opensAt = addMinutes(session.startsAt, -LOBBY_OPENS_MIN);
      if (now < opensAt) {
        throw new BusinessRuleError('The lobby opens 15 minutes before the session starts', 'LOBBY_NOT_OPEN', {
          opensAt: opensAt.toISOString(),
        });
      }
      if (now > addMinutes(session.endsAt, LATE_JOIN_GRACE_MIN)) throw new BusinessRuleError('This session has ended', 'SESSION_ENDED');
    }

    switch (role) {
      case 'host':
        return { role, isHost: true, canPublish: true, canPublishData: true, hidden: false };
      case 'observer':
        return { role, isHost: false, canPublish: false, canPublishData: false, hidden: true };
      case 'student':
        return { role, isHost: false, canPublish: ctx.allowedToSpeak ?? false, canPublishData: true, hidden: false };
    }
  }
}

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

/** `session`: the real LiveKit room. `demo`: a private room for an App Review demo account (see DemoReviewers). */
export type JoinRoom = 'session' | 'demo';

export interface JoinPlan extends JoinDecision {
  room: JoinRoom;
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

  /**
   * `decide` plus the App Review demo exception. Real users (`demoReviewer` falsy) get exactly `decide`'s answer in
   * the real room. A demo reviewer who is an ACTIVE student of the batch may enter a SCHEDULED session at any time —
   * no lobby clock, no host needed — into a private demo room where they can publish (to try camera and mic).
   * Cancelled/ended sessions, missing enrollment and LIVE sessions (real room, normal student rights) are unchanged.
   */
  plan(ctx: JoinContext & { demoReviewer?: boolean }): JoinPlan {
    if (ctx.demoReviewer && ctx.session.status === 'SCHEDULED' && this.roleFor(ctx) === 'student') {
      return { role: 'student', isHost: false, canPublish: true, canPublishData: true, hidden: false, room: 'demo' };
    }
    return { ...this.decide(ctx), room: 'session' };
  }

  /** Status a client should see: a demo reviewer's SCHEDULED session reads as LIVE so the app lets them in. */
  viewStatus(status: SessionStatus, role: ClassroomRole | null, demoReviewer: boolean): SessionStatus {
    return demoReviewer && role === 'student' && status === 'SCHEDULED' ? 'LIVE' : status;
  }
}

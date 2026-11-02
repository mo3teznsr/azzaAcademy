import type { DecideRescheduleRequestInput, RescheduleRequestStatus, RescheduleSessionInput, Role } from '@azza/shared';
import { BusinessRuleError, NotFoundError } from '../../core/errors';
import type { Clock } from '../../core/ports';
import { formatInZone } from '../../core/time';
import type { Notifier } from '../notifications/notification.types';
import type { RescheduleRequestRepository } from './reschedule-request.repository';

type Actor = { id: string; name: string; role: Role };

/** The one SessionService capability this service needs: an ADMIN move of the session (ISP). */
export interface SessionMover {
  reschedule(id: string, input: RescheduleSessionInput, user: Actor): Promise<{ requested: boolean; session: unknown }>;
}

/** Admin review of host reschedule requests. Filing a request lives in SessionService.reschedule. */
export class RescheduleRequestService {
  constructor(
    private readonly repo: RescheduleRequestRepository,
    private readonly sessions: SessionMover,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
  ) {}

  /** ADMIN sees every request; a TEACHER only their own. Newest first. */
  async list(user: Actor, status?: RescheduleRequestStatus) {
    const items = await this.repo.list({ status, ...(user.role !== 'ADMIN' && { requestedById: user.id }) });
    return { items };
  }

  private async pending(id: string) {
    const request = await this.repo.find(id);
    if (!request) throw new NotFoundError('Reschedule request', id);
    if (request.status !== 'PENDING') {
      throw new BusinessRuleError(`This request was already ${request.status.toLowerCase()}`, 'REQUEST_ALREADY_DECIDED', { status: request.status });
    }
    return request;
  }

  /** Moves the session (same rules as an admin reschedule: 409 on teacher clash, 422 if not SCHEDULED / in the past). */
  async approve(id: string, input: DecideRescheduleRequestInput, admin: Actor) {
    const request = await this.pending(id);
    const durationMin = Math.round((request.endsAt.getTime() - request.startsAt.getTime()) / 60_000);
    const { session } = await this.sessions.reschedule(
      request.sessionId,
      { startsAt: request.startsAt.toISOString(), durationMin, reason: input.reason ?? request.reason ?? undefined, notifyStudents: input.notifyStudents },
      admin,
    );
    const decided = await this.repo.decide(id, { status: 'APPROVED', decidedById: admin.id, decidedAt: this.clock.now(), decisionNote: input.reason ?? null });
    await this.notifier.notify([request.requestedById], {
      type: 'SESSION_RESCHEDULE_APPROVED',
      title: `Reschedule approved · ${request.session.batch.code} S${String(request.session.number).padStart(2, '0')}`,
      body: `"${request.session.title}" now starts ${formatInZone(request.startsAt, request.session.batch.timezone)}`,
      data: { sessionId: request.sessionId, requestId: id },
    });
    return { request: decided, session };
  }

  async decline(id: string, input: DecideRescheduleRequestInput, admin: Actor) {
    const request = await this.pending(id);
    const decided = await this.repo.decide(id, { status: 'DECLINED', decidedById: admin.id, decidedAt: this.clock.now(), decisionNote: input.reason ?? null });
    await this.notifier.notify([request.requestedById], {
      type: 'SESSION_RESCHEDULE_DECLINED',
      title: `Reschedule declined · ${request.session.batch.code} S${String(request.session.number).padStart(2, '0')}`,
      body: input.reason ? `"${request.session.title}" stays as planned — ${input.reason}` : `"${request.session.title}" stays as planned`,
      data: { sessionId: request.sessionId, requestId: id },
    });
    return { request: decided };
  }
}

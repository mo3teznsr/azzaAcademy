import {
  SOCKET_EVENTS,
  type CancelSessionInput,
  type ChatMessageEvent,
  type HandQueueEvent,
  type RescheduleSessionInput,
  type Role,
  type UpdateAttendanceInput,
  type SessionStatusEvent,
} from '@azza/shared';
import type { z } from 'zod';
import type { sessionFeedbackInput, updateAgendaInput } from '@azza/shared';
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from '../../core/errors';
import type { Clock, RealtimeBroadcaster, VideoProvider, VideoWebhookEvent } from '../../core/ports';
import { addMinutes, formatInZone } from '../../core/time';
import { appEmails } from '../notifications/email-templates';
import type { Notifier } from '../notifications/notification.types';
import type { ClassroomState } from './classroom-state';
import { DemoReviewers, demoRoomName } from './demo-reviewers';
import type { ClassroomRole, JoinPolicy } from './join-policy';
import type { SessionCore, SessionRepository } from './session.repository';

/** `email` identifies App Review demo accounts (DemoReviewers); callers without it are never treated as demo. */
type Actor = { id: string; name: string; role: Role; email?: string };

/** Persists a host's reschedule request (implemented by PrismaRescheduleRequestRepository). */
export interface RescheduleRequestLog {
  create(
    input: { sessionId: string; requestedById: string; startsAt: Date; endsAt: Date; reason: string | null },
    at: Date,
  ): Promise<{ id: string }>;
}

/** Called when a session is delivered (ENDED). Implemented by the payouts module (DIP). */
export interface EarningsAccrual {
  accrueForSession(sessionId: string): Promise<unknown>;
}

export class SessionService {
  constructor(
    private readonly repo: SessionRepository,
    private readonly policy: JoinPolicy,
    private readonly classroom: ClassroomState,
    private readonly video: VideoProvider,
    private readonly realtime: RealtimeBroadcaster,
    private readonly notifier: Notifier,
    private readonly earnings: EarningsAccrual,
    private readonly clock: Clock,
    private readonly requests: RescheduleRequestLog,
    private readonly demo: DemoReviewers = DemoReviewers.none(),
  ) {}

  private isDemo(user: { email?: string }) {
    return this.demo.isDemo(user.email);
  }

  /** A demo reviewer in a session that isn't really live: their classroom activity stays private (see `join`). */
  private inDemoRoom(s: SessionCore, user: { email?: string }) {
    return s.status !== 'LIVE' && this.isDemo(user);
  }

  // ───────── access ─────────

  private async load(id: string): Promise<SessionCore> {
    const s = await this.repo.findCore(id);
    if (!s) throw new NotFoundError('Session', id);
    return s;
  }

  private async roleOf(s: SessionCore, user: { id: string; role: Role }): Promise<ClassroomRole | null> {
    const enrollmentStatus = user.role === 'ADMIN' ? null : await this.repo.enrollmentStatus(user.id, s.batchId);
    return this.policy.roleFor({
      session: { ...s, batchTeacherId: s.batch.teacherId },
      user,
      enrollmentStatus,
    });
  }

  private async requireRole(s: SessionCore, user: { id: string; role: Role }, allowed: ClassroomRole[]) {
    const role = await this.roleOf(s, user);
    if (!role || !allowed.includes(role)) throw new ForbiddenError();
    return role;
  }

  /** Used by the socket layer to authorize `session:join`. */
  async participantRole(sessionId: string, user: { id: string; role: Role }) {
    const s = await this.load(sessionId);
    return this.requireRole(s, user, ['host', 'student', 'observer']);
  }

  // ───────── reads ─────────

  async get(id: string, user: Actor) {
    const s = await this.load(id);
    const myRole = await this.requireRole(s, user, ['host', 'student', 'observer']);
    const detail = await this.repo.findDetail(id);
    const status = this.policy.viewStatus(s.status, myRole, this.isDemo(user));
    if (status !== detail!.status) {
      // App Review demo: present the session as live so the lobby offers "Join" (the stored session is untouched).
      return { ...detail!, status, startedAt: detail!.startedAt ?? this.clock.now(), myRole };
    }
    return { ...detail!, myRole };
  }

  async messages(id: string, user: Actor, opts: { before?: string; limit: number }) {
    const s = await this.load(id);
    await this.requireRole(s, user, ['host', 'student', 'observer']);
    const rows = await this.repo.listMessages(id, opts.before ? new Date(opts.before) : undefined, opts.limit);
    return { items: rows.reverse() };
  }

  async attendance(id: string, user: Actor) {
    const s = await this.load(id);
    await this.requireRole(s, user, ['host', 'observer']);
    const { students, rows, marks } = await this.repo.attendance(id, s.batchId);
    const items = students.map((student) => {
      const mine = rows.filter((r) => r.userId === student.id);
      // A saved correction wins over the LiveKit join log.
      const mark = marks.find((m) => m.userId === student.id)?.mark ?? null;
      return {
        user: student,
        attended: mark ? mark !== 'ABSENT' : mine.length > 0,
        mark,
        firstJoinedAt: mine[0]?.joinedAt ?? null,
        lastLeftAt: mine.at(-1)?.leftAt ?? null,
        seconds: mine.reduce((sum, r) => sum + r.seconds, 0),
        joins: mine.length,
      };
    });
    const present = items.filter((i) => i.attended).length;
    return { sessionId: id, total: items.length, present, percent: items.length ? Math.round((present / items.length) * 100) : 0, items };
  }

  /** Host/ADMIN corrects attendance once the session has started (LIVE or ENDED). */
  async updateAttendance(id: string, input: UpdateAttendanceInput, user: Actor) {
    const s = await this.load(id);
    await this.requireRole(s, user, ['host', 'observer']);
    if (s.status !== 'LIVE' && s.status !== 'ENDED') {
      throw new BusinessRuleError('Attendance can be edited once the session has started', 'SESSION_NOT_STARTED');
    }
    const enrolled = new Set(await this.repo.activeStudentIds(s.batchId));
    const unknown = input.items.filter((i) => !enrolled.has(i.userId)).map((i) => i.userId);
    if (unknown.length) throw new BusinessRuleError('Only active students of this batch can be marked', 'NOT_IN_BATCH', { userIds: unknown });
    await this.repo.saveAttendanceMarks(id, input.items, user.id);
    return this.attendance(id, user);
  }

  // ───────── host edits ─────────

  async updateAgenda(id: string, input: z.infer<typeof updateAgendaInput>, user: Actor) {
    const s = await this.load(id);
    await this.requireRole(s, user, ['host', 'observer']);
    return this.repo.update(id, input);
  }

  /** ADMIN moves the session; a host only files a request that admins act on. */
  async reschedule(id: string, input: RescheduleSessionInput, user: Actor) {
    const s = await this.load(id);
    await this.requireRole(s, user, ['host', 'observer']);
    if (s.status !== 'SCHEDULED') throw new BusinessRuleError('Only scheduled sessions can be moved', 'SESSION_NOT_SCHEDULED');
    const startsAt = new Date(input.startsAt);
    const duration = input.durationMin ?? Math.round((s.endsAt.getTime() - s.startsAt.getTime()) / 60_000);
    const endsAt = addMinutes(startsAt, duration);
    if (startsAt <= this.clock.now()) throw new BusinessRuleError('The new time must be in the future', 'START_IN_PAST');

    if (user.role !== 'ADMIN') {
      const request = await this.requests.create(
        { sessionId: id, requestedById: user.id, startsAt, endsAt, reason: input.reason ?? null },
        this.clock.now(),
      );
      await this.notifier.notifyRole('ADMIN', {
        type: 'SESSION_RESCHEDULE_REQUEST',
        title: `Reschedule request · ${s.batch.code} S${String(s.number).padStart(2, '0')}`,
        body: `${user.name} asked to move "${s.title}" to ${formatInZone(startsAt, s.batch.timezone)}${input.reason ? ` — ${input.reason}` : ''}`,
        data: { sessionId: id, requestId: request.id, startsAt: startsAt.toISOString(), durationMin: String(duration), requestedBy: user.id },
      });
      return { requested: true as const, session: s, request };
    }

    const teacherId = s.hostId ?? s.batch.teacherId;
    const clashes = await this.repo.teacherOverlaps(teacherId, startsAt, endsAt, id);
    if (clashes.length) {
      throw new ConflictError('Teacher is double-booked at that time', {
        conflicts: clashes.map((c) => ({ sessionId: c.id, batch: c.batch.code, number: c.number, startsAt: c.startsAt })),
      });
    }

    const updated = await this.repo.update(id, {
      startsAt,
      endsAt,
      movedFrom: s.movedFrom ?? s.startsAt,
      moveReason: input.reason ?? null,
    });

    if (input.notifyStudents) {
      const recipients = [...(await this.repo.activeStudentIds(s.batchId)), teacherId];
      const course = s.batch.course.titleEn;
      await this.notifier.notify(recipients, {
        type: 'SESSION_RESCHEDULED',
        title: `Session moved · ${s.title}`,
        body: `${course} ${s.batch.code}: now ${formatInZone(startsAt, s.batch.timezone)}`,
        data: { sessionId: id, startsAt: startsAt.toISOString() },
        email: (r) => appEmails.sessionRescheduled(course, s.title, formatInZone(startsAt, r.timezone, r.locale), input.reason),
      });
    }
    return { requested: false as const, session: updated };
  }

  async cancel(id: string, input: CancelSessionInput) {
    const s = await this.load(id);
    if (s.status !== 'SCHEDULED') throw new BusinessRuleError('Only scheduled sessions can be cancelled', 'SESSION_NOT_SCHEDULED');
    const updated = await this.repo.update(id, { status: 'CANCELLED', moveReason: input.reason ?? null });
    this.broadcastStatus(id, 'CANCELLED');
    if (input.notifyStudents) {
      const course = s.batch.course.titleEn;
      await this.notifier.notify([...(await this.repo.activeStudentIds(s.batchId)), s.hostId ?? s.batch.teacherId], {
        type: 'SESSION_CANCELLED',
        title: `Session cancelled · ${s.title}`,
        body: `${course} ${s.batch.code} on ${formatInZone(s.startsAt, s.batch.timezone)}`,
        data: { sessionId: id },
        email: (r) => appEmails.sessionCancelled(course, s.title, formatInZone(s.startsAt, r.timezone, r.locale), input.reason),
      });
    }
    return updated;
  }

  // ───────── live room ─────────

  /**
   * Issues a LiveKit token for the session room.
   *
   * App Review demo accounts (DEMO_REVIEWER_EMAILS) joining a session that is not live get a token for a private
   * per-reviewer room (`demoRoomName`) instead of the real one. This is the least invasive option: the real session's
   * status, recording, notifications and attendance are never written — the demo room name matches no LiveSession,
   * so LiveKit webhooks for it (participant_joined/left, room_finished) are ignored — and other students and the
   * teacher never see the reviewer. No recording is started for the demo room. When the real session is LIVE the
   * reviewer joins the real room as an ordinary student. Every other user takes the unchanged `JoinPolicy.decide` path.
   */
  async join(id: string, user: Actor) {
    const s = await this.load(id);
    const enrollmentStatus = user.role === 'ADMIN' ? null : await this.repo.enrollmentStatus(user.id, s.batchId);
    const decision = this.policy.plan({
      session: { ...s, batchTeacherId: s.batch.teacherId },
      user,
      enrollmentStatus,
      allowedToSpeak: this.classroom.canSpeak(id, user.id),
      now: this.clock.now(),
      demoReviewer: this.isDemo(user),
    });
    if (decision.room === 'demo') {
      const roomName = demoRoomName(s.roomName, user.id);
      await this.video.ensureRoom(roomName, { emptyTimeoutSec: 5 * 60, maxParticipants: 2 });
      const token = await this.video.createJoinToken({
        roomName,
        identity: user.id,
        name: user.name,
        canPublish: decision.canPublish,
        canPublishData: decision.canPublishData,
        isHost: false,
        hidden: false,
        metadata: JSON.stringify({ role: decision.role, userRole: user.role, demo: true }),
      });
      return { serverUrl: this.video.serverUrl, token, roomName, role: decision.role, canPublish: decision.canPublish, sessionStatus: 'LIVE' as const };
    }
    await this.video.ensureRoom(s.roomName, { emptyTimeoutSec: 10 * 60, maxParticipants: s.batch.capacity + 10 });
    const token = await this.video.createJoinToken({
      roomName: s.roomName,
      identity: user.id,
      name: user.name,
      canPublish: decision.canPublish,
      canPublishData: decision.canPublishData,
      isHost: decision.isHost,
      hidden: decision.hidden,
      metadata: JSON.stringify({ role: decision.role, userRole: user.role }),
    });
    return { serverUrl: this.video.serverUrl, token, roomName: s.roomName, role: decision.role, canPublish: decision.canPublish, sessionStatus: s.status };
  }

  async start(id: string, user: Actor) {
    const s = await this.load(id);
    await this.requireRole(s, user, ['host', 'observer']);
    if (s.status === 'LIVE') return s;
    if (s.status !== 'SCHEDULED') throw new BusinessRuleError(`Cannot start a ${s.status.toLowerCase()} session`, 'INVALID_TRANSITION');
    const now = this.clock.now();
    if (now < addMinutes(s.startsAt, -15)) throw new BusinessRuleError('Sessions can start at most 15 minutes early', 'TOO_EARLY');

    await this.video.ensureRoom(s.roomName, { emptyTimeoutSec: 10 * 60, maxParticipants: s.batch.capacity + 10 });
    let egressId: string | null = null;
    try {
      egressId = (await this.video.startRecording(s.roomName)).egressId;
    } catch (err) {
      console.error(`[session] recording failed to start for ${s.roomName}`, err);
    }
    const updated = await this.repo.update(id, { status: 'LIVE', startedAt: now, egressId });
    if (s.batch.status === 'ENROLLING' || s.batch.status === 'FULL') await this.repo.setBatchStatus(s.batchId, 'RUNNING');
    this.broadcastStatus(id, 'LIVE', { startedAt: now });

    await this.notifier.notify(await this.repo.activeStudentIds(s.batchId), {
      type: 'SESSION_LIVE',
      title: `${s.batch.course.titleEn} is live`,
      body: `${s.title} has started — join now`,
      data: { sessionId: id },
    }, { channels: ['realtime', 'push'] });
    return updated;
  }

  async end(id: string, user: Actor) {
    const s = await this.load(id);
    await this.requireRole(s, user, ['host', 'observer']);
    if (s.status === 'ENDED') return s;
    if (s.status !== 'LIVE') throw new BusinessRuleError('Only a live session can be ended', 'INVALID_TRANSITION');
    if (s.egressId) await this.video.stopRecording(s.egressId).catch((err) => console.error('[session] stop recording', err));
    await this.video.closeRoom(s.roomName).catch((err) => console.error('[session] close room', err));
    return this.markEnded(s, this.clock.now());
  }

  /** Idempotent: shared by the host's "End" button and LiveKit's room_finished webhook. */
  private async markEnded(s: SessionCore, at: Date) {
    if (s.status === 'ENDED') return s;
    const updated = await this.repo.update(s.id, { status: 'ENDED', endedAt: at });
    await this.repo.closeAllAttendance(s.id, at);
    this.classroom.clear(s.id);
    this.broadcastStatus(s.id, 'ENDED', { startedAt: s.startedAt ?? undefined, endedAt: at });
    await this.earnings.accrueForSession(s.id);
    if ((await this.repo.remainingSessions(s.batchId)) === 0 && s.batch.status === 'RUNNING') {
      await this.repo.setBatchStatus(s.batchId, 'COMPLETED');
    }
    return updated;
  }

  // ───────── moderation ─────────

  async moderate(id: string, targetUserId: string, action: 'mute' | 'remove' | 'allow-speak', user: Actor) {
    const s = await this.load(id);
    await this.requireRole(s, user, ['host', 'observer']);
    if (s.status !== 'LIVE') throw new BusinessRuleError('The session is not live', 'SESSION_NOT_LIVE');
    switch (action) {
      case 'mute':
        await this.video.muteParticipant(s.roomName, targetUserId);
        break;
      case 'remove':
        this.classroom.revokeSpeak(id, targetUserId);
        this.classroom.lower(id, targetUserId);
        await this.video.removeParticipant(s.roomName, targetUserId);
        break;
      case 'allow-speak':
        this.classroom.allowSpeak(id, targetUserId);
        this.classroom.lower(id, targetUserId);
        await this.video.setCanPublish(s.roomName, targetUserId, true);
        break;
    }
    this.broadcastHands(id);
    return { ok: true, action, userId: targetUserId };
  }

  // ───────── classroom (socket) ─────────

  async postChat(sessionId: string, user: Actor, body: string): Promise<ChatMessageEvent> {
    const s = await this.load(sessionId);
    await this.requireRole(s, user, ['host', 'student', 'observer']);
    if (s.status === 'CANCELLED' || s.status === 'ENDED') throw new BusinessRuleError('Chat is closed for this session', 'CHAT_CLOSED');
    if (this.inDemoRoom(s, user)) {
      // Demo room: echo to the reviewer only; nothing is stored on, or broadcast to, the real session.
      const event: ChatMessageEvent = {
        id: `demo-${this.clock.now().getTime()}`,
        sessionId,
        user: { id: user.id, name: user.name, role: user.role },
        body,
        createdAt: this.clock.now().toISOString(),
      };
      this.realtime.toUser(user.id, SOCKET_EVENTS.CHAT_MESSAGE, event);
      return event;
    }
    const msg = await this.repo.createMessage(sessionId, user.id, body);
    const event: ChatMessageEvent = {
      id: msg.id,
      sessionId,
      user: { id: msg.user.id, name: msg.user.name, role: msg.user.role },
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
    };
    this.realtime.toSession(sessionId, SOCKET_EVENTS.CHAT_MESSAGE, event);
    return event;
  }

  async raiseHand(sessionId: string, user: Actor) {
    const s = await this.load(sessionId);
    await this.requireRole(s, user, ['student']);
    if (this.inDemoRoom(s, user)) {
      // Demo room: show the reviewer their own raised hand without touching the real session's queue.
      const event: HandQueueEvent = { sessionId, queue: [{ userId: user.id, name: user.name, raisedAt: this.clock.now().toISOString() }] };
      this.realtime.toUser(user.id, SOCKET_EVENTS.HAND_QUEUE, event);
      return event;
    }
    this.classroom.raise(sessionId, user, this.clock.now());
    return this.broadcastHands(sessionId);
  }

  /** Students lower their own hand; hosts can lower anyone's. */
  async lowerHand(sessionId: string, user: Actor, targetUserId?: string) {
    const s = await this.load(sessionId);
    const role = await this.requireRole(s, user, ['host', 'student', 'observer']);
    const target = targetUserId && role !== 'student' ? targetUserId : user.id;
    this.classroom.lower(sessionId, target);
    return this.broadcastHands(sessionId);
  }

  handQueue(sessionId: string): HandQueueEvent {
    return {
      sessionId,
      queue: this.classroom.queue(sessionId).map((h) => ({ userId: h.userId, name: h.name, raisedAt: h.raisedAt.toISOString() })),
    };
  }

  private broadcastHands(sessionId: string) {
    const event = this.handQueue(sessionId);
    this.realtime.toSession(sessionId, SOCKET_EVENTS.HAND_QUEUE, event);
    return event;
  }

  private broadcastStatus(sessionId: string, status: SessionStatusEvent['status'], at: { startedAt?: Date; endedAt?: Date } = {}) {
    const event: SessionStatusEvent = {
      sessionId,
      status,
      startedAt: at.startedAt?.toISOString(),
      endedAt: at.endedAt?.toISOString(),
    };
    this.realtime.toSession(sessionId, SOCKET_EVENTS.SESSION_STATUS, event);
    this.realtime.toRole('ADMIN', SOCKET_EVENTS.SESSION_STATUS, event);
  }

  // ───────── feedback ─────────

  async feedback(id: string, input: z.infer<typeof sessionFeedbackInput>, user: Actor) {
    const s = await this.load(id);
    await this.requireRole(s, user, ['student']);
    if (s.status !== 'ENDED' && s.status !== 'LIVE') throw new BusinessRuleError('Feedback opens once the session has started', 'FEEDBACK_NOT_OPEN');
    return this.repo.upsertFeedback(id, user.id, input);
  }

  // ───────── LiveKit webhook ─────────

  async handleVideoEvent(evt: VideoWebhookEvent) {
    switch (evt.event) {
      case 'participant_joined': {
        const s = evt.roomName ? await this.repo.findByRoomName(evt.roomName) : null;
        if (!s || !evt.participantIdentity || !(await this.repo.userExists(evt.participantIdentity))) return { handled: false };
        await this.repo.openAttendance(s.id, evt.participantIdentity, evt.at);
        this.realtime.toRole('ADMIN', SOCKET_EVENTS.ROOM_STATS, { sessionId: s.id, event: evt.event, userId: evt.participantIdentity });
        return { handled: true };
      }
      case 'participant_left': {
        const s = evt.roomName ? await this.repo.findByRoomName(evt.roomName) : null;
        if (!s || !evt.participantIdentity) return { handled: false };
        await this.repo.closeAttendance(s.id, evt.participantIdentity, evt.at);
        this.classroom.lower(s.id, evt.participantIdentity);
        this.realtime.toRole('ADMIN', SOCKET_EVENTS.ROOM_STATS, { sessionId: s.id, event: evt.event, userId: evt.participantIdentity });
        return { handled: true };
      }
      case 'egress_ended': {
        const s = evt.egressId ? await this.repo.findByEgressId(evt.egressId) : null;
        if (!s || !evt.fileUrl) return { handled: false };
        await this.repo.update(s.id, { recordingUrl: evt.fileUrl });
        await this.notifier.notify(await this.repo.activeStudentIds(s.batchId), {
          type: 'RECORDING_READY',
          title: `Recording ready · ${s.title}`,
          body: `${s.batch.course.titleEn} ${s.batch.code} S${String(s.number).padStart(2, '0')}`,
          data: { sessionId: s.id },
        }, { channels: ['in-app', 'realtime'] });
        return { handled: true };
      }
      case 'room_finished': {
        const s = evt.roomName ? await this.repo.findByRoomName(evt.roomName) : null;
        if (!s || s.status !== 'LIVE') return { handled: false };
        await this.markEnded(s, evt.at);
        return { handled: true };
      }
      default:
        return { handled: false };
    }
  }
}

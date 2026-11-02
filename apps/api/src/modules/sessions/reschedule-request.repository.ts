import type { RescheduleRequestStatus } from '@azza/shared';
import type { Db } from '../../infrastructure/db';

const listInclude = {
  requestedBy: { select: { id: true, name: true, image: true } },
  decidedBy: { select: { id: true, name: true } },
  session: {
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      startsAt: true,
      endsAt: true,
      batch: {
        select: {
          id: true,
          code: true,
          timezone: true,
          course: { select: { id: true, titleEn: true, titleAr: true } },
          teacher: { select: { id: true, name: true } },
        },
      },
    },
  },
} as const;

export interface NewRescheduleRequest {
  sessionId: string;
  requestedById: string;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
}

export interface RescheduleDecision {
  status: Exclude<RescheduleRequestStatus, 'PENDING'>;
  decidedById: string;
  decidedAt: Date;
  decisionNote: string | null;
}

/** Persistence for host reschedule requests (admins approve/decline them). */
export class PrismaRescheduleRequestRepository implements RescheduleRequestRepository {
  constructor(private readonly db: Db) {}

  /** A newer request for the same session supersedes any still-pending one. */
  async create(input: NewRescheduleRequest, at: Date) {
    const [, created] = await this.db.$transaction([
      this.db.rescheduleRequest.updateMany({
        where: { sessionId: input.sessionId, status: 'PENDING' },
        data: { status: 'DECLINED', decidedAt: at, decisionNote: 'Superseded by a newer request' },
      }),
      this.db.rescheduleRequest.create({ data: input, include: listInclude }),
    ]);
    return created;
  }

  async find(id: string) {
    return this.db.rescheduleRequest.findUnique({ where: { id }, include: listInclude });
  }

  async list(filter: { status?: RescheduleRequestStatus; requestedById?: string }) {
    return this.db.rescheduleRequest.findMany({
      where: { ...(filter.status && { status: filter.status }), ...(filter.requestedById && { requestedById: filter.requestedById }) },
      include: listInclude,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async decide(id: string, decision: RescheduleDecision) {
    return this.db.rescheduleRequest.update({ where: { id }, data: decision, include: listInclude });
  }
}

export type RescheduleRequestRecord = NonNullable<Awaited<ReturnType<PrismaRescheduleRequestRepository['find']>>>;

/** Port used by RescheduleRequestService (tests use an in-memory implementation). */
export interface RescheduleRequestRepository {
  create(input: NewRescheduleRequest, at: Date): Promise<RescheduleRequestRecord>;
  find(id: string): Promise<RescheduleRequestRecord | null>;
  list(filter: { status?: RescheduleRequestStatus; requestedById?: string }): Promise<RescheduleRequestRecord[]>;
  decide(id: string, decision: RescheduleDecision): Promise<RescheduleRequestRecord>;
}

import type { Db } from '../../infrastructure/db';

export interface StatsRepository {
  liveRoomNames(): Promise<Array<{ roomName: string }>>;
}

export class PrismaStatsRepository implements StatsRepository {
  constructor(private readonly db: Db) {}

  liveRoomNames() {
    return this.db.liveSession.findMany({ where: { status: 'LIVE' }, select: { roomName: true } });
  }
}

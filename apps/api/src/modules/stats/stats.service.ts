import type { VideoProvider } from '../../core/ports';
import type { StatsRepository } from './stats.repository';

/** Public, anonymous numbers for the marketing site. */
export class StatsService {
  private cache: { at: number; value: { liveSessions: number; participants: number } } | null = null;

  constructor(
    private readonly repo: StatsRepository,
    private readonly video: Pick<VideoProvider, 'listRooms'>,
    private readonly nowMs: () => number = Date.now,
    private readonly ttlMs = 15_000,
  ) {}

  /** `{ liveSessions, participants }` — LIVE sessions and people in their rooms (LiveKit), cached briefly. */
  async liveNow() {
    if (this.cache && this.nowMs() - this.cache.at < this.ttlMs) return this.cache.value;
    const live = await this.repo.liveRoomNames();
    const names = new Set(live.map((s) => s.roomName));
    const rooms = live.length ? await this.video.listRooms().catch(() => []) : [];
    const participants = rooms.filter((r) => names.has(r.name)).reduce((n, r) => n + r.numParticipants, 0);
    const value = { liveSessions: live.length, participants };
    this.cache = { at: this.nowMs(), value };
    return value;
  }
}

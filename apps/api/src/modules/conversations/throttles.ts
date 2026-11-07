// In-memory throttles for chat (single API process; see docs/COMMUNICATIONS.md "keep it simple").

const SWEEP_AT = 10_000;

/** Sliding window: at most `max` hits per `windowMs` per key. */
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();
  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** Records a hit and returns true, or returns false (without recording) when the key is over the limit. */
  tryHit(key: string, nowMs: number): boolean {
    const since = nowMs - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > since);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(nowMs);
    this.hits.set(key, recent);
    if (this.hits.size > SWEEP_AT) this.sweep(since);
    return true;
  }

  private sweep(since: number) {
    for (const [k, ts] of this.hits) if (!ts.some((t) => t > since)) this.hits.delete(k);
  }
}

/** At most one event per key per `intervalMs` (the first one passes, later ones within the interval are dropped). */
export class Collapser {
  private readonly last = new Map<string, number>();
  constructor(private readonly intervalMs: number) {}

  shouldFire(key: string, nowMs: number): boolean {
    const prev = this.last.get(key);
    if (prev !== undefined && nowMs - prev < this.intervalMs) return false;
    this.last.set(key, nowMs);
    if (this.last.size > SWEEP_AT) {
      for (const [k, t] of this.last) if (nowMs - t >= this.intervalMs) this.last.delete(k);
    }
    return true;
  }
}

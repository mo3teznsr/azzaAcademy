export interface Job {
  name: string;
  everyMs: number;
  run: () => Promise<unknown>;
  /** Run once when the scheduler starts (default true). False waits for the first interval. */
  runAtBoot?: boolean;
  /** Delay before the first run, then every `everyMs` (e.g. to land on a fixed time of day). Implies no run at boot. */
  firstRunInMs?: number;
}

/** Minimal in-process interval scheduler (one API node). Overlapping runs of the same job are skipped. */
export class JobScheduler {
  private readonly timers: ReturnType<typeof setInterval>[] = [];
  private readonly running = new Set<string>();

  constructor(private readonly jobs: Job[]) {}

  start() {
    for (const job of this.jobs) {
      const tick = async () => {
        if (this.running.has(job.name)) return;
        this.running.add(job.name);
        try {
          const result = await job.run();
          if (result && typeof result === 'object' && Object.values(result).some((v) => typeof v === 'number' && v > 0)) {
            console.info(`[job] ${job.name}`, result);
          }
        } catch (err) {
          console.error(`[job] ${job.name} failed`, err);
        } finally {
          this.running.delete(job.name);
        }
      };
      if (job.firstRunInMs !== undefined) {
        const first = setTimeout(() => {
          void tick();
          this.timers.push(setInterval(tick, job.everyMs));
        }, job.firstRunInMs);
        this.timers.push(first as unknown as ReturnType<typeof setInterval>);
        continue;
      }
      if (job.runAtBoot !== false) void tick();
      this.timers.push(setInterval(tick, job.everyMs));
    }
  }

  stop() {
    for (const t of this.timers) clearInterval(t);
    this.timers.length = 0;
  }
}

/** Milliseconds from `now` to the next time the UTC clock reads `hourUtc`:00 (always in the future). */
export function msUntilUtcHour(now: Date, hourUtc: number): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc);
  return (next > now.getTime() ? next : next + 86_400_000) - now.getTime();
}

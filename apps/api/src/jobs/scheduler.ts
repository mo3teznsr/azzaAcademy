export interface Job {
  name: string;
  everyMs: number;
  run: () => Promise<unknown>;
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
      void tick();
      this.timers.push(setInterval(tick, job.everyMs));
    }
  }

  stop() {
    for (const t of this.timers) clearInterval(t);
    this.timers.length = 0;
  }
}

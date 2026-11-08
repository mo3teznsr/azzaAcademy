import { appleSeatProductId } from '@azza/shared';
import type { Clock } from '../../core/ports';
import type { Db } from '../../infrastructure/db';
import type { CourseRecord, CourseRepository } from '../courses/course.repository';
import type { RecordedCourseInput, RecordedSyncResult, SyncResult, SyncStatus } from './appstore-sync.service';

export interface SyncLogger {
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

export const consoleSyncLogger: SyncLogger = {
  info: (m, meta) => console.info(`[app-store] ${m}`, ...(meta === undefined ? [] : [meta])),
  warn: (m, meta) => console.warn(`[app-store] ${m}`, ...(meta === undefined ? [] : [meta])),
  error: (m, meta) => console.error(`[app-store] ${m}`, ...(meta === undefined ? [] : [meta])),
};

/** What the coordinator needs of the sync engine; `configured` is false when there is no API key. */
export interface AppStoreSyncer {
  readonly configured: boolean;
  syncSeatPrice(priceFils: number): Promise<SyncResult>;
  syncRecordedCourse(course: RecordedCourseInput): Promise<RecordedSyncResult>;
}

const NOT_CONFIGURED = 'not configured';

/** Used when the App Store Connect key is missing: every call is SKIPPED and nothing is written anywhere. */
export class DisabledAppStoreSync implements AppStoreSyncer {
  readonly configured = false;
  async syncSeatPrice(): Promise<SyncResult> {
    return { status: 'SKIPPED', detail: NOT_CONFIGURED };
  }
  async syncRecordedCourse(): Promise<RecordedSyncResult> {
    return { status: 'SKIPPED', detail: NOT_CONFIGURED, monthly: null, yearly: null };
  }
}

export interface SeatProductRow {
  priceFils: number;
  productId: string;
  status: SyncStatus;
  detail: string | null;
  syncedAt: Date;
}

export interface AppleSyncStore {
  upsertSeat(row: SeatProductRow): Promise<void>;
  seats(): Promise<SeatProductRow[]>;
  /** Distinct prices (fils) of batches people can enrol in now. */
  openBatchPrices(): Promise<number[]>;
}

export class PrismaAppleSyncStore implements AppleSyncStore {
  constructor(private readonly db: Db) {}

  async upsertSeat(row: SeatProductRow) {
    const { priceFils, ...data } = row;
    await this.db.appleSeatProduct.upsert({ where: { priceFils }, create: row, update: data });
  }

  async seats() {
    const rows = await this.db.appleSeatProduct.findMany({ orderBy: { priceFils: 'asc' } });
    return rows.map((r) => ({ ...r, status: r.status as SyncStatus }));
  }

  async openBatchPrices() {
    const rows = await this.db.batch.findMany({
      where: { status: { in: ['ENROLLING', 'FULL', 'RUNNING'] } },
      distinct: ['priceFils'],
      select: { priceFils: true },
      orderBy: { priceFils: 'asc' },
    });
    return rows.map((r) => r.priceFils);
  }
}

export interface AppStoreStatus {
  configured: boolean;
  seats: Array<{ priceFils: number; productId: string; status: SyncStatus; detail: string | null; syncedAt: Date | null }>;
  courses: Array<{ id: string; slug: string; titleEn: string; titleAr: string | null; status: SyncStatus; detail: string | null; syncedAt: Date | null }>;
}

interface CatalogTotals {
  seats: number;
  courses: number;
  failed: number;
}
interface Flight {
  current: Promise<SyncStatus>;
  followUp: Promise<SyncStatus> | null;
}

type SyncCourses = Pick<CourseRepository, 'findById' | 'update' | 'list'>;

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const PAGE = 100;

/**
 * Runs the App Store sync from the places that change prices and from the nightly job, and remembers the last
 * result per course and per seat price. Triggers are fire-and-forget: they never throw and never delay a request.
 */
export class AppStoreSyncCoordinator {
  private readonly pending = new Set<Promise<unknown>>();
  private running: Promise<CatalogTotals> | null = null;
  private readonly flights = new Map<string, Flight>();

  constructor(
    private readonly syncer: AppStoreSyncer,
    private readonly store: AppleSyncStore,
    private readonly courses: SyncCourses,
    private readonly clock: Clock,
    private readonly logger: SyncLogger = consoleSyncLogger,
  ) {}

  get configured() {
    return this.syncer.configured;
  }

  /** Fire-and-forget: a recorded course's prices were set. */
  recordedPricingChanged(courseId: string): void {
    if (!this.configured) return;
    this.track(this.syncCourse(courseId).then(() => undefined));
  }

  /** Fire-and-forget: a batch was created or its price changed. */
  seatPriceChanged(priceFils: number): void {
    if (!this.configured) return;
    this.track(this.syncSeat(priceFils).then(() => undefined));
  }

  /** Resolves when every fire-and-forget trigger has finished (tests, shutdown). */
  async idle() {
    while (this.pending.size) await Promise.allSettled([...this.pending]);
    if (this.running) await this.running.catch(() => undefined);
  }

  /**
   * Every open batch price, then every published recorded course, one at a time (Apple rate limits).
   * Single-flight: while a run is in progress, callers (the nightly job, "Sync now") get that same run.
   */
  syncAppStoreCatalog(): Promise<CatalogTotals> {
    if (this.running) return this.running;
    const run = this.runCatalog().finally(() => {
      if (this.running === run) this.running = null;
    });
    this.running = run;
    return run;
  }

  private async runCatalog(): Promise<CatalogTotals> {
    const totals = { seats: 0, courses: 0, failed: 0 };
    if (!this.configured) return totals;
    const prices = [...new Set(await this.store.openBatchPrices())].filter((p) => appleSeatProductId(p));
    for (const price of prices) {
      totals.seats++;
      if ((await this.syncSeat(price)) === 'FAILED') totals.failed++;
    }
    for (let skip = 0; ; skip += PAGE) {
      const page = await this.courses.list({ status: 'PUBLISHED', type: 'RECORDED', skip, take: PAGE });
      for (const course of page.items) {
        totals.courses++;
        if ((await this.syncCourse(course.id)) === 'FAILED') totals.failed++;
      }
      if (page.items.length < PAGE) break;
    }
    return totals;
  }

  /** "Sync now": runs the catalog sync in the background. A run already in progress is left alone. */
  startSync(): { started: true } {
    this.syncAppStoreCatalog().then(
      (totals) => this.logger.info('catalog sync finished', totals),
      (e) => this.logger.error(`catalog sync failed: ${message(e)}`),
    );
    return { started: true };
  }

  get syncing() {
    return this.running !== null;
  }

  async status(): Promise<AppStoreStatus> {
    const [seats, recorded] = await Promise.all([this.store.seats(), this.listRecorded()]);
    return {
      configured: this.configured,
      seats,
      courses: recorded.flatMap((c) =>
        c.appleSyncStatus
          ? [{ id: c.id, slug: c.slug, titleEn: c.titleEn, titleAr: c.titleAr, status: c.appleSyncStatus as SyncStatus, detail: c.appleSyncDetail ?? null, syncedAt: c.appleSyncedAt ?? null }]
          : [],
      ),
    };
  }

  private async listRecorded(): Promise<CourseRecord[]> {
    const out: CourseRecord[] = [];
    for (let skip = 0; ; skip += PAGE) {
      const page = await this.courses.list({ type: 'RECORDED', skip, take: PAGE });
      out.push(...page.items);
      if (page.items.length < PAGE) return out;
    }
  }

  private track(p: Promise<unknown>) {
    this.pending.add(p);
    void p.finally(() => this.pending.delete(p));
  }

  /** One sync per key at a time; calls that arrive meanwhile share a single follow-up run after it. */
  private serial(key: string, fn: () => Promise<SyncStatus>): Promise<SyncStatus> {
    const flight = this.flights.get(key);
    if (flight) {
      flight.followUp ??= flight.current.then(() => this.launch(key, fn));
      return flight.followUp;
    }
    return this.launch(key, fn);
  }

  private launch(key: string, fn: () => Promise<SyncStatus>): Promise<SyncStatus> {
    const flight: Flight = { current: null as never, followUp: null };
    flight.current = fn().finally(() => {
      if (this.flights.get(key) === flight && !flight.followUp) this.flights.delete(key);
    });
    this.flights.set(key, flight);
    return flight.current;
  }

  private syncSeat(priceFils: number): Promise<SyncStatus> {
    return this.serial(`seat:${priceFils}`, () => this.doSyncSeat(priceFils));
  }

  private syncCourse(courseId: string): Promise<SyncStatus> {
    return this.serial(`course:${courseId}`, () => this.doSyncCourse(courseId));
  }

  private async doSyncSeat(priceFils: number): Promise<SyncStatus> {
    try {
      const productId = appleSeatProductId(priceFils);
      const result = await this.syncer.syncSeatPrice(priceFils);
      // Prices that are not whole dirhams have no product, so there is nothing to remember.
      if (productId) {
        await this.store.upsertSeat({ priceFils, productId, status: result.status, detail: result.detail, syncedAt: this.clock.now() });
      }
      if (result.status === 'FAILED') this.logger.warn(`seat ${priceFils} fils: ${result.detail}`);
      return result.status;
    } catch (e) {
      this.logger.error(`seat ${priceFils} fils: ${message(e)}`);
      return 'FAILED';
    }
  }

  private async doSyncCourse(courseId: string): Promise<SyncStatus> {
    try {
      const course = await this.courses.findById(courseId);
      if (!course || course.type !== 'RECORDED') return 'SKIPPED';
      const result: RecordedSyncResult =
        course.monthlyPriceFils && course.yearlyPriceFils
          ? await this.syncer.syncRecordedCourse({
              slug: course.slug,
              titleEn: course.titleEn,
              titleAr: course.titleAr,
              monthlyPriceFils: course.monthlyPriceFils,
              yearlyPriceFils: course.yearlyPriceFils,
            })
          : { status: 'SKIPPED', detail: 'the course has no prices yet', monthly: null, yearly: null };
      await this.courses.update(courseId, {
        ...(result.status === 'SYNCED' && { appleMonthlyProductId: result.monthly, appleYearlyProductId: result.yearly }),
        appleSyncStatus: result.status,
        appleSyncDetail: result.detail,
        appleSyncedAt: this.clock.now(),
      });
      if (result.status === 'FAILED') this.logger.warn(`course ${course.slug}: ${result.detail}`);
      return result.status;
    } catch (e) {
      this.logger.error(`course ${courseId}: ${message(e)}`);
      return 'FAILED';
    }
  }
}

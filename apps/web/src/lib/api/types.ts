import type {
  BatchStatus,
  CourseLevel,
  CourseStatus,
  DisplayCurrency,
  EarningStatus,
  EnrollmentStatus,
  HandQueueEvent,
  Locale,
  OrderStatus,
  PaymentMethod,
  PayoutRunStatus,
  PayoutStatus,
  Role,
  SessionLanguage,
  SessionStatus,
} from '@azza/shared';

/**
 * Response shapes of the Azza API, derived from what the API services/repositories actually return
 * (dates arrive as ISO strings). Resource modules unwrap `{ items }` envelopes where a screen only needs the list.
 */
export type ISODate = string;
export type CoverStyle = 'sun' | 'sky' | 'sage' | 'peach';

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface Items<T> {
  items: T[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  locale: Locale;
  timezone: string;
  displayCurrency: DisplayCurrency;
  phone?: string | null;
  image?: string | null;
  emailVerified?: boolean;
  banned?: boolean;
  createdAt?: ISODate;
}

export interface Me extends User {
  counts: { activeEnrollments: number; unreadNotifications: number; teachingBatches: number; upcomingSessions: number };
}

export interface PersonRef {
  id: string;
  name: string;
  image?: string | null;
  email?: string;
}

export interface CourseModule {
  id: string;
  courseId: string;
  order: number;
  titleEn: string;
  titleAr: string | null;
}

export interface Course {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string | null;
  descriptionEn: string;
  descriptionAr: string | null;
  category: string;
  level: CourseLevel;
  coverStyle: CoverStyle | string;
  priceFils: number;
  status: CourseStatus;
  modules: CourseModule[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type CourseRef = Pick<Course, 'id' | 'slug' | 'titleEn' | 'titleAr' | 'coverStyle'>;

export interface ScheduleRule {
  id: string;
  batchId: string;
  weekdays: number[];
  startTime: string;
  durationMin: number;
  sessionCount: number;
  skipDates: string[];
}

/** GET /batches item. */
export interface BatchSummary {
  id: string;
  code: string;
  courseId: string;
  teacherId: string;
  capacity: number;
  language: SessionLanguage;
  timezone: string;
  priceFils: number | null;
  waitlistEnabled: boolean;
  minStudents: number;
  enrollmentOpensOn: ISODate | null;
  enrollmentClosesOn: ISODate | null;
  status: BatchStatus;
  startsOn: ISODate;
  endsOn: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
  course: CourseRef & Pick<Course, 'priceFils' | 'category'>;
  teacher: PersonRef;
  schedule: ScheduleRule | null;
  /** `enrollments` = ACTIVE enrollments */
  _count: { enrollments: number; sessions: number };
}

export interface AgendaItem {
  minute: number;
  label: string;
}

export interface LiveSession {
  id: string;
  batchId: string;
  number: number;
  title: string;
  agenda: AgendaItem[] | null;
  notes: string | null;
  startsAt: ISODate;
  endsAt: ISODate;
  status: SessionStatus;
  movedFrom: ISODate | null;
  moveReason: string | null;
  hostId: string | null;
  roomName: string;
  startedAt: ISODate | null;
  endedAt: ISODate | null;
  recordingUrl: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** GET /batches/:id */
export interface BatchDetail extends BatchSummary {
  sessions: LiveSession[];
  seatsTaken: number;
  seatsLeft: number;
}

export type ClassroomRole = 'host' | 'student' | 'observer';

/** GET /sessions/:id */
export interface SessionDetail extends LiveSession {
  host: PersonRef | null;
  batch: Pick<BatchSummary, 'id' | 'code' | 'teacherId' | 'timezone' | 'language' | 'status'> & {
    course: CourseRef;
    teacher: PersonRef;
  };
  materials: Material[];
  assignments: Assignment[];
  myRole: ClassroomRole | null;
}

/** Session as returned by /me/schedule — with enough batch context to render a slate row. */
export interface ScheduleItem extends LiveSession {
  batch: Pick<BatchSummary, 'id' | 'code' | 'timezone' | 'language'> & { course: CourseRef; teacher: PersonRef };
}

export interface ScheduleResponse {
  from: ISODate;
  to: ISODate;
  items: ScheduleItem[];
}

export interface SchedulePreview {
  sessions: Array<{ number: number; localDate: string; startsAt: ISODate; endsAt: ISODate }>;
  skipped: string[];
  endsOn: string;
  conflicts: Array<{ sessionNumber: number; localDate: string; withBatch: string }>;
}

/** GET /me/enrollments item. */
export interface Enrollment {
  id: string;
  userId: string;
  batchId: string;
  status: EnrollmentStatus;
  createdAt: ISODate;
  updatedAt: ISODate;
  batch: Pick<BatchSummary, 'id' | 'code' | 'status' | 'language' | 'timezone' | 'startsOn' | 'endsOn' | 'capacity'> & {
    course: CourseRef & { category: string };
    teacher: PersonRef;
    schedule: Pick<ScheduleRule, 'weekdays' | 'startTime' | 'durationMin' | 'sessionCount'> | null;
  };
  latestOrder: Pick<Order, 'id' | 'reference' | 'status' | 'method' | 'totalFils' | 'expiresAt' | 'createdAt'> | null;
  nextSession: Pick<LiveSession, 'id' | 'number' | 'title' | 'startsAt' | 'endsAt' | 'status'> | null;
  progress: { sessionsDone: number; sessionsTotal: number; sessionsAttended: number; percent: number };
}

/** GET /batches/:id/enrollments item (admin). */
export interface BatchEnrollment {
  id: string;
  userId: string;
  batchId: string;
  status: EnrollmentStatus;
  createdAt: ISODate;
  updatedAt: ISODate;
  user: PersonRef & { email: string };
  orders: Array<Pick<Order, 'id' | 'reference' | 'method' | 'status' | 'totalFils' | 'refundedFils' | 'paidAt' | 'createdAt'>>;
}

export interface RosterEntry {
  enrollmentId: string;
  enrolledAt: ISODate;
  user: PersonRef & { email: string; phone: string | null; locale: Locale };
  sessionsAttended: number;
  /** ENDED sessions this student attended (for the per-session grid). */
  attendedSessionIds: string[];
  secondsAttended: number;
  /** `null` before the first session has ended. */
  attendancePercent: number | null;
}

/** GET /batches/:id/roster */
export interface Roster {
  batchId: string;
  endedSessions: number;
  averageAttendancePercent: number | null;
  items: RosterEntry[];
}

export type SessionRef = Pick<LiveSession, 'id' | 'number' | 'title'>;

export interface Material {
  id: string;
  batchId: string;
  sessionId: string | null;
  title: string;
  url: string;
  kind: 'SLIDES' | 'FILE' | 'LINK' | 'VIDEO';
  createdAt: ISODate;
  session?: SessionRef | null;
}

export interface Assignment {
  id: string;
  batchId: string;
  sessionId: string | null;
  title: string;
  description: string;
  dueAt: ISODate;
  maxScore: number;
  createdAt: ISODate;
  session?: SessionRef | null;
  submissionCount?: number;
  /** Only for students: their own submission. */
  mySubmission?: Submission | null;
}

export interface Submission {
  id: string;
  assignmentId: string;
  userId: string;
  url: string | null;
  text: string | null;
  score: number | null;
  feedback: string | null;
  submittedAt: ISODate;
  gradedAt: ISODate | null;
  late?: boolean;
  user?: PersonRef;
}

/** GET /me/recordings item. */
export interface Recording {
  id: string;
  number: number;
  title: string;
  startsAt: ISODate;
  endedAt: ISODate | null;
  recordingUrl: string;
  batch: { id: string; code: string; course: Pick<Course, 'id' | 'titleEn' | 'titleAr' | 'coverStyle'> };
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  readAt: ISODate | null;
  createdAt: ISODate;
  data?: Record<string, string> | null;
}

export interface NotificationPage extends Paged<Notification> {
  unread: number;
}

export interface JoinTicket {
  serverUrl: string;
  token: string;
  roomName: string;
  role: ClassroomRole;
  canPublish: boolean;
  sessionStatus: SessionStatus;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId?: string;
  user: { id: string; name: string; role: string; image?: string | null };
  body: string;
  pinned?: boolean;
  createdAt: ISODate;
}

export type HandQueue = HandQueueEvent;

export interface AttendanceRow {
  user: PersonRef;
  attended: boolean;
  firstJoinedAt: ISODate | null;
  lastLeftAt: ISODate | null;
  seconds: number;
  joins: number;
}

/** GET /sessions/:id/attendance */
export interface AttendanceReport {
  sessionId: string;
  total: number;
  present: number;
  percent: number;
  items: AttendanceRow[];
}

// ---------- Money ----------
export interface FxRates {
  base: 'AED';
  rates: Partial<Record<Exclude<DisplayCurrency, 'AED'>, number>>;
  updatedAt: ISODate;
}

export interface Quote {
  subtotalFils: number;
  discountFils: number;
  vatFils: number;
  totalFils: number;
  couponCode: string | null;
  display: { currency: DisplayCurrency; amount: number; rate: number };
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  iban: string;
  swift: string;
  branch: string | null;
  instructions: string | null;
  currency: 'AED';
  active: boolean;
  sortOrder: number;
}

export interface Order {
  id: string;
  reference: string;
  enrollmentId: string;
  userId: string;
  method: PaymentMethod;
  status: OrderStatus;
  subtotalFils: number;
  discountFils: number;
  vatFils: number;
  totalFils: number;
  receivedFils: number | null;
  refundedFils: number;
  feeFils: number;
  displayCurrency: DisplayCurrency;
  fxRate: number;
  couponCode: string | null;
  bankAccountId: string | null;
  /** Lists include `{ id, bankName, iban }`; GET /orders/:id includes the full account. */
  bankAccount: (Pick<BankAccount, 'id' | 'bankName' | 'iban'> & Partial<BankAccount>) | null;
  receiptUrl: string | null;
  receiptUploadedAt: ISODate | null;
  expiresAt: ISODate | null;
  verifiedAt: ISODate | null;
  rejectionReason: string | null;
  paidAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  user: PersonRef & { email: string };
  verifiedBy: { id: string; name: string } | null;
  enrollment: {
    id: string;
    status: EnrollmentStatus;
    batch: { id: string; code: string; course: Pick<Course, 'id' | 'titleEn' | 'titleAr'> };
  };
}

/** Order as created by POST /checkout (no relations). */
export type CreatedOrder = Omit<Order, 'user' | 'verifiedBy' | 'enrollment' | 'bankAccount'>;

export interface EnrollmentRecord {
  id: string;
  userId: string;
  batchId: string;
  status: EnrollmentStatus;
  createdAt: ISODate;
}

export type CheckoutResult =
  | { waitlisted: false; order: CreatedOrder; enrollment: EnrollmentRecord; quote: Quote; clientSecret: string }
  | { waitlisted: false; order: CreatedOrder; enrollment: EnrollmentRecord; quote: Quote; bankAccount: BankAccount; reference: string; expiresAt: ISODate }
  | { waitlisted: true; enrollment: EnrollmentRecord };

export interface Coupon {
  id: string;
  code: string;
  percentOff: number | null;
  amountOffFils: number | null;
  maxRedemptions: number | null;
  redemptions: number;
  expiresOn: ISODate | null;
  active: boolean;
  createdAt: ISODate;
}

// ---------- Earnings & payouts ----------
export interface EarningsBatch {
  batchId: string;
  code: string;
  status: BatchStatus;
  course: { id: string; titleEn: string; titleAr: string | null };
  startsOn: ISODate;
  endsOn: ISODate;
  activeStudents: number;
  sessionCount: number;
  sessionsDelivered: number;
  grossFils: number;
  refundsFils: number;
  vatFils: number;
  feesFils: number;
  /** gross − refunds − VAT − fees */
  netRevenueFils: number;
  perSessionFils: number;
  earnedFils: number;
  projectedTotalFils: number;
}

export interface LedgerEntry {
  id: string;
  kind: 'SESSION' | 'REFUND_ADJUSTMENT' | 'BONUS' | 'DEDUCTION' | string;
  amountFils: number;
  status: EarningStatus;
  availableAt: ISODate;
  createdAt: ISODate;
  note: string | null;
  payoutId: string | null;
  batch: { id: string; code: string; course: { titleEn: string; titleAr: string | null } };
  session: { id: string; number: number; title: string; endedAt: ISODate | null } | null;
}

/** GET /teacher/earnings */
export interface EarningsSummary {
  summary: {
    earnedThisMonthFils: number;
    scheduledRestOfMonthFils: number;
    availableFils: number;
    pendingFils: number;
    lifetimePaidFils: number;
    nextPayout: { expectedOn: string; estimatedFils: number };
  };
  batches: EarningsBatch[];
  ledger: LedgerEntry[];
}

export interface TeacherBankDetails {
  id: string;
  userId: string;
  bankName: string;
  accountHolder: string;
  iban: string;
  swift: string;
  verified: boolean;
  verifiedAt: ISODate | null;
  updatedAt: ISODate;
}

export interface Payout {
  id: string;
  runId: string;
  teacherId: string;
  amountFils: number;
  adjustmentsFils: number;
  /** amountFils + adjustmentsFils */
  totalFils: number;
  status: PayoutStatus;
  holdReason: string | null;
  transferReference: string | null;
  paidAt: ISODate | null;
  createdAt: ISODate;
}

/** GET /teacher/payouts item. */
export interface TeacherPayout extends Payout {
  run: { id: string; periodStart: ISODate; periodEnd: ISODate; status: PayoutRunStatus };
}

/** Payout inside GET /admin/payout-runs/:id */
export interface RunPayout extends Payout {
  teacher: PersonRef & { email: string; bankDetails: TeacherBankDetails | null };
  _count: { earnings: number };
}

interface PayoutRunBase {
  id: string;
  periodStart: ISODate;
  periodEnd: ISODate;
  status: PayoutRunStatus;
  approvedAt: ISODate | null;
  paidAt: ISODate | null;
  createdAt: ISODate;
}

/** GET /admin/payout-runs item. */
export interface PayoutRun extends PayoutRunBase {
  _count: { payouts: number };
  totalFils: number;
  readyFils: number;
  heldCount: number;
}

/** GET /admin/payout-runs/:id */
export interface PayoutRunDetail extends PayoutRunBase {
  payouts: RunPayout[];
  totals: { totalFils: number; readyFils: number; [k: string]: number };
}

// ---------- Admin ----------
export type DashboardAlertType = 'TRANSFERS_TO_VERIFY' | 'SEAT_HOLDS_EXPIRING' | 'TEACHER_BANK_UNVERIFIED' | 'PAYOUTS_HELD';

export interface DashboardSession {
  id: string;
  number: number;
  title: string;
  status: SessionStatus;
  startsAt: ISODate;
  endsAt: ISODate;
  movedFrom: ISODate | null;
  batch: { id: string; code: string; course: { titleEn: string }; teacher: { id: string; name: string } };
}

/** GET /admin/dashboard */
export interface AdminDashboard {
  date: string;
  liveRooms: number;
  sessionsToday: { count: number; items: DashboardSession[] };
  activeBatches: number;
  seats: { held: number; capacity: number; filledPercent: number };
  revenueMonth: { grossFils: number; refundedFils: number; vatFils: number; netFils: number; orders: number };
  alerts: Array<{ type: DashboardAlertType; severity: 'info' | 'warning'; count: number }>;
}

export interface LiveRoomStat {
  session: {
    id: string;
    number: number;
    title: string;
    status: SessionStatus;
    roomName: string;
    startsAt: ISODate;
    endsAt: ISODate;
    startedAt: ISODate | null;
    batch: {
      id: string;
      code: string;
      capacity: number;
      course: { titleEn: string; titleAr: string | null };
      teacher: { id: string; name: string };
      _count: { enrollments: number };
    };
  };
  roomName: string;
  participants: number;
  recording: boolean;
  roomOpen: boolean;
  roomCreatedAt: ISODate | null;
}

/** GET /admin/live-rooms */
export interface LiveRooms {
  items: LiveRoomStat[];
  orphanRooms: Array<{ name: string; numParticipants: number }>;
  at: string;
}

/** GET /admin/settings */
export interface PlatformSettings {
  rules: { TEACHER_SHARE_PERCENT: number; EARNING_HOLD_DAYS: number; MIN_PAYOUT_AED: number; BANK_TRANSFER_HOLD_HOURS: number; VAT_PERCENT: number };
  integrations: { stripe: boolean; livekit: boolean; smtp: boolean; push: boolean };
}

export interface AdminUser extends User {
  _count: { enrollments: number; teaching: number };
}

/** GET /api/v1/stats/live (public) */
export interface LiveNow {
  liveSessions: number;
  participants: number;
}

/** GET /api/v1/me/calendar */
export interface CalendarFeed {
  url: string;
  webcalUrl: string;
}

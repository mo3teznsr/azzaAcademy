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
  descriptionEn: string | null;
  descriptionAr: string | null;
  /** Lesson titles (the public syllabus preview); bodies come from `learningApi.lessons`. */
  lessons?: Array<{ id: string; order: number; titleEn: string; titleAr: string | null }>;
}

/** Managed course category, as embedded on a course (`categoryRef`). */
export interface CategoryRef {
  slug: string;
  nameEn: string;
  nameAr: string | null;
  /** A lucide icon name (kebab-case), e.g. `book-open`. */
  icon: string | null;
}

/** GET /categories item. `courseCount` = published courses. */
export interface Category extends CategoryRef {
  order: number;
  active: boolean;
  courseCount: number;
}

export interface CourseFaq {
  qEn: string;
  aEn: string;
  qAr?: string;
  aAr?: string;
}

export interface Course {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string | null;
  descriptionEn: string;
  descriptionAr: string | null;
  /** Category slug; show `categoryRef` names to people. */
  category: string;
  categoryRef: CategoryRef | null;
  level: CourseLevel;
  coverStyle: CoverStyle | string;
  /** `/media/...` path or absolute URL; null = typographic cover. Resolve with `mediaUrl`. */
  coverImageUrl: string | null;
  /** Uploaded video URL, or a YouTube / Vimeo / direct https link; null = none. Classify with `parseCourseVideoUrl`. */
  introVideoUrl: string | null;
  /** "From" price: the lowest price among open (ENROLLING/FULL/RUNNING) batches; null when none. */
  priceFils: number | null;
  outcomesEn: string[];
  outcomesAr: string[];
  requirementsEn: string[];
  requirementsAr: string[];
  audienceEn: string[];
  audienceAr: string[];
  faq: CourseFaq[];
  /** Position on the featured rail; null = not featured. */
  featuredRank: number | null;
  /** Average of visible reviews (0 when none). */
  ratingAvg: number;
  ratingCount: number;
  status: CourseStatus;
  /** Teacher who proposed the course; null for admin-made courses. */
  createdById: string | null;
  /** Admin's note when a proposal was sent back; cleared on approval. */
  reviewNote: string | null;
  submittedAt: ISODate | null;
  modules: CourseModule[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type CourseRef = Pick<Course, 'id' | 'slug' | 'titleEn' | 'titleAr' | 'coverStyle' | 'coverImageUrl'>;

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
  /** Seat price; pricing lives on the batch. */
  priceFils: number;
  waitlistEnabled: boolean;
  minStudents: number;
  enrollmentOpensOn: ISODate | null;
  enrollmentClosesOn: ISODate | null;
  status: BatchStatus;
  /** Admin's note when a teacher's proposal was sent back. */
  reviewNote: string | null;
  submittedAt: ISODate | null;
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
  batch: { id: string; code: string; course: Pick<Course, 'id' | 'titleEn' | 'titleAr' | 'coverStyle' | 'coverImageUrl'> };
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
  /** STRIPE: redirect to Stripe Checkout; the order turns PAID only via the webhook. */
  | { waitlisted: false; order: CreatedOrder; enrollment: EnrollmentRecord; quote: Quote; checkoutUrl: string }
  | { waitlisted: false; order: CreatedOrder; enrollment: EnrollmentRecord; quote: Quote; bankAccount: BankAccount; reference: string; expiresAt: ISODate }
  | { waitlisted: true; enrollment: EnrollmentRecord };

export type CouponStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'PAUSED' | 'EXHAUSTED';

export interface Coupon {
  id: string;
  code: string;
  percentOff: number | null;
  amountOffFils: number | null;
  maxRedemptions: number | null;
  redemptions: number;
  perUserLimit: number | null;
  minOrderFils: number | null;
  startsOn: ISODate | null;
  expiresOn: ISODate | null;
  /** Pause switch. */
  active: boolean;
  stackable: boolean;
  courseId: string | null;
  batchId: string | null;
  course: { id: string; titleEn: string; titleAr: string | null } | null;
  batch: { id: string; code: string; course: { id: string; titleEn: string; titleAr: string | null } } | null;
  /** Derived server-side. */
  status: CouponStatus;
  createdAt: ISODate;
}

export interface CouponUsage {
  coupon: { id: string; code: string; redemptions: number; maxRedemptions: number | null };
  totalDiscountFils: number;
  items: Array<{
    id: string;
    createdAt: ISODate;
    discountFils: number;
    student: { id: string; name: string; email: string };
    order: { id: string; reference: string; totalFils: number };
    batch: { id: string; code: string; courseTitleEn: string; courseTitleAr: string | null };
  }>;
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

// ---------- Certificates ----------
export type CertificateCourse = Pick<Course, 'id' | 'slug' | 'titleEn' | 'titleAr' | 'coverImageUrl'>;

/** GET /me/certificates item — attendance frozen at issue. */
export interface Certificate {
  id: string;
  code: string;
  issuedAt: ISODate;
  attended: number;
  total: number;
  batchId: string;
  batchCode: string;
  course: CertificateCourse;
  courseTitle: string;
  teacherName: string;
  startsOn: ISODate;
  endsOn: ISODate;
}

/** ACTIVE batch that is not over yet: `required` sessions to attend, `needed` still to attend. */
export interface CertificateProgress {
  batchId: string;
  batchCode: string;
  course: CertificateCourse;
  courseTitle: string;
  teacherName: string;
  startsOn: ISODate;
  endsOn: ISODate;
  attended: number;
  total: number;
  required: number;
  needed: number;
  sessionsEnded: number;
  reachable: boolean;
}

export interface MyCertificates {
  items: Certificate[];
  inProgress: CertificateProgress[];
}

/** GET /certificates/:code (public). */
export interface CertificateVerification extends Omit<Certificate, 'id'> {
  valid: true;
  holderName: string;
}

// ---------- Public teacher profile ----------
export interface TeacherProfileBatch {
  id: string;
  code: string;
  courseId: string;
  courseTitle: string;
  courseTitleAr: string | null;
  courseSlug: string;
  language: SessionLanguage;
  timezone: string;
  startsOn: ISODate;
  /** "Tue & Thu · 19:00 · 12 sessions" (English, from the API). */
  scheduleSummary: string;
  seatsLeft: number;
  status: Extract<BatchStatus, 'ENROLLING' | 'FULL'>;
  priceFils: number;
}

/** GET /teachers/:id (public). */
export interface TeacherProfile {
  id: string;
  name: string;
  image: string | null;
  headline: string | null;
  bio: string | null;
  languages: SessionLanguage[];
  courses: Array<CertificateCourse & { category: string }>;
  upcomingBatches: TeacherProfileBatch[];
}

// ---------- Waitlist ----------
export interface WaitlistEntry {
  enrollmentId: string;
  joinedAt: ISODate;
  batchId: string;
  batchCode: string;
  batchStatus: BatchStatus;
  startsOn: ISODate;
  course: CertificateCourse;
  courseTitle: string;
  /** 1-based place in line. */
  position: number;
  total: number;
}

/** A seat offered from the waitlist: check out before `holdExpiresAt`. */
export interface WaitlistPromotion {
  enrollmentId: string;
  batchId: string;
  batchCode: string;
  batchStatus: BatchStatus;
  startsOn: ISODate;
  course: CertificateCourse;
  courseTitle: string;
  promotedAt: ISODate;
  holdExpiresAt: ISODate;
}

/** GET /me/waitlist */
export interface MyWaitlist {
  items: WaitlistEntry[];
  promoted: WaitlistPromotion[];
}

// ---------- Admin reports ----------
export interface ReportKpis {
  revenueFils: number;
  newEnrollments: number;
  /** 0–1 */
  fillRate: number;
  attendanceRate: number;
  completionRate: number;
  refundsFils: number;
}

/** GET /admin/reports?from&to */
export interface AdminReport {
  range: { from: string; to: string; days: number; timezone: string };
  previousRange: { from: string; to: string; days: number };
  kpis: ReportKpis;
  previous: ReportKpis;
  revenueByCourse: Array<{ courseId: string; title: string; revenueFils: number }>;
  batches: Array<{
    id: string;
    code: string;
    courseId: string;
    courseTitle: string;
    teacherId: string;
    teacherName: string;
    capacity: number;
    seatsHeld: number;
    status: BatchStatus;
    waitlistCount: number;
  }>;
  attendanceBatch: { id: string; code: string; courseTitle: string } | null;
  attendanceBySession: Array<{ number: number; rate: number }>;
  teachers: Array<{ id: string; name: string; sessionsRun: number; avgAttendance: number; onTimeStartRate: number }>;
}

export interface CourseReview {
  id: string;
  courseId: string;
  userId: string;
  rating: number;
  body: string;
  teacherReply: string | null;
  repliedAt: ISODate | null;
  /** Only admins ever see hidden reviews. */
  hidden: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
  user: { id: string; name: string; image: string | null };
}

export interface RatingSummary {
  ratingAvg: number;
  ratingCount: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
}

/** GET /courses/:idOrSlug/reviews */
export interface CourseReviewPage {
  items: CourseReview[];
  total: number;
  page: number;
  pageSize: number;
  summary: RatingSummary;
  mine: CourseReview | null;
  canReview: boolean;
}

/** GET /me/saved-courses item. */
export type SavedCourse = Course & { savedAt: ISODate };

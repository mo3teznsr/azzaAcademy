import { z } from 'zod';
import { isCourseCoverUrl, parseCourseVideoUrl } from './course-media';
import {
  ATTENDANCE_MARKS,
  BATCH_STATUSES,
  COURSE_LEVELS,
  COURSE_SORTS,
  COURSE_STATUSES,
  DISPLAY_CURRENCIES,
  LOCALES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PLATFORMS,
  RESCHEDULE_REQUEST_STATUSES,
  ROLES,
  SESSION_LANGUAGES,
} from './enums';

// Request contracts shared by the API (validation) and the web client (forms).

const id = z.string().min(1);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const ianaTimezone = z.string().min(3);

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuery>;

// ---------- Users ----------
const publicProfileFields = {
  headline: z.string().trim().max(120).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
};

export const updateProfileInput = z.object({
  name: z.string().min(2).max(80).optional(),
  locale: z.enum(LOCALES).optional(),
  timezone: ianaTimezone.optional(),
  displayCurrency: z.enum(DISPLAY_CURRENCIES).optional(),
  phone: z.string().max(32).optional(),
  /** Public teacher profile (`GET /teachers/:id`) — TEACHER/ADMIN only; `null` clears. */
  ...publicProfileFields,
});
export type UpdateProfileInput = z.infer<typeof updateProfileInput>;

export const adminCreateUserInput = z.object({
  name: z.string().min(2),
  email: z.email(),
  role: z.enum(ROLES),
  locale: z.enum(LOCALES).default('en'),
});
export type AdminCreateUserInput = z.infer<typeof adminCreateUserInput>;

export const registerDeviceInput = z.object({
  token: z.string().min(10),
  platform: z.enum(PLATFORMS),
});
export type RegisterDeviceInput = z.infer<typeof registerDeviceInput>;

/** `DELETE /me` — the literal word guards against accidental calls. */
export const deleteAccountInput = z.object({
  confirm: z.literal('DELETE'),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountInput>;

// ---------- Courses ----------
export const courseModuleInput = z.object({
  titleEn: z.string().min(2),
  titleAr: z.string().optional(),
  descriptionEn: z.string().max(1000).optional(),
  descriptionAr: z.string().max(1000).optional(),
  order: z.number().int().min(0),
});

const bullets = z.array(z.string().trim().min(1).max(300)).max(20).default([]);
export const courseFaqItem = z.object({
  qEn: z.string().trim().min(2).max(300),
  aEn: z.string().trim().min(1).max(2000),
  qAr: z.string().trim().max(300).optional(),
  aAr: z.string().trim().max(2000).optional(),
});
export type CourseFaqItem = z.infer<typeof courseFaqItem>;

export const createCourseInput = z.object({
  /** Omit to derive one from the English title. */
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  titleEn: z.string().min(2),
  titleAr: z.string().optional(),
  descriptionEn: z.string().default(''),
  descriptionAr: z.string().optional(),
  /** A `Category.slug` (see `GET /categories`). */
  category: z.string().min(2),
  level: z.enum(COURSE_LEVELS),
  coverStyle: z.enum(['sun', 'sky', 'sage', 'peach']).default('sun'),
  /** Photo cover: bundled art under `/media/`, a file from `POST /admin/media`, or an https URL. Null = typographic cover. */
  coverImageUrl: z.string().max(500).refine(isCourseCoverUrl, 'Must be a /media/ path, an uploaded file or an https URL').nullable().optional(),
  /** Intro video: a file from `POST /admin/media`, a YouTube / Vimeo link, or an https link to an mp4 / mov / webm. */
  introVideoUrl: z
    .string()
    .max(500)
    .refine((v) => parseCourseVideoUrl(v) !== null, 'Must be an uploaded video, a YouTube or Vimeo link, or an https link to an mp4 / mov / webm file')
    .nullable()
    .optional(),
  priceAed: z.number().positive(),
  modules: z.array(courseModuleInput).default([]),
  outcomesEn: bullets,
  outcomesAr: bullets,
  requirementsEn: bullets,
  requirementsAr: bullets,
  audienceEn: bullets,
  audienceAr: bullets,
  faq: z.array(courseFaqItem).max(30).default([]),
  /** ADMIN only: position on the featured rail; null removes it. */
  featuredRank: z.number().int().min(0).max(999).nullable().optional(),
});
export type CreateCourseInput = z.infer<typeof createCourseInput>;
export const updateCourseInput = createCourseInput.partial().extend({ status: z.enum(COURSE_STATUSES).optional() });
export type UpdateCourseInput = z.infer<typeof updateCourseInput>;

export const courseListQuery = paginationQuery.extend({
  category: z.string().optional(),
  level: z.enum(COURSE_LEVELS).optional(),
  status: z.enum(COURSE_STATUSES).optional(),
  /** TEACHER: only the courses they proposed (any status). */
  mine: z.stringbool().optional(),
  /** Has an open (ENROLLING) batch taught in this language. */
  language: z.enum(SESSION_LANGUAGES).optional(),
  minPriceAed: z.coerce.number().min(0).optional(),
  maxPriceAed: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  featured: z.stringbool().optional(),
  sort: z.enum(COURSE_SORTS).default('newest'),
});

// ---------- Categories ----------
export const categoryInput = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,40}$/),
  nameEn: z.string().trim().min(2).max(60),
  nameAr: z.string().trim().max(60).optional(),
  icon: z.string().max(40).optional(),
  order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});
export type CategoryInput = z.infer<typeof categoryInput>;
export const updateCategoryInput = categoryInput.omit({ slug: true }).partial();
export type UpdateCategoryInput = z.infer<typeof updateCategoryInput>;

// ---------- Course reviews ----------
export const courseReviewInput = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(2000).default(''),
});
export type CourseReviewInput = z.infer<typeof courseReviewInput>;
export const reviewReplyInput = z.object({ reply: z.string().trim().min(2).max(2000) });
export const reviewModerationInput = z.object({ hidden: z.boolean() });

/** Admin decision on a teacher's course or batch proposal. A send-back needs a note the teacher can act on. */
export const reviewDecisionInput = z
  .object({ approve: z.boolean(), note: z.string().trim().max(1000).optional() })
  .refine((d) => d.approve || (d.note?.length ?? 0) >= 3, { message: 'Say what needs to change', path: ['note'] });
export type ReviewDecisionInput = z.infer<typeof reviewDecisionInput>;

// ---------- Batches & schedules ----------
export const scheduleRuleInput = z.object({
  weekdays: z.array(z.number().int().min(0).max(6)).min(1), // 0 = Sunday
  startTime: hhmm,
  durationMin: z.number().int().min(15).max(480),
  sessionCount: z.number().int().min(1).max(200),
  startsOn: isoDate,
  skipDates: z.array(isoDate).default([]),
});
export type ScheduleRuleInput = z.infer<typeof scheduleRuleInput>;

export const createBatchInput = z.object({
  courseId: id,
  code: z.string().regex(/^B\d{2,4}$/),
  /** Required for admins; a teacher always proposes batches for themselves. */
  teacherId: id.optional(),
  capacity: z.number().int().min(1).max(500),
  language: z.enum(SESSION_LANGUAGES),
  timezone: ianaTimezone,
  priceAed: z.number().positive().optional(),
  waitlistEnabled: z.boolean().default(true),
  minStudents: z.number().int().min(0).default(0),
  enrollmentOpensOn: isoDate.optional(),
  enrollmentClosesOn: isoDate.optional(),
  schedule: scheduleRuleInput,
  sessionTitles: z.array(z.string()).optional(),
});
export type CreateBatchInput = z.infer<typeof createBatchInput>;

export const updateBatchInput = createBatchInput
  .omit({ courseId: true, schedule: true })
  .partial()
  .extend({ status: z.enum(BATCH_STATUSES).optional() });
export type UpdateBatchInput = z.infer<typeof updateBatchInput>;

export const previewScheduleInput = scheduleRuleInput.extend({ timezone: ianaTimezone, teacherId: id.optional() });
export type PreviewScheduleInput = z.infer<typeof previewScheduleInput>;

export const batchListQuery = paginationQuery.extend({
  courseId: z.string().optional(),
  teacherId: z.string().optional(),
  status: z.enum(BATCH_STATUSES).optional(),
  language: z.enum(SESSION_LANGUAGES).optional(),
});

// ---------- Sessions ----------
export const rescheduleSessionInput = z.object({
  startsAt: z.iso.datetime(),
  durationMin: z.number().int().min(15).max(480).optional(),
  reason: z.string().max(500).optional(),
  notifyStudents: z.boolean().default(true),
});
export type RescheduleSessionInput = z.infer<typeof rescheduleSessionInput>;

/** PATCH /sessions/:id/attendance — `mark: null` removes a correction (back to the join log). */
export const updateAttendanceInput = z.object({
  items: z
    .array(z.object({ userId: id, mark: z.enum(ATTENDANCE_MARKS).nullable() }))
    .min(1)
    .max(500),
});
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceInput>;

export const rescheduleRequestListQuery = z.object({
  status: z.enum(RESCHEDULE_REQUEST_STATUSES).optional(),
});
export type RescheduleRequestListQuery = z.infer<typeof rescheduleRequestListQuery>;

export const decideRescheduleRequestInput = z.object({
  reason: z.string().max(500).optional(),
  notifyStudents: z.boolean().default(true),
});
export type DecideRescheduleRequestInput = z.infer<typeof decideRescheduleRequestInput>;

export const shiftScheduleInput = z.object({
  fromSessionNumber: z.number().int().min(1),
  days: z.number().int().min(-60).max(60),
});

export const updateAgendaInput = z.object({
  title: z.string().min(2).optional(),
  agenda: z.array(z.object({ minute: z.number().int().min(0), label: z.string().min(1) })).optional(),
  notes: z.string().max(5000).optional(),
});

export const chatMessageInput = z.object({ body: z.string().trim().min(1).max(2000) });

// ---------- Checkout & payments ----------
export const checkoutInput = z.object({
  batchId: id,
  method: z.enum(PAYMENT_METHODS),
  couponCode: z.string().trim().optional(),
  displayCurrency: z.enum(DISPLAY_CURRENCIES).default('AED'),
  bankAccountId: id.optional(),
});
export type CheckoutInput = z.infer<typeof checkoutInput>;

export const uploadReceiptInput = z.object({ receiptUrl: z.url() });

/** `POST /payments/apple/verify` — the StoreKit 2 JWS (`Transaction.jwsRepresentation`). `orderId` is optional:
 * the transaction's appAccountToken identifies the order (restores of unfinished transactions send none). */
export const appleVerifyInput = z.object({
  orderId: id.optional(),
  signedTransaction: z.string().min(20).max(20_000),
});
export type AppleVerifyInput = z.infer<typeof appleVerifyInput>;

export const reviewTransferInput = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('APPROVE'), receivedAed: z.number().positive() }),
  z.object({ decision: z.literal('REJECT'), reason: z.string().min(3) }),
  z.object({ decision: z.literal('REQUEST_NEW_RECEIPT'), reason: z.string().min(3) }),
]);
export type ReviewTransferInput = z.infer<typeof reviewTransferInput>;

export const refundInput = z.object({ amountAed: z.number().positive(), reason: z.string().min(3) });

export const bankAccountInput = z.object({
  bankName: z.string().min(2),
  accountName: z.string().min(2),
  iban: z.string().regex(/^AE\d{21}$/, 'UAE IBAN: AE + 21 digits'),
  swift: z.string().regex(/^[A-Z0-9]{8}([A-Z0-9]{3})?$/),
  branch: z.string().optional(),
  instructions: z.string().max(1000).optional(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});
export type BankAccountInput = z.infer<typeof bankAccountInput>;

export const fxRateInput = z.object({
  currency: z.enum(['SAR', 'QAR', 'USD']),
  ratePerAed: z.number().positive(),
});

/**
 * Coupon rules. Exactly one of percentOff / amountOffAed; at most one of courseId / batchId
 * (neither = every course). Dates are calendar days: valid from `startsOn` through `expiresOn`.
 */
export const couponInput = z.object({
  code: z.string().regex(/^[A-Z0-9-]{3,20}$/),
  percentOff: z.number().int().min(1).max(100).optional(),
  amountOffAed: z.number().positive().optional(),
  maxRedemptions: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().optional(),
  minOrderAed: z.number().positive().optional(),
  startsOn: isoDate.optional(),
  expiresOn: isoDate.optional(),
  courseId: id.optional(),
  batchId: id.optional(),
  stackable: z.boolean().default(false),
  active: z.boolean().default(true),
});
export type CouponInput = z.infer<typeof couponInput>;

/** PATCH: every rule is optional; `null` clears a limit, a date or the scope. The code is immutable. */
export const updateCouponInput = z.object({
  percentOff: z.number().int().min(1).max(100).nullable().optional(),
  amountOffAed: z.number().positive().nullable().optional(),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  perUserLimit: z.number().int().positive().nullable().optional(),
  minOrderAed: z.number().positive().nullable().optional(),
  startsOn: isoDate.nullable().optional(),
  expiresOn: isoDate.nullable().optional(),
  courseId: id.nullable().optional(),
  batchId: id.nullable().optional(),
  stackable: z.boolean().optional(),
  active: z.boolean().optional(),
});
export type UpdateCouponInput = z.infer<typeof updateCouponInput>;

// ---------- Payouts ----------
export const teacherBankDetailsInput = z.object({
  bankName: z.string().min(2),
  accountHolder: z.string().min(2),
  iban: z.string().regex(/^AE\d{21}$/),
  swift: z.string().regex(/^[A-Z0-9]{8}([A-Z0-9]{3})?$/),
});
export type TeacherBankDetailsInput = z.infer<typeof teacherBankDetailsInput>;

export const createPayoutRunInput = z.object({ periodStart: isoDate, periodEnd: isoDate });
export const payoutAdjustmentInput = z.object({
  payoutId: id,
  amountAed: z.number(), // positive bonus, negative deduction
  reason: z.string().min(3),
});
export const markPayoutPaidInput = z.object({ transferReference: z.string().min(3) });

// ---------- Content ----------
export const materialInput = z.object({
  batchId: id,
  sessionId: id.optional(),
  title: z.string().min(2),
  url: z.url(),
  kind: z.enum(['SLIDES', 'FILE', 'LINK', 'VIDEO']),
});

export const assignmentInput = z.object({
  batchId: id,
  sessionId: id.optional(),
  title: z.string().min(2),
  description: z.string().default(''),
  dueAt: z.iso.datetime(),
  maxScore: z.number().int().min(1).default(100),
});
export const submissionInput = z.object({ url: z.url().optional(), text: z.string().max(10000).optional() });
export const gradeInput = z.object({ score: z.number().int().min(0), feedback: z.string().max(5000).optional() });

export const sessionFeedbackInput = z.object({
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.string()).max(10).default([]),
  comment: z.string().max(2000).optional(),
});

// ---------- Query & admin helpers (added for the v1 API) ----------
export const dateRangeQuery = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});
export type DateRangeQuery = z.infer<typeof dateRangeQuery>;

export const cancelSessionInput = z.object({
  reason: z.string().max(500).optional(),
  notifyStudents: z.boolean().default(true),
});
export type CancelSessionInput = z.infer<typeof cancelSessionInput>;

export const orderListQuery = paginationQuery.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
});
export type OrderListQuery = z.infer<typeof orderListQuery>;

export const transferListQuery = paginationQuery.extend({
  status: z.enum(ORDER_STATUSES).optional(),
});

export const adminUserListQuery = paginationQuery.extend({
  role: z.enum(ROLES).optional(),
});

export const adminUpdateUserInput = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(ROLES).optional(),
  banned: z.boolean().optional(),
  ...publicProfileFields,
});
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserInput>;

export const updateBankAccountInput = bankAccountInput.partial();
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountInput>;

/** GET /admin/reports — inclusive local days (Asia/Dubai); default the last 30 days. */
export const reportQuery = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type ReportQuery = z.infer<typeof reportQuery>;

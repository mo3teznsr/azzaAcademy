import { z } from 'zod';
import {
  ATTENDANCE_MARKS,
  BATCH_STATUSES,
  COURSE_LEVELS,
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
export const updateProfileInput = z.object({
  name: z.string().min(2).max(80).optional(),
  locale: z.enum(LOCALES).optional(),
  timezone: ianaTimezone.optional(),
  displayCurrency: z.enum(DISPLAY_CURRENCIES).optional(),
  phone: z.string().max(32).optional(),
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

// ---------- Courses ----------
export const courseModuleInput = z.object({
  titleEn: z.string().min(2),
  titleAr: z.string().optional(),
  order: z.number().int().min(0),
});

export const createCourseInput = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  titleEn: z.string().min(2),
  titleAr: z.string().optional(),
  descriptionEn: z.string().default(''),
  descriptionAr: z.string().optional(),
  category: z.string().min(2),
  level: z.enum(COURSE_LEVELS),
  coverStyle: z.enum(['sun', 'sky', 'sage', 'peach']).default('sun'),
  priceAed: z.number().positive(),
  modules: z.array(courseModuleInput).default([]),
});
export type CreateCourseInput = z.infer<typeof createCourseInput>;
export const updateCourseInput = createCourseInput.partial().extend({ status: z.enum(COURSE_STATUSES).optional() });
export type UpdateCourseInput = z.infer<typeof updateCourseInput>;

export const courseListQuery = paginationQuery.extend({
  category: z.string().optional(),
  level: z.enum(COURSE_LEVELS).optional(),
  status: z.enum(COURSE_STATUSES).optional(),
});

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
  teacherId: id,
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

export const couponInput = z.object({
  code: z.string().regex(/^[A-Z0-9-]{3,20}$/),
  percentOff: z.number().int().min(1).max(100).optional(),
  amountOffAed: z.number().positive().optional(),
  maxRedemptions: z.number().int().positive().optional(),
  expiresOn: isoDate.optional(),
});

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
});
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserInput>;

export const updateBankAccountInput = bankAccountInput.partial();
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountInput>;

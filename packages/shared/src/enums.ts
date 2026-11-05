// Single source of truth for enum values shared by API, web and (mirrored) mobile.

export const ROLES = ['STUDENT', 'TEACHER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const LOCALES = ['en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

export const SESSION_LANGUAGES = ['AR', 'EN'] as const;
export type SessionLanguage = (typeof SESSION_LANGUAGES)[number];

export const COURSE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];

export const BATCH_STATUSES = ['DRAFT', 'ENROLLING', 'FULL', 'RUNNING', 'COMPLETED', 'CANCELLED'] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const SESSION_STATUSES = ['SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const ENROLLMENT_STATUSES = [
  'PENDING_PAYMENT',
  'AWAITING_TRANSFER',
  'VERIFYING',
  'ACTIVE',
  'WAITLISTED',
  'CANCELLED',
  'REFUNDED',
  'EXPIRED',
] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

/** APPLE_IAP is the iOS app's only method (App Store guideline 3.1.1); Android and web use STRIPE / BANK_TRANSFER. */
export const PAYMENT_METHODS = ['STRIPE', 'BANK_TRANSFER', 'APPLE_IAP'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ORDER_STATUSES = [
  'AWAITING_PAYMENT',
  'AWAITING_RECEIPT',
  'VERIFYING',
  'AMOUNT_MISMATCH',
  'PAID',
  'FAILED',
  'REJECTED',
  'EXPIRED',
  'REFUNDED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Money only moves in AED. The others are display currencies. */
export const BASE_CURRENCY = 'AED' as const;
export const DISPLAY_CURRENCIES = ['AED', 'SAR', 'QAR', 'USD'] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export const EARNING_STATUSES = ['PENDING', 'AVAILABLE', 'PAID', 'REVERSED'] as const;
export type EarningStatus = (typeof EARNING_STATUSES)[number];

export const PAYOUT_RUN_STATUSES = ['DRAFT', 'APPROVED', 'PROCESSING', 'PAID'] as const;
export type PayoutRunStatus = (typeof PAYOUT_RUN_STATUSES)[number];

export const PAYOUT_STATUSES = ['READY', 'HELD', 'PAID', 'CARRIED_OVER'] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const PLATFORMS = ['ios', 'android', 'web'] as const;
export type Platform = (typeof PLATFORMS)[number];

/** Teacher/admin correction of a student's attendance for one session (overrides the LiveKit join log). */
export const ATTENDANCE_MARKS = ['PRESENT', 'LATE', 'LEFT_EARLY', 'ABSENT'] as const;
export type AttendanceMark = (typeof ATTENDANCE_MARKS)[number];

export const RESCHEDULE_REQUEST_STATUSES = ['PENDING', 'APPROVED', 'DECLINED'] as const;
export type RescheduleRequestStatus = (typeof RESCHEDULE_REQUEST_STATUSES)[number];

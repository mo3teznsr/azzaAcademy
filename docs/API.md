# Azza API contract (v1)

Base: `http://localhost:4000`. JSON everywhere. Errors: `{ "error": { "code", "message", "details?" } }`.
Lists: `{ items, total, page, pageSize, pageCount }` with `?page=&pageSize=&q=`.
Request bodies = zod schemas in `packages/shared/src/schemas.ts` (named below). Money fields end in `Fils` (AED × 100).
Status: ✅ implemented · ⏳ to implement.

## Auth (better-auth) ✅
| | |
|---|---|
| `POST /api/auth/sign-up/email` | `{ name, email, password }` → `{ token, user }` (role defaults to STUDENT) |
| `POST /api/auth/sign-in/email` | `{ email, password }` → `{ token, user }`; web gets a cookie, mobile stores `token` |
| `POST /api/auth/sign-out` | |
| `GET  /api/auth/get-session` | → `{ session, user }` or `null` |
| `POST /api/auth/request-password-reset` / `reset-password` | |
| `GET  /api/auth/verify-email?token=` | |
User fields: `id, name, email, role, locale ('en'|'ar'), timezone, displayCurrency, phone, image, headline, bio` (`headline`/`bio`: public teacher profile, `null` when unset).

## Me ✅
| | |
|---|---|
| `GET /api/v1/me` | profile + `counts: { activeEnrollments, unreadNotifications, teachingBatches, upcomingSessions }` (next 7 days) |
| `PATCH /api/v1/me` | `updateProfileInput` → profile. `headline` (≤ 120) / `bio` (≤ 2000, `null` clears) are TEACHER/ADMIN only (403 for students) |
| `DELETE /api/v1/me` | `deleteAccountInput` `{ confirm: "DELETE" }` (anything else → 400 `VALIDATION`) → `{ ok: true, deleted: true }`. Permanently erases the signed-in account (App Store 5.1.1(v) / Google Play): login sessions, linked accounts, verification rows, device tokens, notifications, teacher bank details, chat messages, session feedback, submissions, certificates and reschedule requests are deleted; seat-holding/waitlisted enrollments → CANCELLED (seats released to the waitlist), unpaid holds (`AWAITING_PAYMENT`/`AWAITING_RECEIPT`) → EXPIRED. The `user` row is kept as an anonymous tombstone (`name: "Deleted user"`, `email: deleted-<id>@deleted.invalid`, image/phone/headline/bio null, role STUDENT, banned) so paid/refunded orders, earnings and payouts survive for accounting; attendance rows stay linked to the tombstone. 409 refusals (nothing is changed): `ADMIN_ACCOUNT` · `HAS_ACTIVE_TEACHING` (taught batch not COMPLETED/CANCELLED, or an upcoming hosted session) · `HAS_UNPAID_EARNINGS` (PENDING/AVAILABLE earnings or READY/HELD payouts) · `ORDER_IN_PROGRESS` (bank transfer VERIFYING / AMOUNT_MISMATCH). Uploaded files (avatar, receipts, submission files) are not removed from storage |
| `POST /api/v1/me/devices` | `registerDeviceInput` (FCM token; re-registering a token moves it to this user) → 201 |
| `DELETE /api/v1/me/devices/:token` | |
| `GET /api/v1/me/schedule?from&to` | `dateRangeQuery` (ISO datetimes; default today 00:00Z + 30 days) → `{ from, to, items: LiveSession+batch{course,teacher}[] }`. Student: sessions of ACTIVE enrollments · teacher: hosted / own batches · admin: all |
| `GET /api/v1/me/calendar` | → `{ url, webcalUrl }` — signed ICS subscription feed for this user (no cookie needed) |
| `GET /api/calendar/:userId/:token.ics` | public, token-signed (HMAC of `BETTER_AUTH_SECRET`) `text/calendar` feed: sessions from 30 days ago to 180 days ahead (student: ACTIVE batches · teacher: hosted/own · admin: all); cancelled sessions are `STATUS:CANCELLED`. Bad token → 404 |
| `GET /api/v1/me/enrollments` | `{ items: [{ ...enrollment, batch{course,teacher,schedule{weekdays,startTime,durationMin,sessionCount}}, latestOrder, nextSession, progress{ sessionsDone, sessionsTotal, sessionsAttended, percent } }] }` (all statuses) |
| `GET /api/v1/me/notifications?page&pageSize&unread=true` | paged list + `unread` count · `POST /api/v1/me/notifications/:id/read` · `POST /api/v1/me/notifications/read-all` → `{ updated }` |
| `GET /api/v1/me/orders` | `{ items }` my orders (+ batch/course) |
| `GET /api/v1/me/recordings` | `{ items }` sessions with `recordingUrl` (student: ACTIVE batches; teacher: own) |
| `GET /api/v1/me/waitlist` ✅ | `{ items: [{ enrollmentId, joinedAt, batchId, batchCode, batchStatus, startsOn, course{id,slug,titleEn,titleAr,coverImageUrl}, courseTitle, position, total }], promoted: [{ enrollmentId, batchId, batchCode, batchStatus, startsOn, course, courseTitle, promotedAt, holdExpiresAt }] }`. `items` = my WAITLISTED enrollments; `position` is 1-based by enrollment `createdAt` among the batch's WAITLISTED (the order seats are offered in), `total` = people waiting. `promoted` = seats offered to me from the waitlist (PENDING_PAYMENT, no open order, `WAITLIST_SEAT_OPEN` sent) → check out before `holdExpiresAt` (+24 h) |

## Certificates ✅
Rule: a student with an ACTIVE enrollment gets one certificate per batch once the batch is over (every non-cancelled session ENDED, or the batch COMPLETED) and they attended **≥ 80 % of the non-cancelled sessions, rounded up** (10 of 12, 8 of 10). Attendance = joined the room, corrected by `AttendanceMark` (same as the roster). Codes look like `AZ-CERT-7Q4K` (alphabet without 0/O/1/I/L/U/V).
| | |
|---|---|
| `GET /api/v1/me/certificates` | issues any newly earned certificates (idempotent, one per `(user, batch)`; `attended`/`total` frozen at issue) → `{ items: [{ id, code, issuedAt, attended, total, batchId, batchCode, course{id,slug,titleEn,titleAr,coverImageUrl}, courseTitle, teacherName, startsOn, endsOn }], inProgress: [{ batchId, batchCode, course, courseTitle, teacherName, startsOn, endsOn, attended, total, required, needed, sessionsEnded, reachable }] }` — `inProgress` = ACTIVE batches not over yet; `required` = sessions to attend, `needed` = still to attend, `reachable` = `needed` ≤ sessions left |
| `GET /api/v1/certificates/:code` | public (no auth; code case-insensitive) → `{ valid: true, code, issuedAt, attended, total, batchId, batchCode, course, courseTitle, teacherName, startsOn, endsOn, holderName }`; unknown code → 404 |

## Teachers ✅
`GET /api/v1/teachers/:id` (public) → `{ id, name, image, headline, bio, languages: ('AR'|'EN')[], courses: [{ id, slug, titleEn, titleAr, coverImageUrl, category }], upcomingBatches: [{ id, code, courseId, courseTitle, courseTitleAr, courseSlug, language, timezone, startsOn, scheduleSummary ("Tue & Thu · 19:00 · 12 sessions"), seatsLeft, status (ENROLLING\|FULL), priceFils (batch price, else course price) }] }`. Courses/languages come from the teacher's non-draft, non-cancelled batches on PUBLISHED courses; `seatsLeft` = capacity − seat-holding enrollments. 404 unless the user is a (non-banned) TEACHER. Teachers set `headline`/`bio` with `PATCH /me`, admins with `PATCH /admin/users/:id`.

## Courses ✅
`GET /api/v1/courses` (`courseListQuery`; non-admins see PUBLISHED) · `GET /api/v1/courses/:idOrSlug` · `POST` (ADMIN, `createCourseInput`) · `PATCH /:id` (ADMIN, `updateCourseInput`).

**Images.** `course.coverImageUrl` (also on every embedded course ref) is a photo cover: a `/media/...` path, a file URL returned by `POST /admin/media` (`kind=course-cover`), or an `https://` URL; `null` = typographic cover in `coverStyle` colours (the fallback colour). People keep their photo in `image` (seeded teachers: `/media/teachers/<name>.jpg`). Paths starting with `/` are relative to the API origin — clients resolve them (`mediaUrl()` on web, `resolveMediaUrl()` on mobile). `GET /media/*` serves the bundled art in `apps/api/public/media/` (public, static).

**Intro video.** `course.introVideoUrl` (also on every embedded course ref; `null` = none) is a file URL returned by `POST /admin/media` (`kind=course-video`), a YouTube link (`youtube.com/watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`), a Vimeo link (`vimeo.com/<id>`, `player.vimeo.com/video/<id>`) or an `https://` link to an `.mp4` / `.mov` / `.webm` file. `createCourseInput` / `updateCourseInput` accept it (nullable; `null` clears) and refuse anything else (400 `VALIDATION`). `parseCourseVideoUrl()` in `@azza/shared` classifies a URL as `{ kind: 'file', url }` (play in a native player) or `{ kind: 'youtube' | 'vimeo', id, embedUrl }` (`embedUrl` is the privacy-friendly `youtube-nocookie.com` / `player.vimeo.com/...?dnt=1` player).

## Batches ✅
| | |
|---|---|
| `GET /api/v1/batches` ✅ | `batchListQuery`; teacher → own; public → ENROLLING/FULL/RUNNING |
| `GET /api/v1/batches/:id` ✅ | batch + course + teacher + schedule + sessions + `seatsTaken`, `seatsLeft` |
| `POST /api/v1/batches/schedule/preview` ✅ | ADMIN, `previewScheduleInput` → `{ sessions, skipped, endsOn, conflicts }` |
| `POST /api/v1/batches` ✅ | ADMIN, `createBatchInput` (generates all sessions; 409 on teacher conflicts) |
| `PATCH /api/v1/batches/:id` ✅ | ADMIN, `updateBatchInput` (status transitions enforced) |
| `GET /api/v1/batches/:id/roster` ✅ | TEACHER(own)/ADMIN → `{ endedSessions, averageAttendancePercent, items: [{ user, sessionsAttended, secondsAttended, attendancePercent }] }` (ACTIVE students; each item also has `attendedSessionIds`; `attendancePercent`/`averageAttendancePercent` are `null` before the first session ends) |
| `POST /api/v1/batches/:id/shift` ✅ | ADMIN, `shiftScheduleInput` — moves every SCHEDULED session from `fromSessionNumber` by `days` (keeps local time), 409 on teacher conflicts, notifies students; → batch |
| `GET /api/v1/batches/:id/enrollments` ✅ | ADMIN → `{ items: [{ ...enrollment, user, orders[] }] }` (all statuses) |

## Sessions & live (LiveKit) ✅
Classroom roles: `host` (batch teacher or `session.hostId`), `student` (ACTIVE enrollment), `observer` (ADMIN, hidden, cannot publish).
| | |
|---|---|
| `GET /api/v1/sessions/:id` | session + host + batch{course,teacher} + materials + assignments + `myRole` (host/student/observer only) |
| `PATCH /api/v1/sessions/:id/agenda` | host/ADMIN, `updateAgendaInput` |
| `POST /api/v1/sessions/:id/reschedule` | `rescheduleSessionInput`. ADMIN → 200 `{ requested: false, session }` (409 on teacher conflict, notifies students+teacher with email). Host (teacher) → **202** `{ requested: true, session, request }`: a `RescheduleRequest` (PENDING) is stored (a newer one for the same session supersedes → DECLINED) and admins get a `SESSION_RESCHEDULE_REQUEST` notification (`data.requestId`) |
| `GET /api/v1/reschedule-requests?status=PENDING\|APPROVED\|DECLINED` | TEACHER (own) / ADMIN (all) → `{ items: [{ id, sessionId, requestedById, startsAt, endsAt, reason, status, decidedById, decidedAt, decisionNote, createdAt, requestedBy{id,name,image}, decidedBy{id,name}\|null, session{ id, number, title, status, startsAt, endsAt, batch{ id, code, timezone, course{id,titleEn,titleAr}, teacher{id,name} } } }] }` newest first (≤ 200) |
| `POST /api/v1/reschedule-requests/:id/approve` · `/decline` | ADMIN, `decideRescheduleRequestInput` (`{ reason?, notifyStudents = true }`). Approve moves the session exactly like an admin reschedule (409 teacher clash / 422 `SESSION_NOT_SCHEDULED` / `START_IN_PAST` leave the request PENDING) → `{ request, session }`; decline → `{ request }`. The teacher gets `SESSION_RESCHEDULE_APPROVED` / `SESSION_RESCHEDULE_DECLINED`. 422 `REQUEST_ALREADY_DECIDED` |
| `POST /api/v1/sessions/:id/cancel` | ADMIN, `cancelSessionInput` (`{ reason?, notifyStudents }`) |
| `POST /api/v1/sessions/:id/join` | → `{ serverUrl, token, roomName, role, canPublish, sessionStatus }`. Lobby opens 15 min before `startsAt` (422 `LOBBY_NOT_OPEN`, `details.opensAt`); 422 `SESSION_ENDED` / `SESSION_CANCELLED`; 403 without ACTIVE enrollment. Students join with `canPublish=false` until the host uses allow-speak (kept on rejoin). Without LiveKit keys `serverUrl=""` and the token is a dev string |
| `POST /api/v1/sessions/:id/start` | host/ADMIN, from 15 min before start: status LIVE, starts recording (failure is logged, not fatal), batch ENROLLING/FULL → RUNNING, broadcasts `session:status`, pushes `SESSION_LIVE` to students |
| `POST /api/v1/sessions/:id/end` | host/ADMIN: ENDED, stop recording, close room, close open attendance, accrue earnings; last session → batch COMPLETED |
| `POST /api/v1/sessions/:id/participants/:userId/mute` · `/remove` · `/allow-speak` | host/ADMIN while LIVE → `{ ok, action, userId }` (allow-speak also lowers the hand) |
| `GET /api/v1/sessions/:id/hands` | current raised-hand queue (`HandQueueEvent`) |
| `GET /api/v1/sessions/:id/messages?before&limit` | chat history, oldest first, `limit` ≤ 200 (default 100) |
| `GET /api/v1/sessions/:id/attendance` | host/ADMIN → `{ sessionId, total, present, percent, items: [{ user, attended, mark, firstJoinedAt, lastLeftAt, seconds, joins }] }` — `mark` (`PRESENT\|LATE\|LEFT_EARLY\|ABSENT`) is a saved correction or `null`; when set it decides `attended` |
| `PATCH /api/v1/sessions/:id/attendance` | host/ADMIN, session LIVE/ENDED (422 `SESSION_NOT_STARTED`), `updateAttendanceInput` `{ items: [{ userId, mark \| null }] }` (`null` removes the correction; 422 `NOT_IN_BATCH` for non-ACTIVE students) → the attendance report above. Corrections also count in `GET /batches/:id/roster` |
| `POST /api/v1/sessions/:id/feedback` | STUDENT (ACTIVE), session LIVE/ENDED, `sessionFeedbackInput` (upsert) → 201 |
| `POST /api/webhooks/livekit` | raw body + `Authorization` (LiveKit signature). participant_joined/left → Attendance; egress_ended → `recordingUrl` (+ `RECORDING_READY`); room_finished → ENDED (same path as `/end`). Without keys the body is a plain JSON `{ event, roomName?, participantIdentity?, egressId?, fileUrl? }` |

## Content ✅
`GET/POST /api/v1/batches/:id/materials` (body = `materialInput` without `batchId`; teacher/admin write, ACTIVE students read) ·
`GET/POST /api/v1/batches/:id/assignments` (body = `assignmentInput` without `batchId`; students also get `mySubmission`, everyone `submissionCount`) ·
`GET /api/v1/assignments/:id/submissions` (teacher/admin) · `POST /api/v1/assignments/:id/submissions` (`submissionInput`, ACTIVE student, upsert → `{ ...submission, late }`) ·
`POST /api/v1/submissions/:id/grade` (`gradeInput`, teacher/admin, `score ≤ maxScore`) · `GET /api/v1/me/recordings`.

## Checkout & payments ✅ (AED only)
| | |
|---|---|
| `GET /api/v1/fx-rates` | `{ base: 'AED', rates: { SAR, QAR, USD }, updatedAt }` (defaults SAR 1.0211 · QAR 0.9912 · USD 0.2723 until set) |
| `POST /api/v1/checkout/quote` | `checkoutInput` (no auth needed; with a session the per-student limit is checked too) → `{ subtotalFils, discountFils, vatFils, totalFils, couponCode, display: { currency, amount, rate } }`. 422 `COUPON_INVALID`, `details.reason` (first broken rule, in this order): `NOT_FOUND`, `PAUSED`, `NOT_STARTED` (+`startsOn`), `EXPIRED`, `EXHAUSTED`, `WRONG_BATCH`, `WRONG_COURSE`, `BELOW_MINIMUM` (+`minOrderFils`, `subtotalFils`), `PER_USER_LIMIT` (+`perUserLimit`; counts the student's paid redemptions + open orders with the code). `POST /checkout` applies the same rules |
| `POST /api/v1/checkout` | `checkoutInput` → **201** `{ waitlisted: false, order, enrollment, quote, ... }` with STRIPE: `clientSecret` (order `AWAITING_PAYMENT`, enrollment `PENDING_PAYMENT`, hold 60 min); BANK_TRANSFER: `bankAccount` (full IBAN), `reference` (e.g. `AZ-B07-48213`), `expiresAt` (= now + `BANK_TRANSFER_HOLD_HOURS`; order `AWAITING_RECEIPT`, enrollment `AWAITING_TRANSFER`, instructions emailed); APPLE_IAP (iOS app only): `appleProductId` (consumable for the batch's list price, `com.futuretech.azza.seat.aed<whole AED>`) + `appAccountToken` (UUID to pass to StoreKit; order `AWAITING_PAYMENT`, enrollment `PENDING_PAYMENT`, hold 60 min), 422 `APPLE_PRODUCT_UNAVAILABLE` (price not whole dirhams) / `COUPON_NOT_SUPPORTED` (App Store prices are fixed). Batch full + waitlist on → **202** `{ waitlisted: true, enrollment }`. 409 with `details.code`: `ALREADY_ENROLLED`, `ALREADY_WAITLISTED`, `ORDER_IN_PROGRESS` (+`orderId`), `BATCH_FULL`. 422 `BATCH_NOT_OPEN` |
| `POST /api/v1/batches/:id/waitlist` | STUDENT joins the waitlist of a genuinely full batch (waitlist on) → **201** `{ enrollment }` (WAITLISTED, `WAITLISTED` notification + email). 409 `details.code`: `SEATS_AVAILABLE` (go to checkout), `ALREADY_ENROLLED`, `ALREADY_WAITLISTED`, `ORDER_IN_PROGRESS` (+`orderId`), `WAITLIST_DISABLED` · `DELETE …/waitlist` → `{ enrollment }` (CANCELLED), 404 if not waitlisted |
| `GET /api/v1/orders/:id` · `GET /api/v1/me/orders` | owner or ADMIN |
| `POST /api/v1/orders/:id/receipt` | `uploadReceiptInput`, owner, from `AWAITING_RECEIPT` (before `expiresAt`) or `AMOUNT_MISMATCH` → order `VERIFYING`, enrollment `VERIFYING` |
| `POST /api/v1/orders/:id/receipt/file` | same rules, `multipart/form-data` with a `file` field (PDF/PNG/JPG/WEBP/HEIC, ≤ 10 MB; 422 `RECEIPT_FILE_INVALID` `details.reason`: TYPE/EMPTY/TOO_LARGE/MISSING). Stored through the `FileStorage` port: `S3FileStorage` (private bucket `S3_BUCKET`, served via CloudFront at `<CLOUDFRONT_URL>/receipts/<random>.<ext>`; required in production) or, when S3 is not configured in dev, `LocalDiskStorage` (`apps/api/uploads/`, override with `UPLOADS_DIR`, served at `GET /uploads/receipts/<random>.<ext>`); the order's `receiptUrl` is set to that URL |
| `POST /api/v1/payments/apple/verify` | `appleVerifyInput` `{ orderId?, signedTransaction }` (StoreKit 2 `Transaction.jwsRepresentation`), student. The JWS is verified with Apple's `@apple/app-store-server-library` (x5c chain to Apple Root CA G3, ES256, bundle `APPLE_BUNDLE_ID`, environment in `APPLE_IAP_ENVIRONMENT`, `APPLE_APP_APPLE_ID` for Production; 400 `APPLE_VERIFICATION_FAILED` / `APPLE_ENVIRONMENT_NOT_ACCEPTED`). The order is found by the transaction's `appAccountToken` (else `orderId`, else the student's newest unpaid APPLE_IAP order for that product) and paid through the same path as a Stripe success (PAID + ACTIVE + enrolled notification; a late purchase still activates an EXPIRED/FAILED hold); `appleTransactionId` (unique), `appleOriginalTransactionId`, `appleEnvironment` and `receivedFils` (Apple's AED price when reported) are stored → `{ order, duplicate }`; replays → `duplicate: true`. Refusals carry `details: { code, orderId?, finishTransaction }` — `finishTransaction: true` means retrying can never succeed and the app finishes the StoreKit transaction: 404 `ORDER_NOT_FOUND`; 409 `NOT_APPLE_ORDER`, `PRODUCT_MISMATCH`, `TOKEN_MISMATCH`, `TRANSACTION_REVOKED`, `ORDER_ALREADY_PAID`, `ORDER_REFUNDED`; 403 `FOREIGN_ORDER` (another account's purchase; `finishTransaction: false`) |
| `GET /api/v1/bank-accounts` | active accounts (IBAN masked `AE07•••…3456` unless ADMIN) |
| `POST /api/webhooks/stripe` | raw body + `stripe-signature`. `payment_intent.succeeded` → order PAID (+fee) + enrollment ACTIVE + coupon redeemed (a `CouponRedemption` row per order + `redemptions` counter; same on transfer APPROVE); idempotent (`duplicate: true` on replays). `payment_failed` → order FAILED (seat held 24 h for a retry). Without Stripe keys the body is `{ "type": "payment.succeeded", "paymentIntentId": "pi_dev_<reference>", "feeFils"?: n }` |
| `POST /api/webhooks/apple` | App Store Server Notifications **V2** `{ signedPayload }`, verified like `/payments/apple/verify` (400 when not). `REFUND` / `REVOKE` for a PAID order → full refund recorded (order REFUNDED, enrollment REFUNDED, teacher `REFUND_ADJUSTMENT`, seat released to the waitlist, `ORDER_REFUNDED` notification); idempotent (`duplicate: true`). Other types (`CONSUMPTION_REQUEST`, `REFUND_DECLINED`, `TEST`, …) → `{ received: true, handled: false, type }` |
Payment methods: `STRIPE`, `BANK_TRANSFER` (web, Android), `APPLE_IAP` (iOS only — App Store guideline 3.1.1).
Order statuses: `AWAITING_PAYMENT, AWAITING_RECEIPT, VERIFYING, AMOUNT_MISMATCH, PAID, FAILED, REJECTED, EXPIRED, REFUNDED`.
Enrollment statuses: seat-holding = `ACTIVE, PENDING_PAYMENT, AWAITING_TRANSFER, VERIFYING`; plus `WAITLISTED, CANCELLED, EXPIRED, REFUNDED`. Batch flips ENROLLING ⇄ FULL automatically.
Job (every 5 min, started by `src/index.ts`): expired holds → order/enrollment EXPIRED; promoted waitlist / failed-card holds without an open order expire after 24 h; freed seats go to the first WAITLISTED student (→ `PENDING_PAYMENT` + `WAITLIST_SEAT_OPEN` email, they may then check out even if the batch looks full). A second job releases matured earnings hourly.

### Admin finance ✅
`GET /api/v1/admin/transfers?status=&q=` (default queue: VERIFYING + AMOUNT_MISMATCH, bank transfers only) ·
`POST /api/v1/admin/orders/:id/review` (`reviewTransferInput`): APPROVE needs `receivedAed × 100 == totalFils` → PAID + ACTIVE + enrolled email; otherwise the order is saved as `AMOUNT_MISMATCH` (with `receivedFils`) and the call returns **422 `AMOUNT_MISMATCH`** `details: { orderId, expectedFils, receivedFils, differenceFils }`; REJECT → REJECTED + enrollment CANCELLED + email + waitlist promotion; REQUEST_NEW_RECEIPT → AWAITING_RECEIPT with a fresh hold + email ·
`POST /api/v1/admin/orders/:id/refund` (`refundInput`, PAID only, partial allowed) → `{ order, refundFils, manual }` (Stripe refund, or `manual: true` for bank transfers to be paid by finance; APPLE_IAP → 422 `APPLE_REFUND_VIA_APPLE`, only Apple refunds them and the webhook records it); full refund → REFUNDED + enrollment REFUNDED; always books a negative `REFUND_ADJUSTMENT` earning for the teacher ·
`GET/POST /api/v1/admin/bank-accounts`, `PATCH /api/v1/admin/bank-accounts/:id` (`bankAccountInput` / `updateBankAccountInput`) · `PUT /api/v1/admin/fx-rates` (`fxRateInput`) · `GET/POST /api/v1/admin/coupons` (`couponInput`: exactly one of `percentOff` / `amountOffAed`; optional `maxRedemptions`, `perUserLimit`, `minOrderAed`, `startsOn`/`expiresOn` (YYYY-MM-DD, valid through the expiry day), scope `courseId` **or** `batchId` (neither = all courses), `stackable` (stored only — one coupon per order), `active`; 422 `COUPON_TERMS` `details.field`: discount/scope/dates/perUserLimit; 404 unknown course/batch; 409 duplicate code). Items include `course`/`batch` (scope, with titles) and a derived `status`: `ACTIVE`/`SCHEDULED`/`EXPIRED`/`PAUSED`/`EXHAUSTED` ·
`PATCH /api/v1/admin/coupons/:id` (`updateCouponInput`, partial; `null` clears; setting one discount kind or scope clears the other; `{ active: false }` pauses) ·
`GET /api/v1/admin/coupons/:id/usage` → `{ coupon: { id, code, redemptions, maxRedemptions }, totalDiscountFils, items: [{ id, createdAt, discountFils, student: { id, name, email }, order: { id, reference, totalFils }, batch: { id, code, courseTitleEn, courseTitleAr } }] }` newest first · `GET /api/v1/admin/orders` (`orderListQuery`).

## Earnings & payouts ✅
Rule: per delivered session the teacher (session host, else batch teacher) earns `round(TEACHER_SHARE_PERCENT% × netFils ÷ sessionCount)`, net = Σ over PAID/REFUNDED orders of (kept amount **excluding VAT**) − Stripe fees. Accrued when a session ends (idempotent on `(sessionId, teacherId, kind)`), `PENDING` for `EARNING_HOLD_DAYS`, then `AVAILABLE`. Refunds add a negative `REFUND_ADJUSTMENT` (`share% × refundNet × delivered ÷ sessionCount`).
| | |
|---|---|
| `GET /api/v1/teacher/earnings` | TEACHER → `{ summary: { earnedThisMonthFils, scheduledRestOfMonthFils, availableFils, pendingFils, lifetimePaidFils, nextPayout: { expectedOn (5th of next month), estimatedFils } }, batches: [{ batchId, code, status, course, activeStudents, sessionCount, sessionsDelivered, grossFils, refundsFils, vatFils, feesFils, netRevenueFils, perSessionFils, earnedFils, projectedTotalFils }], ledger: [last 100 earnings with batch + session] }` (month in the teacher's timezone) |
| `GET /api/v1/teacher/payouts` | `{ items: [{ ...payout, totalFils, run }] }` |
| `GET /api/v1/teacher/bank-details` → `{ bankDetails \| null }` · `PUT` | `teacherBankDetailsInput` (sets `verified=false`, notifies admins) |
| `POST /api/v1/admin/payout-runs` | `createPayoutRunInput` → DRAFT run, one Payout per teacher over AVAILABLE unpaid earnings up to `periodEnd`: `HELD` (`NO_BANK_DETAILS` / `BANK_DETAILS_UNVERIFIED`), `CARRIED_OVER` (below `MIN_PAYOUT_AED`), else `READY`. 409 if the period exists |
| `GET /api/v1/admin/payout-runs` (paged, with `totalFils`, `readyFils`, `heldCount`) · `GET /api/v1/admin/payout-runs/:id` (payouts + teacher + bankDetails + `totals`) | |
| `POST /api/v1/admin/payout-runs/:id/approve` (DRAFT → APPROVED) · `GET\|POST …/export` (CSV download) · `POST …/mark-paid` (`markPayoutPaidInput`, APPROVED → PAID: READY payouts + their earnings PAID, `payoutPaid` email; HELD/CARRIED_OVER earnings roll into the next run) | |
| `POST /api/v1/admin/payouts/adjustments` | `payoutAdjustmentInput` (DRAFT runs only; books a BONUS/DEDUCTION earning and re-evaluates the payout status) → run |
| `POST /api/v1/admin/teachers/:id/bank-details/verify` | also re-evaluates that teacher's HELD payouts in draft runs |

## Public stats ✅
`GET /api/v1/stats/live` (no auth, cached 15 s) → `{ liveSessions, participants }` (LIVE sessions and people in their LiveKit rooms).

## Admin ✅
`GET /api/v1/admin/settings` → `{ rules: { TEACHER_SHARE_PERCENT, EARNING_HOLD_DAYS, MIN_PAYOUT_AED, BANK_TRANSFER_HOLD_HOURS, VAT_PERCENT }, integrations: { stripe, livekit, smtp, push } }` (booleans only, never secrets) ·
`GET /api/v1/admin/dashboard` → `{ date, liveRooms, sessionsToday: { count, items (with `movedFrom`) }, activeBatches, seats: { held, capacity, filledPercent }, revenueMonth: { grossFils, refundedFils, vatFils, netFils, orders }, alerts: [{ type: TRANSFERS_TO_VERIFY|SEAT_HOLDS_EXPIRING|TEACHER_BANK_UNVERIFIED|PAYOUTS_HELD, severity, count }] }` (days/months in Asia/Dubai) ·
`GET /api/v1/admin/users?role=&q=` (paged) · `POST /api/v1/admin/users` (`adminCreateUserInput`; account is email-verified, the user gets an **invite** email with a set-password link) · `PATCH /api/v1/admin/users/:id` (`adminUpdateUserInput`: `name?, role?, banned?, headline?, bio?`; banning revokes logins; you cannot ban/demote yourself) ·
`GET /api/v1/admin/live-rooms` → `{ items: [{ session, roomName, participants, recording, roomOpen, roomCreatedAt }], orphanRooms }` (LiveKit rooms joined with LIVE sessions). ·
`POST /api/v1/admin/media` (multipart: `file` + `kind` = `course-cover` | `course-video`) → **201** `{ url }` — stores a course cover (JPG/PNG/WEBP ≤ 8 MB, folder `course-covers/`) or intro video (MP4/MOV/WEBM ≤ 200 MB, folder `course-videos/`) through the FileStorage port; save the URL on the course with `PATCH /courses/:id` (`coverImageUrl` / `introVideoUrl`). URL shape: `<CLOUDFRONT_URL>/<folder>/<32 hex>.<ext>` with S3, `<API_URL>/uploads/<folder>/<32 hex>.<ext>` on local disk (dev; `GET /uploads/*` answers single `Range` requests so videos can seek). 422 `COURSE_MEDIA_INVALID` `details.reason`: `KIND` | `TYPE` (with `accepted` MIME types) | `EMPTY` | `TOO_LARGE` (with `maxBytes`; bodies over 201 MB are refused from `Content-Length` before they are read) | `MISSING`; 401 signed out, 403 non-admins.

### Admin reports ✅
`GET /api/v1/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD` (`reportQuery`; inclusive days in Asia/Dubai; default the last 30 days ending today; 422 `INVALID_RANGE` if from > to or > 366 days) →
`{ range: { from, to, days, timezone }, previousRange: { from, to, days }, kpis, previous, revenueByCourse: [{ courseId, title, revenueFils }], batches: [{ id, code, courseId, courseTitle, teacherId, teacherName, capacity, seatsHeld, status, waitlistCount }], attendanceBatch: { id, code, courseTitle } | null, attendanceBySession: [{ number, rate }], teachers: [{ id, name, sessionsRun, avgAttendance, onTimeStartRate }] }`.
`kpis` / `previous` (same shape; `previous` = the equal-length period ending the day before `from`): `{ revenueFils, newEnrollments, fillRate, attendanceRate, completionRate, refundsFils }`. Rates are 0–1 (4 decimals, 0 when there is nothing to divide).
- `revenueFils` = Σ `totalFils` (incl. VAT) of PAID + REFUNDED orders by `paidAt` in range; `newEnrollments` = number of those orders; `revenueByCourse` = the same split by course, biggest first.
- `refundsFils` = Σ `refundedFils` of orders refunded in range (full → REFUNDED, partial stays PAID; dated by the order's last update).
- `fillRate` = Σ held seats ÷ Σ capacity over batches active in range (ENROLLING/FULL/RUNNING/COMPLETED, created or started before the end, `endsOn` ≥ start); held seats are today's counts. `batches` lists the same batches.
- `attendanceRate` = attended ÷ expected seats over ENDED sessions scheduled in range (expected = the batch's ACTIVE students).
- `completionRate` = share of ACTIVE students meeting the certificate rule in batches that ended in range.
- `attendanceBySession`: per ENDED session of the RUNNING batch with most held seats (`attendanceBatch`), all sessions so far.
- `teachers`: per host (session host, else batch teacher) over ENDED sessions in range; `avgAttendance` = mean per-session rate, `onTimeStartRate` = started ≤ 5 min after `startsAt`.

## Realtime (Socket.IO) ✅
Path `/socket.io`. Auth: cookie (web) or `{ auth: { token } }` (mobile). Rooms: `user:<id>`, `role:<ROLE>`, `session:<id>`.
Events in `packages/shared/src/realtime.ts`. Client → server events take a payload and an optional ack `(res: SocketAck) => void` (`{ ok: true, data } | { ok: false, error: { code, message } }`):
- `session:join { sessionId }` — authorized like the REST API (host/ACTIVE student/admin) → ack `{ sessionId, role, hands }`; required before the events below.
- `session:leave { sessionId }`.
- `chat:send { sessionId, body }` — persisted, broadcast as `chat:message` (`ChatMessageEvent`) to `session:<id>`.
- `hand:raise { sessionId }` (students) · `hand:lower { sessionId, userId? }` (host may lower anyone) — broadcast `hand:queue` (`HandQueueEvent`, in-memory per API process).
Server → client: `session:status` (session room + admins), `notification:new` (`NotificationEvent`, user room), `order:updated` (`OrderUpdatedEvent`, user + admins), `admin:room-stats` (participant joined/left, admins).

## Seed (`bun run db:seed`, idempotent)
All passwords `password123`: admin `admin@azza.test` (Nour Adel) · teachers `lina@azza.test` (Lina Haddad), `omar@`, `maya@`, `tomas@azza.test` · student `sara@azza.test` (Sara Kamal) + 23 more (`firstname.lastname@azza.test`).
Product Design Foundations B06 (Lina, Sep–Oct, COMPLETED: 8 students, all 12 sessions ENDED with attendance; Sara 11/12 → certificate on `GET /me/certificates`, Mariam Saeed 7/12 → none), B07 (Lina, Tue/Thu 19:00 Dubai, AR, 23/24 ACTIVE + Nadia Shams' transfer `AZ-B07-48213` VERIFYING, S01–S04 ENDED with attendance, recordings, chat and accrued earnings), B08 (ENROLLING, Sara not enrolled), B09 (weekend); one ENROLLING batch for each other course; Spoken Arabic B02 (Omar, capacity 4, FULL, waitlist: Lara Mikhail then Sara → position 2 of 2); teachers have a `headline` and `bio`; 3 bank accounts; FX rates; coupons `WELCOME10`, `RAMADAN100`, `EARLYBIRD` (−10 %, Product Design Foundations only, 1 per student, Oct 1 – Dec 31).

## Teacher proposals (courses & batches)

Teachers draft courses and batches; admins approve them.

| Endpoint | Who | Notes |
|---|---|---|
| `POST /api/v1/courses` | TEACHER, ADMIN | `slug` optional (derived from `titleEn`). A teacher's course is `DRAFT` with `createdById` = them. `category` must be a `Category.slug` (422 `UNKNOWN_CATEGORY`). |
| `PATCH /api/v1/courses/:id` | TEACHER (own, `DRAFT`/`PENDING_REVIEW`), ADMIN | A teacher cannot send `status` or `featuredRank`; 422 `COURSE_LOCKED` once published. |
| `POST /api/v1/courses/:id/submit` | TEACHER | `DRAFT` → `PENDING_REVIEW`; 422 `COURSE_INCOMPLETE` (description ≥ 20 chars and ≥ 1 module), `ALREADY_SUBMITTED`. Notifies admins (`COURSE_SUBMITTED`). |
| `POST /api/v1/courses/:id/review` | ADMIN | `{ approve, note? }` (note ≥ 3 chars to send back). Approve → `PUBLISHED`; send back → `DRAFT` + `reviewNote`. Notifies the teacher. |
| `GET /api/v1/courses?mine=true` | TEACHER | The teacher's own proposals, any status. |
| `POST /api/v1/courses/media` | TEACHER, ADMIN | Same as `POST /admin/media` (cover / intro video upload). |
| `POST /api/v1/batches`, `POST /batches/schedule/preview` | TEACHER, ADMIN | For a teacher, `teacherId` is forced to them; only on `PUBLISHED` courses or their own. Admins must send `teacherId` (422 `TEACHER_REQUIRED`). |
| `PATCH /api/v1/batches/:id` | TEACHER (own, `DRAFT`/`PENDING_REVIEW`), ADMIN | 422 `BATCH_LOCKED` once approved. |
| `POST /api/v1/batches/:id/submit` / `/review` | TEACHER / ADMIN | Same shape as courses; approve → `ENROLLING` (422 `COURSE_NOT_PUBLISHED` until the course is approved). |

## Catalog depth

- `GET /api/v1/categories` (public) → `{ items: [{ slug, nameEn, nameAr, icon, order, active, courseCount }] }` (published courses). `?all=true` (admin) includes hidden ones. ADMIN: `POST /categories`, `PATCH /categories/:slug`, `DELETE /categories/:slug` (409 while courses use it — hide with `active: false` instead).
- Course now carries `categoryRef { slug, nameEn, nameAr, icon }`, `outcomesEn/Ar`, `requirementsEn/Ar`, `audienceEn/Ar` (string arrays), `faq [{ qEn, aEn, qAr?, aAr? }]`, `featuredRank`, `ratingAvg`, `ratingCount`; modules gain `descriptionEn/Ar`.
- `GET /api/v1/courses` adds `language` (has an ENROLLING batch in it), `minPriceAed`, `maxPriceAed`, `minRating`, `featured=true` (ordered by `featuredRank`) and `sort` = `newest | rating | price_asc | price_desc | popular`.
- `GET /api/v1/courses/:idOrSlug/related` → `{ items }` (≤ 4: same category, then same level).
- Reviews: `GET /api/v1/courses/:idOrSlug/reviews?page` → `{ items, total, summary: { ratingAvg, ratingCount, distribution }, mine, canReview }`; `PUT /courses/:id/reviews/mine` (STUDENT with an ACTIVE enrollment in a batch that has delivered a session, else 422 `REVIEW_NOT_ELIGIBLE`) `{ rating 1–5, body }`; `DELETE /courses/:id/reviews/mine`; `POST /reviews/:id/reply` (a teacher of the course or ADMIN) `{ reply }`; `PATCH /reviews/:id` (ADMIN) `{ hidden }`. Hidden reviews leave the average.
- Saved courses: `GET /api/v1/me/saved-courses`, `PUT|DELETE /api/v1/courses/:id/save`.

## Instructors

- `GET /api/v1/teachers` (public) → `{ items: [{ id, name, image, headline, languages: ('AR'|'EN')[], categories: string[] (slugs), courses: [{ id, slug, titleEn, titleAr }], openBatches }] }` — non-banned teachers, those with open batches first.
- `GET /api/v1/instructor-applications/mine` (signed in) → `{ application: null | { id, status: PENDING|APPROVED|REJECTED, reviewNote, headline, bio, categories, languages, experience, sampleUrl, phone, createdAt, decidedAt } }`.
- `POST /api/v1/instructor-applications` (signed-in STUDENT) body `instructorApplicationInput` `{ headline 4–120, bio 40–2000, categories: slug[] 1–5, languages: ('AR'|'EN')[] ≥1, experience 20–1500, sampleUrl?: https URL, phone? }` → 201. 422 `ALREADY_INSTRUCTOR` for teachers/admins, 409 `CONFLICT` while one is PENDING. Admins get `INSTRUCTOR_APPLIED`.
- ADMIN: `GET /api/v1/instructor-applications?status=PENDING|APPROVED|REJECTED`, `POST /api/v1/instructor-applications/:id/review` `{ approve, note? }` (note ≥ 3 to decline). Approve → the user's role becomes TEACHER (empty headline/bio filled from the application) and they get `INSTRUCTOR_APPROVED`; decline → `INSTRUCTOR_DECLINED` with the note, and they may apply again. 422 `APPLICATION_DECIDED` if already decided.

## Pricing lives on the batch

- Students buy a seat in a **batch**. `createBatchInput.priceAed` is **required**; `createCourseInput` no longer takes a price.
- `Course.priceFils` is now the derived **"from" price**: the lowest price among the course's ENROLLING/FULL/RUNNING batches (null when none). The API recomputes it whenever a batch is created, re-priced, approved or changes status. Catalog sort/filter by price use it.
- Checkout always charges `batch.priceFils` (minus coupons).

## Card payments: Stripe Checkout

- `POST /api/v1/checkout` with `method: 'STRIPE'` now returns `{ order, checkoutUrl }` (no `clientSecret`). Redirect the browser (web) or open it in the system browser / in-app browser tab (mobile).
- Stripe's hosted page charges AED. Payment is confirmed **only** by the webhook (`POST /api/webhooks/stripe`): `checkout.session.completed` (paid) / `checkout.session.async_payment_succeeded` → order PAID + enrollment ACTIVE; `checkout.session.async_payment_failed` / `checkout.session.expired` → order FAILED (the seat hold stays until it expires, so the student can retry). Subscribe these events in the Stripe dashboard.
- Return URLs: `${WEB_URL}/checkout/return?ref=<order reference>` (and `&cancelled=1` on cancel). `GET /api/v1/orders/by-reference/:ref` (owner/admin) returns the order so the page can show "confirming…" until the webhook lands.
- Dev without Stripe keys: the fake gateway returns the success URL directly; confirm with a fake webhook body `{ "type": "payment.succeeded", "checkoutSessionId": "cs_dev_<ref>" }`.


### Stripe setup for recorded-course plans
- **Webhook events** (`POST /api/webhooks/stripe`): `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`.
- **Dunning (Billing → Revenue recovery → Retries):** turn on **Smart Retries** and make the retry window end **within 16 days** of the first failed payment, then set the final action to **Cancel the subscription**. 16 days is the access grace (`GRACE_DAYS`): a PAST_DUE learner keeps access until `currentPeriodEnd + 16 days`, and Stripe's cancel arrives as `customer.subscription.deleted` and ends the plan (`SUBSCRIPTION_ENDED`). A longer retry window would leave a learner locked out yet still billed.
- **Customer Portal (Settings → Billing → Customer portal):** turn on **Cancel subscriptions → at the end of the billing period** (not immediately) and **Update subscriptions → Customers can switch plans**, allowing each recorded course's monthly and yearly Price (the API creates them under the course's Product); keep payment-method updates and invoice history on. Learners reach it through `POST /subscriptions/:id/portal`.
- **Refunds made in the Dashboard** on a plan invoice are picked up from `charge.refunded` (see *Recorded courses → Refunds*).

## Batch sessions

- `POST /api/v1/batches/:id/sessions` (ADMIN or the batch's teacher) `{ startsAt (ISO), durationMin 15–480, title, notifyStudents }` → 201 session. Adds one session outside the weekly rule (next number), stretches the batch dates and the rule's session count, checks teacher clashes (409 `CONFLICT` with `details.conflicts`), refuses past times (422 `START_IN_PAST`) and closed batches (422 `BATCH_CLOSED`). Students get `SESSION_ADDED`.
- Existing: `POST /sessions/:id/reschedule` (move), `POST /sessions/:id/cancel` (ADMIN), and seats via `PATCH /batches/:id { capacity }` (cannot go below enrolled).

## Lessons & quizzes

**Lessons** are part of the course curriculum: each `CourseModule` has ordered lessons with markdown text, an optional video and links. They are written under the course-editing rule (ADMIN always; the proposing TEACHER only while the course is `DRAFT`/`PENDING_REVIEW`, else 403 / 422 `COURSE_LOCKED`).
Saving a course (`PATCH /courses/:id` with `modules`) now keeps modules by `id` (`courseModuleInput.id`), so their lessons survive; modules left out are deleted with their lessons. Clients that send no ids keep the existing modules by position.

| | |
|---|---|
| `GET /api/v1/courses/:idOrSlug` | public; `modules[].lessons: [{ id, order, titleEn, titleAr }]` (titles only, the syllabus preview) |
| `GET /api/v1/courses/:idOrSlug/lessons` | ADMIN, the proposing teacher, a teacher of a batch of the course, or a student with an ACTIVE enrollment in any batch of it (else 403) → `{ course: { id, slug, titleEn, titleAr, status }, modules: [{ id, order, titleEn, titleAr, descriptionEn, descriptionAr, lessons: [{ id, moduleId, order, titleEn, titleAr, bodyEn, bodyAr, videoUrl, attachments: [{ title, url }], createdAt, updatedAt }] }] }` |
| `POST /api/v1/courses/:courseId/modules/:moduleId/lessons` | `lessonInput` `{ titleEn, titleAr?, bodyEn (markdown), bodyAr?, videoUrl? (same rules as `introVideoUrl`: uploaded course video, YouTube, Vimeo, https mp4/mov/webm; null = none), attachments: [{ title, url (http/https) }] ≤ 20, order? (default last) }` → 201 lesson. 404 when the module is not in the course |
| `PATCH …/lessons/:lessonId` | `updateLessonInput` (partial; `order` is ignored, use the reorder call) → lesson |
| `DELETE …/lessons/:lessonId` | → `{ ok: true }` (the rest are renumbered) |
| `PUT …/lessons/order` | `reorderLessonsInput` `{ ids }` — every lesson id of the module once, in the new order (422 `LESSON_ORDER_MISMATCH`) → `{ items }` |

**Quizzes** are auto-graded and belong to a batch, optionally linked to a module of its course. Authors: the batch teacher and ADMIN. Takers: students with an ACTIVE enrollment, PUBLISHED quizzes only (drafts are 404 to them).
- Questions (`quizQuestionInput`): `type` `SINGLE` | `MULTIPLE` | `TRUE_FALSE`, `promptEn`, `promptAr?`, `points` 1–100 (default 1), `options` 2–8 `{ id?, textEn, textAr?, correct }` (exactly one correct for SINGLE/TRUE_FALSE, which has exactly 2 options; ≥ 1 for MULTIPLE). Ids are kept when sent back, assigned when missing. Stored as validated JSON on the quiz.
- **Grading:** SINGLE / TRUE_FALSE: full points for exactly the correct option. MULTIPLE (partial credit): `points × max(0, (right − wrong) ÷ correct options)`, rounded to 2 decimals; a question is `correct` only with full points.
- **Attempts:** `maxAttempts` (default 1) counts every attempt, the open one included. **Time limit** (`timeLimitMin`, null = untimed) is checked on the server: deadline = `startedAt + limit`, capped by `dueAt`; submissions later than deadline + 30 s are refused (422 `QUIZ_TIME_UP`) and the attempt is kept with score 0 (`timedOut: true`). An abandoned open attempt is closed the same way when the student returns.
- **Answer hiding:** students never get `options[].correct`. Per-question correctness and the answer key (`attempts[].questions`, `answerKey`) appear only when `reveal` is true: after `dueAt`, or once all of the student's attempts are submitted.

| | |
|---|---|
| `GET /api/v1/batches/:id/quizzes` | teacher/ADMIN: all, each `{ …quiz without questions, questionCount, totalPoints, attemptCount, studentsAttempted }`; student: PUBLISHED, each with `mine` (below) |
| `POST /api/v1/batches/:id/quizzes` | teacher/ADMIN, `quizInput` `{ title, description, moduleId?, dueAt?, timeLimitMin?, maxAttempts, questions }` → 201 quiz (`DRAFT`). 422 `MODULE_NOT_IN_COURSE` |
| `PATCH /api/v1/batches/:id/quizzes/:quizId` | `updateQuizInput`; 422 `QUIZ_HAS_ATTEMPTS` when changing `questions` after someone started |
| `DELETE /api/v1/batches/:id/quizzes/:quizId` | → `{ ok: true }` (attempts go too) |
| `POST /api/v1/batches/:id/quizzes/:quizId/publish` | → quiz (`PUBLISHED`, `publishedAt`). 422 `QUIZ_EMPTY`, `ALREADY_PUBLISHED`. ACTIVE students get `QUIZ_PUBLISHED` (`data: { quizId, batchId }`; in-app, realtime, push) |
| `POST /api/v1/batches/:id/quizzes/:quizId/unpublish` | back to `DRAFT`; 422 `QUIZ_HAS_ATTEMPTS` |
| `GET /api/v1/quizzes/:id` | teacher/ADMIN: the full quiz with answers + `totalPoints`, `attemptCount`, `hasAttempts`. Student → `{ quiz (questions without `correct`, `questionCount`, `totalPoints`), progress, reveal, openAttempt: { id, number, startedAt, deadline } \| null, attempts: [{ id, number, startedAt, submittedAt, score, maxScore, percent, timedOut, questions?: [{ questionId, selected, correct, earned, points, correctOptionIds }] }], answerKey?: { [questionId]: optionId[] } }` |
| `POST /api/v1/quizzes/:id/start` | student: opens an attempt (returns the open one if any) → the student view. 422 `QUIZ_CLOSED` (past `dueAt`), `NO_ATTEMPTS_LEFT` |
| `POST /api/v1/quizzes/:id/attempts` | student, `quizSubmissionInput` `{ answers: { [questionId]: optionId[] } }` → 201 student view + `result` (the graded attempt). Untimed quizzes may skip `start`; timed ones get 422 `ATTEMPT_NOT_STARTED`. Also 422 `QUIZ_TIME_UP`, `QUIZ_CLOSED`, `NO_ATTEMPTS_LEFT` |
| `GET /api/v1/quizzes/:id/results` | teacher/ADMIN → `{ quiz, summary: { students, submitted, averagePercent }, students: [{ user{id,name,email,image}, attempts, bestScore, bestPercent, lastSubmittedAt }], questions: [{ questionId, type, promptEn, promptAr, points, answered, correct, rate (0–1) }] }` (ACTIVE students; rates use each student's best attempt) |
| `GET /api/v1/me/quizzes` | PUBLISHED quizzes of my ACTIVE batches → `{ items: [{ …quiz without questions, questionCount, totalPoints, batch{ id, code, course{id,slug,titleEn,titleAr} }, mine }] }` |
`mine` / `progress` = `{ status: OPEN | IN_PROGRESS | SUBMITTED | MISSED, attemptsUsed (submitted), attemptsLeft, canStart, bestScore, bestPercent, maxScore }`.

## Communications

Announcements, chat and support. The full contract is in [COMMUNICATIONS.md](./COMMUNICATIONS.md). Below is a summary of what the API serves.

**Class members** are the batch teacher plus students with an ACTIVE enrollment. Admins read everything, post in class chats and delete messages. Errors use the usual shape: `NOT_CLASS_MEMBER` (403), `DM_NOT_ALLOWED` (403), `CHAT_CLOSED` (422), `RATE_LIMITED` (429), `INVALID_ASSIGNEE` (422).

**Announcements**

| | |
|---|---|
| `GET /api/v1/me/announcements?page&pageSize` | platform announcements for my role (admins see all audiences) plus my classes' announcements, pinned first, then newest → `{ items: [{ id, scope, audience, batch: { id, code, courseTitle, courseTitleAr } \| null, title, body, pinned, author: { id, name, image }, createdAt, updatedAt }], total, page, pageSize }` |
| `GET /api/v1/batches/:id/announcements?page&pageSize` | class members and ADMIN, same shape |
| `POST /api/v1/batches/:id/announcements` | the batch teacher or ADMIN, `batchAnnouncementInput` `{ title ≤ 120, body (markdown) ≤ 4000, pinned?, notify? = true }` → 201 item |
| `POST /api/v1/announcements` | ADMIN, `platformAnnouncementInput` `{ title, body, audience: ALL \| STUDENTS \| TEACHERS, pinned?, notify? }` → 201 item |
| `PATCH /api/v1/announcements/:id` | the author or ADMIN, `updateAnnouncementInput` `{ title?, body?, pinned?, audience? (PLATFORM only) }` |
| `DELETE /api/v1/announcements/:id` | the author or ADMIN → `{ ok: true }` |

New announcements notify their recipients, except the author, with `ANNOUNCEMENT` and `data: { announcementId, batchId? }`. Both kinds go in-app, realtime and push; only PLATFORM announcements also go by email. A class announcement reaches the teacher and the ACTIVE students; a platform one reaches every role for `ALL`, or only students or teachers.

**Chat:** a class chat per batch, plus a private chat between an ACTIVE student and the batch teacher. There are no student-to-student chats.

| | |
|---|---|
| `GET /api/v1/me/conversations` | `{ items: [{ id, type, batch: { id, code, courseTitle, courseTitleAr }, counterpart: { id, name, image, role } \| null, lastMessage: { body, senderName, createdAt } \| null, lastMessageAt, createdAt, unread, closed }], unreadTotal }`, most recent activity first. Class chats are created on first listing. Teachers see every private chat of their batches. Admins get `[]`. |
| `GET /api/v1/batches/:id/conversation` | the CLASS conversation (created if missing), one item |
| `POST /api/v1/batches/:id/dm` | an ACTIVE student only → their DIRECT conversation with the batch teacher (created if missing) |
| `GET /api/v1/conversations/:id/messages?before=<ISO>&limit=50` | `{ items: [{ id, sender: { id, name, image, role }, body, createdAt, deleted }], hasMore }`, newest last; deleted messages come back with `body: ''` |
| `POST /api/v1/conversations/:id/messages` | `{ body ≤ 2000 }` → 201 message. Also marks the conversation read for the sender. |
| `POST /api/v1/conversations/:id/read` | → `{ ok: true }` (sets `lastReadAt` to now) |
| `DELETE /api/v1/messages/:id` | in a class chat: the sender, the batch teacher or ADMIN; in a private chat: the sender or ADMIN → `{ ok: true }` |

- **Access:** a student whose enrollment is no longer ACTIVE loses access. Admins can read private chats but not post in them (`DM_NOT_ALLOWED`).
- **Closed chats:** when a batch is COMPLETED or CANCELLED, its chats are read-only (`CHAT_CLOSED`). Only an admin can still delete messages there.
- **Rate limit:** at most 20 messages a minute per user per conversation (429 `RATE_LIMITED`), counted in memory.
- **Socket events:** `toUser` events go to the members (the teacher and the ACTIVE students who can see the chat), never back to the sender: `conversation:message` `{ conversationId, message }` and `conversation:message-deleted` `{ conversationId, messageId }`.
- **Notifications:** `CHAT_MESSAGE` with `data: { conversationId }`, in-app, realtime and push. They are sent only for private chats, or when the teacher posts in the class chat, and collapse to at most one per conversation per recipient every 10 minutes (counted in memory).

**Support:** in-app tickets with a thread per ticket. Admins answer them.

| | |
|---|---|
| `POST /api/v1/support/tickets` | any signed-in user, `supportTicketInput` `{ subject ≤ 140, category: PAYMENT \| CLASS \| ACCOUNT \| TECHNICAL \| OTHER, body ≤ 4000, orderId? (must be mine), batchId? }` → 201 ticket detail. Notifies admins with `SUPPORT_TICKET` (in-app, realtime, email). |
| `GET /api/v1/support/tickets?status&category&page&pageSize` | the owner sees their own tickets, an admin sees all, newest activity first → `{ items: [{ id, subject, category, status, user: { id, name, email }, assigneeId, createdAt, lastMessageAt, unreadForMe }], total, page, pageSize }`. `unreadForMe` means the other side wrote last: staff, for the owner; the owner, for admins, unless the ticket is resolved. |
| `GET /api/v1/support/tickets/:id` | the owner or ADMIN → `{ …ticket, user, messages: [{ id, authorId, author: { id, name, image }, body, fromStaff, createdAt }] (oldest first), order: { id, reference, status, totalFils, createdAt } \| null, batch: { id, code, courseTitle, courseTitleAr } \| null }` |
| `POST /api/v1/support/tickets/:id/messages` | the owner or ADMIN, `{ body }` → 201 ticket detail. A staff reply sets `AWAITING_USER` and notifies the owner with `SUPPORT_REPLY` (in-app, realtime, push, email). An owner reply sets `OPEN`, which also reopens a RESOLVED ticket, and notifies admins with `SUPPORT_REPLY` (in-app, realtime, email). |
| `PATCH /api/v1/support/tickets/:id` | `updateSupportTicketInput` `{ status?, assigneeId? (an admin, or null) }`. ADMIN may change anything; the owner may only send `{ status: 'RESOLVED' }` (otherwise 403) → ticket detail |

**Account deletion** (`DELETE /me`) also erases the user's chat messages, their private chats, their read markers, their support tickets and any support messages they wrote.

## Lesson progress

- `PUT /api/v1/lessons/:lessonId/complete` / `DELETE …/complete` (anyone who can read the course's lessons) → `{ lessonId, completed }`. Marks the lesson done for the caller (idempotent).
- `GET /api/v1/courses/:courseId/lessons` now also returns `progress: { completed, total, nextLesson: { id, titleEn, titleAr, moduleId, moduleTitleEn, moduleTitleAr } | null }`, and each lesson has `completed: boolean` for the caller. Order is module order, then lesson order; `nextLesson` is the first not done.
- `GET /api/v1/me/learning-progress` → `{ items: [{ courseId, slug, titleEn, titleAr, type: 'LIVE'|'RECORDED', completed, total, nextLesson, subscription? }] }` for every course with an ACTIVE enrollment, plus every RECORDED course with a live plan or any lesson progress (progress outlives a plan, so a lapsed course stays listed). RECORDED items carry `subscription: { status, currentPeriodEnd, cancelAtPeriodEnd, hasAccess } | null` (the plan that decides access, else the newest ended one; `null` = never had a plan; `hasAccess` follows the access rule, and is always true for an admin or the course's author). LIVE items have no `subscription`. Powers "Continue learning".

## Assignment & material files

Files are uploaded first, then referenced by URL. Uploads go to the `FileStorage` port (local disk under `/uploads/...` in dev, S3 + CloudFront in prod) with unguessable 128-bit keys. Nothing is stored for a rejected file.

| | |
|---|---|
| `POST /api/v1/assignments/:id/submission/file` | a STUDENT with an ACTIVE enrollment in the assignment's batch (403 otherwise, 404 for an unknown assignment), multipart `file` → 201 `{ url, name, size, type }`, stored under `submissions/` |
| `POST /api/v1/batches/:id/materials/file` | the batch teacher or ADMIN, multipart `file` → 201 `{ url, name, size, type }`, stored under `materials/` |
| `PATCH /api/v1/assignments/:id` | the batch teacher or ADMIN, `updateAssignmentInput` `{ sessionId? (null detaches), title?, description?, dueAt?, maxScore? }` → the assignment. `maxScore` cannot go below an existing grade (422 `SCORE_TOO_HIGH`). |
| `DELETE /api/v1/assignments/:id` | the batch teacher or ADMIN → `{ ok: true }`. Assignments are hard-deleted, so this is refused with 409 `ASSIGNMENT_HAS_SUBMISSIONS` once anyone has submitted. |

- **Submission files:** pdf, docx, pptx, xlsx, png, jpg, webp, zip, txt, md; at most 20 MB. Errors are 422 `SUBMISSION_FILE_INVALID` with `details.reason` = `TYPE` | `EMPTY` | `TOO_LARGE` | `MISSING` (no `file` field).
- **Material files:** the same types plus mp3 and m4a; at most 50 MB. Errors are 422 `MATERIAL_FILE_INVALID` with the same reasons.
- **Type detection:** by the part's content type (common aliases such as `application/x-zip-compressed` are accepted). When the browser sends no type or `application/octet-stream`, the file extension decides. `type` in the response is the canonical content type.
- **Size:** oversized bodies are refused while streaming (`bodyLimit`), before the file is buffered.
- **Submitting:** `POST /api/v1/assignments/:id/submissions` now also takes `files: [{ url, name, size, type }]` (at most 5), alongside `url` and `text`; at least one of the three is required (`EMPTY_SUBMISSION`). Each `url` must be a `submissions/` file on our storage origin, otherwise 422 `SUBMISSION_FILE_INVALID` with `reason: 'FOREIGN_URL'`. The stored `type` comes from the stored key, not the client. Omitting `files` on a re-submit keeps the previous list; `files: []` clears it.
- **Reading:** submissions carry `files` (default `[]`) in the teacher's `GET /api/v1/assignments/:id/submissions` and in the student's `mySubmission` on `GET /api/v1/batches/:id/assignments`.
- **Materials:** after uploading, create the material with `POST /api/v1/batches/:id/materials` using the returned `url`. A `FILE` material must use a `materials/` URL from our storage (422 `MATERIAL_FILE_INVALID`, `reason: 'FOREIGN_URL'`); `SLIDES`, `LINK` and `VIDEO` accept any URL as before.
- **Notifications:** none. Assignment creation does not notify students, so edits (including due date changes) don't either.

## Recorded courses ✅

A `Course` has `type` `LIVE` (cohorts, sold per batch) or `RECORDED` (self-paced, sold as a monthly or yearly plan per course). The type is fixed at creation. **Access** to a recorded course's lessons and quizzes: an admin, the author, or a subscription that is ACTIVE or CANCELLING with `now < currentPeriodEnd`, or PAST_DUE with `now < currentPeriodEnd + 16 days`. Progress, quiz attempts and certificates survive a lapsed plan. Bank-transfer plans are prepaid with no auto-renew and no grace (a renewal receipt uploaded before the end keeps access until it is reviewed).

### Catalog and course DTO
- `GET /api/v1/courses?type=LIVE|RECORDED` — optional filter (omitted = both); `courseListQuery` otherwise unchanged.
- `teacherCutPercent` is in a course payload only for **admins and the course's author**; public responses omit the field. Stripe ids are never returned; Apple ids come as `appleProducts: { monthly, yearly } | null`.
- `POST /courses` (`type` RECORDED), `PATCH /courses/:id` and `POST /courses/:id/submit|review` as for live courses. Publishing a RECORDED course needs both prices and a lesson: 422 `RECORDED_NOT_READY` with `details.missing: ('PRICES'|'LESSONS')[]`. Editing a published course as its teacher: 422 `COURSE_LOCKED`.

### Course setup (ADMIN unless noted)
| | |
|---|---|
| `PUT /api/v1/admin/courses/:id/recorded-pricing` | `{ monthlyPriceFils, yearlyPriceFils }` (before VAT; yearly must be below 12 monthly) → course; syncs the Stripe Product and Prices. 422 `NOT_RECORDED` |
| `PUT /api/v1/admin/courses/:id/apple-products` | `{ monthly?, yearly? }` (null clears) — each must equal `com.futuretech.azza.rec.<slug>.monthly\|yearly`, else 422 `APPLE_PRODUCT_MISMATCH` |
| `PUT /api/v1/courses/:id/preview-lesson` | TEACHER (author, under the editing rule) or ADMIN, `{ lessonId \| null }` — the one lesson anyone can watch; 404 when it is not in the course. `null` (or a lesson that was later deleted) means the first lesson in curriculum order (module order, then lesson order); the course DTO's `previewLessonId` is always this effective id on RECORDED courses |
| `GET /api/v1/admin/settings/cuts` · `PUT` | `{ liveCutPercent, recordedCutPercent }` — default teacher cuts (percent, 0–100) |
| `PUT /api/v1/admin/courses/:id/cut` | `{ teacherCutPercent \| null }` — per-course override (wins when set). A cut is read at payment time and never recalculated |

### Lessons (recorded)
- `GET /courses/:id/lessons` — for a RECORDED course anyone signed in gets the structure: lessons they cannot open come as `{ id, moduleId, order, titleEn, titleAr, completed, locked: true }` (no body, video or links); the preview lesson and everything for staff/subscribers has `locked: false`. Unpublished recorded courses are 404 to non-staff.
- `GET /lessons/:id/preview` — public (no sign-in): only the preview lesson (the teacher's choice, else the first lesson in curriculum order) of a PUBLISHED recorded course, else 404.
- `GET /lessons/:id` — 403 `PLAN_REQUIRED` with `details: { courseSlug, lapsed }` when the viewer has no access (`lapsed` = once had a paid period; an abandoned, never-paid checkout is `false`). The same applies to `PUT /lessons/:id/video-position`, `PUT|DELETE /lessons/:id/complete` and course quizzes.
- `PUT /lessons/:id/video-position` `{ positionSec }` → `{ lessonId, positionSec }`; `GET /lessons/:id` returns `videoPositionSec`.

### Course quizzes (recorded)
`GET|POST /courses/:id/quizzes`, `PATCH|DELETE /courses/:id/quizzes/:quizId`, `POST …/publish|unpublish` — authored by course editors (same shapes as batch quizzes; `moduleId` optional; `passPercent` default 70). Subscribers take them through `GET /quizzes/:id`, `POST /quizzes/:id/start`, `POST /quizzes/:id/attempts`: **unlimited attempts, no due date**. Errors: 422 `NOT_RECORDED_COURSE` (course quizzes on a live course), 403 `PLAN_REQUIRED`, plus the batch-quiz codes (`QUIZ_EMPTY`, `ALREADY_PUBLISHED`, `QUIZ_HAS_ATTEMPTS`, `MODULE_NOT_IN_COURSE`, `ATTEMPT_NOT_STARTED`, `QUIZ_TIME_UP`).

### Certificates (recorded)
`GET /me/certificates` also issues a course certificate once every lesson is completed and every published quiz's best attempt is at or above its `passPercent`; no active plan is needed and it is never revoked. Recorded items have `kind: 'RECORDED'`, `batchId: null`, `batchCode: null`, `attended: 0`, `total: 0`, `startsOn/endsOn: null`. `GET /certificates/:code` verifies as before.

### Subscriptions (learner)
| | |
|---|---|
| `POST /api/v1/courses/:id/subscribe` | `{ plan: 'MONTHLY'\|'YEARLY', method: 'STRIPE'\|'APPLE_IAP'\|'BANK_TRANSFER', bankAccountId? }`. STRIPE → 201 `{ checkoutUrl, reference }`; APPLE_IAP → `{ productId, appAccountToken, reference }`; BANK_TRANSFER → `{ plan, bankAccount, reference, amountFils, expiresAt, paymentId }`. Coupons never apply. Errors: 404 (course not published), 422 `NOT_RECORDED`, `PRICE_NOT_READY`, `APPLE_PRODUCT_MISSING`, `METHOD_UNAVAILABLE`, `NO_BANK_ACCOUNT`; 409 `ALREADY_SUBSCRIBED` |
| `POST /api/v1/subscriptions/apple/verify` | `{ signedTransaction }` → the plan; 422 `APPLE_UNAVAILABLE`, `PRODUCT_MISMATCH`, `APPLE_ACCOUNT_CONFLICT`, `FOREIGN_SUBSCRIPTION` |
| `GET /api/v1/subscriptions/by-reference/:ref` | the return page's poll → `{ status, courseSlug, nextLessonId }` (owner only) |
| `GET /api/v1/me/subscriptions` | `{ items: [{ id, course{id,slug,titleEn,titleAr,coverImageUrl}, plan, provider, status, currentPeriodEnd, cancelAtPeriodEnd, priceFils, hasAccess, pendingPayment: { id, reference, amountFils, status, expiresAt, reviewNote, bankAccount } \| null }] }` (an envelope, like the other /me lists) |
| `POST /api/v1/subscriptions/:id/cancel` · `/resume` | card plans: cancel at period end (access stays to the end) / undo. 422 `NOT_ACTIVE` |
| `POST /api/v1/subscriptions/:id/switch` | `{ plan }` — the other plan, prorated by Stripe. 422 `SAME_PLAN`, `PRICE_NOT_READY` |
| `POST /api/v1/subscriptions/:id/switch-to-card` | a transfer plan → a card plan whose first charge is the day the paid period ends |
| `POST /api/v1/subscriptions/:id/portal` | → `{ url }` (Stripe Customer Portal). 422 `NOT_CARD_PLAN` |
| `POST /api/v1/subscription-payments/:id/receipt` | multipart receipt for a transfer payment (see *Checkout*); 422 `METHOD_UNAVAILABLE`, `PAYMENT_NOT_AWAITING_RECEIPT`, `PAYMENT_EXPIRED` |

Apple plans cannot be cancelled, resumed, switched or opened in the portal here: 422 `MANAGED_BY_APPLE` (the learner uses their App Store subscriptions). Transfer plans: 422 `NOT_CARD_PLAN` on those card-only actions. Transfers appear in `GET /admin/transfers` next to seat orders (`kind: 'SUBSCRIPTION'`) and are reviewed there; review errors: 422 `PAYMENT_NOT_REVIEWABLE`, `NOTE_REQUIRED`, `AMOUNT_MISMATCH`.

### Subscriptions (admin and author)
| | |
|---|---|
| `GET /api/v1/admin/subscriptions?courseId&status&provider&page&pageSize` | ADMIN → paged `{ items: [{ id, user{id,name,email}, course{id,slug,titleEn,titleAr}, plan, provider: 'STRIPE'\|'APPLE'\|'BANK_TRANSFER', status, currentPeriodEnd, cancelAtPeriodEnd, priceFils, lastPayment: { id, totalFils, status, paidAt } \| null, createdAt }], total, page, pageSize, pageCount }`, newest first |
| `POST /api/v1/admin/subscriptions/:id/cancel` | ADMIN, `{ refund: 'NONE'\|'FULL' }` → `{ id, plan, status: 'EXPIRED', currentPeriodEnd, cancelAtPeriodEnd, priceFils, closedPayments: [{ id, reference, status, totalFils, receiptUploaded }], refundedFils }`. Ends the plan now and sends `SUBSCRIPTION_ENDED`. STRIPE: an unfinished checkout (INCOMPLETE) has its Checkout Session expired first; if it was already paid the answer is 409 `CHECKOUT_COMPLETED` and nothing changes. FULL refunds the last paid invoice first, then cancels, records the refund and reverses the teacher's earning; if Stripe refuses the refund nothing changes (502 `REFUND_FAILED`, retry or cancel with `NONE`); if the cancel fails after a refund the response is 200 with `cancelPending: true` (refund kept, plan still running; cancel again with `NONE`). The response also has `cancelPending: false` normally. BANK_TRANSFER: ends it; FULL records a manual refund (finance returns the money) and `closedPayments` lists open payments that were closed (`receiptUploaded: true` = money may need returning). Errors: 422 `MANAGED_BY_APPLE`, `NOT_ACTIVE` (already ended), 404, 409 `CHECKOUT_COMPLETED`, 502 `REFUND_FAILED` |
| `GET /api/v1/teacher/courses/:id/subscribers` | the course's author or an ADMIN (others 403) → `{ active, cancelling, pastDue, total }` |

### Refunds
- A refund made in the **Stripe Dashboard** on a plan invoice arrives as `charge.refunded`. The charge's invoice id and cumulative `amount_refunded` are matched to the `SubscriptionPayment`; `refundedFils` is set to the cumulative amount (status `REFUNDED` once fully refunded, otherwise it stays `PAID`) and the teacher's earning is reversed pro rata. Idempotent: the same or a smaller cumulative amount changes nothing. Refunds of seat orders carry no invoice and behave as before. The learner's access is not changed by a refund (use admin cancel for that).
- Apple `REFUND` / `REVOKE` notifications are handled as for seats (payment `REFUNDED`, earning reversed; the plan ends when it is the current period).
- Admin cancel with FULL goes through the same record-and-reverse step.

### Notifications and jobs
Types (each with `data: { courseSlug, subscriptionId }`): `SUBSCRIPTION_ACTIVE`, `SUBSCRIPTION_PAYMENT_FAILED`, `SUBSCRIPTION_RENEWS_SOON`, `SUBSCRIPTION_ENDED`, plus `SUBSCRIPTION_RECEIPT` for every charge. Copy is localised by the user's language.
- `remind-renewals` (daily; `YEARLY_REMINDER_DAYS` = 7): `SUBSCRIPTION_RENEWS_SOON` by in-app, email and push, once per period (remembered in `Subscription.reminderSentForPeriodEnd`). STRIPE/APPLE: YEARLY plans that are ACTIVE (not CANCELLING) and end within 7 days (a late run still sends it, once); monthly card plans get none. BANK_TRANSFER, monthly and yearly: within 7 days and again on the end day, i.e. ends today or ended within the last 24 h (`reminderEndDaySentFor`), unless a renewal receipt is already waiting for review; the message points to "Renew by transfer".
- `expire-transfer-subscriptions` (daily) ends transfer plans past their end with no grace; `expire-transfer-payments` (every 5 minutes) closes unpaid holds.

### Error codes (recorded courses)
`NOT_RECORDED`, `NOT_RECORDED_COURSE`, `RECORDED_NOT_READY` (`details.missing`), `COURSE_LOCKED`, `PLAN_REQUIRED` (403, `details: { courseSlug, lapsed }`), `PRICE_NOT_READY`, `APPLE_PRODUCT_MISSING`, `APPLE_PRODUCT_MISMATCH`, `APPLE_UNAVAILABLE`, `PRODUCT_MISMATCH`, `APPLE_ACCOUNT_CONFLICT`, `FOREIGN_SUBSCRIPTION`, `MANAGED_BY_APPLE`, `ALREADY_SUBSCRIBED` (409), `SAME_PLAN`, `NOT_ACTIVE`, `NOT_CARD_PLAN`, `NOT_TRANSFER_PLAN`, `METHOD_UNAVAILABLE`, `NO_BANK_ACCOUNT`, `PAYMENT_NOT_AWAITING_RECEIPT`, `PAYMENT_EXPIRED`, `PAYMENT_NOT_REVIEWABLE`, `NOTE_REQUIRED`, `REFUND_FAILED`, `CHECKOUT_COMPLETED` (409), `LESSON_ORDER_MISMATCH`, `QUIZ_*`.

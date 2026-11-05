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

**Images.** `course.coverImageUrl` (also on every embedded course ref) is a photo cover: a `/media/...` path or an `https://` URL; `null` = typographic cover in `coverStyle` colours. People keep their photo in `image` (seeded teachers: `/media/teachers/<name>.jpg`). Paths starting with `/` are relative to the API origin — clients resolve them (`mediaUrl()` on web, `resolveMediaUrl()` on mobile). `GET /media/*` serves the bundled art in `apps/api/public/media/` (public, static).

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
`GET /api/v1/admin/live-rooms` → `{ items: [{ session, roomName, participants, recording, roomOpen, roomCreatedAt }], orphanRooms }` (LiveKit rooms joined with LIVE sessions).

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

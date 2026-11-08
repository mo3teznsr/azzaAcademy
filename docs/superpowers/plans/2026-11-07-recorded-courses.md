# Recorded Courses on a Monthly or Yearly Plan: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add RECORDED courses that learners join on their own with a per-course monthly or yearly subscription (Stripe on web and Android, Apple auto-renewable on iOS), with admin-set teacher cuts, recorded-course certificates and the CX rules in the spec.

**Architecture:**
- The API gains a `subscriptions` module that follows the existing pattern: service, then repository port, then routes, plus a pure policy file.
- Provider events (Stripe webhooks, Apple notifications) are the only things that change subscription state.
- Every paid period becomes a `SubscriptionPayment`, which feeds the earnings and finance reports.
- Course access goes through one pure function, `canAccessRecorded()`.
- Web (Next.js) and mobile (Flutter) add the plan picker, plan management and the lapsed and past-due states at parity.

**Tech Stack:** Bun, Hono, Prisma 7 (hand-written SQL migrations), Stripe Node SDK (subscriptions, Customer Portal), App Store Server API types already in `infrastructure/payments`, Next.js 16 + shadcn + React Query, Flutter + Riverpod + go_router + `in_app_purchase`.

**Spec:** `docs/superpowers/specs/2026-11-07-recorded-courses-design.md` (read it in full first; this plan argues from it).

## Global Constraints

- **Money:**
  - integer **fils of AED**; prices are stored before VAT, as `Batch.priceFils` is today;
  - VAT and fees use the existing `PriceCalculator` and `EarningsCalculator.orderNet` rules;
  - display currency plus FX is a snapshot, as on `Order`.
- **Course type:** `LIVE` | `RECORDED`, fixed at creation and never converted. Existing courses become LIVE.
- **Default cuts:** both start at the current `TEACHER_SHARE_PERCENT` value. A per-course override is optional and wins when set. A cut is read **at payment time** and never recalculated afterwards.
- **Access:** the viewer is an admin or the author, or has a subscription that is ACTIVE or CANCELLING with `now < currentPeriodEnd`, or PAST_DUE with `now < currentPeriodEnd + 16 days`.
- **Progress is never deleted:** `LessonProgress`, quiz attempts and certificates survive a lapsed plan.
- **Recorded certificate:** every lesson completed, and every published quiz's best attempt is at or above `passPercent`.
- **Quizzes:** `passPercent` defaults to 70. Recorded quizzes have unlimited attempts and no due date.
- **Preview:** one preview lesson per recorded course, readable by anyone, including visitors who aren't signed in.
- **Reminders:** the yearly-renewal reminder goes out **7 days** before `currentPeriodEnd`. Monthly plans get none; every charge sends a receipt.
- **Platforms:**
  - Android uses Stripe (the owner's decision);
  - iOS uses one Apple subscription group per course, with product ids `com.futuretech.azza.rec.<courseSlug>.monthly` and `.yearly`;
  - **Bank transfer** (web and Android only) buys a prepaid month or year with no auto-renew, approved in the existing transfers inbox. Coupons don't apply to plans.
  - **Transfer access:** ACTIVE until `currentPeriodEnd`, then EXPIRED, with no grace. A renewal receipt uploaded before the end keeps access until it's reviewed. An approved renewal extends from `max(now, currentPeriodEnd)`.
  - **Transfer reminders:** 7 days before the end and on the end day, for monthly and yearly. Card yearly plans get the 7-day reminder only.
  - Copy: "Pay by bank transfer. Your access starts once we confirm it, usually within 1 working day." / «ادفع بتحويل بنكي. يبدأ وصولك بعد تأكيدنا للتحويل، عادةً خلال يوم عمل واحد.»
- **Copy** follows docs/VOICE.md. These lines are fixed:
  - "Start any time. Learn at your pace." / «ابدأ متى شئت، وتعلّم على راحتك.»
  - "Monthly" / «شهري», "Yearly" / «سنوي»
  - "Your plan has ended. Your progress is saved." / «انتهى اشتراكك، وتقدّمك محفوظ.»
  - "Your last payment didn't go through. Update your card to keep learning." / «لم تتم آخر عملية دفع. حدّث بطاقتك لتواصل التعلّم.»
  - "Cancel any time. You keep access until the end of the period you paid for." / «يمكنك الإلغاء في أي وقت، ويبقى وصولك حتى نهاية المدة المدفوعة.»
- **Arabic and layout:** Arabic is written natively, digits are Western, and RTL is correct. Touch targets are at least 44pt, and screens work at 2× text size.
- **Repo rules:**
  - Migrations are hand-written in `apps/api/prisma/migrations/<timestamp>_<name>/migration.sql`. The SQL user table is `"user"`. After each schema change, `bunx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` must print nothing.
  - **No commits per task.** The coordinator makes one commit at the end and leaves out the owner's files: `apps/mobile/pubspec.yaml` and the deleted `android/key.properties.example`.
  - Never run `dart format` on whole files.
- **Checks that must stay green:**
  - `bun run typecheck` (root)
  - `bun test` in apps/api
  - `bun run lint` in apps/web
  - `flutter analyze` and `flutter test` in apps/mobile

## Review Focus

1. **Webhook replays and out-of-order events:** a Stripe `invoice.paid` that arrives twice, or before `checkout.session.completed`, must create exactly one `SubscriptionPayment` and one earning. The test lives in Task 5.
2. **Subscribing twice to the same course:** two checkout clicks, or Stripe plus Apple, must never produce two live subscriptions. The second checkout gets 409 `ALREADY_SUBSCRIBED`. Tests in Tasks 5 and 6.
3. **The access boundary around period end and grace:** access must hold at `currentPeriodEnd - 1s` and at `+15d23h` while PAST_DUE, and stop at `+16d`. Tests in Task 4.
4. **Course content changing after completion:** lessons added after a certificate was issued must not revoke it. Lessons deleted before completion must not block it. Tests in Task 8.
5. **A refund after a payout has already run:** reversing the earning must create a negative adjustment, never edit a paid earning. Test in Task 7.

---

### Task 1: Schema, migration and shared types

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20261108090000_recorded_courses/migration.sql`
- Modify: `packages/shared/src/enums.ts`, `packages/shared/src/schemas.ts`, `packages/shared/src/index.ts`
- Create: `packages/shared/src/subscriptions.ts`
- Test: `apps/api/test/recorded-schemas.test.ts`

**Interfaces (Produces):**
- **Enums:**
  - `CourseType { LIVE RECORDED }`
  - `SubscriptionPlan { MONTHLY YEARLY }`
  - `SubscriptionProvider { STRIPE APPLE BANK_TRANSFER }`
  - `SubscriptionStatus { INCOMPLETE ACTIVE PAST_DUE CANCELLING EXPIRED }`
- **`Course` additions:**
  - `type CourseType @default(LIVE)`
  - `monthlyPriceFils Int?`, `yearlyPriceFils Int?`
  - `teacherCutPercent Int?`
  - `previewLessonId String?`
  - `stripeProductId String?`, `stripeMonthlyPriceId String?`, `stripeYearlyPriceId String?`
  - `appleMonthlyProductId String? @unique`, `appleYearlyProductId String? @unique`
- **`PlatformSettings`:** a single row, `id = 'default'`, with `liveCutPercent Int` and `recordedCutPercent Int`. The migration seeds both with 70 (or whatever value `TEACHER_SHARE_PERCENT` currently has in `.env.example`).
- **`Subscription`:**
  - `id`, `userId`, `courseId`, `plan`, `provider`, `status`
  - `providerSubscriptionId String? @unique` (null for transfers)
  - `stripeCustomerId String?`, `appleOriginalTransactionId String? @unique`, `appleAppAccountToken String? @unique`
  - `currentPeriodEnd DateTime?`, `cancelAtPeriodEnd Boolean @default(false)`
  - `priceFils Int` (the price locked in at signup)
  - `createdAt`, `updatedAt`
  - indexes `[userId, courseId]` and `[status, currentPeriodEnd]`
- **`SubscriptionPayment`:**
  - `id`, `subscriptionId`, `reference String @unique`
  - `providerPaymentId String @unique` (Stripe invoice id or Apple transaction id)
  - `periodStart`, `periodEnd`
  - `subtotalFils`, `vatFils`, `totalFils`, `feeFils @default(0)`, `refundedFils @default(0)`
  - `displayCurrency @default("AED")`, `fxRate Decimal @default(1)`
  - `status` (`AWAITING_RECEIPT` | `AWAITING_REVIEW` | `PAID` | `REJECTED` | `EXPIRED` | `REFUNDED`), `paidAt?`
  - `providerPaymentId` becomes nullable for transfers
  - transfer fields: `plan`, `bankAccountId?`, `receiptUrl?`, `expiresAt?`, `reviewNote?`, `reviewedById?`
- **`Quiz`:**
  - `batchId` becomes optional;
  - gains `courseId String?` (exactly one of `batchId` and `courseId` is set, checked in the service) and `passPercent Int @default(70)`.
- **`Earning`:** `batchId` becomes optional; gains `courseId String?` and `subscriptionPaymentId String?`; new unique `[subscriptionPaymentId, kind]`.
- **`Certificate`:** `batchId` becomes optional, and `attended` and `total` default to 0; gains `courseId String?`; new unique `[userId, courseId]`.
- **`LessonVideoPosition`:** `userId`, `lessonId`, `positionSec Int`, `updatedAt`; `@@id([userId, lessonId])`.
- **Shared zod schemas** (exported from `@azza/shared`):
  - `recordedPricingInput { monthlyPriceFils: int ≥ 100, yearlyPriceFils: int ≥ 100 }`, with a refine: yearly < monthly × 12;
  - `cutSettingsInput { liveCutPercent: 0–100, recordedCutPercent: 0–100 }`;
  - `courseCutInput { teacherCutPercent: 0–100 | null }`;
  - `subscribeInput { plan: 'MONTHLY'|'YEARLY', method: 'STRIPE'|'APPLE_IAP', displayCurrency?: string }`;
  - `videoPositionInput { positionSec: int ≥ 0 }`;
  - `courseInput` gains `type`, and `quizInput` gains `passPercent` (0–100).
- **`packages/shared/src/subscriptions.ts`:** `appleRecordedProductId(slug: string, plan: SubscriptionPlan): string`, `yearlySavingMonths(monthlyFils: number, yearlyFils: number): number` (rounded down), and the `GRACE_DAYS = 16` and `YEARLY_REMINDER_DAYS = 7` constants.

- [ ] **Step 1:** Write `recorded-schemas.test.ts`:
  - `recordedPricingInput` rejects yearly ≥ monthly × 12;
  - `appleRecordedProductId('ux-basics','YEARLY') === 'com.futuretech.azza.rec.ux-basics.yearly'`;
  - `yearlySavingMonths(4900, 49000) === 2`.
- [ ] **Step 2:** Run `cd apps/api && bun test test/recorded-schemas.test.ts`. Expected: FAIL (the exports don't exist yet).
- [ ] **Step 3:** Add the schema, migration and shared code above. In the migration, back-fill nothing (every new column is nullable or has a default), drop `NOT NULL` on the three `batchId` columns, and add the partial unique index `CREATE UNIQUE INDEX "subscription_one_live_per_course" ON "Subscription"("userId","courseId") WHERE status IN ('INCOMPLETE','ACTIVE','PAST_DUE','CANCELLING');`.
- [ ] **Step 4:** Run `bunx prisma generate`, the drift check (empty output), `bun test test/recorded-schemas.test.ts` (PASS), then the full `bun test` and `bun run typecheck` from the root. Fix any call sites broken by the now-optional `batchId` with a null-guard; don't change behaviour.

### Task 2: Admin-set teacher cuts

**Files:**
- Create: `apps/api/src/modules/settings/settings.service.ts`, `settings.repository.ts`, `settings.routes.ts`
- Modify: `apps/api/src/modules/payouts/earnings-calculator.ts`, `payout.service.ts`, `payout.repository.ts`, `apps/api/src/container.ts`, `apps/api/src/app.ts`, `apps/api/src/modules/courses/course.service.ts` and its routes
- Test: `apps/api/test/cut-settings.test.ts`, plus updates to `apps/api/test/earnings-calculator.test.ts`

**Interfaces:**
- **Produces:**
  - `SettingsService.cuts(): Promise<{ liveCutPercent: number; recordedCutPercent: number }>`
  - `SettingsService.updateCuts(input: CutSettingsInput, actor): Promise<…>` (admin only)
  - `cutFor(course: { type: CourseType; teacherCutPercent: number | null }, cuts): number`, a pure function in `settings.service.ts`
- **`EarningsCalculator`:** the constructor no longer takes a percent; `sessionShare(netFils, sessionCount, cutPercent)` and `paymentShare(netFils, cutPercent): number`.
- **Routes:**
  - `GET /admin/settings/cuts`
  - `PUT /admin/settings/cuts`
  - `PUT /admin/courses/:id/cut` with `courseCutInput`
- `accrueForSession` reads `cutFor(batch.course, cuts)`.
- Remove `TEACHER_SHARE_PERCENT` from the config schema and from the `container.ts:256` stats export, replacing it with the settings value. Keep the env var tolerated (ignored) so old `.env` files still boot.

- [ ] **Step 1:** Write the tests:
  - `cutFor({type:'LIVE',teacherCutPercent:null},{liveCutPercent:70,recordedCutPercent:60}) === 70`
  - `cutFor({type:'RECORDED',teacherCutPercent:null}, …) === 60`
  - `cutFor({type:'RECORDED',teacherCutPercent:85}, …) === 85`
  - `paymentShare(10000, 60) === 6000`
  - a non-admin `updateCuts` throws `ForbiddenError`
  - a session accrued after the live cut changes from 70 to 50 uses 50, while the already-accrued earning keeps its old amount
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement the code above.
- [ ] **Step 4:** Run `bun test` (all passing) and the typecheck.

### Task 3: Recorded-course authoring, preview lesson and Stripe price sync

**Files:**
- Modify: `apps/api/src/modules/courses/course.service.ts`, `course.repository.ts`, `course.routes.ts`, `apps/api/src/modules/batches/*` (refuse batches on RECORDED courses), `apps/api/src/core/ports.ts`, `apps/api/src/infrastructure/payments/stripe-gateway.ts` (real and fake)
- Test: `apps/api/test/recorded-authoring.test.ts`

**Interfaces:**
- **Produces, on the `PaymentGateway` port:**
  - `upsertRecordedProduct(args: { productId?: string; name: string; courseId: string; monthlyFils: number; yearlyFils: number; currentMonthlyPriceId?: string; currentYearlyPriceId?: string }): Promise<{ productId: string; monthlyPriceId: string; yearlyPriceId: string }>`
  - Prices are AED, `recurring.interval` month/year, `tax_behavior: 'exclusive'`.
  - A changed amount creates a new Price and archives the old one. Existing subscribers keep their price, because Stripe subscriptions point at the old Price.
- **Course rules:**
  - creating a course takes `type`;
  - `PUT /admin/courses/:id/recorded-pricing` with `recordedPricingInput` stores the prices and calls `upsertRecordedProduct`;
  - `PUT /courses/:id/preview-lesson` `{ lessonId | null }` is allowed for course editors, and the lesson must belong to the course;
  - `PUT /admin/courses/:id/apple-products` `{ monthly?: string, yearly?: string }`.
- **Publishing a RECORDED course** requires both prices plus at least one lesson; otherwise it fails with 422 `RECORDED_NOT_READY` and `details.missing: ('PRICES'|'LESSONS')[]`.
- **Batches:** `POST /batches` for a RECORDED course fails with 422 `RECORDED_HAS_NO_BATCHES`.
- **Course DTOs** (catalog and detail) gain `type`, `monthlyPriceFils`, `yearlyPriceFils`, `previewLessonId` and `appleProducts: {monthly, yearly} | null`. For a RECORDED course, `priceFils` (the "from" price) equals `monthlyPriceFils`.
- **The teacher proposal flow:** a teacher proposes the type; the admin sets the prices when approving.

- [ ] **Step 1:** Write the tests:
  - a RECORDED course can't be published without prices → `RECORDED_NOT_READY` with `missing:['PRICES']`;
  - a price change calls the fake gateway with the old price ids and stores the new ones;
  - creating a batch on a RECORDED course gives `RECORDED_HAS_NO_BATCHES`;
  - the catalog DTO's `priceFils` equals the monthly price;
  - a preview lesson from another course gives 404.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement. The fake gateway returns deterministic ids (`prod_fake_<courseId>`, `price_fake_m_<amount>`).
- [ ] **Step 4:** Run `bun test` and the typecheck. Both pass.

### Task 4: Access policy, course-level quizzes and video position

**Files:**
- Create: `apps/api/src/modules/subscriptions/access-policy.ts`
- Modify: `apps/api/src/modules/lessons/lesson.service.ts`, `lesson.repository.ts`, `lesson.routes.ts`, `apps/api/src/modules/quizzes/quiz.service.ts`, `quiz.repository.ts`, `quiz.routes.ts`, `quiz-grader.ts`
- Test: `apps/api/test/recorded-access.test.ts`

**Interfaces:**
- **Produces:** `canAccessRecorded(sub: { status: SubscriptionStatus; currentPeriodEnd: Date | null } | null, now: Date): boolean`, a pure function that implements the Global Constraints access rule.
- **`LessonRepository`** gains `recordedSubscription(courseId, userId)`, returning the newest non-expired row, and `videoPosition` and `setVideoPosition`.
- **`assertCanRead` for a RECORDED course:** admin, author, or `canAccessRecorded(...)`. A forbidden learner gets 403 `PLAN_REQUIRED`, with `details: { courseSlug, lapsed: boolean }`, where `lapsed` means they once had a subscription.
- **Preview lesson:** `GET /lessons/:id/preview` needs no auth. It returns the lesson only when it is the course's `previewLessonId`; otherwise 404.
- **Lessons list for a non-subscriber of a RECORDED course:** return titles, the module structure, `locked: true` per lesson, and the preview lesson unlocked, instead of a 403. `progress` is still included.
- **Video position:**
  - `PUT /lessons/:id/video-position` with `videoPositionInput`, under the same read rule;
  - `GET` includes `videoPositionSec` in the lesson payload.
- **Course-level quizzes:**
  - `POST /courses/:id/quizzes` (course editors, RECORDED only) creates a quiz with `courseId`, `maxAttempts` ignored (unlimited) and `dueAt` null;
  - `GET /courses/:id/quizzes` lists published quizzes and the viewer's best score;
  - attempts reuse the existing attempt endpoints, with access checked through the course;
  - `passPercent` can be edited on both quiz kinds;
  - the grader exposes `passed(bestPercent, passPercent): boolean`.

- [ ] **Step 1:** Write the tests:
  - `canAccessRecorded` is true at `periodEnd - 1s` while ACTIVE and false at `periodEnd` while ACTIVE;
  - true while CANCELLING before `periodEnd`;
  - PAST_DUE is true at `periodEnd + 15d23h` and false at `+16d`;
  - EXPIRED and `null` are false;
  - a non-subscriber's lesson list shows lessons as locked, except the preview lesson;
  - reading a locked lesson gives 403 `PLAN_REQUIRED` with `lapsed:false`, or with `lapsed:true` after an EXPIRED row;
  - a recorded quiz allows a 3rd attempt;
  - a video position round-trips.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `bun test`, including the existing `lessons-quizzes.test.ts`, unchanged and still passing.

### Task 5: Stripe subscription checkout, webhooks and self-service

**Files:**
- Create: `apps/api/src/modules/subscriptions/subscription.service.ts`, `subscription.repository.ts`, `subscription.routes.ts`
- Modify: `apps/api/src/core/ports.ts`, `apps/api/src/infrastructure/payments/stripe-gateway.ts` (real and fake), `apps/api/src/modules/webhooks/webhook.routes.ts`, `apps/api/src/container.ts`, `apps/api/src/app.ts`
- Test: `apps/api/test/stripe-subscriptions.test.ts`

**Interfaces:**
- **Consumes:** `canAccessRecorded` (Task 4), `PriceCalculator` (VAT), and the Stripe price ids (Task 3).
- **Produces, on the `PaymentGateway` port:**
  - `createSubscriptionCheckout(args: { priceId: string; customerEmail: string; reference: string; metadata: Record<string,string>; successUrl: string; cancelUrl: string }): Promise<{ id: string; url: string }>`
  - `setCancelAtPeriodEnd(subscriptionId: string, cancel: boolean): Promise<void>`
  - `cancelNow(subscriptionId: string): Promise<void>`
  - `switchPlan(subscriptionId: string, newPriceId: string): Promise<void>` (proration `create_prorations`)
  - `customerPortalUrl(customerId: string, returnUrl: string): Promise<string>`
  - `refundInvoice(invoiceId: string, amountFils: number): Promise<void>`
- **`PaymentWebhookEvent.type`** gains:
  - `'subscription.updated'`, carrying `subscription: { id, customerId, status: 'active'|'past_due'|'canceled'|'incomplete'|'unpaid', currentPeriodEnd: Date, cancelAtPeriodEnd: boolean, priceId, metadata }`;
  - `'invoice.paid'`, carrying `invoice: { id, subscriptionId, amountPaidFils, taxFils, feeFils, periodStart, periodEnd, billingReason }`;
  - `'invoice.failed'`.
  - Map `customer.subscription.created|updated|deleted`, `invoice.paid` and `invoice.payment_failed`. `checkout.session.completed` in subscription mode becomes `subscription.updated`, via the retrieved subscription.
- **`SubscriptionService.handleStripeEvent(evt)`**, called by the webhook route. The route first passes the event to `checkout.handlePaymentEvent`, and passes it here when that returns `handled:false`.
  - **Status mapping:** active → ACTIVE (CANCELLING if `cancelAtPeriodEnd`); past_due/unpaid → PAST_DUE; canceled → EXPIRED; incomplete → INCOMPLETE.
  - **`invoice.paid`:** upserts one `SubscriptionPayment` by `providerPaymentId`, idempotently, then calls `PayoutService.accrueForSubscriptionPayment` (Task 7) and sends a receipt.
  - **`invoice.failed`:** notifies `SUBSCRIPTION_PAYMENT_FAILED` once per invoice.
- **Routes:**
  - `POST /courses/:id/subscribe` with `subscribeInput` and `method:'STRIPE'`:
    - 409 `ALREADY_SUBSCRIBED` if a live row exists; 422 `NOT_RECORDED` for a LIVE course;
    - creates an INCOMPLETE row, `reference`, and returns `{ checkoutUrl, reference }`;
    - success URL `${WEB_URL}/learn/recorded/return?ref=…`.
  - `GET /subscriptions/by-reference/:ref` → `{ status, courseSlug, nextLessonId }`, polled by the return page.
  - `GET /me/subscriptions` → `[{ id, course: {id, slug, titleEn, titleAr, coverImageUrl}, plan, provider, status, currentPeriodEnd, cancelAtPeriodEnd, priceFils, hasAccess }]`.
  - `POST /subscriptions/:id/cancel` and `POST /subscriptions/:id/resume` (Stripe only; for Apple, 422 `MANAGED_BY_APPLE`).
  - `POST /subscriptions/:id/switch` `{ plan }`.
  - `POST /subscriptions/:id/portal` → `{ url }`.

- [ ] **Step 1:** Write the tests with the fake gateway:
  - subscribing returns a `checkoutUrl`, and a second subscribe gives `ALREADY_SUBSCRIBED`;
  - `subscription.updated(active)` makes the row ACTIVE with `currentPeriodEnd` set;
  - an `invoice.paid` delivered twice creates one payment;
  - `invoice.paid` before `subscription.updated` still links through `metadata.subscriptionRef`;
  - cancel sets CANCELLING and calls `setCancelAtPeriodEnd(true)`, and resume reverses it;
  - switch calls `switchPlan` with the yearly price id;
  - `invoice.failed` notifies once;
  - `canceled` gives EXPIRED.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement. Put `subscriptionRef` (our row id) in the checkout `subscription_data.metadata`, so every later event can find the row.
- [ ] **Step 4:** Run `bun test` and the typecheck.

### Task 6: Apple auto-renewable subscriptions

**Files:**
- Modify: `apps/api/src/modules/payments/apple/apple-iap.service.ts`, `apple-iap-policy.ts`, `apps/api/src/modules/subscriptions/subscription.service.ts`, `subscription.routes.ts`, and the `AppleTransaction` port fields in `apps/api/src/core/ports.ts` (add `expiresDate: Date | null`, `type: string | null`, `offerType` ignored)
- Test: `apps/api/test/apple-subscriptions.test.ts`

**Interfaces:**
- **`POST /courses/:id/subscribe` with `method:'APPLE_IAP'`:**
  - creates an INCOMPLETE row with `appleAppAccountToken` (a UUID);
  - returns `{ productId, appAccountToken, reference }`, using `course.appleMonthlyProductId`/`appleYearlyProductId`;
  - 422 `APPLE_PRODUCT_MISSING` when the product isn't set.
- **`POST /subscriptions/apple/verify` `{ signedTransaction }`:**
  - verifies the transaction and finds the row by `appAccountToken` or `originalTransactionId`;
  - the product must match the course;
  - sets ACTIVE and `currentPeriodEnd = expiresDate`, and upserts a `SubscriptionPayment` (`providerPaymentId = transactionId`) using the existing Apple AED price rule.
- **`AppleIapService.handleNotification`** routes subscription products (the prefix `com.futuretech.azza.rec.`) to `SubscriptionService.handleAppleNotification`:
  - `SUBSCRIBED`/`DID_RENEW` → ACTIVE plus a payment;
  - `DID_FAIL_TO_RENEW` → PAST_DUE (subtype `GRACE_PERIOD` keeps access);
  - `GRACE_PERIOD_EXPIRED`/`EXPIRED` → EXPIRED;
  - `DID_CHANGE_RENEWAL_STATUS` (`AUTO_RENEW_DISABLED`) → CANCELLING, and `AUTO_RENEW_ENABLED` → ACTIVE;
  - `DID_CHANGE_RENEWAL_PREF` → the plan changes at the next renewal (store it on the row; apply it on `DID_RENEW`);
  - `REFUND`/`REVOKE` → the payment becomes REFUNDED, the earning is reversed (Task 7), and the row becomes EXPIRED.
- **A learner with a live Stripe row** gets 409 `ALREADY_SUBSCRIBED` on an Apple subscribe, and the other way round.

- [ ] **Step 1:** Write the tests with the existing fake verifier:
  - subscribe returns the course's yearly product id;
  - a missing product gives `APPLE_PRODUCT_MISSING`;
  - verify activates;
  - a replayed `DID_RENEW` creates one payment;
  - `DID_FAIL_TO_RENEW`, then `GRACE_PERIOD_EXPIRED`, gives PAST_DUE and then EXPIRED;
  - `AUTO_RENEW_DISABLED` gives CANCELLING;
  - `REFUND` reverses the earning;
  - Stripe, then Apple, gives `ALREADY_SUBSCRIBED`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `bun test`. The existing `apple-iap.test.ts` must still pass.

### Task 6b: Bank-transfer plans

**Files:**
- Modify: `apps/api/src/modules/subscriptions/subscription.service.ts`, `subscription.repository.ts`, `subscription.routes.ts`, `apps/api/src/modules/payments/receipt-upload.service.ts`, `finance-admin.service.ts`, `payments.routes.ts` (the transfers list), `apps/api/src/modules/subscriptions/access-policy.ts`
- Test: `apps/api/test/transfer-subscriptions.test.ts`

**Interfaces:**
- **`POST /courses/:id/subscribe` with `method:'BANK_TRANSFER'`** (and optional `bankAccountId`):
  - creates or reuses the learner's Subscription row (provider BANK_TRANSFER) plus a `SubscriptionPayment` in AWAITING_RECEIPT, with `expiresAt = now + BANK_TRANSFER_HOLD_HOURS`;
  - sends the existing `TRANSFER_INSTRUCTIONS` notification, with the course and plan in the title;
  - returns `{ bankAccount, reference, amountFils, expiresAt, paymentId }`;
  - 409 `ALREADY_SUBSCRIBED` if a live Stripe or Apple row exists. A live transfer row is allowed (that's a renewal).
- **`POST /subscription-payments/:id/receipt`:** reuses `ReceiptUploadService` rules and moves the payment to AWAITING_REVIEW.
- **The transfers inbox** (`GET /admin/transfers` and its review endpoint) lists subscription payments too:
  - items gain `kind: 'SEAT'|'SUBSCRIPTION'` and `course` + `plan` for subscriptions;
  - `review` on a subscription payment calls `SubscriptionService.reviewTransfer(paymentId, { approve, note }, adminId)`.
- **Approving a transfer:**
  - the payment becomes PAID with `periodStart = max(now, sub.currentPeriodEnd ?? now)` and `periodEnd = periodStart + 1 month|1 year`;
  - the subscription becomes ACTIVE with `currentPeriodEnd = periodEnd`;
  - `accrueForSubscriptionPayment` runs (Task 7) and a receipt is sent.
- **Rejecting a transfer:** the payment becomes REJECTED and the learner is notified with the note. The existing stale-order job also expires transfer payments that are past `expiresAt`.
- **Access policy:** `canAccessRecorded` gains a third argument, `pendingRenewalReceipt: boolean`. For BANK_TRANSFER, access holds while `now < currentPeriodEnd`, or while `pendingRenewalReceipt` is true and that receipt was uploaded before `currentPeriodEnd`. No grace period.
- **Expiry:** a daily job sets BANK_TRANSFER rows past `currentPeriodEnd` (with no pending renewal) to EXPIRED and notifies `SUBSCRIPTION_ENDED`.
- **`POST /subscriptions/:id/switch-to-card`:**
  - for an ACTIVE transfer row, creates a Stripe subscription checkout with `trial_end = currentPeriodEnd` and returns `{ checkoutUrl }`;
  - on activation, the transfer row is closed as EXPIRED at `currentPeriodEnd`, without losing access, and the Stripe row takes over. The partial unique index allows it, because the transfer row is EXPIRED only at that point; until then, link through `metadata.replacesSubscriptionId`.
- **Admin cancel on a transfer row:** `{ refund: 'NONE'|'FULL' }` sets EXPIRED now; FULL records a manual refund on the last payment and reverses the earning.

- [ ] **Step 1:** Write the tests:
  - subscribing by transfer returns the bank account and reference, and the payment is AWAITING_RECEIPT;
  - a receipt moves it to AWAITING_REVIEW;
  - approval makes it ACTIVE with `periodEnd = approval + 1 month`;
  - an early renewal approved 5 days before the end extends from the old end, not from now;
  - a renewal receipt uploaded before the end keeps access after the end until review, and rejecting it removes access;
  - a first transfer awaiting review gives no access;
  - the transfers inbox lists `kind:'SUBSCRIPTION'`;
  - a Stripe live row blocks a transfer subscribe;
  - switch-to-card passes `trial_end = currentPeriodEnd` to the fake gateway (add `trialEnd?: Date` to `createSubscriptionCheckout`).
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `bun test`. The existing `receipt-upload.test.ts` must still pass.

### Task 7: Earnings from subscription payments and refunds

**Files:**
- Modify: `apps/api/src/modules/payouts/payout.service.ts`, `payout.repository.ts`, `apps/api/src/modules/reports/*` (finance totals), `apps/api/src/modules/payments/finance-admin.service.ts`
- Test: `apps/api/test/subscription-earnings.test.ts`

**Interfaces:**
- **`PayoutService.accrueForSubscriptionPayment(paymentId: string): Promise<Earning | null>`:**
  - teacher = `course.createdById`; returns null when there is none;
  - `amount = paymentShare(orderNet(payment), cutFor(course, cuts))`;
  - `kind 'SUBSCRIPTION'`, `availableAt = paidAt + earningHoldDays`;
  - idempotent through the unique `[subscriptionPaymentId, kind]`.
- **`PayoutService.reverseSubscriptionPayment(paymentId: string, refundedFils: number)`:**
  - before a payout has run, updates the earning;
  - after a payout has run, creates a `REFUND_ADJUSTMENT` earning with a negative amount, as `RefundEarningsReverser` does for orders.
- **Payout runs and teacher earnings screens** include earnings with `courseId` and no batch (grouped by course).
- **Finance reports** include recorded revenue as its own line: gross, refunds, fees, VAT, net.

- [ ] **Step 1:** Write the tests:
  - a 4900-fils payment (VAT 5% included in the total, fee 200) at a 60% recorded cut gives the expected net share;
  - an admin-created course gives no earning;
  - accruing twice gives one earning;
  - a refund after a payout run gives a negative `REFUND_ADJUSTMENT` and leaves the paid earning untouched (Review Focus 5);
  - the finance report shows `recorded.grossFils`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `bun test`. The existing `earnings-calculator.test.ts` and `report-math.test.ts` must still pass.

### Task 8: Certificates for recorded courses

**Files:**
- Modify: `apps/api/src/modules/certificates/certificate-eligibility.ts`, `certificate.service.ts`, `certificate.repository.ts`, `apps/api/src/modules/lessons/lesson.service.ts` (trigger), `apps/api/src/modules/quizzes/quiz.service.ts` (trigger)
- Test: `apps/api/test/recorded-certificates.test.ts`

**Interfaces:**
- **`recordedEligible(args: { lessonIds: string[]; completedIds: Set<string>; quizzes: Array<{ passPercent: number; bestPercent: number | null }> }): boolean`:** true when `lessonIds` is non-empty and all are completed, and every quiz's `bestPercent` ≥ `passPercent`.
- **`CertificateService.issueRecordedIfEligible(userId, courseId)`:** idempotent through `[userId, courseId]`.
  - Called after `setCompleted(true)` and after a quiz attempt is graded, and lazily inside `GET /me/certificates` for every recorded course the user has progress in.
  - Issuing doesn't require an active plan.
- **Certificate DTO** gains `kind: 'LIVE'|'RECORDED'` and `course` for recorded certificates. The verify page payload shows the course title, with no attendance line.

- [ ] **Step 1:** Write the tests:
  - eligible only after the last lesson and a passing quiz;
  - a failing best attempt at 65% with a 70% pass mark is not eligible, and 70% is;
  - adding a lesson after issue keeps the certificate (Review Focus 4);
  - deleting an unfinished lesson makes the learner eligible;
  - an expired plan still issues.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `bun test`.

### Task 9: Learner and admin endpoints, reminders and docs

**Files:**
- Modify: `apps/api/src/modules/lessons/lesson.service.ts` (`myProgress`), `apps/api/src/modules/subscriptions/*`, `apps/api/src/modules/admin/*`, `apps/api/src/jobs` (wherever `expireStaleOrders` is scheduled), `apps/api/src/modules/notifications/*` (types), `docs/API.md`, `docs/STORE_RELEASE.md`
- Test: `apps/api/test/subscription-admin.test.ts`

**Interfaces:**
- **`GET /me/learning-progress`:** items gain `type`, plus for recorded courses `subscription: { status, currentPeriodEnd, cancelAtPeriodEnd, hasAccess } | null`. Lapsed recorded courses with any progress are still listed.
- **Admin routes:**
  - `GET /admin/subscriptions?courseId&status&provider&page` → items with the user, course, plan, provider, status, `currentPeriodEnd` and the last payment;
  - `POST /admin/subscriptions/:id/cancel` `{ refund: 'NONE'|'FULL' }`: Stripe only (`cancelNow` plus `refundInvoice` of the last payment, then Task 7's reversal); for Apple, 422 `MANAGED_BY_APPLE`.
- **Job `remindRenewals()`, daily:**
  - Stripe and Apple: YEARLY, ACTIVE subscriptions whose `currentPeriodEnd` falls 7 days ahead (inside a 24-hour window);
  - BANK_TRANSFER: monthly and yearly, 7 days ahead and on the end day; the notification links to "Renew by transfer";
  - notify `SUBSCRIPTION_RENEWS_SOON` by email and push, once per period (remembered by `reminderSentForPeriodEnd` on the row; add that column in this task's migration `20261108120000_subscription_reminder`).
- **Notification types:** `SUBSCRIPTION_ACTIVE`, `SUBSCRIPTION_PAYMENT_FAILED`, `SUBSCRIPTION_RENEWS_SOON` and `SUBSCRIPTION_ENDED`, each with `data: { courseSlug, subscriptionId }`.
- **Docs:**
  - `docs/API.md` documents every new endpoint and error code;
  - `docs/STORE_RELEASE.md` gains §2b, the per-course subscription group steps, including turning on the Billing Grace Period (16 days) in App Store Connect;
  - the Stripe setup notes cover Smart Retries ending within 16 days, then cancelling the subscription, and the Customer Portal settings: cancel at period end and switch plans on.

- [ ] **Step 1:** Write the tests:
  - the reminder fires for a yearly plan ending in 7 days and not for a monthly one, and not twice;
  - admin cancel with a FULL refund calls `cancelNow` and `refundInvoice` and reverses the earning;
  - an Apple subscription gives `MANAGED_BY_APPLE`;
  - learning progress lists a lapsed course with `hasAccess:false`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement and write the docs.
- [ ] **Step 4:** Run the full `bun test`, the typecheck and the drift check.

### Task 10: Web: catalog, course page, preview, checkout return

**Files:**
- Modify:
  - `apps/web/src/features/catalog/*` (card marker, Live/Recorded filter)
  - `apps/web/src/app/(public)/(site)/courses/[slug]/*` and `apps/web/src/features/course/*`
  - `apps/web/src/lib/api/*` (typed clients)
  - `apps/web/src/lib/i18n/dictionaries/en.ts` and `ar.ts`
- Create:
  - `apps/web/src/features/subscriptions/plan-picker.tsx`
  - `apps/web/src/app/(student)/(shell)/learn/recorded/return/page.tsx`
- Test: `apps/web` lint and typecheck, plus a Playwright script in the scratchpad (not committed) for the verification task.

**Interfaces:**
- **Consumes:** Tasks 3, 4 and 5 endpoints.
- **`PlanPicker`** props: `{ course: CourseDetail; subscription: MySubscription | null }`. It uses the existing price component for currency conversion.
  - Monthly and Yearly appear as a shadcn `RadioGroup`. Yearly shows `≈ AED x/month · save N months` (`yearlySavingMonths`) and "incl. VAT" where it applies.
  - It lists what you get: all lessons and quizzes, a certificate when you finish, cancel any time.
  - The payment choice is Card or Bank transfer, the same component pattern as the batch checkout. For a transfer, show the fixed transfer copy, then the instructions page: reuse the existing bank-transfer checkout screen's layout, with the reference and amount copy buttons and the receipt upload.
  - The CTA is "Start learning", calling `POST /courses/:id/subscribe` and then `location.href = checkoutUrl` (card). Before the CTA, it shows the next charge date (today + period) and the fixed cancel line.
  - A subscriber sees "Continue", linking to the next lesson, and their status line ("Renews 7 Dec" / "Ends 7 Dec · Resume plan").
- **The recorded course page** replaces "Choose your class" with the PlanPicker, adds a "Watch the free lesson" link to the preview lesson, and shows locked lessons with a lock icon.
- **The return page** shows "Setting up your access…" and polls `GET /subscriptions/by-reference/:ref` every 1.5 s, for up to 60 s.
  - On ACTIVE, it goes to the next lesson.
  - If it times out, it says it's still processing and offers a link to "Your plans". It never shows a failure while the status is INCOMPLETE.

- [ ] **Step 1:** Build the components and wire the routes. Use shadcn primitives: RadioGroup, Card, Button, Badge.
- [ ] **Step 2:** Run `cd apps/web && bun run lint && bunx tsc --noEmit`. Expected: 0 errors.

### Task 11: Web: My learning, Your plans, banners, video resume

**Files:**
- Modify:
  - `apps/web/src/app/(student)/(shell)/learn/*` (dashboard)
  - `apps/web/src/features/lessons/lesson-reader.tsx` (video resume; saves position every 10 s and on pause/unload)
  - `apps/web/src/app/(student)/(shell)/settings/*` (an account menu link)
  - the i18n dictionaries
- Create:
  - `apps/web/src/app/(student)/(shell)/plans/page.tsx`
  - `apps/web/src/features/subscriptions/plan-banner.tsx`
  - `apps/web/src/features/subscriptions/manage-plan.tsx`

**Interfaces:**
- **My learning:** recorded courses appear next to classes, each with a progress bar, the next lesson and the status line. Lapsed ones show "Your plan has ended. Your progress is saved." with "Renew to continue", which re-subscribes with the previous plan.
- **`/plans`:** one card per subscription.
  - Stripe: Cancel, a two-step shadcn `AlertDialog` saying "You can keep learning until {date}. Your progress and certificate stay yours."; Resume; Switch to yearly; Update card (portal).
  - Apple: "Manage in the App Store on your iPhone".
  - Transfer: "Paid until {date}", with "Renew by transfer" and "Switch to card". A pending transfer shows the reference and amount with copy buttons, the receipt upload, and its review status.
- **`PlanBanner`** appears on the course page and the lesson reader when the status is PAST_DUE (the failed-payment line plus Update card) or CANCELLING (Ends {date} · Resume).
- **Reading a locked lesson** (403 `PLAN_REQUIRED`) shows a calm panel with the PlanPicker instead of an error page.

- [ ] **Step 1:** Build the pieces above.
- [ ] **Step 2:** Run the web lint and typecheck. Expected: 0 errors.

### Task 12: Web: studio and admin

**Files:**
- Modify:
  - `apps/web/src/features/studio/*` (the new-course flow asks Live or Recorded first; a recorded course has no batch tab, and shows Subscribers and Earnings plus a course-level quiz list and the preview-lesson picker)
  - `apps/web/src/features/quizzes/*` (`passPercent` field)
  - `apps/web/src/app/(admin)/admin/courses/*` (the approve flow sets recorded prices; per-course cut override with a "for rare cases" warning; Apple product ids)
  - `apps/web/src/app/(admin)/admin/settings/*` (a default-cuts card)
  - `apps/web/src/app/(admin)/admin/reports/*` (the recorded revenue line)
  - `apps/web/src/app/(admin)/admin/transfers/*` (subscription transfers appear with a course and plan label, and are reviewed the same way)
- Create: `apps/web/src/app/(admin)/admin/subscriptions/page.tsx` (filters, table, a cancel dialog with a refund choice)

- [ ] **Step 1:** Build the screens. Admin navigation gains "Subscriptions".
- [ ] **Step 2:** Run the web lint and typecheck. Expected: 0 errors.

### Task 13: Mobile: catalog, course detail, subscribe (Stripe on Android, Apple on iOS)

**Files:**
- Modify:
  - `apps/mobile/lib/features/catalog/presentation/course_detail_screen.dart`, `catalog_widgets.dart`, `explore_filters_sheet.dart`
  - `apps/mobile/lib/features/checkout/data/app_store_gateway.dart` (auto-renewable purchase support)
  - `lib/l10n/app_en.arb` and `app_ar.arb`
- Create: under `apps/mobile/lib/features/subscriptions/`, `data/subscription_repository.dart`, `domain/subscription_models.dart`, `presentation/plan_picker.dart`, `presentation/subscribe_return_screen.dart`
- Test: `apps/mobile/test/features/recorded_subscribe_test.dart`

**Interfaces:**
- **`SubscriptionRepository`:**
  - `subscribe(courseId, plan, method) → SubscribeStart` (`checkoutUrl` or Apple product + token);
  - `byReference(ref)`, `mine()`, `cancel(id)`, `resume(id)`, `switchPlan(id, plan)`, `portalUrl(id)`, `verifyApple(signedTransaction)`.
- **Android:** opens `checkoutUrl` in the external browser or custom tab. Returning to the app (resume lifecycle, or a deep link to `azza://learn/recorded/return?ref=`) polls `byReference`, the same as on web.
- **Android: bank transfer** as on web, reusing the patterns in `bank_transfer_screen.dart` (reference and amount copy, receipt upload). **iOS doesn't offer bank transfer.**
- **iOS:** buys the auto-renewable product through `in_app_purchase` with `applicationUserName = appAccountToken`, then calls `verifyApple`, then finishes the transaction. It reuses the pending-transaction resend logic in `apple_purchase_coordinator.dart`.
- **PlanPicker** follows the same rules and copy as on web (Task 10). It shows a preview lesson button, and locked lessons get a lock icon.

- [ ] **Step 1:** Write the widget tests with fakes:
  - a recorded course shows the PlanPicker, not the batch picker;
  - Yearly shows the saving;
  - Start on Android opens the checkout URL;
  - on iOS it calls the purchase with the token;
  - the return screen shows "Setting up your access…" and then opens the next lesson when the status becomes ACTIVE.
- [ ] **Step 2:** Run `flutter test test/features/recorded_subscribe_test.dart`. Expected: FAIL.
- [ ] **Step 3:** Implement. Run `flutter gen-l10n`.
- [ ] **Step 4:** Run `flutter analyze` and the full `flutter test`. Both are clean.

### Task 14: Mobile: my learning, plans, banners, video resume, teacher and admin parity

**Files:**
- Modify:
  - `apps/mobile/lib/features/home/*` (student home "continue" and next-lesson card), `apps/mobile/lib/features/learn/*` (my learning list, lesson video resume)
  - `apps/mobile/lib/features/me/*` (Your plans entry)
  - `apps/mobile/lib/features/teacher/*` (create Live or Recorded, recorded course hub: subscribers, earnings, course quizzes, preview lesson)
  - `apps/mobile/lib/features/admin/*` (default cuts, per-course override, recorded prices and Apple ids, subscriptions list and cancel, subscription transfers in the transfer review queue)
  - the ARB files
- Create: `apps/mobile/lib/features/subscriptions/presentation/my_plans_screen.dart`, `plan_banner.dart`
- Test: `apps/mobile/test/features/recorded_plans_test.dart`

**Interfaces:**
- **Same behaviour and copy as Task 11 and Task 12.** On iOS, Manage opens `https://apps.apple.com/account/subscriptions`. Cancel is a two-step dialog.
- **The lesson video player** saves the position every 10 s and on dispose, and seeks to `videoPositionSec` on open.

- [ ] **Step 1:** Write the widget tests:
  - a lapsed course shows its progress and "Renew to continue";
  - PAST_DUE shows the banner;
  - cancel asks twice, then calls the repository;
  - an Apple plan shows the App Store manage button and no cancel;
  - the teacher's new-course flow asks the type first;
  - admin default cuts save.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement, then run `flutter gen-l10n`.
- [ ] **Step 4:** Run `flutter analyze` and the full `flutter test`. Both are clean.

### Task 15: End-to-end verification and ship

- [ ] **Step 1:** Run every check from the root: typecheck, the API `bun test`, the web lint, `flutter analyze` and `flutter test`. All green.
- [ ] **Step 2:** Run the seed with one recorded course (add it to `apps/api/prisma/seed.ts`: priced 4900/49000 fils, 2 modules, 4 lessons, 1 quiz, a preview lesson). Then, in the browser:
  - as a visitor, watch the preview lesson;
  - sign in as the seeded student, subscribe (fake gateway → return page → lesson 1);
  - complete the lessons, pass the quiz, and check the certificate;
  - cancel (CANCELLING line) and resume;
  - as the admin, change the recorded cut and see the new cut in a new payment's earning.
  - Do it at desktop and 390px widths, in EN and AR.
- [ ] **Step 3:** Run `flutter run -d macos` per role (student, teacher, admin) for the same flow, as far as the fake gateway allows.
- [ ] **Step 4:** The coordinator commits everything except the owner's files, pushes to PR 3 and updates the PR description.

### Task 9b: Automatic App Store product sync (added at the owner's request, 2026-11-07)

The App Store Connect API creates and prices the Apple products, so nobody sets them up by hand. It is split in two so the core can be built in parallel with the API track.

**9b-a: client and sync engine (new files only)**

**Files:**
- Create: `apps/api/src/infrastructure/appstore/app-store-connect-client.ts` (ES256 JWT with `iss` = issuer id, `kid` = key id, `aud` = 'appstoreconnect-v1', 20-minute expiry, cached about 15 minutes; a JSON:API fetch wrapper with paging and 429 back-off)
- Create: `apps/api/src/modules/appstore-sync/appstore-sync.service.ts`, `appstore-sync.port.ts`, and an in-memory fake under test/fakes
- Test: `apps/api/test/appstore-sync.test.ts`

**Interfaces (Produces):**
- **Port `AppStoreCatalog`:**
  - `findIapByProductId(productId)` → `{id, state} | null`
  - `createConsumable({productId, name, reviewNote})` → `{id}`
  - `setIapLocalizations(iapId, [{locale:'en-US'|'ar-SA', name, description}])`
  - `uaePricePoints(iapId | subscriptionId, kind)` → `[{id, customerPrice: number}]` (territory ARE)
  - `setIapPrice(iapId, pricePointId)` (POST /v1/inAppPurchasePriceSchedules, `baseTerritory` ARE)
  - `findSubscriptionGroup(referenceName)` and `createSubscriptionGroup(referenceName)`
  - `findSubscriptionByProductId(productId)`
  - `createSubscription({groupId, productId, name, period:'ONE_MONTH'|'ONE_YEAR', groupLevel})`
  - `setSubscriptionLocalizations(...)`
  - `setSubscriptionPrice(subId, pricePointId)` (POST /v1/subscriptionPrices, territory ARE, `preserveCurrentPrice: false`)
- **`nearestPricePoint(points, targetFils)`:** a pure function that picks the point whose `customerPrice` is closest to the VAT-inclusive target, with ties going to the lower one.
- **`AppStoreSyncService`:**
  - `syncSeatPrice(priceFils)`: product `com.futuretech.azza.seat.aed<AED>` (`appleSeatProductId` from @azza/shared). Whole dirhams only; anything else is skipped with a reason. It creates the product if missing, sets en/ar names ("Class seat" / «مقعد في صفّ») and the price nearest `PriceCalculator.inclusive(priceFils)`.
  - `syncRecordedCourse(course)`: group reference name `rec.<slug>`, then the monthly and yearly products with `appleRecordedProductId(slug, plan)`, en/ar names from the course title, and prices nearest the inclusive monthly and yearly prices. It returns `{monthly, yearly}` product ids.
  - Each call is idempotent (find before create) and never deletes anything. Price changes only replace the price schedule.
  - Each returns `{status:'SYNCED'|'SKIPPED'|'FAILED', detail}`.
- **Tests (fake catalog):**
  - creates a missing consumable once (a second run makes no create call);
  - `nearestPricePoint` picks 472.99 over 459.99 for a 472.50 target;
  - a non-whole-dirham price is skipped;
  - a recorded course gets one group and two subscriptions with ONE_MONTH/ONE_YEAR;
  - a price change re-prices without re-creating;
  - a 429 is retried with back-off (client unit test with a stub fetch).

**9b-b: wiring (after Task 9)**
- **Config:** add optional `ASC_ISSUER_ID`, `ASC_KEY_ID` and `ASC_PRIVATE_KEY_PATH` (or `ASC_PRIVATE_KEY`) to the API config. When they're missing, sync is disabled and reports `SKIPPED: not configured`, and nothing else breaks.
- **Triggers:**
  - after `setRecordedPricing`, call `syncRecordedCourse` and write the returned ids into `appleMonthlyProductId`/`appleYearlyProductId`;
  - after a batch is created or its price changes, call `syncSeatPrice`.
  - Both run fire-and-forget with the injected logger; a failure never breaks the admin request.
- **Nightly job:** `syncAppStoreCatalog()` walks every distinct batch price and every published RECORDED course. Schedule it next to the existing jobs.
- **Status:**
  - store the last result per course on `Course.appleSyncStatus String?` and `appleSyncedAt DateTime?` (migration `20261108130000_course_apple_sync`), and per seat price in a small `AppleSeatProduct {priceFils @id, productId, status, detail, syncedAt}` table;
  - `GET /admin/app-store/status` lists them;
  - `POST /admin/app-store/sync` runs the sync now (admin only).
- **Clients:** the admin course screen (web Task 12 and mobile Task 14 follow-ups) shows the sync status and a "Sync now" button. If those tasks are already done, a small follow-up web+mobile change adds it.
- **Docs:** STORE_RELEASE.md §2 explains creating the API key (Users and Access → Integrations → App Store Connect API, App Manager role) and the env vars, and states that the Paid Apps Agreement and App Review are still manual.

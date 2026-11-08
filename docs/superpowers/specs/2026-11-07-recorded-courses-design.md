# Recorded courses on a monthly or yearly plan: design

**Status:** draft for the owner's approval.
**Date:** 2026-11-07.

## Why

Today every Azza course is live: learners buy a seat in a **batch** with a schedule and a teacher. The owner wants a second kind of course, a **recorded course**:
- a learner starts it on their own, any time, with no batch and no schedule;
- they pay for that course with a **monthly or yearly plan**.

This lets teachers sell what they've recorded once to many learners, and lets learners start the day they decide to learn.

## Decisions made by the owner

1. **One type per course.**
   - A course is either **LIVE** (batches, as today) or **RECORDED** (a plan), never both.
   - The type is set when the course is created.
2. **Learners enrol themselves** in a recorded course. There's no batch, class, seats or schedule.
3. **Each recorded course has its own monthly and yearly plan**, i.e. its own two prices.
4. **When a plan ends,** the learner **keeps their progress and any certificate**. The lessons and quizzes lock again until they renew; renewing picks up where they stopped.
5. **The admin decides the teacher's cut:**
   - one **default cut for live courses** and one **default cut for recorded courses**, edited by the admin in the app. This replaces today's fixed `TEACHER_SHARE_PERCENT` in server config; its current value becomes the starting default for both.
   - in rare cases the admin can set a **different cut on an individual course**. Otherwise every course uses its type's default.
6. **A recorded-course certificate** is issued once the learner has **completed every lesson and passed every quiz** in the course.
7. **Some learners will pay by offline bank transfer.** A plan must be payable by transfer as well as by card or Apple.

## Goals

- Admins and teachers can create, propose and approve recorded courses, using the existing course, module, lesson and quiz editors.
- The catalog and course page show recorded courses with their monthly and yearly prices. The prices appear in the visitor's chosen currency, with the existing price component.
- A learner can subscribe, start right away, cancel at any time and renew, on web and mobile.
- Access is always derived from the subscription state reported by the payment provider, through webhooks. It's never trusted from the client.
- Teachers earn their cut on every successful payment, including renewals. The earnings flow into the existing payout runs next to their live earnings.
- The admin can see and manage subscriptions: a list, a status and a cancel action. Refunds are handled where the provider allows them.

## Non-goals (for this version)

- **No live parts in a recorded course:** no sessions, class chat, announcements to a class, assignments, attendance, waitlist or seats.
  - Assignments need a teacher to grade them, which a self-paced course doesn't have.
- **No all-access or bundle subscription.** Plans are per course only.
- **No free trials or introductory prices.** The public course page still lists lesson titles and the intro video, as today; one preview lesson is free (see Customer experience).
- **No converting** a live course into a recorded one, or the other way round.
- No coupons on plans in this version.

## Anti-goals (would be failures even if it works)

- A learner loses progress or a certificate because a plan lapsed.
- A learner keeps access after a failed or cancelled payment, or loses it while still paid up. Access must follow the provider's real state, including renewals that happen while they're offline.
- A learner is double-charged or ends up with two active plans for the same course.
- Copy that promises "learn anything" or "self-paced" for live courses. VOICE.md's honesty rules still apply; for recorded courses, "at your own pace" is now true and may be used.

## How it works

### Data (the builder decides the exact schema)
- **`Course`:**
  - gains `type`: `LIVE` | `RECORDED`, default LIVE; all existing courses stay LIVE;
  - gains `monthlyPriceFils?` and `yearlyPriceFils?` (AED before VAT, as today), required for a RECORDED course before it can be published;
  - gains `teacherCutPercent?`, the override; null means use the type's default.
- **Platform settings:** the admin-editable default cuts for live and recorded, stored in the database.
- **A subscription record per learner per recorded course:**
  - plan (MONTHLY | YEARLY), provider (STRIPE | APPLE | BANK_TRANSFER), the provider's subscription id (none for transfers);
  - status (ACTIVE, PAST_DUE, CANCELLED-at-period-end, EXPIRED);
  - `currentPeriodEnd`, `cancelAtPeriodEnd`.
  - At most one non-expired subscription per learner per course.
- **Each paid period (first payment and each renewal) becomes a payment record**, with the same money fields as `Order`: total, VAT, fee, refunded, display currency and FX snapshot.
  - It gets a receipt, appears in admin finance reports, and generates the teacher's earning.
  - The builder may extend `Order` or add a sibling model. Today `Order` hangs off a batch `Enrollment`, so that would need to change.
- **`Earning` and `Certificate` are tied to a batch today.** They need to support a recorded course too: either an optional `courseId` with `batchId` made optional, or a separate record. Builder's call.

### Access
- Lessons and quizzes of a RECORDED course are readable by admins, the course's author, and a viewer whose subscription is:
  - ACTIVE, or cancelled but still before `currentPeriodEnd`; or
  - **PAST_DUE for at most 16 days after `currentPeriodEnd`** (my call: the same length as Apple's billing grace period). Stripe's retry schedule is set to give up within that window, after which the subscription is cancelled and becomes EXPIRED.
- This extends `LessonService.assertCanRead` and the quiz equivalent.
- Lesson progress (`LessonProgress`) and quiz attempts are kept forever, whatever the subscription status.

### Paying
- **Web and Android: Stripe Checkout in subscription mode.**
  - **Android uses Stripe, not Google Play Billing.** This is the owner's decision; they accept the risk of Play policy rejection, as for live seats today.
  - One Stripe Product per recorded course, with a monthly and a yearly Price, created or updated by the API when an admin sets or changes the prices.
  - A price change creates new Stripe Prices. Existing subscribers keep their price until the builder decides otherwise; my call is that they keep it.
  - **Webhooks** drive everything: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated` and `customer.subscription.deleted`. They're handled idempotently through the existing webhooks module.
  - Learners cancel, or switch between monthly and yearly, through the **Stripe Customer Portal**.
- **iOS: Apple auto-renewable subscriptions** (App Store guideline 3.1.1, since this is digital content).
  - **One subscription group per recorded course** (my call; required): Apple allows one active subscription per group, so a shared group would make subscribing to course B replace course A.
  - Each group has two products: `com.futuretech.azza.rec.<courseSlug>.monthly` and `.yearly`. The server maps product → course from a table the admin fills in when publishing. Monthly ↔ yearly crossgrades stay inside the course's own group.
  - Ops cost, accepted: publishing a recorded course on iOS, or changing its price, means creating or editing its two products in App Store Connect. Until both product ids are entered, the iOS app shows the course but says "Available on our website for now" (as live courses do today without products).
  - Purchases are verified with `appAccountToken`. App Store Server Notifications V2 drive renewals, the grace period, expiry and refunds.
  - Learners manage and cancel through the App Store's subscription settings.
  - docs/STORE_RELEASE.md gains the per-course product steps.
- **Bank transfer (web and Android; not iOS, where Apple requires In-App Purchase for digital content):**
  - **A prepaid period that doesn't renew on its own.** The learner picks Monthly or Yearly and gets the existing transfer instructions (bank account, amount incl. VAT, reference, hold of `BANK_TRANSFER_HOLD_HOURS`).
  - They upload the receipt with the existing receipt upload. The admin approves or rejects it in the **existing transfers inbox**, where subscription transfers appear next to seat transfers, labelled with the course and plan.
  - **On approval:**
    - the paid period starts at the later of now and the end of their current period, so renewing early never loses days;
    - the subscription is ACTIVE until `currentPeriodEnd` and then becomes EXPIRED. There's no PAST_DUE and no 16-day grace for transfers.
  - **No access while a first transfer awaits review** (my call). But if a **renewal** receipt was uploaded before the period ended, access continues until the admin reviews it (my call: the learner did their part, so the wait is ours).
  - **Reminders:** transfer plans don't renew, so **monthly and yearly both** get a reminder **7 days before the end**, and another on the day it ends. Each has a one-tap "Renew by transfer" that starts a new transfer for the same plan.
  - **Switching to card:** a learner with an active transfer plan can "Switch to card". This starts a Stripe subscription whose first charge is on their `currentPeriodEnd` (Stripe `trial_end`), so nothing is paid twice.
  - **Refunds:** the admin records a manual refund, as for seat transfers today. A refund reverses the teacher's earning, and the admin can end access at once.
  - Rejected or expired transfers notify the learner with the reason, using the existing transfer review copy, and offer to try again.
- **VAT, fees and FX** work as they do for orders today: AED is the base, and the display currency is a snapshot.

### Teacher pay
- On every successful paid period, the teacher (the course's `createdById`; for an admin-created course, no earning) earns `cut% × net`.
  - Net uses the same rule as today's `orderNet`: total minus refunds, minus VAT, minus the processor fee.
  - The cut is the course override, or else the recorded default, read **at the time of the payment**.
- Earnings are held for `earningHoldDays`, then join the normal payout run.
- Refunds reverse the earning, as they do today.
- Live courses keep their per-session accrual, but read the live default cut (or the course override) instead of `TEACHER_SHARE_PERCENT`.
- Changing a cut never recalculates money already earned.

### Certificates
- When a learner has completed every lesson and passed every quiz of a recorded course, a certificate is issued, idempotently, with the same verifiable code and page as today.
  - **Quizzes have no pass mark today, so they gain one:** `passPercent` per quiz, default 70 (my call), editable in the quiz editor. A quiz counts as passed when the learner's best attempt meets it.
  - **Recorded-course quizzes belong to the course, not a batch:** unlimited attempts and no due date (my call), so failing can never block a certificate for good. Live quizzes keep their current rules.
  - The check runs when a lesson is marked complete or a quiz is passed, and also lazily in `GET /me/certificates`, as today.
- If the course later gains new lessons, an issued certificate stays valid.

### Screens (web and mobile at parity)
- **Catalog and course page:**
  - a "Recorded" or "Live" marker on cards, and a filter;
  - for a recorded course, the page shows a plan picker (Monthly / Yearly, with the yearly saving shown) instead of "Choose your class", plus "Start learning";
  - an active subscriber sees "Continue" and their next lesson.
- **My learning:** recorded courses appear next to live classes, showing progress, the next lesson, and the plan's renewal or end date ("Renews 7 Dec" / "Ends 7 Dec"). A lapsed course shows "Renew to continue" and still shows the progress.
- **Account:** "Your plans" lists each subscription, its status and next charge, with Manage (the Stripe Customer Portal, or the App Store's subscription settings on iOS).
- **Teacher studio:** creating a course asks Live or Recorded first. A recorded course has no batch tab; it shows subscribers and earnings instead.
- **Admin:**
  - approve recorded courses and set their monthly and yearly prices;
  - edit the two default cuts, and set a per-course override with a warning that it's for rare cases;
  - a subscriptions list with filters (course, status, provider) and a cancel action. My call for what it does:
    - Stripe: **cancel now, with an optional refund of the current period** (a full refund, or none). Access ends immediately and a refund reverses the teacher's earning.
    - Apple: the admin can only view; the screen says the learner manages it in the App Store, and refunds come only from Apple (as for live IAP orders today).
  - recorded revenue in the finance reports.
- **Copy** follows VOICE.md. Proposed lines:
  - "Start any time. Learn at your pace." / «ابدأ متى شئت، وتعلّم على راحتك.»
  - Plan names: "Monthly" / «شهري», "Yearly" / «سنوي».
  - Lapsed state: "Your plan has ended. Your progress is saved." / «انتهى اشتراكك، وتقدّمك محفوظ.»

## Customer experience (the owner asked for the best CX)

The principle: **a plan should feel fair, clear and easy to leave.** That's what makes people comfortable starting one. Each item below is a requirement, not decoration.

**Before paying**
- **Try before buying:** the first lesson of every recorded course is free to watch without a plan, so people can feel the teaching first.
  - This is my call (it isn't a trial; it's one lesson). The teacher can choose which lesson is the free preview.
- **Prices people understand:**
  - shown in the visitor's currency, with "incl. VAT" where it applies;
  - yearly shown as the per-month equivalent plus the saving ("AED 41/month, billed yearly · save 2 months");
  - the course page states plainly what you get: all lessons and quizzes, a certificate when you finish, cancel any time.
- **No surprises at checkout:** before paying, the learner sees the amount, when they'll next be charged, and "Cancel any time. You keep access until the end of the period you paid for."

**Starting**
- After payment, the learner lands straight in **lesson 1** (or their next lesson if they had progress before), not on a receipt page.
- If the webhook hasn't arrived yet, show a short "Setting up your access…" state that polls and resolves on its own. Never show a dead end or a "payment failed" scare while it's still processing.

**Learning**
- **"Continue where you left off"** everywhere: on home, the course card and the course page. This includes **resuming a video at the second it was stopped**, kept on the server so it works across devices.
- A progress bar per course, and on home a "next lesson" card that takes one tap to open.

**Keeping the plan healthy**
- **Reminders that build trust:**
  - an email and a notification **7 days before a yearly renewal**, with a one-tap way to manage it;
  - monthly plans get no reminder (that would be noise), but every charge sends a receipt.
- **Failed payment, handled gently:**
  - access continues during the provider's retry period (Stripe Smart Retries; Apple's billing grace period, turned on);
  - a calm banner says "Your last payment didn't go through. Update your card to keep learning", with a direct link to update the card;
  - access stops only when the provider marks the subscription expired.
- **Switching plans:** monthly → yearly is one step from "Your plans", with credit for the unused time (Stripe proration; Apple handles it on iOS).

**Leaving and coming back**
- **Cancelling takes two taps** and never needs support. Show what happens ("You can keep learning until 7 Dec. Your progress and certificate stay yours.") and no guilt-trip screens.
- A learner who cancelled sees "Ends 7 Dec · Resume plan" and can undo with one tap before the date.
- **Lapsed courses stay visible** in My learning with their progress and a "Renew to continue" button that goes straight to checkout with the plan they had before. Renewing returns them to their next lesson.
- Certificates are always reachable, whatever the plan status.

**Everywhere**
- Web, Android and iOS behave the same. The only difference is where cancel/manage opens (the Stripe portal vs. the App Store), and the app says so in plain words.
- **Transfer learners are never second-class.** The checkout states plainly: "Pay by bank transfer. Your access starts once we confirm it, usually within 1 working day." The waiting state shows the reference and amount with copy buttons, plus the upload button. A transfer plan's card says "Paid until 7 Dec · Renew by transfer" or "Switch to card".
- Arabic is written natively, RTL is correct, digits stay Western, and prices and dates use the existing formatters.
- Screen-reader labels on the plan picker and progress, 44pt touch targets, and readable at 2× text size (the mobile tests already cover 2×).

## Left to the builder
- Exact schema shape: extend `Order`/`Earning`/`Certificate` or add sibling models; migration names.
- Endpoint names and shapes, following the existing module pattern (service + repository port + routes), documented in docs/API.md.
- Reminder emails (renewal soon, payment failed): use the existing Notifier.
- How the catalog's "from" price shows for recorded courses: my call is the monthly price.
- Test coverage, following the existing API, web and mobile test suites.

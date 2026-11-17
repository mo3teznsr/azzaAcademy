# Business Audit Fixes: Implementation Plan

**Goal:** Fix the gaps found by the 16 November 2026 business audit (EdTech, marketing, sales, finance and growth), in order of impact. The market is the UAE: AED, 5% VAT, Federal Tax Authority (FTA) rules. Saudi Arabia (ZATCA, mada, 15% VAT) is out of scope until expansion.

**Report:** https://claude.ai/artifact/2En5hZ4qephFAm1WzhCWmB (average 5.7/10).

**Rules for every change:**
- Follow the existing module pattern: service, repository port, routes, a pure policy file, and tests with in-memory fakes.
- Money stays in integer fils of AED. Prisma migrations are hand-written SQL.
- Web and mobile stay at parity unless a step says otherwise. Arabic and English copy for every new string.
- Each phase ships as its own PR with tests passing (`bun test`, `bun run typecheck`, `flutter analyze`, `flutter test`).

## Done

PR #7 (`fix/money-leaks`):
- [x] Apple's commission recorded as the payment fee (admin setting, default 15%).
- [x] Stripe dashboard refunds booked for live-class orders.
- [x] Chargebacks: admins alerted when opened; a lost one booked like a refund.
- [x] Uploaded lesson videos play inside the mobile app, with resume.

## Phase 1: Quick wins (two weeks)

Status: done. Items 1–4 in PR #8, items 5–8 in PR #9. Still open from this phase: notices older than this plan are English-only in-app and in push (emails are bilingual); certificate Open Graph images; a cookie consent banner before the ad pixels are switched on.

1. **Live class reminders.** A scheduler job every 5 minutes sends `SESSION_STARTING` 24 h, 1 h and 10 min before each live session to enrolled students (push, in-app, email for 24 h). Columns on `LiveSession` remember which reminders went out, so reruns send nothing new. `SESSION_MISSED` after a session ends tells absent students the recording link.
2. **Emails in the user's language.** `email-templates.ts` takes the recipient's locale and renders Arabic (RTL) or English. New users default to Arabic.
3. **SEO basics on the web.** `sitemap.ts` (courses, teachers, static pages), `robots.ts`, `metadataBase`, Arabic metadata when the locale is Arabic, JSON-LD (`Course` with `hasCourseInstance` and `AggregateRating`, `FAQPage`, `Person`, `Organization`) and Open Graph images.
4. **Checkout clean-up.**
   - Merge the "Card" and "Wallet" choices (both go to Stripe) into "Card / Apple Pay".
   - Remove the step bar that starts at "3 of 4".
   - Default plans to yearly, with a "best value" badge (web and mobile).
   - Read `?coupon=` from the link.
   - WhatsApp button on checkout and the bank transfer screen.
   - Show the refund guarantee ("full refund before the first class").
5. **Analytics and attribution.** GA4 and Meta, TikTok and Snap pixels, loaded only when their IDs are set in env. UTM, `gclid`, `fbclid` and the referrer are saved in a cookie and stored on the user at sign-up and on each order. Funnel events: `view_course`, `begin_checkout`, `purchase`, `subscribe`.
6. **Certificates that spread.** "Add to LinkedIn" and web share buttons, a `CERTIFICATE_ISSUED` notification, and an Open Graph image on the verify page.
7. **Abandoned checkout recovery.** One reminder an hour after a seat is held, and one 6 hours before the hold expires, by email and push, linking back to checkout.
8. **Apple VAT on the books.** App Store sales record that Apple collected the VAT, so admin reports stop showing it as the platform's liability.

## Phase 2: 30 days

Status: done in PR #10, with two changes from the plan:
- Coupons on subscriptions use Stripe promotion codes (made in the Stripe dashboard), not the admin coupons, so plan discounts stay out of our earnings logic. Bank transfer and App Store plans take no code yet.
- The payout CSV keeps full IBANs (the bank needs them); every download is in the audit log instead.

1. **Growth dashboard for admins.** MRR and ARR, monthly churn, retention by signup month, second purchase within 90 days, revenue and net margin by teacher, share of the top five teachers.
2. **FTA tax invoices.** Sequential invoice numbers, the platform TRN (a setting), the customer's TRN when given, and credit notes for refunds. A PDF on the receipt page. This sets up the UAE e-invoicing rollout from 2027.
3. **Coupons on subscriptions.** `couponCode` on subscribe, passed to Stripe as a discount, so seasonal campaigns (Ramadan, National Day, White Friday) work on plans.
4. **Win-back messages.** Inactivity nudge after 7 days without lesson progress, an offer 7 and 30 days after a plan ends (one-time coupon), and a welcome series after sign-up.
5. **Lesson completion tied to watching.** A lesson counts as complete once 80% of the video is watched (from `LessonVideoPosition`), or when the video ends. Blocks earning a certificate by clicking through.
6. **Payout controls.** An `AuditLog` table, `createdById` on payout runs, the creator can't approve their own run, a transfer reference per teacher payout, and IBANs masked in the CSV export.
7. **Session earnings true-up.** When a batch ends, add an adjustment so the teacher receives their full share of the batch's final net, including students who joined after the first sessions.

## Phase 3: 90 days

Status: done in PR #11. Notes:
- Payouts through a provider API were not built; bank transfers are matched from the bank's CSV statement instead.
- Google and Apple sign-in is web only; mobile needs Apple and Google console setup first (steps in the PR).
- Tabby is off until its keys are set and has not been tried against Tabby itself.

1. **Arabic SEO done properly.** Server-render course, teacher and landing pages; `/ar` and `/en` routes with `hreflang`; category pages.
2. **Referral program.** Codes for students and teachers; a reward for both sides after the first paid order; a teacher bonus (`Earning.kind = BONUS`) on students they bring.
3. **Sign in with Apple and Google** (better-auth social providers).
4. **Tabby instalments** for live classes (through Stripe if the UAE account supports it, otherwise direct).
5. **Less manual work.** Automatic matching of bank transfers by a required reference; payouts through a provider API instead of CSV.
6. **Lesson Q&A** for recorded courses, and teacher analytics (drop-off by lesson, inactive students).

## Phase 4: 180 days

Status: done in PR #11. Notes:
- The all-access plan is sold by card and bank transfer, not in the iPhone app (needs an App Store product), and has no mobile purchase screen.
- Streaming uses Bunny Stream and is off until its keys are set; offline copies are the low MP4 rendition.

1. **All-access subscription** for recorded courses, with teacher shares split by minutes watched.
2. **Companies and schools.** `Organization`, seat packs, invoices by bank transfer, completion reports per organization, manual enrolment by admins.
3. **Adaptive streaming (HLS) and offline downloads** on mobile.
4. **Investor metrics:** net revenue retention, LTV/CAC, payback, gross margin after platform fees and teacher shares, acquisition by channel.

# Azza — architecture & conventions

Live cohort courses: **Course → Batch (own schedule) → Session (one LiveKit room)**.
Roles: `STUDENT`, `TEACHER`, `ADMIN`. Languages: English + Arabic (RTL). Money: **AED only** in the backend.

```
apps/api      Bun + Hono + Prisma 7 (pg adapter) + better-auth + zod + Socket.IO + nodemailer + firebase-admin + LiveKit + Stripe
apps/web      Next.js (App Router) — student, teacher, admin areas
apps/mobile   Flutter — one app, a different navigation tree per role after login
packages/shared  zod request schemas, enums, money helpers, socket event names (used by api + web)
docs/         this file + API.md
```

Design source of truth: the "Live Courses Platform" design canvas (boards are `.dc.html` files under
`/private/tmp/claude-501/-Users-moteznsr-dev-projects-new-Azza-/c761e8f8-e143-4b88-bdd7-6c9359d70f28/scratchpad/canvas/project/`).
Theme tokens are in `Main.dc.html` and `Components.dc.html`.

## SOLID in this codebase

| Principle | How it shows up |
|---|---|
| **S**ingle responsibility | Each module = `*.repository.ts` (persistence) · `*.service.ts` (business rules) · `*.routes.ts` (HTTP only: validate → call service → JSON). Pure logic (e.g. `ScheduleGenerator`, `EarningsCalculator`, `PriceCalculator`) lives in its own class with no I/O. Email bodies (`email-templates.ts`) are separate from delivery (`Mailer`). |
| **O**pen/closed | Payment methods are strategies behind `CheckoutStrategy` (`StripeCheckout`, `BankTransferCheckout`); a new method is a new class registered in the container, not an `if` in the service. Notification channels (`EmailChannel`, `PushChannel`, `RealtimeChannel`) are composed by `NotificationService`. |
| **L**iskov | Every adapter is substitutable: `FakePaymentGateway`/`StripePaymentGateway`, `ConsoleMailer`/`NodemailerMailer`, `DisabledVideoProvider`/`LiveKitVideoProvider`, `LogPushNotifier`/`FirebasePushNotifier`. The app runs fully without any third-party key. |
| **I**nterface segregation | Small ports in `src/core/ports.ts` (`Mailer`, `PushNotifier`, `VideoProvider`, `PaymentGateway`, `RealtimeBroadcaster`, `Clock`). Services depend only on the ports they use. |
| **D**ependency inversion | Services receive repositories/ports via constructor. `src/container.ts` is the only file that `new`s concrete classes. Tests build services with fakes. |

API rules:
- Routes never touch Prisma. Services never touch Hono `Context`.
- Throw `AppError` subclasses (`NotFoundError`, `ForbiddenError`, `ConflictError`, `BusinessRuleError`); the error handler maps them to `{ error: { code, message, details } }`.
- Validate every input with schemas from `@azza/shared` via `validate('json' | 'query', schema)`.
- Money: integers in **fils** (`priceFils`, `amountFils`). Display currencies are computed, never stored as amounts (orders keep `displayCurrency` + `fxRate` snapshot only).
- Time: store UTC; batches carry an IANA `timezone`; use `src/core/time.ts`.
- Auth: better-auth at `/api/auth/*` (cookies for web, `Authorization: Bearer <token>` for mobile via the bearer plugin; the token comes back in the `set-auth-token` response header and in the sign-in body).
- Business constants come from config (`TEACHER_SHARE_PERCENT`, `EARNING_HOLD_DAYS`, `MIN_PAYOUT_AED`, `BANK_TRANSFER_HOLD_HOURS`, `VAT_PERCENT`).

Web rules (Next.js): feature folders, a typed `api` client in `lib/api`, server components for reads where possible, `@azza/shared` schemas for forms, theme tokens as CSS variables, `dir="rtl"` + Arabic fonts when locale is `ar`.

Mobile rules (Flutter): feature-first folders, Riverpod for state, `go_router` with a **role-based route tree** (`/student/*`, `/teacher/*`, `/admin/*`) chosen after login; repositories behind abstract classes; `dio` client with bearer token; `socket_io_client`; `livekit_client`; `firebase_messaging`; ARB localisation (en, ar).

## Running locally

```bash
bun install
cd apps/api && cp .env.example .env   # set DATABASE_URL, BETTER_AUTH_SECRET
bunx prisma migrate dev && bun run db:seed
bun run dev                           # http://localhost:4000
```

## File storage (S3 + CloudFront)

Uploads (payment receipts) go through the `FileStorage` port. With `S3_BUCKET` + `CLOUDFRONT_URL` set, `S3FileStorage` writes to S3 and returns CloudFront URLs; otherwise dev falls back to `LocalDiskStorage` (`apps/api/uploads/`). Production refuses to boot without S3.

AWS setup:

1. **S3 bucket** (e.g. `azza-uploads-prod` in `AWS_REGION`): keep *Block all public access* on; default encryption SSE-S3.
2. **CloudFront distribution** with the bucket as origin and **Origin Access Control** (sign requests). Viewer protocol: redirect to HTTPS; cache policy `CachingOptimized` (keys are immutable). Optionally add an alternate domain (e.g. `cdn.azza.ae`) with an ACM certificate from `us-east-1`.
3. **Bucket policy**: allow `s3:GetObject` on `arn:aws:s3:::<bucket>/*` to principal `cloudfront.amazonaws.com` with condition `AWS:SourceArn` = the distribution ARN (CloudFront's OAC screen generates it).
4. **API IAM permissions**: `s3:PutObject` and `s3:GetObject` on `arn:aws:s3:::<bucket>/*`. Use the task/instance role in AWS; locally use `AWS_PROFILE` or `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`.
5. Set `AWS_REGION`, `S3_BUCKET`, `CLOUDFRONT_URL` (the `https://dxxxx.cloudfront.net` or custom domain) in the API env.

Keys are 128-bit random (`receipts/<hex>.<ext>`), so CloudFront URLs are unguessable but not access-controlled; switch to CloudFront signed URLs if receipts must require auth.

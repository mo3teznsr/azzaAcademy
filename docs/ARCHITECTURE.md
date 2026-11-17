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

## Lesson video streaming (MediaConvert + CloudFront)

Uploaded lesson videos already live in the bucket (`course-videos/<hex>.mp4`). The `VideoTranscoder` port (`MediaConvertTranscoder`) submits an **AWS Elemental MediaConvert** job that reads the upload in place and writes, under `streams/<lessonId>/<nonce>/`:

- `hls/master.m3u8` + `master_<240|360|720|1080>p.m3u8` + `.ts` segments (H.264 QVBR, AAC, 6 s segments);
- `mp4/lesson_low.mp4` (360p, progressive) for data saver and offline downloads;
- `poster/lesson_poster.0000001.jpg` (frame at 5 s; `.0000000` for videos under 6 s).

The job id is the lesson's `streamAssetId`. Completion: EventBridge → SNS → `POST /api/webhooks/mediaconvert` (SNS signature + topic check, then `GetJob`), with the `sync-lesson-streams` polling job as the fallback. Web and mobile see the same `stream` object as before.

**Delivery: a playlist-rewrite endpoint, not signed cookies.** Every HLS segment must carry a CloudFront signature. Signed cookies would need the CDN under the API's cookie domain plus credentialed CORS in hls.js, and the mobile `video_player` cannot share browser cookies (it would have to send `Cookie` headers, which AVPlayer applies inconsistently to segment requests). A signed playlist URL alone fails too: players resolve segment URIs against the playlist URL and drop its query string. So `hlsUrl` is `<API_URL>/api/v1/lesson-streams/<token>/master.m3u8`: the API reads the playlist from S3 and makes every URI absolute — rendition playlists back through the same route, segments on CloudFront with one custom-policy signature (`Resource: <cdn>/streams/<lessonId>/<nonce>/hls/*`, `DateLessThan` = the token's expiry). Plain URLs, no headers or cookies: it works in hls.js, Safari/AVPlayer and ExoPlayer. Playlists are tiny (rewritten per request, cached privately 30 s) while segments stay on CloudFront. The token (HMAC, purpose `azza:lesson-streams:v1`, 6 h) is issued only with a lesson the viewer may read and is never accepted as a download link. Single files (poster, low MP4, original upload, download redirects) are canned-policy signed URLs.

AWS setup:

1. **MediaConvert role** (IAM → Roles, trusted entity `mediaconvert.amazonaws.com`): `s3:GetObject` on `arn:aws:s3:::<bucket>/course-videos/*`, `s3:PutObject` on `arn:aws:s3:::<bucket>/streams/*` (plus `kms:Decrypt`/`kms:GenerateDataKey` with SSE-KMS). Set `MEDIACONVERT_ROLE_ARN`.
2. **API permissions**: `mediaconvert:CreateJob`, `mediaconvert:GetJob`, `iam:PassRole` on that role, and `s3:GetObject` on `arn:aws:s3:::<bucket>/streams/*` (playlists). `MEDIACONVERT_REGION` if jobs run outside `AWS_REGION` (check MediaConvert is offered there); the SDK uses the regional endpoint, `MEDIACONVERT_ENDPOINT` overrides it. Optional `MEDIACONVERT_QUEUE_ARN`.
3. **Completion events**: SNS → standard topic (`azza-mediaconvert`) whose access policy lets `events.amazonaws.com` `sns:Publish`. EventBridge → rule on the default bus, pattern `{ "source": ["aws.mediaconvert"], "detail-type": ["MediaConvert Job State Change"], "detail": { "status": ["COMPLETE", "ERROR", "CANCELED"] } }`, target the topic. SNS → **HTTPS** subscription to `https://<api host>/api/webhooks/mediaconvert` (raw message delivery off); the API confirms it automatically. Set `MEDIACONVERT_SNS_TOPIC_ARN` (required in production; other topics are refused).
4. **CloudFront signing**: `openssl genrsa -out cf.pem 2048 && openssl rsa -pubout -in cf.pem -out cf.pub.pem`; CloudFront → Public keys → add `cf.pub.pem`; Key groups → create one with it. Set `CLOUDFRONT_KEY_PAIR_ID` (the public key id) and `CLOUDFRONT_PRIVATE_KEY_PATH` (or `CLOUDFRONT_PRIVATE_KEY`).
5. **Cache behaviour `streams/*`** (same S3 origin + OAC): HTTPS only, `CachingOptimized` (query strings out of the cache key), *Restrict viewer access* → **Trusted key groups** → the group above. Deploy the API with the signing key **before** restricting, or streams stop playing.
6. **CORS for hls.js** (segments are fetched by XHR from the web origin): a response headers policy on `streams/*` allowing origin `https://azza.academy` (plus staging), methods `GET, HEAD`, header `Range`, exposing `Content-Length, Content-Range`. Playlists come from the API, whose CORS already allows `TRUSTED_ORIGINS`.
7. **Original uploads**: with a signing key the API signs lesson `videoUrl`s and download redirects. `course-videos/*` also holds public course intro videos, so restrict that behaviour only once intro videos are signed too or lesson uploads move to their own folder; until then originals still rely on unguessable keys.

Existing videos: `POST /api/v1/admin/lessons-streaming/backfill` (or `VIDEO_TRANSCODE_BACKFILL=true`) submits jobs for lessons uploaded before streaming was set up.

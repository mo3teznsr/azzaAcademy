# Store release — App Store & Google Play

What the Azza mobile app (`apps/mobile`) needs before submission. ✅ = done in code, ⬜ = still to do (most of these need your accounts, a decision, or a production server).

## 1. Blockers

| | Item | Store | Notes |
|---|---|---|---|
| ✅ | **How courses are paid for in the app** (code) | Apple 3.1.1 | iOS sells seats only through In-App Purchase (consumables per price point). Android keeps Stripe + bank transfer. See §2. |
| ⬜ | In-App Purchase products + agreements in App Store Connect | Apple | §2 steps 1–5. Without the products the iOS app shows "Enrol on our website" (disabled) for every course. |
| ✅ | In-app account deletion | Both | Profile → Delete account (typed `DELETE` confirm) → `DELETE /api/v1/me`. Teachers/admins are sent to support. |
| ✅ | Public deletion URL | Play | `https://<web>/account/delete` — paste into Play Console → Data safety → Account deletion. |
| ✅ | Privacy policy + Terms | Both | `/privacy`, `/terms` on the web app, linked from sign-in and Profile → Legal. **Have a lawyer review the text.** |
| ✅ | Removed "Continue with Google / Apple" placeholder buttons | Apple 2.1 | They only showed "coming soon". If Google sign-in is ever added, Sign in with Apple becomes mandatory (4.8). |
| ✅ | "Contact support" no longer a placeholder | Apple 2.1 | Opens `mailto:support@azza.academy` (`AppConfig.supportEmail`). |
| ✅ | Real app icon (was the Flutter logo) | Both | Source: `apps/mobile/assets/brand/app-icon-1024.png`, Play 512px: `play-icon-512.png`. |
| ✅ | Android release signing | Play | Reads `android/key.properties` (template: `key.properties.example`). Without it the build falls back to debug keys, which Play rejects. |
| ✅ | Release build refuses a non-https API URL | Both | Prevents shipping a build pointed at `localhost`. |
| ⬜ | Production API + web deployed over HTTPS | Both | Reviewers must be able to sign in and use the app. |
| ✅ | Reviewer demo account (code) | Both | `appreview@azza.academy`, seeded by `bun run db:seed` (`seedAppReviewer` in `apps/api/prisma/seed.ts`): paid student in a private batch (Watercolour L1 · B90, three sessions a week for ~a year), past sessions with recordings in Library, a certificate (Product Design Foundations · B06). Any email in API env `DEMO_REVIEWER_EMAILS` can open the lobby and live room of every session in its batches **at any time, without a teacher**: when the session isn't really live it gets a private LiveKit room (no recording; the real session, its attendance and other students are untouched). See §1a. |
| ⬜ | Reviewer demo account (production) | Both | On the production API: set `DEMO_REVIEWER_EMAILS=appreview@azza.academy`, `DEMO_REVIEWER_PASSWORD=<strong, 12+ chars>` and `DEMO_RECORDING_URL=<a playable MP4 on CloudFront>`, run the seed's reviewer step, sign in once on a phone to check. Then fill in App Store Connect and Play Console → App access as in §1a. |

### 1a. App Review Information (App Store Connect → your version → App Review Information)

- **Sign-in required:** ✔
- **User name:** `appreview@azza.academy`
- **Password:** the value of `DEMO_REVIEWER_PASSWORD` on the production API.
- **Notes** (paste):

  > This is a student account with a paid enrolment, so every screen has content.
  > To try a live class at any time: Home or the Schedule tab → tap any upcoming session of "Watercolour L1 · B90" → the lobby shows "Live now" → tap the "Join as …" button. The class room opens immediately; no teacher needs to be online for this review account (you will be alone in the room).
  > Live video and audio need the Camera and Microphone permissions — tap Allow when iOS asks (or enable them in Settings → Azza). Without them you can still join, watch, chat and raise a hand.
  > Recordings: Library tab. Certificate: Me → Certificates (Product Design Foundations B06).

- **Contact information:** a phone and email that answer during review.

Google Play → App content → App access: same account, password and steps.

## 2. iOS In-App Purchase (decided)

Group live classes are one-to-many real-time services, so on iOS they must be sold with In-App Purchase (guideline 3.1.1 / 3.1.3(d)). Google Play keeps the existing Stripe card + bank-transfer flow unchanged.

**How it works**
- **Products are per price point, not per course**: one **Consumable** per whole-dirham list price (before VAT), id `com.futuretech.azza.seat.aed<AED>` — AED 880 → `com.futuretech.azza.seat.aed880`. Consumable (not non-consumable) so the same student can buy the same price point again for another batch. Rule lives in `packages/shared/src/apple-iap.ts` and is mirrored in `apps/mobile/lib/features/checkout/domain/apple_iap.dart`.
- iOS checkout shows only the App Store option, with StoreKit's localized price (no card, bank transfer, coupon, AED breakdown or "Google Pay"). Card and bank-transfer routes redirect to the order status screen on iOS, and its receipt-upload buttons are hidden.
- If a batch's price has no product (not created, not cleared for sale, or not a whole number of dirhams), the iOS app shows a disabled **"Enrol on our website"** state — no link, no price button (anti-steering).
- Flow: Enroll → `POST /checkout { method: APPLE_IAP }` (order + per-order `appAccountToken`) → StoreKit 2 purchase with that token → `POST /payments/apple/verify` with the signed transaction → the API verifies Apple's signature and marks the order PAID through the same path as a Stripe success → the app finishes the transaction only after that. Unfinished transactions are re-sent at the next sign-in/launch. Ask-to-Buy shows a pending state.
- Refunds: only Apple refunds IAP. App Store Server Notifications V2 `REFUND` / `REVOKE` → order + enrollment REFUNDED, teacher earning reversed, seat released. Admin refunds of APPLE_IAP orders are refused.
- Coupons don't apply on iOS (App Store prices are fixed). Apple's commission is not recorded as `feeFils`; `receivedFils` is Apple's AED price when the transaction reports one.

**Consumables to create now** (current seeded list prices):

| Product ID | List price | Price incl. 5% VAT (set the nearest App Store price point) |
|---|---|---|
| `com.futuretech.azza.seat.aed540` | AED 540 | AED 567 |
| `com.futuretech.azza.seat.aed650` | AED 650 | AED 682.50 |
| `com.futuretech.azza.seat.aed880` | AED 880 | AED 924 |
| `com.futuretech.azza.seat.aed1200` | AED 1,200 | AED 1,260 |

Any new course/batch price needs its product before iOS can sell it. With an App Store Connect API key (§2c) the API creates and prices these products for you; the table is then only a reference.

**App Store Connect setup**
1. **Agreements, Tax and Banking** → accept the **Paid Apps Agreement**, add bank account and tax forms (status must be *Active*, or StoreKit returns no products).
2. **App → Monetization → In-App Purchases → +** → type **Consumable**, Reference name e.g. "Seat AED 880", Product ID from the table, price (UAE storefront tax-inclusive, pick the point nearest the VAT-inclusive total), a localized display name/description (en + ar), a review screenshot of the checkout screen. Status must reach *Ready to Submit*; **attach the products to the app version** the first time you submit it.
3. **App Information → App Store Server Notifications** → Version 2 · Production URL `https://<api>/api/webhooks/apple` · Sandbox URL the same (or a staging API). Use "Request a test notification" to check (the API answers `handled: false, type: TEST`).
4. **Users and Access → Sandbox → Test Accounts** → create sandbox testers; on the phone sign in under Settings → App Store → Sandbox Account. TestFlight builds also buy in sandbox.
5. **API env** (`apps/api/.env`): `APPLE_BUNDLE_ID=com.futuretech.azza`, `APPLE_APP_APPLE_ID=<numeric Apple ID from App Information>`, `APPLE_IAP_ENVIRONMENT=Production,Sandbox` in production (App Review and TestFlight purchase in Sandbox against the production server; sandbox purchases can only be made by your testers and are stored with `appleEnvironment = Sandbox`). Local/staging: `APPLE_IAP_ENVIRONMENT=Sandbox`.
6. Xcode: the In-App Purchase capability is enabled by default on the App ID; nothing else to add. StoreKit purchases cannot run in the simulator against real products — test on a device with a sandbox tester.
7. Review notes: mention that the reviewer account is already enrolled and that a new enrolment is bought with In-App Purchase on any open batch.

## 2b. iOS auto-renewable subscriptions (recorded courses)

Recorded courses are sold on iOS with **auto-renewable subscriptions**, one **subscription group per course** with a monthly and a yearly product, so a learner holds at most one plan per course and Apple handles upgrades, downgrades and cancellation.

**Per recorded course** (after the course has a slug and prices; product ids come from `appleRecordedProductId`):
1. **App → Monetization → Subscriptions → Create Subscription Group**, reference name e.g. `Logo design` (the name learners see in their App Store subscriptions; localise it en/ar).
2. In the group add two subscriptions: **Monthly** (duration *1 Month*, Product ID `com.futuretech.azza.rec.<courseSlug>.monthly`) and **Yearly** (*1 Year*, `com.futuretech.azza.rec.<courseSlug>.yearly`). Put Yearly at the higher level (level 1) and Monthly at level 2 so moving to yearly is an upgrade (immediate) and back is a downgrade (next renewal).
3. Set the UAE price of each to the App Store price point nearest the **VAT-inclusive** price (course price x 1.05); add the localised display name and description (en, ar) and a review screenshot.
4. In the admin, set the course's Apple products (`PUT /admin/courses/:id/apple-products`, or the course screen) so iOS offers the plan. A plan without its product shows "not available in the app yet" (anti-steering: no link to the website).
5. Submit the subscriptions with the next app version for review; the first ones must ship with a build.

**Billing Grace Period (once, App Store Connect → App → Monetization → Subscriptions → Billing Grace Period):** turn it **on** for **all** subscriptions, duration **16 days**, for *All renewals*. It matches the API's access grace (`GRACE_DAYS` = 16): while Apple retries a failed renewal, the learner keeps access until `currentPeriodEnd + 16 days` (`DID_FAIL_TO_RENEW` with the grace subtype marks the plan PAST_DUE); if Apple gives up, `GRACE_PERIOD_EXPIRED` / `EXPIRED` ends it and the learner is told ("Your plan has ended. Your progress is saved.").

**Server notifications:** the existing V2 URL (§2, step 3) also carries `SUBSCRIBED`, `DID_RENEW`, `DID_FAIL_TO_RENEW`, `DID_CHANGE_RENEWAL_STATUS`, `DID_CHANGE_RENEWAL_PREF`, `EXPIRED`, `REFUND` and `REVOKE`; nothing more to configure. Test with sandbox testers (sandbox renewals run every few minutes).

**Reminders:** Apple sends its own renewal notices; the API additionally reminds yearly subscribers 7 days before `currentPeriodEnd`. Monthly plans get none. Cancelling is done in Settings → Apple ID → Subscriptions (the app links there; 422 `MANAGED_BY_APPLE` for API cancels).

## 2c. Automatic App Store product setup (App Store Connect API)

The API can create and price the Apple products itself: one consumable per open batch price (§2) and one subscription group with a monthly and a yearly product per published recorded course (§2b). It names them in English and Arabic and sets the UAE price to the App Store price point nearest the VAT-inclusive price. It never deletes anything, and a price change only replaces the price. Existing subscribers keep the price they have.

**Create the key (once)**
1. App Store Connect → **Users and Access → Integrations → App Store Connect API → Team Keys → +**.
2. Name it (e.g. "Azza API"), access **App Manager**, then **Generate**.
3. Copy the **Issuer ID** (top of the page) and the **Key ID**, and download the `.p8` file. Apple lets you download it **once**. Keep it outside the repo (a secrets manager, or a file on the server such as `/etc/azza/AuthKey_XXXXXXXXXX.p8`) and never commit it.

**Configure** (`apps/api/.env`; see `.env.example`)
```
APPLE_APP_APPLE_ID=<numeric Apple ID, already set in §2>
ASC_ISSUER_ID=<Issuer ID>
ASC_KEY_ID=<Key ID>
ASC_PRIVATE_KEY_PATH=/etc/azza/AuthKey_XXXXXXXXXX.p8
# or, instead of the path, the key inline with literal \n for newlines: ASC_PRIVATE_KEY=
```
If any of these is missing or the file can't be read, the sync is off: the API still boots, and Admin → App Store shows "Add your App Store Connect API key to enable automatic product setup."

**When it runs**
- A recorded course's prices are saved, or a batch is created or its price changes: that course or price is synced in the background (the admin request never waits and never fails because of Apple).
- Every night at about 03:00 UAE (never at API start, so a restart does not hit Apple): every open batch price and every published recorded course, one after the other to respect Apple's rate limits.
- **Sync now** in the admin (`POST /admin/app-store/sync`) runs the same thing on demand. The result per price and per course is in `GET /admin/app-store/status` (SYNCED, SKIPPED or FAILED, with the reason). A price that is not a whole number of dirhams is SKIPPED, because there is no product for it.

**Still manual (the API cannot do these)**
- Accept the **Paid Apps Agreement** and add bank and tax details (§2, step 1).
- **App Review**: attach the new products to the app version and submit; the first subscriptions must ship with a build.
- A **review screenshot** for each product, and each subscription group's localisation if App Store Connect asks for it.
- **Availability / territories** and the Billing Grace Period (§2b).
New products appear as *Missing Metadata* until the screenshot is added.

**Smoke check before trusting it** (`apps/api/scripts/appstore-smoke.ts`; not part of the tests). With the key in place:
```
cd apps/api
bun scripts/appstore-smoke.ts --price-aed 450          # read-only: app, in-app purchases, subscription groups, UAE price points
bun scripts/appstore-smoke.ts --price-aed 450 --apply  # really creates and prices that one seat product
```
Without `--apply` it creates nothing and prints what a sync would do. Run it first and confirm that every step prints `ok`; a `FAIL` line shows the exact Apple error for the request shape that needs adjusting.

## 3. Platform config

| | Item |
|---|---|
| ✅ | Android: cleartext HTTP only in debug builds (`src/debug/AndroidManifest.xml`). |
| ✅ | Android: removed unused READ/WRITE_CALENDAR permissions (add_2_calendar uses an Intent). |
| ✅ | iOS: removed `voip` background mode (no CallKit/PushKit — Apple 2.5.4). Kept `audio` for live sessions. |
| ✅ | iOS: permission strings rewritten (no "development server" wording). |
| ✅ | iOS: `Runner.entitlements` with `aps-environment` for push. Enable **Push Notifications** on the App ID in the Apple Developer portal. |
| ✅ | Firebase: `ios/Runner/GoogleService-Info.plist` and `android/app/google-services.json` are present. |
| ⬜ | Firebase: upload the APNs auth key (Project settings → Cloud Messaging) or iOS push won't deliver. |
| ✅ | Bundle / application ID is `com.futuretech.azza` (iOS `PRODUCT_BUNDLE_IDENTIFIER` and Android `applicationId`); it cannot change after the first upload. |
| ⬜ | iPad: the app declares iPhone + iPad (`TARGETED_DEVICE_FAMILY = 1,2`), so App Store needs iPad screenshots and iPad layouts get reviewed. Set to iPhone-only if iPad isn't a target. |
| ⬜ | Launch screen is plain white; consider the ink background to match the icon. |

## 4. Store listings

**App Store Connect**
- ⬜ App name, subtitle, description, keywords — EN + AR.
- ⬜ Screenshots: 6.9" iPhone (1320×2868), plus 13" iPad if iPad stays.
- ⬜ Privacy "nutrition label": Contact info (name, email), User content (audio/video in live sessions, uploaded receipts), Identifiers (user ID, device push token), Purchases (order history). Linked to identity, not used for tracking.
- ⬜ Age rating questionnaire, category Education, support URL, privacy URL.
- ✅ Export compliance: only standard HTTPS/WebRTC encryption → `ITSAppUsesNonExemptEncryption = NO` is set in Info.plist.

**Google Play Console**
- ⬜ Upload key (§1), enrol in Play App Signing.
- ⬜ Store listing: short + full description (EN/AR), 512px icon, 1024×500 feature graphic, phone screenshots.
- ⬜ Data safety form (same data as the Apple label; data encrypted in transit; deletion available).
- ⬜ Content rating, target audience (not children), app access (reviewer account), ads: none.
- ⬜ New personal developer accounts must run a closed test with 12+ testers for 14 days before production.

## 5. Build commands

```bash
cd apps/mobile
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://api.azza.academy \
  --dart-define=WEB_URL=https://azza.academy \
  --dart-define=STRIPE_PUBLISHABLE_KEY=pk_live_...
flutter build ipa --release \
  --dart-define=API_BASE_URL=https://api.azza.academy \
  --dart-define=WEB_URL=https://azza.academy
```

`pubspec.yaml` is at `version: 4.0.0+1`. Bump the build number (`4.0.0+1` → `4.0.0+2` → …) for every upload — App Store Connect and Play reject a build number they've already seen; change `4.0.0` only for a new public version.

# Azza mobile (Flutter)

One iOS + Android app. After sign-in the router mounts a **different navigation tree per role**:

| Role | Tree | Tabs |
|---|---|---|
| STUDENT | `/student/*` (ink + sky) | Home · Explore · Schedule · Library · Me |
| TEACHER | `/teacher/*` (ink + sun) | Today · Batches · Calendar · Earnings · Me |
| ADMIN | `/admin/*` (cream + ink) | Overview · Live · Batches · Approvals · Me |

Shared routes (any role): course detail, batch picker, batch schedule, checkout, card payment, bank transfer,
order status, enrolled, my orders, lobby, live room, after-session, session prep, reschedule request,
attendance summary, roster, assignments, notifications, language & region.

## Run

```bash
flutter pub get            # also generates lib/l10n/app_localizations*.dart
flutter run \
  --dart-define=API_BASE_URL=http://localhost:4000 \      # Android emulator: http://10.0.2.2:4000
  --dart-define=STRIPE_PUBLISHABLE_KEY=pk_test_xxx \      # optional — card option hidden without it
  --dart-define=STRIPE_MERCHANT_ID=merchant.com.azza      # optional — enables Apple Pay in the sheet
flutter analyze && flutter test
```

## Structure

```
lib/
  core/        config (dart-define), domain/enums (mirror of packages/shared enums.ts),
               network (Dio + AuthInterceptor → AppException), realtime (Socket.IO port + events),
               money (fils, display currencies), prefs (locale/RTL, numerals, currency, onboarding),
               push (FCM, guarded), theme (tokens, ink/cream ThemeData, fonts), widgets (states, chips, signal)
  features/<feature>/{data, domain, presentation}
               auth · catalog · home · checkout · me · learn · live · teacher · admin
  router/      routes, pure `computeRedirect`, role shells, GoRouter provider
  l10n/        app_en.arb, app_ar.arb (RTL)
```

Every repository is an abstract class provided through Riverpod (`*RepositoryProvider`); tests override them with fakes.
SDKs sit behind ports too: `VideoRoomService` (LiveKit), `RealtimeClient` (Socket.IO), `PaymentSheetGateway` (Stripe),
`ReceiptPicker` (file_picker), `PushService` (FCM). Models are hand-written immutable classes with tolerant `fromJson`.

## Push notifications (Firebase) — optional

The app starts without Firebase files (push is simply disabled). To enable:

1. `dart pub global activate flutterfire_cli && flutterfire configure --project <firebase-project>`
   (or download the files manually).
2. Android: put `google-services.json` in `android/app/` and add the Google services Gradle plugin
   (`id("com.google.gms.google-services")`) to `android/settings.gradle.kts` + `android/app/build.gradle.kts`.
3. iOS: add `GoogleService-Info.plist` to `ios/Runner` (Xcode → Runner target), enable the *Push Notifications*
   capability and upload an APNs key in the Firebase console.
4. After sign-in the token is registered with `POST /api/v1/me/devices` and removed on sign-out.

## Stripe

Payment Sheet (card, Apple Pay, Google Pay; charged in **AED**). `MainActivity` is a `FlutterFragmentActivity`
and the Android theme is MaterialComponents as required by `flutter_stripe`. iOS deployment target is 15.0.

## API integration notes

The data layer is checked against JSON captured from the live API (`test/fixtures/*.json`,
`test/data/api_fixtures_test.dart` drives every `Dio*Repository` through a fixture adapter). Re-capture
those files when an endpoint changes shape.

- Receipt upload: `POST /api/v1/orders/:id/receipt/file` (multipart `file`).
- Bank transfer: the order (`GET /orders/:id`, checkout response) carries the full receiving IBAN;
  `GET /bank-accounts` stays masked.
- Attendance corrections: `PATCH /api/v1/sessions/:id/attendance` (`{ items: [{ userId, mark }] }`).
- Reschedule requests: `GET /api/v1/reschedule-requests` (teacher: own, admin: all) +
  `POST …/:id/approve|decline` (admin).
- Dashboard alerts are aggregated counts `{ type, severity, count }`; live people come from `/admin/live-rooms`.
- `GET /batches` items have no `sessions[]` (progress is shown on the batch detail only).
- Still missing: course `outcomes[]` (derived from the description), `waitlistCount`, publish-recording,
  message-batch / promote-waitlist, social sign-in (Google/Apple), recording watch progress.

## iOS build notes (Xcode 26.0.x)

- Swift Package Manager is disabled in `pubspec.yaml` (`flutter: config: enable-swift-package-manager: false`):
  SwiftPM rejects the firebase-ios-sdk manifest, so plugins build through CocoaPods.
- `ios/Shims/DeviceInfoVisionShim.h` (force-included into the `device_info_plus` pod by the Podfile) declares
  `-[NSProcessInfo isiOSAppOnVision]`, which the 26.0 SDK lacks. Remove both once Xcode ≥ 26.1.
- Run with `--dart-define=API_URL=http://localhost:4000` (`API_BASE_URL` also works).

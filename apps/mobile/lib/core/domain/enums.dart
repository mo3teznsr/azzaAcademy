// Dart mirror of packages/shared/src/enums.ts. `wire` is the exact API value.
// Keep in sync with the TypeScript source of truth.

T _parse<T extends WireEnum>(List<T> values, Object? raw, T fallback) {
  final s = raw?.toString();
  for (final v in values) {
    if (v.wire == s) return v;
  }
  return fallback;
}

abstract interface class WireEnum {
  String get wire;
}

enum Role implements WireEnum {
  student('STUDENT'),
  teacher('TEACHER'),
  admin('ADMIN');

  const Role(this.wire);
  @override
  final String wire;
  static Role parse(Object? raw) => _parse(values, raw, Role.student);

  /// Root of this role's navigation tree.
  String get home => '/$name';
}

enum AppLocale implements WireEnum {
  en('en'),
  ar('ar');

  const AppLocale(this.wire);
  @override
  final String wire;
  static AppLocale parse(Object? raw) => _parse(values, raw, AppLocale.en);
  bool get isRtl => this == AppLocale.ar;
}

enum SessionLanguage implements WireEnum {
  ar('AR'),
  en('EN');

  const SessionLanguage(this.wire);
  @override
  final String wire;
  static SessionLanguage parse(Object? raw) => _parse(values, raw, SessionLanguage.en);
}

enum CourseStatus implements WireEnum {
  draft('DRAFT'),
  pendingReview('PENDING_REVIEW'),
  published('PUBLISHED'),
  archived('ARCHIVED');

  const CourseStatus(this.wire);
  @override
  final String wire;
  static CourseStatus parse(Object? raw) => _parse(values, raw, CourseStatus.published);

  /// The proposing teacher may still change the course (the API answers `COURSE_LOCKED` otherwise).
  bool get teacherEditable => this == CourseStatus.draft || this == CourseStatus.pendingReview;
}

/// Fixed when the course is created: LIVE = batches of live sessions, RECORDED = lessons on a monthly or yearly plan.
enum CourseType implements WireEnum {
  live('LIVE'),
  recorded('RECORDED');

  const CourseType(this.wire);
  @override
  final String wire;
  static CourseType parse(Object? raw) => _parse(values, raw, CourseType.live);
}

/// A recorded course's two plans (`SUBSCRIPTION_PLANS` in packages/shared).
enum SubscriptionPlan implements WireEnum {
  monthly('MONTHLY'),
  yearly('YEARLY');

  const SubscriptionPlan(this.wire);
  @override
  final String wire;
  static SubscriptionPlan parse(Object? raw) => _parse(values, raw, SubscriptionPlan.monthly);
}

enum CourseLevel implements WireEnum {
  beginner('BEGINNER'),
  intermediate('INTERMEDIATE'),
  advanced('ADVANCED');

  const CourseLevel(this.wire);
  @override
  final String wire;
  static CourseLevel parse(Object? raw) => _parse(values, raw, CourseLevel.beginner);
  int get number => index + 1;
}

enum BatchStatus implements WireEnum {
  draft('DRAFT'),
  pendingReview('PENDING_REVIEW'),
  enrolling('ENROLLING'),
  full('FULL'),
  running('RUNNING'),
  completed('COMPLETED'),
  cancelled('CANCELLED');

  const BatchStatus(this.wire);
  @override
  final String wire;
  static BatchStatus parse(Object? raw) => _parse(values, raw, BatchStatus.enrolling);
  bool get canEnroll => this == BatchStatus.enrolling || this == BatchStatus.running;

  /// Still a teacher's proposal: not yet approved by an admin.
  bool get isProposal => this == BatchStatus.draft || this == BatchStatus.pendingReview;
}

enum SessionStatus implements WireEnum {
  scheduled('SCHEDULED'),
  live('LIVE'),
  ended('ENDED'),
  cancelled('CANCELLED');

  const SessionStatus(this.wire);
  @override
  final String wire;
  static SessionStatus parse(Object? raw) => _parse(values, raw, SessionStatus.scheduled);
}

enum EnrollmentStatus implements WireEnum {
  pendingPayment('PENDING_PAYMENT'),
  awaitingTransfer('AWAITING_TRANSFER'),
  verifying('VERIFYING'),
  active('ACTIVE'),
  waitlisted('WAITLISTED'),
  cancelled('CANCELLED'),
  refunded('REFUNDED'),
  expired('EXPIRED');

  const EnrollmentStatus(this.wire);
  @override
  final String wire;
  static EnrollmentStatus parse(Object? raw) => _parse(values, raw, EnrollmentStatus.active);
}

enum PaymentMethod implements WireEnum {
  stripe('STRIPE'),
  bankTransfer('BANK_TRANSFER'),

  /// iOS only: Apple In-App Purchase (App Store guideline 3.1.1).
  appleIap('APPLE_IAP');

  const PaymentMethod(this.wire);
  @override
  final String wire;
  static PaymentMethod parse(Object? raw) => _parse(values, raw, PaymentMethod.stripe);
}

enum OrderStatus implements WireEnum {
  awaitingPayment('AWAITING_PAYMENT'),
  awaitingReceipt('AWAITING_RECEIPT'),
  verifying('VERIFYING'),
  amountMismatch('AMOUNT_MISMATCH'),
  paid('PAID'),
  failed('FAILED'),
  rejected('REJECTED'),
  expired('EXPIRED'),
  refunded('REFUNDED');

  const OrderStatus(this.wire);
  @override
  final String wire;
  static OrderStatus parse(Object? raw) => _parse(values, raw, OrderStatus.awaitingPayment);

  bool get isProblem =>
      this == OrderStatus.amountMismatch || this == OrderStatus.rejected || this == OrderStatus.failed;
  bool get isFinal => this == OrderStatus.paid || this == OrderStatus.expired || this == OrderStatus.refunded;
}

/// Money only moves in AED; every other currency is display-only and comes from `GET /currencies`
/// (an uppercase ISO 4217 code). There is no hard-coded list: see `FxRates`.
extension type const DisplayCurrency(String wire) {
  static const aed = DisplayCurrency('AED');

  /// Unknown or malformed codes become AED.
  static DisplayCurrency parse(Object? raw) {
    final code = '$raw'.trim().toUpperCase();
    return RegExp(r'^[A-Z]{3}$').hasMatch(code) ? DisplayCurrency(code) : aed;
  }

  bool get isBase => wire == 'AED';
}

enum EarningStatus implements WireEnum {
  pending('PENDING'),
  available('AVAILABLE'),
  paid('PAID'),
  reversed('REVERSED');

  const EarningStatus(this.wire);
  @override
  final String wire;
  static EarningStatus parse(Object? raw) => _parse(values, raw, EarningStatus.pending);
}

enum PayoutRunStatus implements WireEnum {
  draft('DRAFT'),
  approved('APPROVED'),
  processing('PROCESSING'),
  paid('PAID');

  const PayoutRunStatus(this.wire);
  @override
  final String wire;
  static PayoutRunStatus parse(Object? raw) => _parse(values, raw, PayoutRunStatus.draft);
}

enum PayoutStatus implements WireEnum {
  ready('READY'),
  held('HELD'),
  paid('PAID'),
  carriedOver('CARRIED_OVER');

  const PayoutStatus(this.wire);
  @override
  final String wire;
  static PayoutStatus parse(Object? raw) => _parse(values, raw, PayoutStatus.ready);
}

enum DevicePlatform implements WireEnum {
  ios('ios'),
  android('android'),
  web('web');

  const DevicePlatform(this.wire);
  @override
  final String wire;
}

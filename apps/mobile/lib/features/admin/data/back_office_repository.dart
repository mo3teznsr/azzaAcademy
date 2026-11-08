import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/money/money.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/utils/json.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../checkout/domain/checkout_models.dart';
import '../../subscriptions/domain/subscription_models.dart' show SubscriptionProvider, SubscriptionStatus;
import '../../teacher/domain/proposal_models.dart' show SchedulePreview, isoDay;
import 'admin_repository.dart' show PayoutRun;

// ───────────────────────────── Models ─────────────────────────────

/// `GET /admin/orders` item (and `GET /orders/:id`): the order plus what the list carries beyond [Order].
@immutable
class AdminOrder {
  const AdminOrder({required this.order, this.refundedFils = 0, this.feeFils = 0, this.couponCode, this.email, this.verifiedBy, this.verifiedAt, this.updatedAt});
  factory AdminOrder.fromJson(Json j) => AdminOrder(
        order: Order.fromJson(j),
        refundedFils: integer(j, 'refundedFils'),
        feeFils: integer(j, 'feeFils'),
        couponCode: strOrNull(j, 'couponCode'),
        email: strOrNull(obj(j, 'user'), 'email'),
        verifiedBy: strOrNull(obj(j, 'verifiedBy'), 'name'),
        verifiedAt: date(j, 'verifiedAt'),
        updatedAt: date(j, 'updatedAt'),
      );

  final Order order;
  final int refundedFils;
  final int feeFils;
  final String? couponCode;
  final String? email;
  final String? verifiedBy;
  final DateTime? verifiedAt;
  final DateTime? updatedAt;

  String get id => order.id;

  /// What can still go back to the student.
  int get refundableFils => (order.totalFils - refundedFils).clamp(0, order.totalFils);

  /// Paid, not an App Store purchase (Apple refunds those), and money left to refund.
  bool get canRefund => order.status == OrderStatus.paid && order.method != PaymentMethod.appleIap && refundableFils > 0;
}

/// `POST /admin/orders/:id/refund` → `{ order, refundFils, manual }`.
@immutable
class RefundResult {
  const RefundResult({required this.refundFils, required this.manual});
  final int refundFils;

  /// Bank transfers: finance pays the money back by hand.
  final bool manual;
}

/// `GET /admin/users` item.
@immutable
class AdminUser {
  const AdminUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.image,
    this.headline,
    this.bio,
    this.banned = false,
    this.emailVerified = false,
    this.createdAt,
    this.activeEnrollments,
    this.teaching,
  });
  factory AdminUser.fromJson(Json j) {
    final count = obj(j, '_count');
    return AdminUser(
      id: str(j, 'id'),
      name: str(j, 'name'),
      email: str(j, 'email'),
      role: Role.parse(j['role']),
      image: strOrNull(j, 'image'),
      headline: strOrNull(j, 'headline'),
      bio: strOrNull(j, 'bio'),
      banned: boolean(j, 'banned'),
      emailVerified: boolean(j, 'emailVerified'),
      createdAt: date(j, 'createdAt'),
      activeEnrollments: intOrNull(count, 'enrollments'),
      teaching: intOrNull(count, 'teaching'),
    );
  }

  final String id;
  final String name;
  final String email;
  final Role role;
  final String? image;
  final String? headline;
  final String? bio;
  final bool banned;
  final bool emailVerified;
  final DateTime? createdAt;
  final int? activeEnrollments;
  final int? teaching;
}

/// Coupon status derived by the API.
enum CouponState implements WireEnum {
  active('ACTIVE'),
  scheduled('SCHEDULED'),
  expired('EXPIRED'),
  paused('PAUSED'),
  exhausted('EXHAUSTED');

  const CouponState(this.wire);
  @override
  final String wire;
  static CouponState parse(Object? raw) => values.firstWhere((v) => v.wire == '$raw', orElse: () => CouponState.active);
}

/// `GET /admin/coupons` item.
@immutable
class Coupon {
  const Coupon({
    required this.id,
    required this.code,
    this.percentOff,
    this.amountOffFils,
    this.maxRedemptions,
    this.redemptions = 0,
    this.perUserLimit,
    this.minOrderFils,
    this.startsOn,
    this.expiresOn,
    this.courseId,
    this.courseTitle,
    this.batchId,
    this.batchCode,
    this.stackable = false,
    this.active = true,
    this.state = CouponState.active,
  });
  factory Coupon.fromJson(Json j) => Coupon(
        id: str(j, 'id'),
        code: str(j, 'code'),
        percentOff: intOrNull(j, 'percentOff'),
        amountOffFils: intOrNull(j, 'amountOffFils'),
        maxRedemptions: intOrNull(j, 'maxRedemptions'),
        redemptions: integer(j, 'redemptions'),
        perUserLimit: intOrNull(j, 'perUserLimit'),
        minOrderFils: intOrNull(j, 'minOrderFils'),
        startsOn: date(j, 'startsOn'),
        expiresOn: date(j, 'expiresOn'),
        courseId: strOrNull(j, 'courseId'),
        courseTitle: strOrNull(obj(j, 'course'), 'titleEn'),
        batchId: strOrNull(j, 'batchId'),
        batchCode: strOrNull(obj(j, 'batch'), 'code'),
        stackable: boolean(j, 'stackable'),
        active: boolean(j, 'active', true),
        state: CouponState.parse(j['status']),
      );

  final String id;
  final String code;
  final int? percentOff;
  final int? amountOffFils;
  final int? maxRedemptions;
  final int redemptions;
  final int? perUserLimit;
  final int? minOrderFils;
  final DateTime? startsOn;
  final DateTime? expiresOn;
  final String? courseId;
  final String? courseTitle;
  final String? batchId;
  final String? batchCode;
  final bool stackable;
  final bool active;
  final CouponState state;
}

/// Body of `POST /admin/coupons` / `PATCH /admin/coupons/:id`.
@immutable
class CouponDraft {
  const CouponDraft({
    required this.code,
    this.percentOff,
    this.amountOffAed,
    this.maxRedemptions,
    this.perUserLimit,
    this.minOrderAed,
    this.startsOn,
    this.expiresOn,
    this.courseId,
    this.active = true,
  });
  final String code;
  final int? percentOff;
  final num? amountOffAed;
  final int? maxRedemptions;
  final int? perUserLimit;
  final num? minOrderAed;
  final DateTime? startsOn;
  final DateTime? expiresOn;

  /// Scope: one course, or null for every course.
  final String? courseId;
  final bool active;

  static final codePattern = RegExp(r'^[A-Z0-9-]{3,20}$');

  Map<String, dynamic> toCreateJson() => {
        'code': code,
        'percentOff': ?percentOff,
        'amountOffAed': ?amountOffAed,
        'maxRedemptions': ?maxRedemptions,
        'perUserLimit': ?perUserLimit,
        'minOrderAed': ?minOrderAed,
        if (startsOn != null) 'startsOn': isoDay(startsOn!),
        if (expiresOn != null) 'expiresOn': isoDay(expiresOn!),
        'courseId': ?courseId,
        'active': active,
      };

  /// PATCH: the code is immutable; `null` clears a rule.
  Map<String, dynamic> toUpdateJson() => {
        'percentOff': percentOff,
        'amountOffAed': amountOffAed,
        'maxRedemptions': maxRedemptions,
        'perUserLimit': perUserLimit,
        'minOrderAed': minOrderAed,
        'startsOn': startsOn == null ? null : isoDay(startsOn!),
        'expiresOn': expiresOn == null ? null : isoDay(expiresOn!),
        'courseId': courseId,
        'active': active,
      };
}

/// `GET /admin/coupons/:id/usage`.
@immutable
class CouponUsage {
  const CouponUsage({this.code = '', this.redemptions = 0, this.maxRedemptions, this.totalDiscountFils = 0, this.items = const []});
  factory CouponUsage.fromJson(Json j) {
    final c = obj(j, 'coupon');
    return CouponUsage(
      code: str(c, 'code'),
      redemptions: integer(c, 'redemptions'),
      maxRedemptions: intOrNull(c, 'maxRedemptions'),
      totalDiscountFils: integer(j, 'totalDiscountFils'),
      items: list(j, 'items').map(CouponRedemption.fromJson).toList(),
    );
  }
  final String code;
  final int redemptions;
  final int? maxRedemptions;
  final int totalDiscountFils;
  final List<CouponRedemption> items;
}

@immutable
class CouponRedemption {
  const CouponRedemption({required this.id, required this.studentName, this.studentEmail, this.reference = '', this.discountFils = 0, this.totalFils = 0, this.batchCode, this.createdAt});
  factory CouponRedemption.fromJson(Json j) => CouponRedemption(
        id: str(j, 'id'),
        studentName: str(obj(j, 'student'), 'name'),
        studentEmail: strOrNull(obj(j, 'student'), 'email'),
        reference: str(obj(j, 'order'), 'reference'),
        discountFils: integer(j, 'discountFils'),
        totalFils: integer(obj(j, 'order'), 'totalFils'),
        batchCode: strOrNull(obj(j, 'batch'), 'code'),
        createdAt: date(j, 'createdAt'),
      );
  final String id;
  final String studentName;
  final String? studentEmail;
  final String reference;
  final int discountFils;
  final int totalFils;
  final String? batchCode;
  final DateTime? createdAt;
}

/// `GET /categories?all=true` item (admin: includes hidden ones).
@immutable
class AdminCategory {
  const AdminCategory({required this.slug, required this.nameEn, this.nameAr, this.icon, this.order = 0, this.active = true, this.courseCount = 0});
  factory AdminCategory.fromJson(Json j) => AdminCategory(
        slug: str(j, 'slug'),
        nameEn: str(j, 'nameEn', str(j, 'slug')),
        nameAr: strOrNull(j, 'nameAr'),
        icon: strOrNull(j, 'icon'),
        order: integer(j, 'order'),
        active: boolean(j, 'active', true),
        courseCount: integer(j, 'courseCount'),
      );
  final String slug;
  final String nameEn;
  final String? nameAr;
  final String? icon;
  final int order;
  final bool active;
  final int courseCount;
}

/// `GET /admin/bank-accounts` item (full IBAN for admins).
@immutable
class AdminBankAccount {
  const AdminBankAccount({required this.account, this.active = true, this.sortOrder = 0});
  factory AdminBankAccount.fromJson(Json j) =>
      AdminBankAccount(account: BankAccount.fromJson(j), active: boolean(j, 'active', true), sortOrder: integer(j, 'sortOrder'));
  final BankAccount account;
  final bool active;
  final int sortOrder;
  String get id => account.id;
}

/// One row of `GET /batches/:id/enrollments`.
@immutable
class EnrollmentRow {
  const EnrollmentRow({required this.id, required this.status, required this.student, this.email, this.createdAt, this.orders = const []});
  factory EnrollmentRow.fromJson(Json j) => EnrollmentRow(
        id: str(j, 'id'),
        status: EnrollmentStatus.parse(j['status']),
        student: PersonRef.fromJson(obj(j, 'user')),
        email: strOrNull(obj(j, 'user'), 'email'),
        createdAt: date(j, 'createdAt'),
        orders: list(j, 'orders').map(Order.fromJson).toList(),
      );
  final String id;
  final EnrollmentStatus status;
  final PersonRef student;
  final String? email;
  final DateTime? createdAt;
  final List<Order> orders;
}

/// `GET /admin/reports` → `kpis` / `previous`.
@immutable
class ReportKpis {
  const ReportKpis({this.revenueFils = 0, this.newEnrollments = 0, this.fillRate = 0, this.attendanceRate = 0, this.completionRate = 0, this.refundsFils = 0});
  factory ReportKpis.fromJson(Json j) => ReportKpis(
        revenueFils: integer(j, 'revenueFils'),
        newEnrollments: integer(j, 'newEnrollments'),
        fillRate: dbl(j, 'fillRate'),
        attendanceRate: dbl(j, 'attendanceRate'),
        completionRate: dbl(j, 'completionRate'),
        refundsFils: integer(j, 'refundsFils'),
      );
  final int revenueFils;
  final int newEnrollments;
  final double fillRate;
  final double attendanceRate;
  final double completionRate;
  final int refundsFils;
}

/// `GET /admin/reports` → `recorded`: recorded-plan revenue on its own line (net = gross − refunds − fees − VAT).
@immutable
class RecordedRevenue {
  const RecordedRevenue({this.grossFils = 0, this.refundsFils = 0, this.feesFils = 0, this.vatFils = 0, this.netFils = 0});
  factory RecordedRevenue.fromJson(Json j) => RecordedRevenue(
        grossFils: integer(j, 'grossFils'),
        refundsFils: integer(j, 'refundsFils'),
        feesFils: integer(j, 'feesFils'),
        vatFils: integer(j, 'vatFils'),
        netFils: integer(j, 'netFils'),
      );
  final int grossFils;
  final int refundsFils;
  final int feesFils;
  final int vatFils;
  final int netFils;

  bool get isEmpty => grossFils == 0 && refundsFils == 0;
}

@immutable
class ReportTeacher {
  const ReportTeacher({required this.name, this.sessionsRun = 0, this.avgAttendance = 0, this.onTimeStartRate = 0});
  factory ReportTeacher.fromJson(Json j) => ReportTeacher(
        name: str(j, 'name'),
        sessionsRun: integer(j, 'sessionsRun'),
        avgAttendance: dbl(j, 'avgAttendance'),
        onTimeStartRate: dbl(j, 'onTimeStartRate'),
      );
  final String name;
  final int sessionsRun;
  final double avgAttendance;
  final double onTimeStartRate;
}

@immutable
class AdminReport {
  const AdminReport({this.from, this.to, this.days = 0, this.kpis = const ReportKpis(), this.previous = const ReportKpis(), this.revenueByCourse = const [], this.teachers = const [], this.recorded});
  factory AdminReport.fromJson(Json j) {
    final range = obj(j, 'range');
    return AdminReport(
      from: date(range, 'from'),
      to: date(range, 'to'),
      days: integer(range, 'days'),
      kpis: ReportKpis.fromJson(obj(j, 'kpis')),
      previous: ReportKpis.fromJson(obj(j, 'previous')),
      revenueByCourse: [for (final r in list(j, 'revenueByCourse')) (title: str(r, 'title'), fils: integer(r, 'revenueFils'))],
      teachers: list(j, 'teachers').map(ReportTeacher.fromJson).toList(),
      recorded: objOrNull(j, 'recorded') == null ? null : RecordedRevenue.fromJson(obj(j, 'recorded')),
    );
  }
  final DateTime? from;
  final DateTime? to;
  final int days;
  final ReportKpis kpis;
  final ReportKpis previous;
  final List<({String title, int fils})> revenueByCourse;
  final List<ReportTeacher> teachers;
  final RecordedRevenue? recorded;
}

/// `GET /admin/settings` (read-only platform rules; integrations are booleans, never secrets).
@immutable
class PlatformSettings {
  const PlatformSettings({this.rules = const {}, this.integrations = const {}});
  factory PlatformSettings.fromJson(Json j) {
    final r = obj(j, 'rules');
    final i = obj(j, 'integrations');
    return PlatformSettings(
      rules: {for (final e in r.entries) if (e.value is num) e.key: e.value as num},
      integrations: {for (final e in i.entries) e.key: e.value == true},
    );
  }
  final Map<String, num> rules;
  final Map<String, bool> integrations;
}

/// `GET /admin/settings/cuts`: the platform's default teacher cut per course type, in percent.
@immutable
class TeacherCuts {
  const TeacherCuts({required this.liveCutPercent, required this.recordedCutPercent});
  factory TeacherCuts.fromJson(Json j) => TeacherCuts(liveCutPercent: integer(j, 'liveCutPercent'), recordedCutPercent: integer(j, 'recordedCutPercent'));
  final int liveCutPercent;
  final int recordedCutPercent;
  int forType(CourseType t) => t == CourseType.recorded ? recordedCutPercent : liveCutPercent;
}

/// One row of `GET /admin/subscriptions`: a learner's plan on a recorded course, with their last payment.
@immutable
class AdminSubscription {
  const AdminSubscription({
    required this.id,
    this.userName = '',
    this.userEmail = '',
    required this.courseId,
    this.courseTitleEn = '',
    this.courseTitleAr,
    required this.plan,
    required this.provider,
    required this.status,
    this.currentPeriodEnd,
    this.lastPaymentFils,
  });

  factory AdminSubscription.fromJson(Json j) {
    final u = obj(j, 'user');
    final c = obj(j, 'course');
    final last = objOrNull(j, 'lastPayment');
    return AdminSubscription(
      id: str(j, 'id'),
      userName: str(u, 'name'),
      userEmail: str(u, 'email'),
      courseId: str(c, 'id', str(j, 'courseId')),
      courseTitleEn: str(c, 'titleEn'),
      courseTitleAr: strOrNull(c, 'titleAr'),
      plan: SubscriptionPlan.parse(j['plan']),
      provider: SubscriptionProvider.parse(j['provider']),
      status: SubscriptionStatus.parse(j['status']),
      currentPeriodEnd: date(j, 'currentPeriodEnd'),
      lastPaymentFils: last == null ? null : intOrNull(last, 'amountFils') ?? intOrNull(last, 'totalFils'),
    );
  }

  final String id;
  final String userName;
  final String userEmail;
  final String courseId;
  final String courseTitleEn;
  final String? courseTitleAr;
  final SubscriptionPlan plan;
  final SubscriptionProvider provider;
  final SubscriptionStatus status;
  final DateTime? currentPeriodEnd;
  final int? lastPaymentFils;

  /// Apple owns the billing: an admin can't cancel or refund these.
  bool get managedByApple => provider == SubscriptionProvider.apple;
  bool get cancellable => !managedByApple && status != SubscriptionStatus.expired;

  String courseTitle(AppLocale l) => l == AppLocale.ar && (courseTitleAr?.trim().isNotEmpty ?? false) ? courseTitleAr! : courseTitleEn;
}

/// Filters for the subscriptions list.
/// One App Store product sync outcome: a seat price, or a recorded course's two plan products.
@immutable
class AppStoreSyncItem {
  const AppStoreSyncItem({required this.key, this.titleEn = '', this.titleAr, this.status, this.detail, this.syncedAt, this.courseId});

  factory AppStoreSyncItem.seat(Json j) {
    final fils = integer(j, 'priceFils');
    return AppStoreSyncItem(key: strOrNull(j, 'productId') ?? '$fils', titleEn: str(j, 'productId'), status: AppleSyncStatus.parse(j['status']), detail: strOrNull(j, 'detail'), syncedAt: date(j, 'syncedAt'));
  }

  factory AppStoreSyncItem.course(Json j) => AppStoreSyncItem(
        key: str(j, 'id'),
        courseId: str(j, 'id'),
        titleEn: str(j, 'titleEn', str(j, 'slug')),
        titleAr: strOrNull(j, 'titleAr'),
        status: AppleSyncStatus.parse(j['status']),
        detail: strOrNull(j, 'detail'),
        syncedAt: date(j, 'syncedAt'),
      );

  final String key;
  final String? courseId;
  final String titleEn;
  final String? titleAr;
  final AppleSyncStatus? status;
  final String? detail;
  final DateTime? syncedAt;

  String title(AppLocale l) => l == AppLocale.ar && titleAr != null ? titleAr! : titleEn;
}

/// `GET /admin/app-store/status`.
@immutable
class AppStoreStatus {
  const AppStoreStatus({this.configured = false, this.seats = const [], this.courses = const []});
  factory AppStoreStatus.fromJson(Json j) => AppStoreStatus(
        configured: boolean(j, 'configured'),
        seats: list(j, 'seats').map(AppStoreSyncItem.seat).toList(),
        courses: list(j, 'courses').map(AppStoreSyncItem.course).toList(),
      );
  final bool configured;
  final List<AppStoreSyncItem> seats;
  final List<AppStoreSyncItem> courses;

  AppStoreSyncItem? course(String id) => courses.where((c) => c.courseId == id).firstOrNull;
}

final appStoreStatusProvider = FutureProvider.autoDispose<AppStoreStatus>((ref) => ref.watch(backOfficeRepositoryProvider).appStoreStatus());

typedef SubscriptionQuery = ({SubscriptionStatus? status, SubscriptionProvider? provider, String? courseId});

// ───────────────────────────── Repository ─────────────────────────────

/// Back-office endpoints the admin "Manage" areas use (orders, people, payouts completion, courses,
/// batches, coupons, categories, reports, bank accounts, FX). Kept apart from [AdminRepository] so the
/// overview's data layer (and its fakes) stays small.
abstract class BackOfficeRepository {
  // Payments
  Future<List<AdminOrder>> orders({OrderStatus? status, PaymentMethod? method, String? q});
  Future<AdminOrder> order(String id);
  Future<RefundResult> refund(String orderId, {required int amountFils, required String reason});

  // People
  Future<List<AdminUser>> users({Role? role, String? q});
  Future<AdminUser> createUser({required String name, required String email, required Role role, AppLocale locale = AppLocale.en});
  Future<AdminUser> updateUser(String id, Map<String, dynamic> changes);

  // Payouts completion
  Future<void> markRunPaid(String runId, String transferReference);
  Future<PayoutRun> adjustPayout(String payoutId, {required int amountFils, required String reason});
  Future<void> verifyTeacherBank(String teacherId);

  // Courses & batches
  Future<List<Course>> courses({CourseStatus? status, String? q});
  Future<Course> saveCourse(String? id, Map<String, dynamic> body);
  Future<SchedulePreview> previewSchedule(Map<String, dynamic> body);
  Future<Batch> createBatch(Map<String, dynamic> body);
  Future<Batch> updateBatch(String batchId, Map<String, dynamic> body);
  Future<void> shiftBatch(String batchId, {required int fromSessionNumber, required int days});
  Future<List<EnrollmentRow>> enrollments(String batchId);

  // Coupons
  Future<List<Coupon>> coupons();
  Future<Coupon> createCoupon(CouponDraft draft);
  Future<Coupon> updateCoupon(String id, Map<String, dynamic> body);
  Future<CouponUsage> couponUsage(String id);

  // Categories
  Future<List<AdminCategory>> categories();
  Future<AdminCategory> createCategory(Map<String, dynamic> body);
  Future<AdminCategory> updateCategory(String slug, Map<String, dynamic> body);
  Future<void> deleteCategory(String slug);

  // Reports
  Future<AdminReport> report({DateTime? from, DateTime? to});

  // Bank accounts & currencies
  Future<List<AdminBankAccount>> bankAccounts();
  Future<AdminBankAccount> saveBankAccount(String? id, Map<String, dynamic> body);
  Future<FxRates> fxRates();
  Future<void> setFxRate(DisplayCurrency currency, double ratePerAed);

  // Settings (read-only)
  Future<PlatformSettings> settings();

  // Recorded courses
  /// `GET /admin/settings/cuts`.
  Future<TeacherCuts> cuts();

  /// `PUT /admin/settings/cuts`.
  Future<TeacherCuts> saveCuts({required int liveCutPercent, required int recordedCutPercent});

  /// `PUT /admin/courses/:id/cut` `{ teacherCutPercent }`; null clears the override.
  Future<void> setCourseCut(String courseId, int? percent);

  /// `PUT /admin/courses/:id/recorded-pricing` (prices before VAT, in fils).
  Future<Course> setRecordedPricing(String courseId, {required int monthlyPriceFils, required int yearlyPriceFils});

  /// `PUT /admin/courses/:id/apple-products`; null clears an id.
  Future<Course> setAppleProducts(String courseId, {String? monthly, String? yearly});

  /// `GET /admin/app-store/status`.
  Future<AppStoreStatus> appStoreStatus();

  /// `POST /admin/app-store/sync` (fire-and-forget: re-read the status a few seconds later).
  Future<void> syncAppStore();

  /// `GET /admin/subscriptions`.
  Future<List<AdminSubscription>> subscriptions(SubscriptionQuery query);

  /// `POST /admin/subscriptions/:id/cancel` `{ refund: NONE | FULL }` (422 `MANAGED_BY_APPLE` for App Store plans).
  /// True when a transfer receipt was under review on a payment this closed (money to return by hand).
  Future<bool> cancelSubscription(String id, {required bool refund});
}

class DioBackOfficeRepository extends DioRepository implements BackOfficeRepository {
  DioBackOfficeRepository(super.dio);

  static const _api = '/api/v1';

  @override
  Future<List<AdminOrder>> orders({OrderStatus? status, PaymentMethod? method, String? q}) async => (await getItems('$_api/admin/orders', query: {
        'status': ?status?.wire,
        'method': ?method?.wire,
        if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
        'pageSize': 100,
      }))
          .map(AdminOrder.fromJson)
          .toList();

  @override
  Future<AdminOrder> order(String id) async => AdminOrder.fromJson(await getJson('$_api/orders/$id'));

  @override
  Future<RefundResult> refund(String orderId, {required int amountFils, required String reason}) async {
    final j = await postJson('$_api/admin/orders/$orderId/refund', {'amountAed': Money.filsToAed(amountFils), 'reason': reason.trim()});
    return RefundResult(refundFils: integer(j, 'refundFils', amountFils), manual: boolean(j, 'manual'));
  }

  @override
  Future<List<AdminUser>> users({Role? role, String? q}) async => (await getItems('$_api/admin/users', query: {
        'role': ?role?.wire,
        if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
        'pageSize': 100,
      }))
          .map(AdminUser.fromJson)
          .toList();

  @override
  Future<AdminUser> createUser({required String name, required String email, required Role role, AppLocale locale = AppLocale.en}) async =>
      AdminUser.fromJson(await postJson('$_api/admin/users', {'name': name.trim(), 'email': email.trim(), 'role': role.wire, 'locale': locale.wire}));

  @override
  Future<AdminUser> updateUser(String id, Map<String, dynamic> changes) async => AdminUser.fromJson(await patchJson('$_api/admin/users/$id', changes));

  @override
  Future<void> markRunPaid(String runId, String transferReference) =>
      postJson('$_api/admin/payout-runs/$runId/mark-paid', {'transferReference': transferReference.trim()});

  @override
  Future<PayoutRun> adjustPayout(String payoutId, {required int amountFils, required String reason}) async => PayoutRun.fromJson(
      await postJson('$_api/admin/payouts/adjustments', {'payoutId': payoutId, 'amountAed': Money.filsToAed(amountFils), 'reason': reason.trim()}));

  @override
  Future<void> verifyTeacherBank(String teacherId) => postJson('$_api/admin/teachers/$teacherId/bank-details/verify');

  @override
  Future<List<Course>> courses({CourseStatus? status, String? q}) async => (await getItems('$_api/courses', query: {
        'status': ?status?.wire,
        if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
        'pageSize': 100,
      }))
          .map(Course.fromJson)
          .toList();

  @override
  Future<Course> saveCourse(String? id, Map<String, dynamic> body) async =>
      Course.fromJson(id == null ? await postJson('$_api/courses', body) : await patchJson('$_api/courses/$id', body));

  @override
  Future<SchedulePreview> previewSchedule(Map<String, dynamic> body) async =>
      SchedulePreview.fromJson(await postJson('$_api/batches/schedule/preview', body));

  @override
  Future<Batch> createBatch(Map<String, dynamic> body) async => Batch.fromJson(await postJson('$_api/batches', body));

  @override
  Future<Batch> updateBatch(String batchId, Map<String, dynamic> body) async => Batch.fromJson(await patchJson('$_api/batches/$batchId', body));

  @override
  Future<void> shiftBatch(String batchId, {required int fromSessionNumber, required int days}) =>
      postJson('$_api/batches/$batchId/shift', {'fromSessionNumber': fromSessionNumber, 'days': days});

  @override
  Future<List<EnrollmentRow>> enrollments(String batchId) async =>
      (await getItems('$_api/batches/$batchId/enrollments')).map(EnrollmentRow.fromJson).toList();

  @override
  Future<List<Coupon>> coupons() async => (await getItems('$_api/admin/coupons')).map(Coupon.fromJson).toList();

  @override
  Future<Coupon> createCoupon(CouponDraft draft) async => Coupon.fromJson(await postJson('$_api/admin/coupons', draft.toCreateJson()));

  @override
  Future<Coupon> updateCoupon(String id, Map<String, dynamic> body) async => Coupon.fromJson(await patchJson('$_api/admin/coupons/$id', body));

  @override
  Future<CouponUsage> couponUsage(String id) async => CouponUsage.fromJson(await getJson('$_api/admin/coupons/$id/usage'));

  @override
  Future<List<AdminCategory>> categories() async =>
      (await getItems('$_api/categories', query: {'all': 'true'})).map(AdminCategory.fromJson).toList()..sort((a, b) => a.order.compareTo(b.order));

  @override
  Future<AdminCategory> createCategory(Map<String, dynamic> body) async => AdminCategory.fromJson(await postJson('$_api/categories', body));

  @override
  Future<AdminCategory> updateCategory(String slug, Map<String, dynamic> body) async =>
      AdminCategory.fromJson(await patchJson('$_api/categories/$slug', body));

  @override
  Future<void> deleteCategory(String slug) => guard(() => dio.delete<dynamic>('$_api/categories/$slug'));

  @override
  Future<AdminReport> report({DateTime? from, DateTime? to}) async => AdminReport.fromJson(await getJson('$_api/admin/reports', query: {
        if (from != null) 'from': isoDay(from),
        if (to != null) 'to': isoDay(to),
      }));

  @override
  Future<List<AdminBankAccount>> bankAccounts() async =>
      (await getItems('$_api/admin/bank-accounts')).map(AdminBankAccount.fromJson).toList()..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));

  @override
  Future<AdminBankAccount> saveBankAccount(String? id, Map<String, dynamic> body) async => AdminBankAccount.fromJson(
      id == null ? await postJson('$_api/admin/bank-accounts', body) : await patchJson('$_api/admin/bank-accounts/$id', body));

  @override
  Future<FxRates> fxRates() async => FxRates.fromJson(await getJson('$_api/fx-rates'));

  @override
  Future<void> setFxRate(DisplayCurrency currency, double ratePerAed) =>
      putJson('$_api/admin/fx-rates', {'currency': currency.wire, 'ratePerAed': ratePerAed});

  @override
  Future<PlatformSettings> settings() async => PlatformSettings.fromJson(await getJson('$_api/admin/settings'));

  @override
  Future<TeacherCuts> cuts() async => TeacherCuts.fromJson(await getJson('$_api/admin/settings/cuts'));

  @override
  Future<TeacherCuts> saveCuts({required int liveCutPercent, required int recordedCutPercent}) async =>
      TeacherCuts.fromJson(await putJson('$_api/admin/settings/cuts', {'liveCutPercent': liveCutPercent, 'recordedCutPercent': recordedCutPercent}));

  @override
  Future<void> setCourseCut(String courseId, int? percent) async {
    await putJson('$_api/admin/courses/$courseId/cut', {'teacherCutPercent': percent});
  }

  @override
  Future<Course> setRecordedPricing(String courseId, {required int monthlyPriceFils, required int yearlyPriceFils}) async => Course.fromJson(
      await putJson('$_api/admin/courses/$courseId/recorded-pricing', {'monthlyPriceFils': monthlyPriceFils, 'yearlyPriceFils': yearlyPriceFils}));

  @override
  Future<Course> setAppleProducts(String courseId, {String? monthly, String? yearly}) async =>
      Course.fromJson(await putJson('$_api/admin/courses/$courseId/apple-products', {'monthly': monthly, 'yearly': yearly}));

  @override
  Future<AppStoreStatus> appStoreStatus() async => AppStoreStatus.fromJson(await getJson('$_api/admin/app-store/status'));

  @override
  Future<void> syncAppStore() async {
    await postJson('$_api/admin/app-store/sync');
  }

  @override
  Future<List<AdminSubscription>> subscriptions(SubscriptionQuery query) async => (await getItems('$_api/admin/subscriptions', query: {
        if (query.status != null) 'status': query.status!.wire,
        if (query.provider != null) 'provider': query.provider!.wire,
        if (query.courseId != null) 'courseId': query.courseId,
        'pageSize': 100,
      }))
          .map(AdminSubscription.fromJson)
          .toList();

  @override
  Future<bool> cancelSubscription(String id, {required bool refund}) async {
    final j = await postJson('$_api/admin/subscriptions/$id/cancel', {'refund': refund ? 'FULL' : 'NONE'});
    return list(j, 'closedPayments').any((p) => boolean(p, 'receiptUploaded'));
  }
}

final backOfficeRepositoryProvider = Provider<BackOfficeRepository>((ref) => DioBackOfficeRepository(ref.watch(dioProvider)));

/// Filters for the orders list.
typedef OrderQuery = ({OrderStatus? status, PaymentMethod? method, String q});
typedef UserQuery = ({Role? role, String q});

final adminOrdersProvider = FutureProvider.autoDispose.family<List<AdminOrder>, OrderQuery>(
  (ref, f) => ref.watch(backOfficeRepositoryProvider).orders(status: f.status, method: f.method, q: f.q),
);
final adminOrderProvider = FutureProvider.autoDispose.family<AdminOrder, String>((ref, id) => ref.watch(backOfficeRepositoryProvider).order(id));
final adminUsersProvider = FutureProvider.autoDispose.family<List<AdminUser>, UserQuery>(
  (ref, f) => ref.watch(backOfficeRepositoryProvider).users(role: f.role, q: f.q),
);
final adminTeachersProvider = FutureProvider.autoDispose<List<AdminUser>>(
  (ref) => ref.watch(backOfficeRepositoryProvider).users(role: Role.teacher),
);
final adminCoursesProvider = FutureProvider.autoDispose.family<List<Course>, CourseStatus?>(
  (ref, status) => ref.watch(backOfficeRepositoryProvider).courses(status: status),
);
final batchEnrollmentsProvider = FutureProvider.autoDispose.family<List<EnrollmentRow>, String>(
  (ref, id) => ref.watch(backOfficeRepositoryProvider).enrollments(id),
);
final couponsProvider = FutureProvider.autoDispose<List<Coupon>>((ref) => ref.watch(backOfficeRepositoryProvider).coupons());
final couponUsageProvider = FutureProvider.autoDispose.family<CouponUsage, String>((ref, id) => ref.watch(backOfficeRepositoryProvider).couponUsage(id));
final adminCategoriesProvider = FutureProvider.autoDispose<List<AdminCategory>>((ref) => ref.watch(backOfficeRepositoryProvider).categories());
final adminReportProvider = FutureProvider.autoDispose.family<AdminReport, int>((ref, days) {
  final today = DateTime.now();
  final to = DateTime(today.year, today.month, today.day);
  return ref.watch(backOfficeRepositoryProvider).report(from: to.subtract(Duration(days: days - 1)), to: to);
});
final adminBankAccountsProvider = FutureProvider.autoDispose<List<AdminBankAccount>>((ref) => ref.watch(backOfficeRepositoryProvider).bankAccounts());
final adminFxRatesProvider = FutureProvider.autoDispose<FxRates>((ref) => ref.watch(backOfficeRepositoryProvider).fxRates());
final platformSettingsProvider = FutureProvider.autoDispose<PlatformSettings>((ref) => ref.watch(backOfficeRepositoryProvider).settings());

final teacherCutsProvider = FutureProvider.autoDispose<TeacherCuts>((ref) => ref.watch(backOfficeRepositoryProvider).cuts());
final adminSubscriptionsProvider = FutureProvider.autoDispose.family<List<AdminSubscription>, SubscriptionQuery>(
  (ref, q) => ref.watch(backOfficeRepositoryProvider).subscriptions(q),
);

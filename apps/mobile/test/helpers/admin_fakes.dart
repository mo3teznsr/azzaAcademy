import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/money/money.dart';
import 'package:azza/core/network/app_exception.dart';
import 'package:azza/features/admin/data/admin_repository.dart';
import 'package:azza/features/admin/data/back_office_repository.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/teacher/domain/proposal_models.dart';

import 'fakes.dart';

/// Back-office stand-in: answers from the given lists and records every write.
class FakeBackOfficeRepository implements BackOfficeRepository {
  FakeBackOfficeRepository({
    this.orderList = const [],
    this.userList = const [],
    this.courseList = const [],
    this.couponList = const [],
    this.categoryList = const [],
    this.deleteCategoryError,
    this.refundResult = const RefundResult(refundFils: 0, manual: false),
    this.subscriptionList = const [],
    this.defaultCuts = const TeacherCuts(liveCutPercent: 60, recordedCutPercent: 60),
  });

  List<AdminSubscription> subscriptionList;
  TeacherCuts defaultCuts;

  final List<({int live, int recorded})> savedCuts = [];
  final List<(String, int?)> courseCuts = [];
  final List<(String, int, int)> pricing = [];
  final List<(String, String?, String?)> appleProducts = [];
  final List<({String id, bool refund})> cancelledSubscriptions = [];

  List<AdminOrder> orderList;
  List<AdminUser> userList;
  List<Course> courseList;
  List<Coupon> couponList;
  List<AdminCategory> categoryList;
  Object? deleteCategoryError;
  RefundResult refundResult;

  final List<({String id, int fils, String reason})> refunds = [];
  final List<(String, Map<String, dynamic>)> userUpdates = [];
  final List<(String, String)> markedPaid = [];
  final List<({String payoutId, int fils, String reason})> adjustments = [];
  final List<String> verifiedTeachers = [];
  final List<(String?, Map<String, dynamic>)> savedCourses = [];
  final List<CouponDraft> createdCoupons = [];
  final List<(String, Map<String, dynamic>)> updatedCoupons = [];
  final List<(String, Map<String, dynamic>)> updatedCategories = [];
  final List<String> deletedCategories = [];
  final List<Map<String, dynamic>> createdBatches = [];
  final List<({String id, int from, int days})> shifts = [];

  @override
  Future<List<AdminOrder>> orders({OrderStatus? status, PaymentMethod? method, String? q}) async =>
      orderList.where((o) => (status == null || o.order.status == status) && (method == null || o.order.method == method)).toList();

  @override
  Future<AdminOrder> order(String id) async => orderList.firstWhere((o) => o.id == id);

  @override
  Future<RefundResult> refund(String orderId, {required int amountFils, required String reason}) async {
    refunds.add((id: orderId, fils: amountFils, reason: reason));
    return RefundResult(refundFils: amountFils, manual: refundResult.manual);
  }

  @override
  Future<List<AdminUser>> users({Role? role, String? q}) async => userList.where((u) => role == null || u.role == role).toList();

  @override
  Future<AdminUser> createUser({required String name, required String email, required Role role, AppLocale locale = AppLocale.en}) async =>
      AdminUser(id: 'u-new', name: name, email: email, role: role);

  @override
  Future<AdminUser> updateUser(String id, Map<String, dynamic> changes) async {
    userUpdates.add((id, changes));
    final u = userList.firstWhere((x) => x.id == id);
    return AdminUser(
      id: u.id,
      name: u.name,
      email: u.email,
      role: changes['role'] == null ? u.role : Role.parse(changes['role']),
      banned: changes['banned'] as bool? ?? u.banned,
      headline: u.headline,
      bio: u.bio,
    );
  }

  @override
  Future<void> markRunPaid(String runId, String transferReference) async => markedPaid.add((runId, transferReference));

  @override
  Future<PayoutRun> adjustPayout(String payoutId, {required int amountFils, required String reason}) async {
    adjustments.add((payoutId: payoutId, fils: amountFils, reason: reason));
    return PayoutRun(id: 'run', periodStart: DateTime(2026, 10), periodEnd: DateTime(2026, 10, 31), status: PayoutRunStatus.draft);
  }

  @override
  Future<void> verifyTeacherBank(String teacherId) async => verifiedTeachers.add(teacherId);

  @override
  Future<List<Course>> courses({CourseStatus? status, String? q}) async => courseList.where((c) => status == null || c.status == status).toList();

  @override
  Future<Course> saveCourse(String? id, Map<String, dynamic> body) async {
    savedCourses.add((id, body));
    return Course(
      id: id ?? 'c-new',
      slug: id ?? 'c-new',
      titleEn: '${body['titleEn'] ?? ''}',
      status: body['status'] == null ? CourseStatus.draft : CourseStatus.parse(body['status']),
      featuredRank: body['featuredRank'] as int?,
    );
  }

  @override
  Future<SchedulePreview> previewSchedule(Map<String, dynamic> body) async => const SchedulePreview();

  @override
  Future<Batch> createBatch(Map<String, dynamic> body) async {
    createdBatches.add(body);
    return Batch(id: 'b-new', code: '${body['code']}', courseId: '${body['courseId']}', status: BatchStatus.draft);
  }

  @override
  Future<Batch> updateBatch(String batchId, Map<String, dynamic> body) async =>
      Batch(id: batchId, code: 'B01', courseId: 'c', status: BatchStatus.parse(body['status']));

  @override
  Future<void> shiftBatch(String batchId, {required int fromSessionNumber, required int days}) async =>
      shifts.add((id: batchId, from: fromSessionNumber, days: days));

  @override
  Future<List<EnrollmentRow>> enrollments(String batchId) async => const [];

  @override
  Future<List<Coupon>> coupons() async => couponList;

  @override
  Future<Coupon> createCoupon(CouponDraft draft) async {
    createdCoupons.add(draft);
    return Coupon(id: 'cp-new', code: draft.code, percentOff: draft.percentOff);
  }

  @override
  Future<Coupon> updateCoupon(String id, Map<String, dynamic> body) async {
    updatedCoupons.add((id, body));
    return couponList.firstWhere((c) => c.id == id);
  }

  @override
  Future<CouponUsage> couponUsage(String id) async => const CouponUsage();

  @override
  Future<List<AdminCategory>> categories() async => categoryList;

  @override
  Future<AdminCategory> createCategory(Map<String, dynamic> body) async => AdminCategory(slug: '${body['slug']}', nameEn: '${body['nameEn']}');

  @override
  Future<AdminCategory> updateCategory(String slug, Map<String, dynamic> body) async {
    updatedCategories.add((slug, body));
    return categoryList.firstWhere((c) => c.slug == slug);
  }

  @override
  Future<void> deleteCategory(String slug) async {
    if (deleteCategoryError != null) throw deleteCategoryError!;
    deletedCategories.add(slug);
  }

  @override
  Future<AdminReport> report({DateTime? from, DateTime? to}) async => const AdminReport();

  @override
  Future<List<AdminBankAccount>> bankAccounts() async => const [];

  @override
  Future<AdminBankAccount> saveBankAccount(String? id, Map<String, dynamic> body) async => throw UnimplementedError();

  // Currencies
  List<CurrencyInfo> currencyList = const [
    CurrencyInfo(code: 'AED', nameEn: 'UAE dirham', decimals: 2),
    CurrencyInfo(code: 'SAR', nameEn: 'Saudi riyal', ratePerAed: 1.0211, decimals: 0, sortOrder: 1),
  ];
  final List<Map<String, dynamic>> createdCurrencies = [];
  final List<(String, Map<String, dynamic>)> updatedCurrencies = [];
  final List<String> deletedCurrencies = [];

  @override
  Future<List<CurrencyInfo>> adminCurrencies() async => [...currencyList];

  @override
  Future<CurrencyInfo> createCurrency(Map<String, dynamic> body) async {
    // The API requires an Arabic name of 1-60 characters.
    final ar = body['nameAr'];
    if (ar is! String || ar.trim().isEmpty || ar.length > 60) throw const AppException('VALIDATION', 'nameAr is required');
    createdCurrencies.add(body);
    final c = CurrencyInfo(code: body['code'] as String, nameEn: body['nameEn'] as String, nameAr: ar, ratePerAed: (body['ratePerAed'] as num).toDouble(), decimals: body['decimals'] as int, sortOrder: currencyList.length);
    currencyList = [...currencyList, c];
    return c;
  }

  @override
  Future<CurrencyInfo> updateCurrency(String code, Map<String, dynamic> body) async {
    updatedCurrencies.add((code, body));
    return currencyList.firstWhere((c) => c.code == code);
  }

  @override
  Future<void> deleteCurrency(String code) async {
    deletedCurrencies.add(code);
    currencyList = currencyList.where((c) => c.code != code).toList();
  }

  // Settings
  PlatformSettings platformSettings = const PlatformSettings(
    rules: {'VAT_PERCENT': 10, 'EARNING_HOLD_DAYS': 7, 'MIN_PAYOUT_AED': 200, 'BANK_TRANSFER_HOLD_HOURS': 48, 'TEACHER_SHARE_PERCENT': 60},
    ruleDefaults: {'VAT_PERCENT': 5, 'EARNING_HOLD_DAYS': 7, 'MIN_PAYOUT_AED': 200, 'BANK_TRANSFER_HOLD_HOURS': 48},
    integrations: {'stripe': true, 'smtp': false},
  );
  final List<Map<String, int?>> savedRules = [];
  final List<Map<String, dynamic>> savedContact = [];

  @override
  Future<PlatformSettings> settings() async => platformSettings;

  @override
  Future<PlatformSettings> saveRules(Map<String, int?> changes) async {
    savedRules.add(changes);
    final rules = {...platformSettings.rules};
    const fields = {'vatPercent': 'VAT_PERCENT', 'earningHoldDays': 'EARNING_HOLD_DAYS', 'minPayoutAed': 'MIN_PAYOUT_AED', 'bankTransferHoldHours': 'BANK_TRANSFER_HOLD_HOURS'};
    changes.forEach((f, v) => rules[fields[f]!] = v ?? platformSettings.ruleDefaults[fields[f]!]!);
    return platformSettings = PlatformSettings(rules: rules, ruleDefaults: platformSettings.ruleDefaults, integrations: platformSettings.integrations);
  }

  @override
  Future<PlatformSettings> saveContact(Map<String, dynamic> body) async {
    savedContact.add(body);
    return platformSettings;
  }

  final Map<String, String?> categoryImages = {};
  final List<String> uploadedCategoryImages = [];
  final List<String> removedCategoryImages = [];

  @override
  Future<AdminCategory> uploadCategoryImage(String slug, List<int> bytes, {String filename = 'category.jpg'}) async {
    uploadedCategoryImages.add(slug);
    categoryImages[slug] = '/uploads/categories/$slug.jpg';
    final c = categoryList.firstWhere((c) => c.slug == slug);
    return AdminCategory(slug: slug, nameEn: c.nameEn, imageUrl: categoryImages[slug]);
  }

  @override
  Future<AdminCategory> removeCategoryImage(String slug) async {
    removedCategoryImages.add(slug);
    categoryImages[slug] = null;
    final c = categoryList.firstWhere((c) => c.slug == slug);
    return AdminCategory(slug: slug, nameEn: c.nameEn);
  }

  @override
  Future<TeacherCuts> cuts() async => defaultCuts;

  @override
  Future<TeacherCuts> saveCuts({required int liveCutPercent, required int recordedCutPercent}) async {
    savedCuts.add((live: liveCutPercent, recorded: recordedCutPercent));
    return defaultCuts = TeacherCuts(liveCutPercent: liveCutPercent, recordedCutPercent: recordedCutPercent);
  }

  @override
  Future<void> setCourseCut(String courseId, int? percent) async => courseCuts.add((courseId, percent));

  @override
  Future<Course> setRecordedPricing(String courseId, {required int monthlyPriceFils, required int yearlyPriceFils}) async {
    pricing.add((courseId, monthlyPriceFils, yearlyPriceFils));
    return Course(id: courseId, slug: courseId, titleEn: courseId, type: CourseType.recorded, monthlyPriceFils: monthlyPriceFils, yearlyPriceFils: yearlyPriceFils);
  }

  @override
  Future<Course> setAppleProducts(String courseId, {String? monthly, String? yearly}) async {
    appleProducts.add((courseId, monthly, yearly));
    return Course(id: courseId, slug: courseId, titleEn: courseId, type: CourseType.recorded);
  }

  @override
  Future<List<AdminSubscription>> subscriptions(SubscriptionQuery query) async => [
        for (final s in subscriptionList)
          if ((query.status == null || s.status == query.status) && (query.provider == null || s.provider == query.provider)) s,
      ];

  @override
  Future<bool> cancelSubscription(String id, {required bool refund}) async {
    cancelledSubscriptions.add((id: id, refund: refund));
    return cancelReturnsReceipt;
  }

  bool cancelReturnsReceipt = false;

  AppStoreStatus appStore = const AppStoreStatus();
  int syncCalls = 0;
  @override
  Future<AppStoreStatus> appStoreStatus() async => appStore;
  @override
  Future<void> syncAppStore() async => syncCalls++;
}

/// [FakeAdminRepository] with a dashboard, transfers and one payout run to show.

class ScriptedAdminRepository extends FakeAdminRepository {
  ScriptedAdminRepository({this.dash = const AdminDashboard(), this.run, this.runs = const []});
  AdminDashboard dash;
  PayoutRun? run;
  List<PayoutRun> runs;

  @override
  Future<AdminDashboard> dashboard() async => dash;
  @override
  Future<PayoutRun> payoutRun(String id) async => run!;
  @override
  Future<List<PayoutRun>> payoutRuns() async => runs;
}

import 'dart:async';

import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/money/money.dart';
import 'package:azza/core/network/app_exception.dart';
import 'package:azza/core/realtime/realtime_client.dart';
import 'package:azza/features/admin/data/admin_repository.dart';
import 'package:azza/features/live/domain/live_models.dart';
import 'package:azza/features/auth/data/auth_repository.dart';
import 'package:azza/features/auth/domain/app_user.dart';
import 'package:azza/features/catalog/data/catalog_repository.dart';
import 'package:azza/features/catalog/data/reviews_repository.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/catalog/domain/course_filters.dart';
import 'package:azza/features/catalog/domain/review_models.dart';
import 'package:azza/features/checkout/data/app_store_gateway.dart';
import 'package:azza/features/checkout/data/apple_iap_repository.dart';
import 'package:azza/features/checkout/data/checkout_repository.dart';
import 'package:azza/features/checkout/domain/apple_iap.dart';
import 'package:azza/features/checkout/domain/checkout_models.dart';
import 'package:azza/features/learn/data/learn_repository.dart';
import 'package:azza/features/me/data/me_repository.dart';
import 'package:azza/features/me/domain/me_models.dart';
import 'package:azza/features/certificates/data/certificates_repository.dart';
import 'package:azza/features/certificates/domain/certificate_models.dart';
import 'package:azza/features/teacher/data/proposals_repository.dart';
import 'package:azza/features/teacher/domain/proposal_models.dart';
import 'package:azza/features/teachers/data/teachers_repository.dart';
import 'package:azza/features/teachers/domain/teacher_models.dart';
import 'package:azza/features/waitlist/data/waitlist_repository.dart';
import 'package:azza/features/waitlist/domain/waitlist_models.dart';

const student = AppUser(id: 'u-s', name: 'Sara Kamal', email: 'sara@example.com', role: Role.student, image: '/media/avatars/sara.jpg');
const teacher = AppUser(id: 'u-t', name: 'Lina Haddad', email: 'lina@example.com', role: Role.teacher);
const admin = AppUser(id: 'u-a', name: 'Nour Adel', email: 'nour@example.com', role: Role.admin);

class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository([this.user]);
  AppUser? user;

  @override
  Future<AppUser?> restore() async => user;

  @override
  Future<AppUser> signIn({required String email, required String password}) async => user!;

  @override
  Future<AppUser> signUp({required String name, required String email, required String password}) async => user!;

  @override
  Future<void> signOut() async => user = null;

  @override
  Future<void> sendVerificationEmail(String email) async {}

  @override
  Future<void> requestPasswordReset(String email, {required String redirectTo}) async => resetRequests.add(email);
  final resetRequests = <String>[];

  @override
  Future<void> changePassword({required String current, required String next}) async {}
}

class FakeMeRepository implements MeRepository {
  FakeMeRepository({this.enrollmentList = const [], this.sessions = const [], this.error});
  List<Enrollment> enrollmentList;
  List<SessionSummary> sessions;
  Object? error;

  @override
  Future<List<Enrollment>> enrollments() async {
    if (error != null) throw error!;
    return enrollmentList;
  }

  @override
  Future<List<SessionSummary>> schedule({required DateTime from, required DateTime to}) async =>
      sessions.where((s) => !s.startsAt.isBefore(from.subtract(const Duration(hours: 3))) && s.startsAt.isBefore(to)).toList();

  @override
  Future<List<AppNotification>> notifications() async => const [];

  @override
  Future<void> markAllNotificationsRead() async {}

  @override
  Future<void> deleteAccount() async => deleteCalls++;

  @override
  Future<AppUser> uploadAvatar(List<int> jpegBytes) async {
    uploads++;
    return avatarUser ?? student.copyWithImage('/media/avatars/test.jpg');
  }
  int uploads = 0;
  AppUser? avatarUser;
  int deleteCalls = 0;

  @override
  Future<void> markNotificationRead(String id) async {}

  @override
  Future<AppUser> me() async => student;

  @override
  Future<void> registerDevice(String token, DevicePlatform platform) async {}

  @override
  Future<void> unregisterDevice(String token) async {}

  @override
  Future<AppUser> updateProfile({String? name, AppLocale? locale, String? timezone, DisplayCurrency? displayCurrency}) async => student;
}

class FakeLearnRepository implements LearnRepository {
  @override
  Future<List<Recording>> recordings() async => const [];
  @override
  Future<List<CourseMaterial>> materials(String batchId) async => const [];
  @override
  Future<List<Assignment>> assignments(String batchId) async => const [];
  @override
  Future<void> submit(String assignmentId, {String? url, String? text}) async {}
}

class FakeCatalogRepository implements CatalogRepository {
  FakeCatalogRepository({
    this.batchList = const [],
    this.courseList = const [],
    this.searchResults = const [],
    this.featuredList = const [],
    this.categoryList = const [],
    this.relatedList = const [],
  });
  final List<Batch> batchList;

  /// Answers `course(idOrSlug)`.
  final List<Course> courseList;

  /// Answers `courses(filters)` (non-featured).
  final List<Course> searchResults;
  final List<Course> featuredList;
  final List<CourseCategory> categoryList;
  final List<Course> relatedList;

  /// Every `courses()` call, in order.
  final List<CourseFilters> queries = [];

  @override
  Future<Batch> batch(String id) async => batchList.firstWhere((b) => b.id == id);
  @override
  Future<List<Batch>> batches({String? courseId, String? status, String? teacherId}) async => batchList;
  @override
  Future<Course> course(String idOrSlug) async => courseList.firstWhere(
        (c) => c.id == idOrSlug || c.slug == idOrSlug,
        orElse: () => throw const AppException('NOT_FOUND', 'Course not found'),
      );
  @override
  Future<List<Course>> courses([CourseFilters filters = const CourseFilters()]) async {
    queries.add(filters);
    return filters.featured ? featuredList : searchResults;
  }

  @override
  Future<List<CourseCategory>> categories() async => categoryList;
  @override
  Future<List<Course>> related(String idOrSlug) async => relatedList;
}

/// Reviews & saved courses: [page] answers the first page, [morePages] the rest; writes are recorded.
class FakeReviewsRepository implements ReviewsRepository {
  FakeReviewsRepository({this.page = const ReviewsPage(), this.morePages = const {}, this.saved = const [], this.error});
  ReviewsPage page;
  Map<int, ReviewsPage> morePages;
  List<Course> saved;
  Object? error;

  final List<({String courseId, int rating, String body})> saves = [];
  final List<String> deletes = [];
  final List<(String, String)> replies = [];
  final List<(String, bool)> moderations = [];
  final List<(String, bool)> saveToggles = [];
  final List<int> pagesRequested = [];

  @override
  Future<ReviewsPage> reviews(String courseIdOrSlug, {int page = 1}) async {
    pagesRequested.add(page);
    return page == 1 ? this.page : (morePages[page] ?? const ReviewsPage());
  }

  @override
  Future<CourseReview> saveMine(String courseId, {required int rating, required String body}) async {
    if (error != null) throw error!;
    saves.add((courseId: courseId, rating: rating, body: body));
    final mine = CourseReview(id: 'r-mine', rating: rating, body: body, userId: student.id, userName: student.name);
    page = ReviewsPage(
      items: [mine, ...page.items],
      total: page.total + 1,
      ratingAvg: rating.toDouble(),
      ratingCount: page.ratingCount + 1,
      distribution: {...page.distribution, rating: (page.distribution[rating] ?? 0) + 1},
      mine: mine,
      canReview: true,
    );
    return mine;
  }

  @override
  Future<void> deleteMine(String courseId) async => deletes.add(courseId);
  @override
  Future<void> reply(String reviewId, String reply) async => replies.add((reviewId, reply));
  @override
  Future<void> setHidden(String reviewId, bool hidden) async => moderations.add((reviewId, hidden));
  @override
  Future<List<Course>> savedCourses() async => saved;
  @override
  Future<void> setSaved(String courseId, bool saved) async {
    if (error != null) throw error!;
    saveToggles.add((courseId, saved));
  }
}

class FakeCheckoutRepository implements CheckoutRepository {
  FakeCheckoutRepository({required this.current, this.banks = const []});
  Order current;
  final List<BankAccount> banks;
  final List<(String, PickedFile)> submitted = [];

  @override
  Future<Order> order(String id) async => current;
  @override
  Future<List<BankAccount>> bankAccounts() async => banks;
  @override
  Future<Order> submitReceipt(String orderId, PickedFile file) async {
    submitted.add((orderId, file));
    return current = Order(
      id: current.id,
      reference: current.reference,
      status: OrderStatus.verifying,
      method: current.method,
      totalFils: current.totalFils,
    );
  }

  @override
  Future<CheckoutResult> checkout(CheckoutRequest request) async => CheckoutResult(order: current);
  @override
  Future<FxRates> fxRates() async => const FxRates(rates: {DisplayCurrency.aed: 1, DisplayCurrency.sar: 1.0211});
  @override
  Future<List<Order>> myOrders() async => [current];
  @override
  Future<Quote> quote(CheckoutRequest request) async => Quote(subtotalFils: current.totalFils, totalFils: current.totalFils);
}

/// `POST /payments/apple/verify`: answers with [result] (or throws [error]) and records each call.
class FakeAppleIapRepository implements AppleIapRepository {
  FakeAppleIapRepository({this.result, this.error});
  Order? result;
  Object? error;
  final List<({String? orderId, String signedTransaction})> calls = [];

  @override
  Future<Order> verify({String? orderId, required String signedTransaction}) async {
    calls.add((orderId: orderId, signedTransaction: signedTransaction));
    if (error != null) throw error!;
    return result!;
  }
}

/// StoreKit stand-in: [products] by id, purchases pushed with [emit], finished transactions recorded.
class FakeAppStoreGateway implements AppStoreGateway {
  FakeAppStoreGateway({this.products = const {}, this.pendingUnfinished = const []});
  final Map<String, StoreProduct> products;
  List<StorePurchase> pendingUnfinished;
  final _purchases = StreamController<List<StorePurchase>>.broadcast();
  final List<(String, String)> bought = [];
  final List<StorePurchase> finished = [];

  void emit(List<StorePurchase> list) => _purchases.add(list);

  @override
  Future<bool> available() async => true;
  @override
  Future<StoreProduct?> product(String productId) async => products[productId];
  @override
  Future<void> buy(String productId, {required String appAccountToken}) async => bought.add((productId, appAccountToken));
  @override
  Stream<List<StorePurchase>> get purchases => _purchases.stream;
  @override
  Future<List<StorePurchase>> unfinished() async => pendingUnfinished;
  @override
  Future<void> finish(StorePurchase purchase) async => finished.add(purchase);
}

class FakeReceiptPicker implements ReceiptPicker {
  FakeReceiptPicker(this.file);
  final PickedFile? file;
  @override
  Future<PickedFile?> pick() async => file;
}

class FakeAdminRepository implements AdminRepository {
  @override
  Future<AdminDashboard> dashboard() async => const AdminDashboard(liveRooms: 2, sessionsToday: 6, activeBatches: 4);
  @override
  Future<List<LiveRoomStat>> liveRooms() async => const [];
  @override
  Future<List<Order>> transfers({String status = 'VERIFYING'}) async => const [];
  @override
  Future<void> reviewTransfer(String orderId, TransferDecision decision, {int? receivedFils, String? reason}) async {}
  @override
  Future<List<PayoutRun>> payoutRuns() async => const [];
  @override
  Future<PayoutRun> payoutRun(String id) async => throw UnimplementedError();
  @override
  Future<void> approvePayoutRun(String id) async {}
  @override
  Future<String> exportPayoutRun(String id) async => '';
  @override
  Future<PayoutRun> createPayoutRun({required DateTime periodStart, required DateTime periodEnd}) async => throw UnimplementedError();
  @override
  Future<List<RescheduleRequest>> rescheduleRequests({String? status = 'PENDING'}) async => const [];
  @override
  Future<void> approveReschedule(String requestId) async {}
  @override
  Future<void> declineReschedule(String requestId, {String? reason}) async {}
}

class FakeRealtimeClient implements RealtimeClient {
  final _c = StreamController<bool>.broadcast();
  @override
  Future<void> connect() async {}
  @override
  Stream<bool> get connection => _c.stream;
  @override
  void dispose() => _c.close();
  @override
  void emit(String event, [Object? data]) {}
  @override
  bool get isConnected => true;
  @override
  void Function() on(String event, void Function(Map<String, dynamic> payload) handler) => () {};
}

class FakeWaitlistRepository implements WaitlistRepository {
  FakeWaitlistRepository([this.overview = const WaitlistOverview()]);
  WaitlistOverview overview;
  final List<String> left = [];

  @override
  Future<WaitlistOverview> mine() async => overview;

  @override
  Future<void> leave(String batchId) async {
    left.add(batchId);
    overview = overview.without(batchId);
  }
}

class FakeCertificatesRepository implements CertificatesRepository {
  FakeCertificatesRepository([this.overview = const CertificatesOverview()]);
  final CertificatesOverview overview;

  @override
  Future<CertificatesOverview> mine() async => overview;

  @override
  Future<Certificate> verify(String code) async =>
      overview.items.firstWhere((c) => c.code == code, orElse: () => throw const AppException('NOT_FOUND', 'Certificate not found'));
}

class FakeTeachersRepository implements TeachersRepository {
  FakeTeachersRepository(this.profile);
  final TeacherProfile profile;

  @override
  Future<TeacherProfile> teacher(String id) async => profile;
}

/// Course/batch proposals: records every call; [preview], [createError] and [reviewError] steer the answers.
class FakeProposalsRepository implements ProposalsRepository {
  FakeProposalsRepository({
    this.mine = const [],
    this.batchable = const [],
    this.pendingCourseList = const [],
    this.pendingBatchList = const [],
    this.preview = const SchedulePreview(),
    this.createError,
    this.reviewError,
  });
  List<Course> mine;
  List<Course> batchable;
  List<Course> pendingCourseList;
  List<Batch> pendingBatchList;
  SchedulePreview preview;
  Object? createError;
  Object? reviewError;

  final List<CourseDraft> createdCourses = [];
  final List<(String, CourseDraft)> updatedCourses = [];
  final List<String> submittedCourses = [];
  final List<String> submittedBatches = [];
  final List<BatchDraft> createdBatches = [];
  final List<(ScheduleDraft, String)> previews = [];
  final List<({String id, bool approve, String? note})> courseReviews = [];
  final List<({String id, bool approve, String? note})> batchReviews = [];
  int uploads = 0;

  Course _course(String id, CourseDraft d, CourseStatus status) => Course(
        id: id,
        slug: id,
        titleEn: d.titleEn,
        titleAr: d.titleAr,
        descriptionEn: d.descriptionEn,
        category: d.category,
        level: d.level,
        coverStyle: d.coverStyle,
        coverImageUrl: d.coverImageUrl,
        priceFils: (d.priceAed * 100).round(),
        status: status,
        createdById: teacher.id,
        modules: [for (final (i, m) in d.modules.indexed) CourseModule(order: i + 1, titleEn: m.titleEn, titleAr: m.titleAr)],
      );

  @override
  Future<List<Course>> myCourses() async => mine;
  @override
  Future<List<Course>> batchableCourses() async => batchable;
  @override
  Future<Course> createCourse(CourseDraft draft) async {
    createdCourses.add(draft);
    return _course('c-new', draft, CourseStatus.draft);
  }

  @override
  Future<Course> updateCourse(String id, CourseDraft draft) async {
    updatedCourses.add((id, draft));
    return _course(id, draft, CourseStatus.draft);
  }

  @override
  Future<Course> submitCourse(String id) async {
    submittedCourses.add(id);
    final d = updatedCourses.isNotEmpty ? updatedCourses.last.$2 : createdCourses.last;
    return _course(id, d, CourseStatus.pendingReview);
  }

  @override
  Future<String> uploadCover(List<int> jpegBytes) async {
    uploads++;
    return '/media/course-covers/test.jpg';
  }

  @override
  Future<SchedulePreview> previewSchedule(ScheduleDraft schedule, {required String timezone}) async {
    previews.add((schedule, timezone));
    return preview;
  }

  @override
  Future<Batch> createBatch(BatchDraft draft) async {
    createdBatches.add(draft);
    if (createError != null) throw createError!;
    return Batch(id: 'b-new', code: draft.code, courseId: draft.courseId, capacity: draft.capacity, status: BatchStatus.draft);
  }

  @override
  Future<Batch> submitBatch(String id) async {
    submittedBatches.add(id);
    return Batch(id: id, code: createdBatches.isEmpty ? 'B01' : createdBatches.last.code, courseId: '', status: BatchStatus.pendingReview);
  }

  @override
  Future<List<Course>> pendingCourses() async => pendingCourseList;
  @override
  Future<List<Batch>> pendingBatches() async => pendingBatchList;

  @override
  Future<void> reviewCourse(String id, {required bool approve, String? note}) async {
    if (reviewError != null) throw reviewError!;
    courseReviews.add((id: id, approve: approve, note: note));
    pendingCourseList = pendingCourseList.where((c) => c.id != id).toList();
  }

  @override
  Future<void> reviewBatch(String id, {required bool approve, String? note}) async {
    if (reviewError != null) throw reviewError!;
    batchReviews.add((id: id, approve: approve, note: note));
    pendingBatchList = pendingBatchList.where((b) => b.id != id).toList();
  }
}

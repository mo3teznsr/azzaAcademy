import 'dart:async';

import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/money/money.dart';
import 'package:azza/core/network/app_exception.dart';
import 'package:azza/core/realtime/realtime_client.dart';
import 'package:azza/features/admin/data/admin_repository.dart';
import 'package:azza/features/announcements/data/announcements_repository.dart';
import 'package:azza/features/announcements/domain/announcement_models.dart';
import 'package:azza/features/chat/data/chat_repository.dart';
import 'package:azza/features/chat/domain/chat_models.dart';
import 'package:azza/features/support/data/support_repository.dart';
import 'package:azza/features/support/domain/support_models.dart';
import 'package:azza/core/domain/class_ref.dart';
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
import 'package:azza/features/instructors/data/instructors_repository.dart';
import 'package:azza/features/instructors/domain/instructor_models.dart';
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

/// Socket stand-in: records emits and lets a test [fire] server events at the subscribed handlers.
class FakeRealtimeClient implements RealtimeClient {
  final _c = StreamController<bool>.broadcast();
  final Map<String, List<void Function(Map<String, dynamic>)>> _handlers = {};
  final List<(String, Object?)> emitted = [];

  /// Delivers a server → client event to every current subscriber.
  void fire(String event, Map<String, dynamic> payload) {
    for (final h in [...?_handlers[event]]) {
      h(payload);
    }
  }

  int listeners(String event) => _handlers[event]?.length ?? 0;

  @override
  Future<void> connect() async {}
  @override
  Stream<bool> get connection => _c.stream;
  @override
  void dispose() => _c.close();
  @override
  void emit(String event, [Object? data]) => emitted.add((event, data));
  @override
  bool get isConnected => true;
  @override
  void Function() on(String event, void Function(Map<String, dynamic> payload) handler) {
    (_handlers[event] ??= []).add(handler);
    return () => _handlers[event]?.remove(handler);
  }
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

/// Instructors directory and applications: records applications and reviews; [applyError] / [reviewError] steer failures.
class FakeInstructorsRepository implements InstructorsRepository {
  FakeInstructorsRepository({this.cards = const [], this.application, this.pending = const [], this.applyError, this.reviewError});
  List<InstructorCard> cards;
  InstructorApplication? application;
  List<InstructorApplication> pending;
  Object? applyError;
  Object? reviewError;

  final List<InstructorApplicationDraft> applied = [];
  final List<({String id, bool approve, String? note})> reviews = [];
  int mineCalls = 0;

  @override
  Future<List<InstructorCard>> directory() async => cards;

  @override
  Future<InstructorApplication?> mine() async {
    mineCalls++;
    return application;
  }

  @override
  Future<InstructorApplication> apply(InstructorApplicationDraft draft) async {
    applied.add(draft);
    if (applyError != null) throw applyError!;
    return application = InstructorApplication(
      id: 'app-new',
      status: ApplicationStatus.pending,
      headline: draft.headline,
      bio: draft.bio,
      categories: draft.categories,
      languages: draft.languages,
      experience: draft.experience,
      sampleUrl: draft.sampleUrl,
      phone: draft.phone,
      createdAt: DateTime(2026, 11, 6),
    );
  }

  @override
  Future<List<InstructorApplication>> applications({ApplicationStatus? status}) async =>
      pending.where((a) => status == null || a.status == status).toList();

  @override
  Future<void> review(String id, {required bool approve, String? note}) async {
    reviews.add((id: id, approve: approve, note: note));
    if (reviewError != null) throw reviewError!;
    pending = pending.where((a) => a.id != id).toList();
  }
}

const classB07 = ClassRef(id: 'b7', code: 'B07', courseTitle: 'Product Design Foundations', courseTitleAr: 'أساسيات تصميم المنتجات');

/// Chat: [overview] answers the inbox, [threads] the messages; sends wait on [sendGate] when set, and are recorded.
class FakeChatRepository implements ChatRepository {
  FakeChatRepository({this.overview = const ConversationsOverview(), this.threads = const {}, this.classConv, this.directConv, this.sendError});
  ConversationsOverview overview;
  Map<String, MessagesPage> threads;
  Conversation? classConv;
  Conversation? directConv;
  Object? sendError;
  Completer<void>? sendGate;

  final List<(String, String)> sent = [];
  final List<String> reads = [];
  final List<String> deleted = [];
  final List<String> classOpened = [];
  final List<String> directOpened = [];
  final List<DateTime?> pagesBefore = [];

  @override
  Future<ConversationsOverview> conversations() async => overview;
  @override
  Future<Conversation> classConversation(String batchId) async {
    classOpened.add(batchId);
    return classConv!;
  }

  @override
  Future<Conversation> openDirect(String batchId) async {
    directOpened.add(batchId);
    return directConv!;
  }

  @override
  Future<MessagesPage> messages(String conversationId, {DateTime? before, int limit = 50}) async {
    pagesBefore.add(before);
    return threads[conversationId] ?? const MessagesPage();
  }

  @override
  Future<ThreadMessage> send(String conversationId, String body) async {
    sent.add((conversationId, body));
    if (sendGate != null) await sendGate!.future;
    if (sendError != null) throw sendError!;
    return ThreadMessage(id: 'srv-${sent.length}', sender: Person(id: student.id, name: student.name, role: Role.student), body: body, createdAt: DateTime.now());
  }

  @override
  Future<void> markRead(String conversationId) async => reads.add(conversationId);
  @override
  Future<void> deleteMessage(String messageId) async => deleted.add(messageId);
}

class FakeAnnouncementsRepository implements AnnouncementsRepository {
  FakeAnnouncementsRepository({this.mineList = const [], this.byBatch = const {}});
  List<Announcement> mineList;
  Map<String, List<Announcement>> byBatch;
  final List<(String?, AnnouncementDraft)> posted = [];
  final List<String> deleted = [];

  Announcement _from(AnnouncementDraft d, String? batchId) => Announcement(
        id: 'a-${posted.length}',
        scope: batchId == null ? AnnouncementScope.platform : AnnouncementScope.batch,
        title: d.title,
        body: d.body,
        pinned: d.pinned,
        audience: d.audience ?? AnnouncementAudience.all,
        createdAt: DateTime.now(),
      );

  @override
  Future<AnnouncementsPage> mine({int page = 1}) async => AnnouncementsPage(items: mineList, total: mineList.length);
  @override
  Future<AnnouncementsPage> forBatch(String batchId, {int page = 1}) async {
    final items = byBatch[batchId] ?? const <Announcement>[];
    return AnnouncementsPage(items: items, total: items.length);
  }

  @override
  Future<Announcement> postToBatch(String batchId, AnnouncementDraft draft) async {
    posted.add((batchId, draft));
    return _from(draft, batchId);
  }

  @override
  Future<Announcement> postPlatform(AnnouncementDraft draft) async {
    posted.add((null, draft));
    return _from(draft, null);
  }

  @override
  Future<void> delete(String id) async => deleted.add(id);
}

/// Support tickets that follow the API's status rules: a staff reply → AWAITING_USER, an owner reply → OPEN.
class FakeSupportRepository implements SupportRepository {
  FakeSupportRepository({this.list = const [], Map<String, TicketDetail>? details, this.staff = false}) : details = details ?? {};
  List<TicketSummary> list;
  final Map<String, TicketDetail> details;

  /// Whether replies come from an admin.
  bool staff;
  final List<TicketDraft> opened = [];
  final List<(String, String)> replies = [];
  final List<(String, SupportStatus)> statusChanges = [];
  final List<({SupportStatus? status, SupportCategory? category})> queries = [];

  TicketDetail _with(TicketDetail d, {SupportStatus? status, SupportMessage? message}) => TicketDetail(
        summary: TicketSummary(
          id: d.id,
          subject: d.summary.subject,
          category: d.summary.category,
          status: status ?? d.status,
          user: d.summary.user,
          createdAt: d.summary.createdAt,
          lastMessageAt: message?.createdAt ?? d.summary.lastMessageAt,
        ),
        messages: [...d.messages, ?message],
        order: d.order,
        batch: d.batch,
      );

  @override
  Future<TicketsPage> tickets({SupportStatus? status, SupportCategory? category, int page = 1}) async {
    queries.add((status: status, category: category));
    final items = list.where((t) => (status == null || t.status == status) && (category == null || t.category == category)).toList();
    return TicketsPage(items: items, total: items.length);
  }

  @override
  Future<TicketDetail> ticket(String id) async => details[id]!;

  @override
  Future<TicketDetail> open(TicketDraft draft) async {
    opened.add(draft);
    final now = DateTime.now();
    final d = TicketDetail(
      summary: TicketSummary(id: 't-new', subject: draft.subject, category: draft.category, status: SupportStatus.open, lastMessageAt: now, createdAt: now),
      messages: [SupportMessage(id: 'm-1', authorId: student.id, body: draft.body, createdAt: now)],
    );
    details[d.id] = d;
    return d;
  }

  @override
  Future<TicketDetail> reply(String id, String body) async {
    replies.add((id, body));
    final msg = SupportMessage(id: 'm-${replies.length + 10}', authorId: staff ? admin.id : student.id, body: body, fromStaff: staff, createdAt: DateTime.now());
    return details[id] = _with(details[id]!, status: staff ? SupportStatus.awaitingUser : SupportStatus.open, message: msg);
  }

  @override
  Future<TicketDetail> setStatus(String id, SupportStatus status) async {
    statusChanges.add((id, status));
    return details[id] = _with(details[id]!, status: status);
  }
}

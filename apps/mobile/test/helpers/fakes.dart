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
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/checkout/data/checkout_repository.dart';
import 'package:azza/features/checkout/domain/checkout_models.dart';
import 'package:azza/features/learn/data/learn_repository.dart';
import 'package:azza/features/me/data/me_repository.dart';
import 'package:azza/features/me/domain/me_models.dart';
import 'package:azza/features/certificates/data/certificates_repository.dart';
import 'package:azza/features/certificates/domain/certificate_models.dart';
import 'package:azza/features/teachers/data/teachers_repository.dart';
import 'package:azza/features/teachers/domain/teacher_models.dart';
import 'package:azza/features/waitlist/data/waitlist_repository.dart';
import 'package:azza/features/waitlist/domain/waitlist_models.dart';

const student = AppUser(id: 'u-s', name: 'Sara Kamal', email: 'sara@example.com', role: Role.student);
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
  FakeCatalogRepository({this.batchList = const []});
  final List<Batch> batchList;

  @override
  Future<Batch> batch(String id) async => batchList.firstWhere((b) => b.id == id);
  @override
  Future<List<Batch>> batches({String? courseId, String? status, String? teacherId}) async => batchList;
  @override
  Future<Course> course(String idOrSlug) async => throw const AppException('NOT_FOUND', 'Course not found');
  @override
  Future<List<Course>> courses({String? q, String? category, String? level}) async => const [];
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

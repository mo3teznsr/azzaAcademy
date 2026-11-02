import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/utils/json.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../checkout/domain/checkout_models.dart';
import '../../live/domain/live_models.dart';

/// `GET /admin/dashboard` → `alerts[]`: aggregated counts `{ type, severity: info|warning, count }`.
/// Types: `TRANSFERS_TO_VERIFY`, `SEAT_HOLDS_EXPIRING`, `TEACHER_BANK_UNVERIFIED`, `PAYOUTS_HELD`.
@immutable
class AdminAlert {
  const AdminAlert({required this.type, required this.count, this.severity = 'info'});
  factory AdminAlert.fromJson(Json j) =>
      AdminAlert(type: str(j, 'type'), count: integer(j, 'count'), severity: str(j, 'severity', 'info'));

  final String type;
  final int count;
  final String severity;

  bool get urgent => severity == 'warning';
  bool get isTransfer => type == 'TRANSFERS_TO_VERIFY';
  bool get isPayouts => type == 'PAYOUTS_HELD';
}

@immutable
class AdminDashboard {
  const AdminDashboard({
    this.liveRooms = 0,
    this.sessionsToday = 0,
    this.sessionsDone = 0,
    this.sessionsLater = 0,
    this.todaySessions = const [],
    this.activeBatches = 0,
    this.seatsFilledPct = 0,
    this.revenueMonthFils = 0,
    this.alerts = const [],
  });

  /// `{ date, liveRooms, sessionsToday{ count, items }, activeBatches, seats{ held, capacity, filledPercent },
  /// revenueMonth{ grossFils, refundedFils, vatFils, netFils, orders }, alerts[] }`.
  factory AdminDashboard.fromJson(Json j, {DateTime? now}) {
    final today = obj(j, 'sessionsToday');
    final items = list(today, 'items').map(SessionSummary.fromJson).toList()..sort((a, b) => a.startsAt.compareTo(b.startsAt));
    final at = now ?? DateTime.now();
    return AdminDashboard(
      liveRooms: integer(j, 'liveRooms'),
      sessionsToday: integer(today, 'count', items.length),
      sessionsDone: items.where((s) => s.status == SessionStatus.ended).length,
      sessionsLater: items.where((s) => s.status == SessionStatus.scheduled && s.startsAt.isAfter(at)).length,
      todaySessions: items,
      activeBatches: integer(j, 'activeBatches'),
      seatsFilledPct: dbl(obj(j, 'seats'), 'filledPercent'),
      revenueMonthFils: integer(obj(j, 'revenueMonth'), 'grossFils'),
      alerts: list(j, 'alerts').map(AdminAlert.fromJson).where((a) => a.count > 0).toList(),
    );
  }

  final int liveRooms;
  final int sessionsToday;
  final int sessionsDone;
  final int sessionsLater;
  final List<SessionSummary> todaySessions;
  final int activeBatches;
  final double seatsFilledPct;
  final int revenueMonthFils;
  final List<AdminAlert> alerts;
}

@immutable
class LiveRoomStat {
  const LiveRoomStat({
    required this.sessionId,
    required this.batchCode,
    required this.sessionNumber,
    required this.courseTitle,
    this.title = '',
    this.participants = 0,
    this.recording = false,
    this.quality,
    this.region,
    this.startedAt,
    this.teacherName,
    this.status = SessionStatus.live,
  });

  factory LiveRoomStat.fromJson(Json j) {
    final s = j['session'] is Map ? obj(j, 'session') : j;
    final batch = obj(s, 'batch');
    return LiveRoomStat(
      sessionId: str(s, 'id', str(j, 'sessionId')),
      batchCode: str(batch, 'code', str(j, 'batchCode')),
      sessionNumber: integer(s, 'number', 1),
      title: str(s, 'title'),
      courseTitle: str(obj(batch, 'course'), 'titleEn', str(j, 'courseTitle')),
      participants: integer(j, 'participants', integer(j, 'numParticipants')),
      recording: boolean(j, 'recording') || s['egressId'] != null,
      quality: strOrNull(j, 'quality'),
      region: strOrNull(j, 'region'),
      startedAt: date(s, 'startedAt'),
      teacherName: strOrNull(obj(batch, 'teacher'), 'name'),
      status: SessionStatus.parse(s['status'] ?? 'LIVE'),
    );
  }

  final String sessionId;
  final String batchCode;
  final int sessionNumber;
  final String title;
  final String courseTitle;
  final int participants;
  final bool recording;
  final String? quality;
  final String? region;
  final DateTime? startedAt;
  final String? teacherName;
  final SessionStatus status;

  bool get hasIssue => quality != null && quality != 'good' && quality != 'excellent';
}

@immutable
class PayoutLine {
  const PayoutLine({required this.id, required this.teacherName, required this.amountFils, required this.status, this.adjustmentsFils = 0, this.holdReason, this.bankName, this.sessions});
  factory PayoutLine.fromJson(Json j) {
    final t = obj(j, 'teacher');
    return PayoutLine(
      id: str(j, 'id'),
      teacherName: str(t, 'name', str(j, 'teacherName')),
      amountFils: integer(j, 'amountFils'),
      adjustmentsFils: integer(j, 'adjustmentsFils'),
      status: PayoutStatus.parse(j['status']),
      holdReason: strOrNull(j, 'holdReason'),
      bankName: strOrNull(obj(t, 'bankDetails'), 'bankName') ?? strOrNull(j, 'bankName'),
      sessions: intOrNull(obj(j, '_count'), 'earnings'),
    );
  }
  final String id;
  final String teacherName;
  final int amountFils;
  final int adjustmentsFils;
  final PayoutStatus status;
  final String? holdReason;
  final String? bankName;
  final int? sessions;
  int get netFils => amountFils + adjustmentsFils;
}

@immutable
class PayoutRun {
  const PayoutRun({required this.id, required this.periodStart, required this.periodEnd, required this.status, this.payouts = const [], this.totalFils});
  factory PayoutRun.fromJson(Json j) {
    final r = j['run'] is Map ? obj(j, 'run') : j;
    final payouts = [...list(r, 'payouts'), ...list(j, 'payouts')].map(PayoutLine.fromJson).toList();
    return PayoutRun(
      id: str(r, 'id'),
      periodStart: dateOr(r, 'periodStart', DateTime.now()),
      periodEnd: dateOr(r, 'periodEnd', DateTime.now()),
      status: PayoutRunStatus.parse(r['status']),
      payouts: payouts,
      // List items carry `totalFils`; the detail carries `totals{ totalFils, readyFils, … }`.
      totalFils: intOrNull(r, 'totalFils') ?? intOrNull(obj(r, 'totals'), 'totalFils'),
    );
  }

  final String id;
  final DateTime periodStart;
  final DateTime periodEnd;
  final PayoutRunStatus status;
  final List<PayoutLine> payouts;
  final int? totalFils;

  List<PayoutLine> get ready => payouts.where((p) => p.status == PayoutStatus.ready).toList();
  List<PayoutLine> get held => payouts.where((p) => p.status == PayoutStatus.held).toList();
  int get grandTotalFils => totalFils ?? payouts.fold(0, (a, p) => a + p.netFils);
  int get readyTotalFils => ready.fold(0, (a, p) => a + p.netFils);
}

enum TransferDecision { approve, reject, requestNewReceipt }

/// Admin endpoints (dashboard, live rooms, finance).
abstract class AdminRepository {
  Future<AdminDashboard> dashboard();
  Future<List<LiveRoomStat>> liveRooms();
  Future<List<Order>> transfers({String status = 'VERIFYING'});
  Future<void> reviewTransfer(String orderId, TransferDecision decision, {int? receivedFils, String? reason});
  Future<List<PayoutRun>> payoutRuns();
  Future<PayoutRun> payoutRun(String id);
  Future<PayoutRun> createPayoutRun({required DateTime periodStart, required DateTime periodEnd});
  Future<void> approvePayoutRun(String id);
  Future<String> exportPayoutRun(String id);
  Future<List<RescheduleRequest>> rescheduleRequests({String? status = 'PENDING'});
  Future<void> approveReschedule(String requestId);
  Future<void> declineReschedule(String requestId, {String? reason});
}

class DioAdminRepository extends DioRepository implements AdminRepository {
  DioAdminRepository(super.dio);

  @override
  Future<AdminDashboard> dashboard() async => AdminDashboard.fromJson(await getJson('/api/v1/admin/dashboard'));

  @override
  Future<List<LiveRoomStat>> liveRooms() async =>
      (await getItems('/api/v1/admin/live-rooms')).map(LiveRoomStat.fromJson).toList();

  @override
  Future<List<Order>> transfers({String status = 'VERIFYING'}) async =>
      (await getItems('/api/v1/admin/transfers', query: {'status': status})).map(Order.fromJson).toList();

  @override
  Future<void> reviewTransfer(String orderId, TransferDecision decision, {int? receivedFils, String? reason}) =>
      postJson('/api/v1/admin/orders/$orderId/review', switch (decision) {
        TransferDecision.approve => {'decision': 'APPROVE', 'receivedAed': (receivedFils ?? 0) / 100},
        TransferDecision.reject => {'decision': 'REJECT', 'reason': reason ?? ''},
        TransferDecision.requestNewReceipt => {'decision': 'REQUEST_NEW_RECEIPT', 'reason': reason ?? ''},
      });

  @override
  Future<List<PayoutRun>> payoutRuns() async =>
      (await getItems('/api/v1/admin/payout-runs')).map(PayoutRun.fromJson).toList();

  @override
  Future<PayoutRun> payoutRun(String id) async => PayoutRun.fromJson(await getJson('/api/v1/admin/payout-runs/$id'));

  @override
  Future<PayoutRun> createPayoutRun({required DateTime periodStart, required DateTime periodEnd}) async {
    String day(DateTime d) => '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
    return PayoutRun.fromJson(await postJson('/api/v1/admin/payout-runs', {'periodStart': day(periodStart), 'periodEnd': day(periodEnd)}));
  }

  @override
  Future<void> approvePayoutRun(String id) => postJson('/api/v1/admin/payout-runs/$id/approve');

  @override
  Future<String> exportPayoutRun(String id) => guard(() async {
        final res = await dio.post<dynamic>('/api/v1/admin/payout-runs/$id/export');
        return '${res.data}';
      });

  @override
  Future<List<RescheduleRequest>> rescheduleRequests({String? status = 'PENDING'}) async =>
      (await getItems('/api/v1/reschedule-requests', query: {'status': ?status})).map(RescheduleRequest.fromJson).toList();

  @override
  Future<void> approveReschedule(String requestId) =>
      postJson('/api/v1/reschedule-requests/$requestId/approve', {'notifyStudents': true});

  @override
  Future<void> declineReschedule(String requestId, {String? reason}) =>
      postJson('/api/v1/reschedule-requests/$requestId/decline', {'reason': ?reason});
}

final adminRepositoryProvider = Provider<AdminRepository>((ref) => DioAdminRepository(ref.watch(dioProvider)));

final adminDashboardProvider = FutureProvider.autoDispose<AdminDashboard>((ref) => ref.watch(adminRepositoryProvider).dashboard());
final liveRoomsProvider = FutureProvider.autoDispose<List<LiveRoomStat>>((ref) => ref.watch(adminRepositoryProvider).liveRooms());
final transfersProvider = FutureProvider.autoDispose<List<Order>>((ref) => ref.watch(adminRepositoryProvider).transfers());
final payoutRunsProvider = FutureProvider.autoDispose<List<PayoutRun>>((ref) => ref.watch(adminRepositoryProvider).payoutRuns());
final rescheduleRequestsProvider =
    FutureProvider.autoDispose<List<RescheduleRequest>>((ref) => ref.watch(adminRepositoryProvider).rescheduleRequests());
final payoutRunProvider = FutureProvider.autoDispose.family<PayoutRun, String>((ref, id) => ref.watch(adminRepositoryProvider).payoutRun(id));

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/utils/json.dart';
import '../../live/domain/live_models.dart';

@immutable
class RosterStudent {
  const RosterStudent({
    required this.id,
    required this.name,
    this.email = '',
    this.attendancePct,
    this.sessionsAttended = 0,
    this.status = EnrollmentStatus.active,
    this.note,
  });

  /// `GET /batches/:id/roster` → `items[]`: `{ enrollmentId, user{ id, name, email, phone, locale }, sessionsAttended,
  /// attendedSessionIds, secondsAttended, attendancePercent | null }` — ACTIVE students only.
  factory RosterStudent.fromJson(Json j) {
    final u = obj(j, 'user');
    return RosterStudent(
      id: str(u, 'id'),
      name: str(u, 'name'),
      email: str(u, 'email'),
      attendancePct: j['attendancePercent'] == null ? null : dbl(j, 'attendancePercent'),
      sessionsAttended: integer(j, 'sessionsAttended'),
      status: EnrollmentStatus.parse(j['status']),
      note: strOrNull(j, 'note'),
    );
  }

  final String id;
  final String name;
  final String email;
  final double? attendancePct;
  final int sessionsAttended;
  final EnrollmentStatus status;
  final String? note;

  bool get waitlisted => status == EnrollmentStatus.waitlisted;
  bool get atRisk => !waitlisted && attendancePct != null && attendancePct! < 70;
}

@immutable
class BatchEarning {
  const BatchEarning({
    required this.batchId,
    required this.code,
    required this.courseTitle,
    this.courseTitleAr,
    required this.amountFils,
    this.sessionsDelivered = 0,
    this.sessionCount = 0,
    this.perSessionFils,
    this.projectedTotalFils,
  });
  /// `GET /teacher/earnings` → `batches[]`: `{ batchId, code, status, course{ id, titleEn, titleAr }, earnedFils, … }`.
  factory BatchEarning.fromJson(Json j) {
    final course = obj(j, 'course');
    return BatchEarning(
      batchId: str(j, 'batchId'),
      code: str(j, 'code'),
      courseTitle: str(course, 'titleEn'),
      courseTitleAr: strOrNull(course, 'titleAr'),
      amountFils: integer(j, 'earnedFils'),
      sessionsDelivered: integer(j, 'sessionsDelivered'),
      sessionCount: integer(j, 'sessionCount'),
      perSessionFils: intOrNull(j, 'perSessionFils'),
      projectedTotalFils: intOrNull(j, 'projectedTotalFils'),
    );
  }

  final String batchId;
  final String code;
  final String courseTitle;
  final String? courseTitleAr;
  final int amountFils;
  final int sessionsDelivered;
  final int sessionCount;
  final int? perSessionFils;
  final int? projectedTotalFils;
}

@immutable
class LedgerEntry {
  const LedgerEntry({required this.id, required this.amountFils, required this.status, required this.kind, this.createdAt, this.note});
  factory LedgerEntry.fromJson(Json j) => LedgerEntry(
        id: str(j, 'id'),
        amountFils: integer(j, 'amountFils'),
        status: EarningStatus.parse(j['status']),
        kind: str(j, 'kind', 'SESSION'),
        createdAt: date(j, 'createdAt'),
        note: strOrNull(j, 'note'),
      );
  final String id;
  final int amountFils;
  final EarningStatus status;
  final String kind;
  final DateTime? createdAt;
  final String? note;
}

@immutable
class EarningsSummary {
  const EarningsSummary({
    this.earnedThisMonthFils = 0,
    this.scheduledRestOfMonthFils = 0,
    this.availableFils = 0,
    this.pendingFils = 0,
    this.lifetimePaidFils = 0,
    this.nextPayout,
    this.nextPayoutEstimateFils,
    this.batches = const [],
    this.ledger = const [],
  });

  /// `summary.nextPayout` is `{ expectedOn: 'YYYY-MM-DD', estimatedFils }`.
  factory EarningsSummary.fromJson(Json j) {
    final s = obj(j, 'summary');
    final next = obj(s, 'nextPayout');
    final expectedOn = strOrNull(next, 'expectedOn');
    return EarningsSummary(
      earnedThisMonthFils: integer(s, 'earnedThisMonthFils'),
      scheduledRestOfMonthFils: integer(s, 'scheduledRestOfMonthFils'),
      availableFils: integer(s, 'availableFils'),
      pendingFils: integer(s, 'pendingFils'),
      lifetimePaidFils: integer(s, 'lifetimePaidFils'),
      nextPayout: expectedOn == null ? null : DateTime.tryParse(expectedOn),
      nextPayoutEstimateFils: intOrNull(next, 'estimatedFils'),
      batches: list(j, 'batches').map(BatchEarning.fromJson).toList(),
      ledger: list(j, 'ledger').map(LedgerEntry.fromJson).toList(),
    );
  }

  final int earnedThisMonthFils;
  final int scheduledRestOfMonthFils;
  final int availableFils;
  final int pendingFils;
  final int lifetimePaidFils;
  final DateTime? nextPayout;
  final int? nextPayoutEstimateFils;
  final List<BatchEarning> batches;
  final List<LedgerEntry> ledger;
}

@immutable
class PayoutEntry {
  const PayoutEntry({required this.id, required this.amountFils, required this.status, this.paidAt, this.reference, this.periodEnd, this.holdReason});
  factory PayoutEntry.fromJson(Json j) => PayoutEntry(
        id: str(j, 'id'),
        amountFils: integer(j, 'amountFils') + integer(j, 'adjustmentsFils'),
        status: PayoutStatus.parse(j['status']),
        paidAt: date(j, 'paidAt'),
        reference: strOrNull(j, 'transferReference'),
        periodEnd: date(obj(j, 'run'), 'periodEnd') ?? date(j, 'createdAt'),
        holdReason: strOrNull(j, 'holdReason'),
      );
  final String id;
  final int amountFils;
  final PayoutStatus status;
  final DateTime? paidAt;
  final String? reference;
  final DateTime? periodEnd;
  final String? holdReason;
}

@immutable
class TeacherBankDetails {
  const TeacherBankDetails({required this.bankName, required this.accountHolder, required this.iban, required this.swift, this.verified = false});
  factory TeacherBankDetails.fromJson(Json j) => TeacherBankDetails(
        bankName: str(j, 'bankName'),
        accountHolder: str(j, 'accountHolder'),
        iban: str(j, 'iban'),
        swift: str(j, 'swift'),
        verified: boolean(j, 'verified'),
      );
  final String bankName;
  final String accountHolder;
  final String iban;
  final String swift;
  final bool verified;

  String get maskedIban {
    final clean = iban.replaceAll(' ', '');
    final last4 = clean.length >= 4 ? clean.substring(clean.length - 4) : clean;
    return 'AE•• •••• •••• $last4';
  }

  Map<String, dynamic> toJson() => {'bankName': bankName, 'accountHolder': accountHolder, 'iban': iban, 'swift': swift};

  static final ibanPattern = RegExp(r'^AE\d{21}$');
  static final swiftPattern = RegExp(r'^[A-Z0-9]{8}([A-Z0-9]{3})?$');
}

/// Teacher-only endpoints: roster, earnings, payouts, bank details.
abstract class TeacherRepository {
  Future<List<RosterStudent>> roster(String batchId);
  Future<EarningsSummary> earnings();
  Future<List<PayoutEntry>> payouts();
  Future<TeacherBankDetails?> bankDetails();
  Future<TeacherBankDetails> saveBankDetails(TeacherBankDetails details);

  /// My reschedule requests (all statuses, newest first).
  Future<List<RescheduleRequest>> rescheduleRequests();
}

class DioTeacherRepository extends DioRepository implements TeacherRepository {
  DioTeacherRepository(super.dio);

  @override
  Future<List<RosterStudent>> roster(String batchId) async {
    final j = await getJson('/api/v1/batches/$batchId/roster');
    return list(j, 'items').map(RosterStudent.fromJson).toList();
  }

  @override
  Future<EarningsSummary> earnings() async => EarningsSummary.fromJson(await getJson('/api/v1/teacher/earnings'));

  @override
  Future<List<PayoutEntry>> payouts() async => (await getItems('/api/v1/teacher/payouts')).map(PayoutEntry.fromJson).toList();

  @override
  Future<TeacherBankDetails?> bankDetails() async {
    final j = await getJson('/api/v1/teacher/bank-details');
    final d = objOrNull(j, 'bankDetails');
    return d == null ? null : TeacherBankDetails.fromJson(d);
  }

  @override
  Future<List<RescheduleRequest>> rescheduleRequests() async =>
      (await getItems('/api/v1/reschedule-requests')).map(RescheduleRequest.fromJson).toList();

  @override
  Future<TeacherBankDetails> saveBankDetails(TeacherBankDetails details) async {
    // PUT returns the saved record itself (not wrapped).
    final j = await putJson('/api/v1/teacher/bank-details', details.toJson());
    return j['iban'] == null ? details : TeacherBankDetails.fromJson(j);
  }
}

final teacherRepositoryProvider = Provider<TeacherRepository>((ref) => DioTeacherRepository(ref.watch(dioProvider)));

final rosterProvider = FutureProvider.autoDispose.family<List<RosterStudent>, String>(
  (ref, batchId) => ref.watch(teacherRepositoryProvider).roster(batchId),
);
final earningsProvider = FutureProvider.autoDispose<EarningsSummary>((ref) => ref.watch(teacherRepositoryProvider).earnings());
final payoutsProvider = FutureProvider.autoDispose<List<PayoutEntry>>((ref) => ref.watch(teacherRepositoryProvider).payouts());
final bankDetailsProvider = FutureProvider.autoDispose<TeacherBankDetails?>((ref) => ref.watch(teacherRepositoryProvider).bankDetails());
final myRescheduleRequestsProvider =
    FutureProvider.autoDispose<List<RescheduleRequest>>((ref) => ref.watch(teacherRepositoryProvider).rescheduleRequests());

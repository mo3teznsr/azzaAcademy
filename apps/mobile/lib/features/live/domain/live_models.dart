import 'package:flutter/foundation.dart';

import '../../../core/utils/json.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../learn/data/learn_repository.dart';

@immutable
class AgendaBlock {
  const AgendaBlock({required this.minute, required this.label});
  factory AgendaBlock.fromJson(Json j) => AgendaBlock(minute: integer(j, 'minute'), label: str(j, 'label'));
  final int minute;
  final String label;
  Map<String, dynamic> toJson() => {'minute': minute, 'label': label};
}

@immutable
class SessionDetail {
  const SessionDetail({
    required this.session,
    this.batch,
    this.agenda = const [],
    this.notes,
    this.materials = const [],
    this.hostId,
    this.startedAt,
    this.endedAt,
    this.waitingCount,
    this.assignments = const [],
  });

  factory SessionDetail.fromJson(Json j) {
    final s = j['session'] is Map ? obj(j, 'session') : j;
    final batchJson = objOrNull(s, 'batch') ?? objOrNull(j, 'batch');
    final batch = batchJson == null ? null : Batch.fromJson(batchJson);
    final base = SessionSummary.fromJson(s);
    final agendaRaw = s['agenda'];
    return SessionDetail(
      session: SessionSummary(
        id: base.id,
        batchId: base.batchId.isEmpty ? (batch?.id ?? '') : base.batchId,
        number: base.number,
        title: base.title,
        startsAt: base.startsAt,
        endsAt: base.endsAt,
        status: base.status,
        movedFrom: base.movedFrom,
        recordingUrl: base.recordingUrl,
        batchCode: base.batchCode.isEmpty ? (batch?.code ?? '') : base.batchCode,
        courseTitle: base.courseTitle.isEmpty ? (batch?.course?.titleEn ?? '') : base.courseTitle,
        courseTitleAr: base.courseTitleAr ?? batch?.course?.titleAr,
        participantCount: base.participantCount,
      ),
      batch: batch,
      agenda: agendaRaw is List
          ? agendaRaw.whereType<Map>().map((e) => AgendaBlock.fromJson(e.cast<String, dynamic>())).toList()
          : const [],
      notes: strOrNull(s, 'notes'),
      materials: [...list(s, 'materials'), ...list(j, 'materials')].map(CourseMaterial.fromJson).toList(),
      hostId: strOrNull(s, 'hostId'),
      startedAt: date(s, 'startedAt'),
      endedAt: date(s, 'endedAt'),
      waitingCount: intOrNull(j, 'waitingCount'),
      assignments: [...list(s, 'assignments'), if (!identical(s, j)) ...list(j, 'assignments')].map(Assignment.fromJson).toList(),
    );
  }

  final SessionSummary session;
  final Batch? batch;
  final List<AgendaBlock> agenda;
  final String? notes;
  final List<CourseMaterial> materials;
  final String? hostId;
  final DateTime? startedAt;
  final DateTime? endedAt;
  final int? waitingCount;

  /// Practice set for this session (`GET /sessions/:id` → `assignments`).
  final List<Assignment> assignments;

  String get slate => '${session.batchCode} · S${session.number.toString().padLeft(2, '0')}';
}

enum LiveRole { host, student, observer }

@immutable
class JoinGrant {
  const JoinGrant({required this.serverUrl, required this.token, required this.roomName, required this.role});
  factory JoinGrant.fromJson(Json j) => JoinGrant(
        serverUrl: str(j, 'serverUrl'),
        token: str(j, 'token'),
        roomName: str(j, 'roomName'),
        role: switch (str(j, 'role')) {
          'host' => LiveRole.host,
          'observer' => LiveRole.observer,
          _ => LiveRole.student,
        },
      );

  final String serverUrl;
  final String token;
  final String roomName;
  final LiveRole role;
  bool get isHost => role == LiveRole.host;
  /// The API's dev mode (no LiveKit keys) returns `serverUrl: ""` and a `dev-token:…` string.
  bool get videoAvailable => serverUrl.isNotEmpty && token.isNotEmpty && !devMode;
  bool get devMode => serverUrl.isEmpty || token.startsWith('dev-token');
}

@immutable
class ChatMessage {
  const ChatMessage({required this.id, required this.userId, required this.userName, required this.role, required this.body, required this.createdAt});
  factory ChatMessage.fromJson(Json j) {
    final u = obj(j, 'user');
    return ChatMessage(
      id: str(j, 'id'),
      userId: str(u, 'id', str(j, 'userId')),
      userName: str(u, 'name', str(j, 'userName')),
      role: str(u, 'role', 'STUDENT'),
      body: str(j, 'body'),
      createdAt: dateOr(j, 'createdAt', DateTime.now()),
    );
  }

  final String id;
  final String userId;
  final String userName;
  final String role;
  final String body;
  final DateTime createdAt;
  bool get fromHost => role == 'TEACHER' || role == 'ADMIN';
}

@immutable
class RaisedHand {
  const RaisedHand({required this.userId, required this.name, required this.raisedAt});
  factory RaisedHand.fromJson(Json j) => RaisedHand(
        userId: str(j, 'userId', str(j, 'id')),
        name: str(j, 'name'),
        raisedAt: dateOr(j, 'raisedAt', DateTime.now()),
      );
  final String userId;
  final String name;
  final DateTime raisedAt;
}

enum AttendanceMark {
  present('PRESENT'),
  late('LATE'),
  leftEarly('LEFT_EARLY'),
  absent('ABSENT');

  const AttendanceMark(this.wire);
  final String wire;

  static AttendanceMark? parse(Object? raw) {
    for (final m in values) {
      if (m.wire == raw) return m;
    }
    return null;
  }
}

@immutable
class AttendanceRow {
  const AttendanceRow({
    required this.userId,
    required this.name,
    required this.seconds,
    this.joinedAt,
    this.leftAt,
    required this.mark,
    this.corrected = false,
  });

  /// `GET /sessions/:id/attendance` item: `{ user, attended, firstJoinedAt, lastLeftAt, seconds, joins, mark }`.
  /// `mark` is the saved teacher/admin correction (`PRESENT|LATE|LEFT_EARLY|ABSENT`), `null` when untouched.
  factory AttendanceRow.fromJson(Json j, {required Duration sessionLength, required DateTime startsAt}) {
    final u = obj(j, 'user');
    final seconds = integer(j, 'seconds');
    final joined = date(j, 'firstJoinedAt');
    final left = date(j, 'lastLeftAt');
    final saved = AttendanceMark.parse(j['mark']);
    return AttendanceRow(
      userId: str(u, 'id'),
      name: str(u, 'name'),
      seconds: seconds,
      joinedAt: joined,
      leftAt: left,
      corrected: saved != null,
      mark: saved ??
          (boolean(j, 'attended') || seconds > 0
              ? classify(seconds: seconds, joinedAt: joined, sessionLength: sessionLength, startsAt: startsAt)
              : AttendanceMark.absent),
    );
  }

  /// Full attendance = ≥ 75% of the session; joining > 10 min late = late.
  static AttendanceMark classify({required int seconds, DateTime? joinedAt, required Duration sessionLength, required DateTime startsAt}) {
    if (seconds <= 0 || joinedAt == null) return AttendanceMark.absent;
    final ratio = sessionLength.inSeconds == 0 ? 1 : seconds / sessionLength.inSeconds;
    if (joinedAt.difference(startsAt).inMinutes > 10) return AttendanceMark.late;
    if (ratio < 0.75) return AttendanceMark.leftEarly;
    return AttendanceMark.present;
  }

  final String userId;
  final String name;
  final int seconds;
  final DateTime? joinedAt;
  final DateTime? leftAt;
  final AttendanceMark mark;
  final bool corrected;

  AttendanceRow withMark(AttendanceMark m) =>
      AttendanceRow(userId: userId, name: name, seconds: seconds, joinedAt: joinedAt, leftAt: leftAt, mark: m, corrected: corrected || m != mark);
}

/// `GET /reschedule-requests` item.
@immutable
class RescheduleRequest {
  const RescheduleRequest({
    required this.id,
    required this.sessionId,
    required this.status,
    required this.startsAt,
    required this.endsAt,
    required this.session,
    this.reason,
    this.requestedByName = '',
    this.decisionNote,
    this.createdAt,
    this.decidedAt,
  });

  factory RescheduleRequest.fromJson(Json j) => RescheduleRequest(
        id: str(j, 'id'),
        sessionId: str(j, 'sessionId'),
        status: str(j, 'status', 'PENDING'),
        startsAt: dateOr(j, 'startsAt', DateTime.now()),
        endsAt: dateOr(j, 'endsAt', DateTime.now()),
        session: SessionSummary.fromJson(obj(j, 'session')),
        reason: strOrNull(j, 'reason'),
        requestedByName: str(obj(j, 'requestedBy'), 'name'),
        decisionNote: strOrNull(j, 'decisionNote'),
        createdAt: date(j, 'createdAt'),
        decidedAt: date(j, 'decidedAt'),
      );

  final String id;
  final String sessionId;

  /// `PENDING` · `APPROVED` · `DECLINED`.
  final String status;

  /// Proposed new time.
  final DateTime startsAt;
  final DateTime endsAt;

  /// The session as currently scheduled (with batch code + course title).
  final SessionSummary session;
  final String? reason;
  final String requestedByName;
  final String? decisionNote;
  final DateTime? createdAt;
  final DateTime? decidedAt;

  bool get pending => status == 'PENDING';
}

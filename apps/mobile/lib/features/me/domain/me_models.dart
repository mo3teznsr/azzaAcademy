import 'package:flutter/foundation.dart';

import '../../../core/domain/enums.dart';
import '../../../core/utils/json.dart';
import '../../catalog/domain/catalog_models.dart';

@immutable
class Enrollment {
  const Enrollment({
    required this.id,
    required this.status,
    required this.batch,
    this.sessionsDone,
    this.sessionsTotal,
    this.sessionsAttended,
    this.latestOrderId,
    this.latestOrderStatus,
  });

  /// `GET /me/enrollments` item: the batch has no `sessions[]`, only a top-level
  /// `nextSession` and `progress { sessionsDone, sessionsTotal, sessionsAttended, percent }`.
  factory Enrollment.fromJson(Json j) {
    final batchJson = obj(j, 'batch');
    final next = objOrNull(j, 'nextSession');
    final batch = Batch.fromJson(
      next != null && list(batchJson, 'sessions').isEmpty ? {...batchJson, 'sessions': [next]} : batchJson,
    );
    final progress = obj(j, 'progress');
    return Enrollment(
      id: str(j, 'id'),
      status: EnrollmentStatus.parse(j['status']),
      batch: batch,
      sessionsDone: intOrNull(progress, 'sessionsDone'),
      sessionsTotal: intOrNull(progress, 'sessionsTotal'),
      sessionsAttended: intOrNull(progress, 'sessionsAttended'),
      latestOrderId: strOrNull(obj(j, 'latestOrder'), 'id'),
      latestOrderStatus: objOrNull(j, 'latestOrder') == null ? null : OrderStatus.parse(obj(j, 'latestOrder')['status']),
    );
  }

  final String id;
  final EnrollmentStatus status;
  final Batch batch;
  final int? sessionsDone;
  final int? sessionsTotal;
  final int? sessionsAttended;
  final String? latestOrderId;
  final OrderStatus? latestOrderStatus;

  int done(DateTime now) => sessionsDone ?? batch.sessionsDone(now);
  int get total => sessionsTotal ?? batch.sessionCount;
  bool get isActive => status == EnrollmentStatus.active;
}

@immutable
class AppNotification {
  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.createdAt,
    this.read = false,
    this.data = const {},
  });

  factory AppNotification.fromJson(Json j) => AppNotification(
        id: str(j, 'id'),
        type: str(j, 'type'),
        title: str(j, 'title'),
        body: str(j, 'body'),
        createdAt: dateOr(j, 'createdAt', DateTime.now()),
        read: j['readAt'] != null || boolean(j, 'read'),
        data: obj(j, 'data').map((k, v) => MapEntry(k, '$v')),
      );

  final String id;
  final String type;
  final String title;
  final String body;
  final DateTime createdAt;
  final bool read;
  final Map<String, String> data;

  AppNotification markRead() =>
      AppNotification(id: id, type: type, title: title, body: body, createdAt: createdAt, read: true, data: data);

  /// Deep link target derived from `data` (sessionId / orderId / batchId).
  String? get route => notificationRoute(type, data);
}

/// Where a notification (in-app row or tapped push) leads; null when it has no screen.
String? notificationRoute(String type, Map<String, dynamic> data) {
  // Recording alerts open the list the reader can play from: the teacher's studio recordings or the student library.
  if (type == 'RECORDING_READY_TEACHER' || type == 'RECORDING_NOT_STARTED') return '/teacher/batches/recordings';
  if (type == 'RECORDING_READY') return '/student/library';
  if (data['sessionId'] != null) {
    return type.contains('LIVE') || type.contains('LOBBY') ? '/sessions/${data['sessionId']}/lobby' : null;
  }
  if (data['orderId'] != null) return '/orders/${data['orderId']}';
  if (data['batchId'] != null) return '/batches/${data['batchId']}/schedule';
  return null;
}

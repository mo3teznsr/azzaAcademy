import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../domain/live_models.dart';

/// `/api/v1/sessions/:id/*` — details, LiveKit join, host controls, chat history, attendance.
abstract class SessionRepository {
  Future<SessionDetail> session(String id);
  Future<JoinGrant> join(String id);
  Future<void> start(String id);
  Future<void> end(String id);
  Future<void> mute(String sessionId, String userId);
  Future<void> remove(String sessionId, String userId);
  Future<void> allowSpeak(String sessionId, String userId);
  Future<List<ChatMessage>> messages(String id);
  Future<List<AttendanceRow>> attendance(String id, {required Duration sessionLength, required DateTime startsAt});

  /// Saves teacher/admin corrections (`PATCH /sessions/:id/attendance`).
  Future<void> saveAttendance(String id, Map<String, AttendanceMark> marks);
  Future<void> feedback(String id, {required int rating, List<String> tags = const [], String? comment});
  Future<void> updateAgenda(String id, {String? title, List<AgendaBlock>? agenda, String? notes});
  Future<void> reschedule(String id, {required DateTime startsAt, int? durationMin, String? reason, bool notifyStudents = true});
}

class DioSessionRepository extends DioRepository implements SessionRepository {
  DioSessionRepository(super.dio);

  @override
  Future<SessionDetail> session(String id) async => SessionDetail.fromJson(await getJson('/api/v1/sessions/$id'));

  @override
  Future<JoinGrant> join(String id) async => JoinGrant.fromJson(await postJson('/api/v1/sessions/$id/join'));

  @override
  Future<void> start(String id) => postJson('/api/v1/sessions/$id/start');

  @override
  Future<void> end(String id) => postJson('/api/v1/sessions/$id/end');

  @override
  Future<void> mute(String sessionId, String userId) => postJson('/api/v1/sessions/$sessionId/participants/$userId/mute');

  @override
  Future<void> remove(String sessionId, String userId) =>
      postJson('/api/v1/sessions/$sessionId/participants/$userId/remove');

  @override
  Future<void> allowSpeak(String sessionId, String userId) =>
      postJson('/api/v1/sessions/$sessionId/participants/$userId/allow-speak');

  @override
  Future<List<ChatMessage>> messages(String id) async =>
      (await getItems('/api/v1/sessions/$id/messages')).map(ChatMessage.fromJson).toList();

  @override
  Future<List<AttendanceRow>> attendance(String id, {required Duration sessionLength, required DateTime startsAt}) async =>
      (await getItems('/api/v1/sessions/$id/attendance'))
          .map((j) => AttendanceRow.fromJson(j, sessionLength: sessionLength, startsAt: startsAt))
          .toList();

  @override
  Future<void> saveAttendance(String id, Map<String, AttendanceMark> marks) => patchJson('/api/v1/sessions/$id/attendance', {
        'items': [
          for (final e in marks.entries) {'userId': e.key, 'mark': e.value.wire},
        ],
      });

  @override
  Future<void> feedback(String id, {required int rating, List<String> tags = const [], String? comment}) =>
      postJson('/api/v1/sessions/$id/feedback', {'rating': rating, 'tags': tags, 'comment': ?comment});

  @override
  Future<void> updateAgenda(String id, {String? title, List<AgendaBlock>? agenda, String? notes}) =>
      patchJson('/api/v1/sessions/$id/agenda', {
        'title': ?title,
        if (agenda != null) 'agenda': agenda.map((e) => e.toJson()).toList(),
        'notes': ?notes,
      });

  @override
  Future<void> reschedule(String id, {required DateTime startsAt, int? durationMin, String? reason, bool notifyStudents = true}) =>
      postJson('/api/v1/sessions/$id/reschedule', {
        'startsAt': startsAt.toUtc().toIso8601String(),
        'durationMin': ?durationMin,
        'reason': ?reason,
        'notifyStudents': notifyStudents,
      });
}

final sessionRepositoryProvider = Provider<SessionRepository>((ref) => DioSessionRepository(ref.watch(dioProvider)));

final sessionDetailProvider = FutureProvider.autoDispose.family<SessionDetail, String>(
  (ref, id) => ref.watch(sessionRepositoryProvider).session(id),
);

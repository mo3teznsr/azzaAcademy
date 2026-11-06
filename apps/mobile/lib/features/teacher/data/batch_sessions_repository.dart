import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../catalog/domain/catalog_models.dart';

/// Body of `POST /batches/:id/sessions`: one extra session outside the weekly rule (catch-up, bonus, exam).
@immutable
class NewSessionDraft {
  const NewSessionDraft({required this.startsAt, required this.durationMin, required this.title, this.notifyStudents = true});

  /// The instant the session starts (sent as UTC ISO-8601).
  final DateTime startsAt;

  /// 15–480 minutes.
  final int durationMin;
  final String title;
  final bool notifyStudents;

  static const minMinutes = 15;
  static const maxMinutes = 480;

  Map<String, dynamic> toJson() => {
        'startsAt': startsAt.toUtc().toIso8601String(),
        'durationMin': durationMin,
        'title': title.trim(),
        'notifyStudents': notifyStudents,
      };
}

/// Changing a running batch's sessions and seats: add a session (teacher of the batch or ADMIN),
/// cancel one (ADMIN), and change the seat count (`PATCH /batches/:id { capacity }`, ADMIN).
/// Moving a session uses `SessionRepository.reschedule` (a request for teachers, direct for admins).
abstract class BatchSessionsRepository {
  /// 201 → the new session. 409 `CONFLICT` (`details.conflicts[].withBatch`), 422 `START_IN_PAST` / `BATCH_CLOSED`.
  Future<SessionSummary> addSession(String batchId, NewSessionDraft draft);

  /// 422 `CAPACITY_TOO_LOW` when below the enrolled count.
  Future<Batch> updateCapacity(String batchId, int capacity);

  Future<void> cancelSession(String sessionId, {String? reason, bool notifyStudents = true});
}

class DioBatchSessionsRepository extends DioRepository implements BatchSessionsRepository {
  DioBatchSessionsRepository(super.dio);

  @override
  Future<SessionSummary> addSession(String batchId, NewSessionDraft draft) async =>
      SessionSummary.fromJson(await postJson('/api/v1/batches/$batchId/sessions', draft.toJson()));

  @override
  Future<Batch> updateCapacity(String batchId, int capacity) async =>
      Batch.fromJson(await patchJson('/api/v1/batches/$batchId', {'capacity': capacity}));

  @override
  Future<void> cancelSession(String sessionId, {String? reason, bool notifyStudents = true}) =>
      postJson('/api/v1/sessions/$sessionId/cancel', {'reason': ?reason, 'notifyStudents': notifyStudents});
}

final batchSessionsRepositoryProvider =
    Provider<BatchSessionsRepository>((ref) => DioBatchSessionsRepository(ref.watch(dioProvider)));

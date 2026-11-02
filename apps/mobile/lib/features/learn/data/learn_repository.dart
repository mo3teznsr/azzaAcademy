import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/utils/json.dart';

@immutable
class Recording {
  const Recording({
    required this.sessionId,
    required this.title,
    required this.number,
    required this.batchId,
    required this.batchCode,
    this.url,
    this.durationSec,
    this.progressSec,
    this.recordedAt,
    this.courseTitle = '',
    this.courseTitleAr,
  });

  factory Recording.fromJson(Json j) {
    final batch = obj(j, 'batch');
    return Recording(
      // `GET /me/recordings` items are sessions: `id` is the session id.
      sessionId: str(j, 'id', str(j, 'sessionId')),
      title: str(j, 'title'),
      number: integer(j, 'number', 1),
      batchId: str(j, 'batchId', str(batch, 'id')),
      batchCode: str(j, 'batchCode', str(batch, 'code')),
      url: strOrNull(j, 'recordingUrl'),
      durationSec: intOrNull(j, 'durationSec'),
      progressSec: intOrNull(j, 'progressSec'),
      recordedAt: date(j, 'endedAt') ?? date(j, 'startsAt'),
      courseTitle: str(obj(batch, 'course'), 'titleEn'),
      courseTitleAr: strOrNull(obj(batch, 'course'), 'titleAr'),
    );
  }

  final String sessionId;
  final String title;
  final int number;
  final String batchId;
  final String batchCode;
  final String? url;
  final int? durationSec;
  final int? progressSec;
  final DateTime? recordedAt;
  final String courseTitle;
  final String? courseTitleAr;

  double get progress =>
      (durationSec == null || durationSec == 0 || progressSec == null) ? 0 : (progressSec! / durationSec!).clamp(0, 1);
}

@immutable
class CourseMaterial {
  const CourseMaterial({required this.id, required this.title, required this.url, required this.kind, this.sessionId});
  factory CourseMaterial.fromJson(Json j) => CourseMaterial(
        id: str(j, 'id'),
        title: str(j, 'title'),
        url: str(j, 'url'),
        kind: str(j, 'kind', 'FILE'),
        sessionId: strOrNull(j, 'sessionId'),
      );
  final String id;
  final String title;
  final String url;
  final String kind;
  final String? sessionId;
}

enum AssignmentState { due, submitted, graded }

@immutable
class Assignment {
  const Assignment({
    required this.id,
    required this.title,
    required this.dueAt,
    this.description = '',
    this.maxScore = 100,
    this.sessionNumber,
    this.batchCode = '',
    this.submissionCount,
    this.submittedAt,
    this.score,
    this.feedback,
  });

  factory Assignment.fromJson(Json j) {
    // Students get their own submission as `mySubmission` (null until they submit).
    final sub = objOrNull(j, 'mySubmission') ?? objOrNull(j, 'submission');
    return Assignment(
      id: str(j, 'id'),
      title: str(j, 'title'),
      description: str(j, 'description'),
      dueAt: dateOr(j, 'dueAt', DateTime.now()),
      maxScore: integer(j, 'maxScore', 100),
      sessionNumber: intOrNull(obj(j, 'session'), 'number'),
      batchCode: str(obj(j, 'batch'), 'code'),
      submissionCount: intOrNull(j, 'submissionCount'),
      submittedAt: sub == null ? null : date(sub, 'submittedAt'),
      score: sub == null ? null : intOrNull(sub, 'score'),
      feedback: sub == null ? null : strOrNull(sub, 'feedback'),
    );
  }

  final String id;
  final String title;
  final String description;
  final DateTime dueAt;
  final int maxScore;
  final int? sessionNumber;
  final String batchCode;
  final int? submissionCount;
  final DateTime? submittedAt;
  final int? score;
  final String? feedback;

  AssignmentState get state => score != null
      ? AssignmentState.graded
      : submittedAt != null
          ? AssignmentState.submitted
          : AssignmentState.due;
}

/// Recordings, materials and assignments.
abstract class LearnRepository {
  Future<List<Recording>> recordings();
  Future<List<CourseMaterial>> materials(String batchId);
  Future<List<Assignment>> assignments(String batchId);
  Future<void> submit(String assignmentId, {String? url, String? text});
}

class DioLearnRepository extends DioRepository implements LearnRepository {
  DioLearnRepository(super.dio);

  @override
  Future<List<Recording>> recordings() async =>
      (await getItems('/api/v1/me/recordings')).map(Recording.fromJson).toList();

  @override
  Future<List<CourseMaterial>> materials(String batchId) async =>
      (await getItems('/api/v1/batches/$batchId/materials')).map(CourseMaterial.fromJson).toList();

  @override
  Future<List<Assignment>> assignments(String batchId) async =>
      (await getItems('/api/v1/batches/$batchId/assignments')).map(Assignment.fromJson).toList();

  @override
  Future<void> submit(String assignmentId, {String? url, String? text}) =>
      postJson('/api/v1/assignments/$assignmentId/submissions', {'url': ?url, 'text': ?text});
}

final learnRepositoryProvider = Provider<LearnRepository>((ref) => DioLearnRepository(ref.watch(dioProvider)));

final recordingsProvider = FutureProvider.autoDispose<List<Recording>>((ref) => ref.watch(learnRepositoryProvider).recordings());

final materialsProvider = FutureProvider.autoDispose.family<List<CourseMaterial>, String>(
  (ref, batchId) => ref.watch(learnRepositoryProvider).materials(batchId),
);

final assignmentsProvider = FutureProvider.autoDispose.family<List<Assignment>, String>(
  (ref, batchId) => ref.watch(learnRepositoryProvider).assignments(batchId),
);

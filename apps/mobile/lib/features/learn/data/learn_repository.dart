import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/utils/json.dart';
import '../../checkout/domain/checkout_models.dart' show PickedFile;
import 'file_uploads.dart';

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
    this.sessionId,
    this.submittedUrl,
    this.submittedText,
    this.files = const [],
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
      sessionId: strOrNull(j, 'sessionId') ?? strOrNull(obj(j, 'session'), 'id'),
      submittedUrl: sub == null ? null : strOrNull(sub, 'url'),
      submittedText: sub == null ? null : strOrNull(sub, 'text'),
      files: sub == null ? const [] : list(sub, 'files').map(AttachedFile.fromJson).toList(),
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

  /// The session this assignment is attached to, if any.
  final String? sessionId;

  /// The student's own hand-in: link, text and files.
  final String? submittedUrl;
  final String? submittedText;
  final List<AttachedFile> files;

  /// Still to hand in and past its due time (late submissions are accepted and flagged).
  bool isOverdue(DateTime now) => state == AssignmentState.due && dueAt.isBefore(now);

  bool get submittedLate => submittedAt != null && submittedAt!.isAfter(dueAt);

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
  /// `POST /assignments/:id/submissions`. [files] omitted keeps the previous list on a re-submit.
  Future<void> submit(String assignmentId, {String? url, String? text, List<AttachedFile>? files});

  /// `POST /assignments/:id/submission/file` (multipart `file`, ≤ 20 MB).
  Future<AttachedFile> uploadSubmissionFile(String assignmentId, PickedFile file, {void Function(double progress)? onProgress});
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
  Future<void> submit(String assignmentId, {String? url, String? text, List<AttachedFile>? files}) =>
      postJson('/api/v1/assignments/$assignmentId/submissions', {
        'url': ?url,
        'text': ?text,
        if (files != null) 'files': [for (final f in files) f.toJson()],
      });

  @override
  Future<AttachedFile> uploadSubmissionFile(String assignmentId, PickedFile file, {void Function(double progress)? onProgress}) =>
      guard(() => uploadPickedFile(dio, '/api/v1/assignments/$assignmentId/submission/file', file, onProgress: onProgress));
}

final learnRepositoryProvider = Provider<LearnRepository>((ref) => DioLearnRepository(ref.watch(dioProvider)));

final recordingsProvider = FutureProvider.autoDispose<List<Recording>>((ref) => ref.watch(learnRepositoryProvider).recordings());

final materialsProvider = FutureProvider.autoDispose.family<List<CourseMaterial>, String>(
  (ref, batchId) => ref.watch(learnRepositoryProvider).materials(batchId),
);

final assignmentsProvider = FutureProvider.autoDispose.family<List<Assignment>, String>(
  (ref, batchId) => ref.watch(learnRepositoryProvider).assignments(batchId),
);

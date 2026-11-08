import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../checkout/domain/checkout_models.dart';
import '../../learn/data/file_uploads.dart';
import '../../learn/data/learn_repository.dart';
import '../domain/studio_models.dart';
import '../presentation/teacher_batches_screen.dart' show teacherBatchesProvider;
import 'teacher_repository.dart';

/// The teacher's class tools on mobile: assignments and grading, materials, quiz authoring.
/// Routes: apps/api/src/modules/content (assignments, materials) and apps/api/src/modules/quizzes.
abstract class TeacherStudioRepository {
  /// `POST /batches/:id/assignments`.
  Future<Assignment> createAssignment(String batchId, AssignmentDraft draft);

  /// `PATCH /assignments/:id` (422 `SCORE_TOO_HIGH` when maxScore drops below a grade).
  Future<Assignment> updateAssignment(String assignmentId, AssignmentDraft draft);

  /// `DELETE /assignments/:id` (409 `ASSIGNMENT_HAS_SUBMISSIONS` once anyone has submitted).
  Future<void> deleteAssignment(String assignmentId);

  /// `GET /assignments/:id/submissions` (teacher/admin).
  Future<List<Submission>> submissions(String assignmentId);

  /// `POST /submissions/:id/grade` `{ score ≤ maxScore, feedback? }`.
  Future<Submission> grade(String submissionId, {required int score, String? feedback});

  /// `POST /batches/:id/materials` `{ title, url, kind, sessionId? }`.
  Future<CourseMaterial> addMaterial(String batchId, MaterialDraft draft);

  /// Stores a video file through `POST /courses/media` (`kind=course-video`; MP4/MOV/WEBM ≤ 200 MB) and returns its URL.
  /// Videos stay here: the materials file store doesn't take video.
  Future<String> uploadVideo(PickedFile file);

  /// `POST /batches/:id/materials/file` (documents, images, mp3/m4a; ≤ 50 MB). A FILE material must use the returned URL.
  Future<AttachedFile> uploadMaterialFile(String batchId, PickedFile file, {void Function(double progress)? onProgress});

  Future<StaffQuiz> quiz(String id);
  Future<StaffQuiz> createQuiz(String batchId, QuizDraft draft);
  Future<StaffQuiz> updateQuiz(String batchId, String quizId, QuizDraft draft, {bool withQuestions = true});
  Future<void> deleteQuiz(String batchId, String quizId);
  Future<StaffQuiz> publishQuiz(String batchId, String quizId);
  Future<StaffQuiz> unpublishQuiz(String batchId, String quizId);

  // A recorded course's own quizzes (`/courses/:id/quizzes`): unlimited attempts, no due date.
  Future<StaffQuiz> createCourseQuiz(String courseId, QuizDraft draft);
  Future<StaffQuiz> updateCourseQuiz(String courseId, String quizId, QuizDraft draft, {bool withQuestions = true});
  Future<void> deleteCourseQuiz(String courseId, String quizId);
  Future<StaffQuiz> publishCourseQuiz(String courseId, String quizId);
  Future<StaffQuiz> unpublishCourseQuiz(String courseId, String quizId);

  /// `PUT /courses/:id/preview-lesson` `{ lessonId }` — the one lesson anyone can watch; null clears it.
  Future<void> setPreviewLesson(String courseId, String? lessonId);
}

class DioTeacherStudioRepository extends DioRepository implements TeacherStudioRepository {
  DioTeacherStudioRepository(super.dio);

  @override
  Future<Assignment> createAssignment(String batchId, AssignmentDraft draft) async =>
      Assignment.fromJson(await postJson('/api/v1/batches/$batchId/assignments', draft.toJson()));

  @override
  Future<Assignment> updateAssignment(String assignmentId, AssignmentDraft draft) async =>
      Assignment.fromJson(await patchJson('/api/v1/assignments/$assignmentId', draft.toPatchJson()));

  @override
  Future<void> deleteAssignment(String assignmentId) => guard(() => dio.delete<dynamic>('/api/v1/assignments/$assignmentId'));

  @override
  Future<List<Submission>> submissions(String assignmentId) async =>
      (await getItems('/api/v1/assignments/$assignmentId/submissions')).map(Submission.fromJson).toList();

  @override
  Future<Submission> grade(String submissionId, {required int score, String? feedback}) async =>
      Submission.fromJson(await postJson('/api/v1/submissions/$submissionId/grade', {'score': score, 'feedback': ?feedback}));

  @override
  Future<CourseMaterial> addMaterial(String batchId, MaterialDraft draft) async =>
      CourseMaterial.fromJson(await postJson('/api/v1/batches/$batchId/materials', draft.toJson()));

  @override
  Future<String> uploadVideo(PickedFile file) => guard(() async {
        final type = videoMediaType(file.name);
        final form = FormData.fromMap({
          'kind': 'course-video',
          'file': file.path != null
              ? await MultipartFile.fromFile(file.path!, filename: file.name, contentType: type)
              : MultipartFile.fromBytes(file.bytes ?? const [], filename: file.name, contentType: type),
        });
        final res = await dio.post<dynamic>('/api/v1/courses/media', data: form);
        return '${asMap(res.data)['url'] ?? ''}';
      });

  @override
  Future<AttachedFile> uploadMaterialFile(String batchId, PickedFile file, {void Function(double progress)? onProgress}) =>
      guard(() => uploadPickedFile(dio, '/api/v1/batches/$batchId/materials/file', file, onProgress: onProgress));

  static DioMediaType? videoMediaType(String name) => switch (name.split('.').last.toLowerCase()) {
        'mp4' => DioMediaType('video', 'mp4'),
        'mov' => DioMediaType('video', 'quicktime'),
        'webm' => DioMediaType('video', 'webm'),
        _ => null,
      };

  String _quiz(String batchId, String quizId) => '/api/v1/batches/$batchId/quizzes/$quizId';

  @override
  Future<StaffQuiz> quiz(String id) async => StaffQuiz.fromJson(await getJson('/api/v1/quizzes/$id'));

  @override
  Future<StaffQuiz> createQuiz(String batchId, QuizDraft draft) async =>
      StaffQuiz.fromJson(await postJson('/api/v1/batches/$batchId/quizzes', draft.toJson()));

  @override
  Future<StaffQuiz> updateQuiz(String batchId, String quizId, QuizDraft draft, {bool withQuestions = true}) async =>
      StaffQuiz.fromJson(await patchJson(_quiz(batchId, quizId), draft.toJson(withQuestions: withQuestions)));

  @override
  Future<void> deleteQuiz(String batchId, String quizId) => guard(() => dio.delete<dynamic>(_quiz(batchId, quizId)));

  @override
  Future<StaffQuiz> publishQuiz(String batchId, String quizId) async => StaffQuiz.fromJson(await postJson('${_quiz(batchId, quizId)}/publish'));

  @override
  Future<StaffQuiz> unpublishQuiz(String batchId, String quizId) async => StaffQuiz.fromJson(await postJson('${_quiz(batchId, quizId)}/unpublish'));

  String _courseQuiz(String courseId, String quizId) => '/api/v1/courses/$courseId/quizzes/$quizId';

  @override
  Future<StaffQuiz> createCourseQuiz(String courseId, QuizDraft draft) async =>
      StaffQuiz.fromJson(await postJson('/api/v1/courses/$courseId/quizzes', draft.toJson()));

  @override
  Future<StaffQuiz> updateCourseQuiz(String courseId, String quizId, QuizDraft draft, {bool withQuestions = true}) async =>
      StaffQuiz.fromJson(await patchJson(_courseQuiz(courseId, quizId), draft.toJson(withQuestions: withQuestions)));

  @override
  Future<void> deleteCourseQuiz(String courseId, String quizId) => guard(() => dio.delete<dynamic>(_courseQuiz(courseId, quizId)));

  @override
  Future<StaffQuiz> publishCourseQuiz(String courseId, String quizId) async =>
      StaffQuiz.fromJson(await postJson('${_courseQuiz(courseId, quizId)}/publish'));

  @override
  Future<StaffQuiz> unpublishCourseQuiz(String courseId, String quizId) async =>
      StaffQuiz.fromJson(await postJson('${_courseQuiz(courseId, quizId)}/unpublish'));

  @override
  Future<void> setPreviewLesson(String courseId, String? lessonId) async {
    await putJson('/api/v1/courses/$courseId/preview-lesson', {'lessonId': lessonId});
  }
}

final teacherStudioRepositoryProvider = Provider<TeacherStudioRepository>((ref) => DioTeacherStudioRepository(ref.watch(dioProvider)));

final submissionsProvider = FutureProvider.autoDispose.family<List<Submission>, String>(
  (ref, assignmentId) => ref.watch(teacherStudioRepositoryProvider).submissions(assignmentId),
);

final staffQuizProvider = FutureProvider.autoDispose.family<StaffQuiz, String>((ref, id) => ref.watch(teacherStudioRepositoryProvider).quiz(id));

// ───────────────────────── Video file picker port ─────────────────────────

abstract class MaterialFilePicker {
  Future<PickedFile?> pickVideo();
}

class PlatformMaterialFilePicker implements MaterialFilePicker {
  @override
  Future<PickedFile?> pickVideo() async {
    final files = await FilePicker.pickFiles(type: FileType.custom, allowedExtensions: const ['mp4', 'mov', 'webm']);
    if (files.isEmpty) return null;
    final f = files.first;
    final size = f.lengthSync() ?? await f.length() ?? 0;
    final path = f.path;
    return PickedFile(name: f.name, size: size, path: path, bytes: path == null ? await f.readAsBytes() : null);
  }
}

final materialFilePickerProvider = Provider<MaterialFilePicker>((ref) => PlatformMaterialFilePicker());

/// Largest video `POST /courses/media` accepts.
const maxMaterialVideoBytes = 200 * 1024 * 1024;

// ───────────────────────── Cross-class queues (Today, grading) ─────────────────────────

/// Classes that are running or about to: the ones with students, practice and grading.
bool isTeachingBatch(Batch b) => !b.status.isProposal && b.status != BatchStatus.cancelled && b.status != BatchStatus.completed;

@immutable
class GradingItem {
  const GradingItem({required this.submission, required this.assignment, required this.batch});
  final Submission submission;
  final Assignment assignment;
  final Batch batch;
  bool get late => submission.lateFor(assignment.dueAt);
}

/// Every submission across the teacher's classes, ungraded first (oldest first), then graded.
/// There is no cross-class endpoint, so it is composed like the web grading page:
/// `GET /batches` → `GET /batches/:id/assignments` → `GET /assignments/:id/submissions`.
final gradingQueueProvider = FutureProvider.autoDispose<List<GradingItem>>((ref) async {
  final batches = (await ref.watch(teacherBatchesProvider.future)).where(isTeachingBatch).toList();
  final learn = ref.watch(learnRepositoryProvider);
  final studio = ref.watch(teacherStudioRepositoryProvider);
  final perBatch = await Future.wait(batches.map((b) async => (b, await learn.assignments(b.id))));
  final pairs = [
    for (final (b, list) in perBatch)
      for (final a in list)
        if (a.submissionCount == null || a.submissionCount! > 0) (b, a),
  ];
  final subs = await Future.wait(pairs.map((p) => studio.submissions(p.$2.id)));
  final items = [
    for (var i = 0; i < pairs.length; i++)
      for (final s in subs[i]) GradingItem(submission: s, assignment: pairs[i].$2, batch: pairs[i].$1),
  ];
  items.sort((a, b) {
    if (a.submission.graded != b.submission.graded) return a.submission.graded ? 1 : -1;
    return a.submission.submittedAt.compareTo(b.submission.submittedAt);
  });
  return items;
});

/// At-risk students per running class (attendance under 70%), from each class roster.
final atRiskByBatchProvider = FutureProvider.autoDispose<List<(Batch, int)>>((ref) async {
  final batches = (await ref.watch(teacherBatchesProvider.future)).where(isTeachingBatch).toList();
  final repo = ref.watch(teacherRepositoryProvider);
  final counts = await Future.wait(batches.map((b) async => (b, (await repo.roster(b.id)).where((s) => s.atRisk).length)));
  return counts.where((c) => c.$2 > 0).toList();
});

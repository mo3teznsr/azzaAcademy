import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../catalog/domain/catalog_models.dart';
import '../domain/proposal_models.dart';

/// Teachers propose courses and batches; admins approve or send them back.
abstract class ProposalsRepository {
  /// `GET /courses?mine=true` — the teacher's own proposals, any status.
  Future<List<Course>> myCourses();

  /// Courses a teacher may run a batch on: every published course plus their own proposals.
  Future<List<Course>> batchableCourses();
  Future<Course> createCourse(CourseDraft draft);
  Future<Course> updateCourse(String id, CourseDraft draft);
  Future<Course> submitCourse(String id);

  /// `POST /courses/media` (multipart `file`, `kind=course-cover`) → the stored URL.
  Future<String> uploadCover(List<int> jpegBytes);

  Future<SchedulePreview> previewSchedule(ScheduleDraft schedule, {required String timezone});
  Future<Batch> createBatch(BatchDraft draft);
  Future<Batch> submitBatch(String id);

  // ── Admin ──
  Future<List<Course>> pendingCourses();
  Future<List<Batch>> pendingBatches();
  Future<void> reviewCourse(String id, {required bool approve, String? note});
  Future<void> reviewBatch(String id, {required bool approve, String? note});
}

class DioProposalsRepository extends DioRepository implements ProposalsRepository {
  DioProposalsRepository(super.dio);

  Future<List<Course>> _courses(Map<String, dynamic> query) async =>
      (await getItems('/api/v1/courses', query: {'pageSize': 100, ...query})).map(Course.fromJson).toList();

  @override
  Future<List<Course>> myCourses() => _courses({'mine': 'true'});

  @override
  Future<List<Course>> batchableCourses() async {
    final results = await Future.wait([_courses(const {}), myCourses()]);
    final byId = <String, Course>{};
    for (final c in [...results[1], ...results[0]]) {
      if (c.status != CourseStatus.archived) byId.putIfAbsent(c.id, () => c);
    }
    return byId.values.toList();
  }

  @override
  Future<Course> createCourse(CourseDraft draft) async => Course.fromJson(await postJson('/api/v1/courses', draft.toJson()));

  @override
  Future<Course> updateCourse(String id, CourseDraft draft) async =>
      Course.fromJson(await patchJson('/api/v1/courses/$id', draft.toJson()));

  @override
  Future<Course> submitCourse(String id) async => Course.fromJson(await postJson('/api/v1/courses/$id/submit'));

  @override
  Future<String> uploadCover(List<int> jpegBytes) => guard(() async {
        final form = FormData.fromMap({
          'kind': 'course-cover',
          'file': MultipartFile.fromBytes(jpegBytes, filename: 'cover.jpg', contentType: DioMediaType('image', 'jpeg')),
        });
        final res = await dio.post<dynamic>('/api/v1/courses/media', data: form);
        return '${asMap(res.data)['url'] ?? ''}';
      });

  @override
  Future<SchedulePreview> previewSchedule(ScheduleDraft schedule, {required String timezone}) async =>
      SchedulePreview.fromJson(await postJson('/api/v1/batches/schedule/preview', {...schedule.toJson(), 'timezone': timezone}));

  @override
  Future<Batch> createBatch(BatchDraft draft) async => Batch.fromJson(await postJson('/api/v1/batches', draft.toJson()));

  @override
  Future<Batch> submitBatch(String id) async => Batch.fromJson(await postJson('/api/v1/batches/$id/submit'));

  @override
  Future<List<Course>> pendingCourses() => _courses({'status': CourseStatus.pendingReview.wire});

  @override
  Future<List<Batch>> pendingBatches() async =>
      (await getItems('/api/v1/batches', query: {'pageSize': 100, 'status': BatchStatus.pendingReview.wire})).map(Batch.fromJson).toList();

  Map<String, dynamic> _decision(bool approve, String? note) => {
        'approve': approve,
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
      };

  @override
  Future<void> reviewCourse(String id, {required bool approve, String? note}) =>
      postJson('/api/v1/courses/$id/review', _decision(approve, note));

  @override
  Future<void> reviewBatch(String id, {required bool approve, String? note}) =>
      postJson('/api/v1/batches/$id/review', _decision(approve, note));
}

final proposalsRepositoryProvider = Provider<ProposalsRepository>((ref) => DioProposalsRepository(ref.watch(dioProvider)));

final myCoursesProvider = FutureProvider.autoDispose<List<Course>>((ref) => ref.watch(proposalsRepositoryProvider).myCourses());
final batchableCoursesProvider =
    FutureProvider.autoDispose<List<Course>>((ref) => ref.watch(proposalsRepositoryProvider).batchableCourses());
final pendingCoursesProvider = FutureProvider.autoDispose<List<Course>>((ref) => ref.watch(proposalsRepositoryProvider).pendingCourses());
final pendingBatchesProvider = FutureProvider.autoDispose<List<Batch>>((ref) => ref.watch(proposalsRepositoryProvider).pendingBatches());

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/utils/json.dart';
import '../domain/instructor_models.dart';

/// The public instructors directory and "Teach on Azza" applications.
abstract class InstructorsRepository {
  /// `GET /teachers` — every teacher, those with open batches first.
  Future<List<InstructorCard>> directory();

  /// `GET /instructor-applications/mine` — the signed-in user's latest application, or null.
  Future<InstructorApplication?> mine();

  /// `POST /instructor-applications` (students only).
  Future<InstructorApplication> apply(InstructorApplicationDraft draft);

  // ── Admin ──
  Future<List<InstructorApplication>> applications({ApplicationStatus? status});
  Future<void> review(String id, {required bool approve, String? note});
}

class DioInstructorsRepository extends DioRepository implements InstructorsRepository {
  DioInstructorsRepository(super.dio);

  @override
  Future<List<InstructorCard>> directory() async =>
      (await getItems('/api/v1/teachers')).map(InstructorCard.fromJson).toList();

  @override
  Future<InstructorApplication?> mine() async {
    final app = objOrNull(await getJson('/api/v1/instructor-applications/mine'), 'application');
    return app == null ? null : InstructorApplication.fromJson(app);
  }

  @override
  Future<InstructorApplication> apply(InstructorApplicationDraft draft) async =>
      InstructorApplication.fromJson(await postJson('/api/v1/instructor-applications', draft.toJson()));

  @override
  Future<List<InstructorApplication>> applications({ApplicationStatus? status}) async =>
      (await getItems('/api/v1/instructor-applications', query: {if (status != null) 'status': status.wire}))
          .map(InstructorApplication.fromJson)
          .toList();

  @override
  Future<void> review(String id, {required bool approve, String? note}) => postJson(
        '/api/v1/instructor-applications/$id/review',
        {'approve': approve, if (note != null && note.trim().isNotEmpty) 'note': note.trim()},
      );
}

final instructorsRepositoryProvider = Provider<InstructorsRepository>((ref) => DioInstructorsRepository(ref.watch(dioProvider)));

final instructorDirectoryProvider =
    FutureProvider.autoDispose<List<InstructorCard>>((ref) => ref.watch(instructorsRepositoryProvider).directory());
final myInstructorApplicationProvider =
    FutureProvider.autoDispose<InstructorApplication?>((ref) => ref.watch(instructorsRepositoryProvider).mine());
final pendingApplicationsProvider = FutureProvider.autoDispose<List<InstructorApplication>>(
  (ref) => ref.watch(instructorsRepositoryProvider).applications(status: ApplicationStatus.pending),
);

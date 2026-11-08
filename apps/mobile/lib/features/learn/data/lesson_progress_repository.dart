import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/utils/json.dart';
import '../../auth/presentation/auth_controller.dart';
import '../domain/lesson_models.dart';

/// Lesson completion: `PUT|DELETE /lessons/:id/complete` and `GET /me/learning-progress`.
abstract class LessonProgressRepository {
  /// Marks [lessonId] done (or not done) for the signed-in reader. Idempotent.
  Future<void> setCompleted(String lessonId, bool completed);

  /// Where the reader stopped watching [lessonId]'s uploaded video, in seconds (`GET /lessons/:id` → `videoPositionSec`).
  Future<int> videoPosition(String lessonId);

  /// `PUT /lessons/:id/video-position` `{ positionSec }`; 0 once the video has been watched to the end.
  Future<void> saveVideoPosition(String lessonId, int positionSec);

  /// Per course with an ACTIVE enrollment, plus recorded courses with progress: lessons done, total and the next lesson to open.
  Future<List<CourseProgress>> learningProgress();
}

class DioLessonProgressRepository extends DioRepository implements LessonProgressRepository {
  DioLessonProgressRepository(super.dio);

  @override
  Future<void> setCompleted(String lessonId, bool completed) async {
    final path = '/api/v1/lessons/${Uri.encodeComponent(lessonId)}/complete';
    await guard(() => completed ? dio.put<dynamic>(path, data: const <String, dynamic>{}) : dio.delete<dynamic>(path));
  }

  @override
  Future<int> videoPosition(String lessonId) async =>
      integer(await getJson('/api/v1/lessons/${Uri.encodeComponent(lessonId)}'), 'videoPositionSec');

  @override
  Future<void> saveVideoPosition(String lessonId, int positionSec) async {
    await guard(() => dio.put<dynamic>('/api/v1/lessons/${Uri.encodeComponent(lessonId)}/video-position', data: {'positionSec': positionSec}));
  }

  @override
  Future<List<CourseProgress>> learningProgress() async =>
      (await getItems('/api/v1/me/learning-progress')).map(CourseProgress.fromJson).toList();
}

final lessonProgressRepositoryProvider =
    Provider<LessonProgressRepository>((ref) => DioLessonProgressRepository(ref.watch(dioProvider)));

/// "Continue learning" on the student home.
final learningProgressProvider = FutureProvider.autoDispose<List<CourseProgress>>(
  (ref) => ref.watch(lessonProgressRepositoryProvider).learningProgress(),
);

/// Local, optimistic completion toggles (lesson id → done), layered over what the server sent.
/// A toggle shows at once; if the server refuses, it rolls back and the error reaches the caller.
/// Reset whenever the signed-in user changes, so one account's toggles never show for another.
class LessonCompletionController extends Notifier<Map<String, bool>> {
  @override
  Map<String, bool> build() {
    ref.watch(currentUserProvider.select((u) => u?.id));
    return const {};
  }

  Future<void> set(String lessonId, bool completed) async {
    final before = state.containsKey(lessonId) ? state[lessonId] : null;
    state = {...state, lessonId: completed};
    try {
      await ref.read(lessonProgressRepositoryProvider).setCompleted(lessonId, completed);
      ref.invalidate(learningProgressProvider);
    } catch (_) {
      final rolled = {...state};
      if (before == null) {
        rolled.remove(lessonId);
      } else {
        rolled[lessonId] = before;
      }
      state = rolled;
      rethrow;
    }
  }
}

final lessonCompletionProvider =
    NotifierProvider<LessonCompletionController, Map<String, bool>>(LessonCompletionController.new);

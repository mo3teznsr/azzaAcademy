import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../domain/lesson_qa_models.dart';

/// Questions and answers under lessons of recorded courses. Learners read, ask, mark the answer that helped and delete
/// their unanswered questions here; the course author answers and moderates on the web studio.
abstract class LessonQaRepository {
  Future<LessonQuestions> questions(String lessonId, {int pageSize = 50});
  Future<void> ask(String lessonId, String body);
  Future<void> deleteQuestion(String questionId);
  Future<void> setAccepted(String answerId, bool accepted);
}

class DioLessonQaRepository extends DioRepository implements LessonQaRepository {
  DioLessonQaRepository(super.dio);

  @override
  Future<LessonQuestions> questions(String lessonId, {int pageSize = 50}) async =>
      LessonQuestions.fromJson(await getJson('/api/v1/lessons/$lessonId/questions', query: {'page': 1, 'pageSize': pageSize}));

  @override
  Future<void> ask(String lessonId, String body) => postJson('/api/v1/lessons/$lessonId/questions', {'body': body});

  @override
  Future<void> deleteQuestion(String questionId) => guard(() => dio.delete<dynamic>('/api/v1/lesson-questions/$questionId'));

  @override
  Future<void> setAccepted(String answerId, bool accepted) => accepted
      ? putJson('/api/v1/lesson-answers/$answerId/accepted', const <String, dynamic>{})
      : guard(() => dio.delete<dynamic>('/api/v1/lesson-answers/$answerId/accepted'));
}

final lessonQaRepositoryProvider = Provider<LessonQaRepository>((ref) => DioLessonQaRepository(ref.watch(dioProvider)));

final lessonQuestionsProvider = FutureProvider.autoDispose.family<LessonQuestions, String>(
  (ref, lessonId) => ref.watch(lessonQaRepositoryProvider).questions(lessonId),
);

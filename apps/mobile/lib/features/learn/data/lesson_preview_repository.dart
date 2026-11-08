import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/utils/json.dart';
import '../domain/lesson_models.dart';

/// The one free lesson of a recorded course: `GET /lessons/:id/preview`, readable without an account.
@immutable
class PreviewLesson {
  const PreviewLesson({required this.lesson, required this.courseId});
  final Lesson lesson;
  final String courseId;
}

abstract class LessonPreviewRepository {
  Future<PreviewLesson> preview(String lessonId);
}

class DioLessonPreviewRepository extends DioRepository implements LessonPreviewRepository {
  DioLessonPreviewRepository(super.dio);

  @override
  Future<PreviewLesson> preview(String lessonId) async {
    final j = await getJson('/api/v1/lessons/${Uri.encodeComponent(lessonId)}/preview');
    return PreviewLesson(lesson: Lesson.fromJson(j), courseId: str(j, 'courseId'));
  }
}

final lessonPreviewRepositoryProvider = Provider<LessonPreviewRepository>((ref) => DioLessonPreviewRepository(ref.watch(dioProvider)));

final previewLessonProvider = FutureProvider.autoDispose.family<PreviewLesson, String>(
  (ref, id) => ref.watch(lessonPreviewRepositoryProvider).preview(id),
);

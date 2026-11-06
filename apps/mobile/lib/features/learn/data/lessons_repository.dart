import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../domain/lesson_models.dart';

/// Course lessons (read-only on mobile; teachers author them on the web).
abstract class LessonsRepository {
  Future<CourseLessons> courseLessons(String courseIdOrSlug);
}

class DioLessonsRepository extends DioRepository implements LessonsRepository {
  DioLessonsRepository(super.dio);

  @override
  Future<CourseLessons> courseLessons(String courseIdOrSlug) async =>
      CourseLessons.fromJson(await getJson('/api/v1/courses/${Uri.encodeComponent(courseIdOrSlug)}/lessons'));
}

final lessonsRepositoryProvider = Provider<LessonsRepository>((ref) => DioLessonsRepository(ref.watch(dioProvider)));

final courseLessonsProvider = FutureProvider.autoDispose.family<CourseLessons, String>(
  (ref, courseId) => ref.watch(lessonsRepositoryProvider).courseLessons(courseId),
);

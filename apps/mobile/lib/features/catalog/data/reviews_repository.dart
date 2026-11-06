import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../auth/presentation/auth_controller.dart';
import '../domain/catalog_models.dart';
import '../domain/review_models.dart';

/// Course reviews (read, write, reply, moderate) and the signed-in user's saved courses.
abstract class ReviewsRepository {
  Future<ReviewsPage> reviews(String courseIdOrSlug, {int page = 1});

  /// STUDENT: create or edit their one review (422 `REVIEW_NOT_ELIGIBLE` before attending a session).
  Future<CourseReview> saveMine(String courseId, {required int rating, required String body});
  Future<void> deleteMine(String courseId);

  /// A teacher of the course or an admin answers publicly.
  Future<void> reply(String reviewId, String reply);

  /// ADMIN: hide or show a review (hidden reviews leave the average).
  Future<void> setHidden(String reviewId, bool hidden);

  Future<List<Course>> savedCourses();
  Future<void> setSaved(String courseId, bool saved);
}

class DioReviewsRepository extends DioRepository implements ReviewsRepository {
  DioReviewsRepository(super.dio);

  @override
  Future<ReviewsPage> reviews(String courseIdOrSlug, {int page = 1}) async =>
      ReviewsPage.fromJson(await getJson('/api/v1/courses/$courseIdOrSlug/reviews', query: {'page': page, 'pageSize': 10}));

  @override
  Future<CourseReview> saveMine(String courseId, {required int rating, required String body}) async =>
      CourseReview.fromJson(await putJson('/api/v1/courses/$courseId/reviews/mine', {'rating': rating, 'body': body.trim()}));

  @override
  Future<void> deleteMine(String courseId) => guard(() => dio.delete<dynamic>('/api/v1/courses/$courseId/reviews/mine'));

  @override
  Future<void> reply(String reviewId, String reply) => postJson('/api/v1/reviews/$reviewId/reply', {'reply': reply.trim()});

  @override
  Future<void> setHidden(String reviewId, bool hidden) => patchJson('/api/v1/reviews/$reviewId', {'hidden': hidden});

  @override
  Future<List<Course>> savedCourses() async => (await getItems('/api/v1/me/saved-courses')).map(Course.fromJson).toList();

  @override
  Future<void> setSaved(String courseId, bool saved) => guard<Response<dynamic>>(() => saved
      ? dio.put<dynamic>('/api/v1/courses/$courseId/save', data: const <String, dynamic>{})
      : dio.delete<dynamic>('/api/v1/courses/$courseId/save'));
}

final reviewsRepositoryProvider = Provider<ReviewsRepository>((ref) => DioReviewsRepository(ref.watch(dioProvider)));

/// First page of a course's reviews (more pages are loaded on demand by the screen).
final courseReviewsProvider = FutureProvider.autoDispose.family<ReviewsPage, String>(
  (ref, courseId) => ref.watch(reviewsRepositoryProvider).reviews(courseId),
);

/// Saved courses of the signed-in user; empty when signed out.
final savedCoursesProvider = FutureProvider.autoDispose<List<Course>>((ref) async {
  if (ref.watch(currentUserProvider) == null) return const [];
  return ref.watch(reviewsRepositoryProvider).savedCourses();
});

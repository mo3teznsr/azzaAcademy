import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../domain/catalog_models.dart';
import '../domain/course_filters.dart';

/// Courses & batches (`/api/v1/courses`, `/api/v1/batches`) and categories.
abstract class CatalogRepository {
  Future<List<Course>> courses([CourseFilters filters = const CourseFilters()]);
  Future<Course> course(String idOrSlug);
  Future<List<Batch>> batches({String? courseId, String? status, String? teacherId});
  Future<Batch> batch(String id);

  /// `GET /categories` — active categories with their published-course counts.
  Future<List<CourseCategory>> categories();

  /// `GET /courses/:idOrSlug/related` (≤ 4).
  Future<List<Course>> related(String idOrSlug);
}

class DioCatalogRepository extends DioRepository implements CatalogRepository {
  DioCatalogRepository(super.dio);

  @override
  Future<List<Course>> courses([CourseFilters filters = const CourseFilters()]) async {
    final items = await getItems('/api/v1/courses', query: {'pageSize': 50, ...filters.toQuery()});
    final all = items.map(Course.fromJson).toList();
    // The list also honours `type` server-side; this keeps the filter true against an API that doesn't yet.
    return filters.type == null ? all : all.where((c) => c.type == filters.type).toList();
  }

  @override
  Future<Course> course(String idOrSlug) async => Course.fromJson(await getJson('/api/v1/courses/$idOrSlug'));

  @override
  Future<List<Batch>> batches({String? courseId, String? status, String? teacherId}) async {
    final items = await getItems('/api/v1/batches', query: {
      'pageSize': 100,
      'courseId': ?courseId,
      'status': ?status,
      'teacherId': ?teacherId,
    });
    return items.map(Batch.fromJson).toList();
  }

  @override
  Future<Batch> batch(String id) async => Batch.fromJson(await getJson('/api/v1/batches/$id'));

  @override
  Future<List<CourseCategory>> categories() async =>
      (await getItems('/api/v1/categories')).map(CourseCategory.fromJson).where((c) => c.slug.isNotEmpty).toList();

  @override
  Future<List<Course>> related(String idOrSlug) async =>
      (await getItems('/api/v1/courses/$idOrSlug/related')).map(Course.fromJson).toList();
}

final catalogRepositoryProvider = Provider<CatalogRepository>((ref) => DioCatalogRepository(ref.watch(dioProvider)));

final courseProvider = FutureProvider.autoDispose.family<Course, String>(
  (ref, id) => ref.watch(catalogRepositoryProvider).course(id),
);

final courseBatchesProvider = FutureProvider.autoDispose.family<List<Batch>, String>((ref, courseId) async {
  final all = await ref.watch(catalogRepositoryProvider).batches(courseId: courseId);
  return all.where((b) => b.status.canEnroll || b.status.name == 'full').toList();
});

final batchProvider = FutureProvider.autoDispose.family<Batch, String>(
  (ref, id) => ref.watch(catalogRepositoryProvider).batch(id),
);

final categoriesProvider = FutureProvider.autoDispose<List<CourseCategory>>((ref) => ref.watch(catalogRepositoryProvider).categories());

final relatedCoursesProvider = FutureProvider.autoDispose.family<List<Course>, String>(
  (ref, id) => ref.watch(catalogRepositoryProvider).related(id),
);

/// `GET /courses?featured=true` (ordered by `featuredRank`).
final featuredCoursesProvider = FutureProvider.autoDispose<List<Course>>(
  (ref) => ref.watch(catalogRepositoryProvider).courses(const CourseFilters(featured: true)),
);

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../domain/catalog_models.dart';

/// Courses & batches (`/api/v1/courses`, `/api/v1/batches`).
abstract class CatalogRepository {
  Future<List<Course>> courses({String? q, String? category, String? level});
  Future<Course> course(String idOrSlug);
  Future<List<Batch>> batches({String? courseId, String? status, String? teacherId});
  Future<Batch> batch(String id);
}

class DioCatalogRepository extends DioRepository implements CatalogRepository {
  DioCatalogRepository(super.dio);

  @override
  Future<List<Course>> courses({String? q, String? category, String? level}) async {
    final items = await getItems('/api/v1/courses', query: {
      'pageSize': 50,
      if (q != null && q.isNotEmpty) 'q': q,
      'category': ?category,
      'level': ?level,
    });
    return items.map(Course.fromJson).toList();
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

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../domain/teacher_models.dart';

/// Public teacher profiles (`GET /api/v1/teachers/:id`).
abstract class TeachersRepository {
  Future<TeacherProfile> teacher(String id);
}

class DioTeachersRepository extends DioRepository implements TeachersRepository {
  DioTeachersRepository(super.dio);

  @override
  Future<TeacherProfile> teacher(String id) async => TeacherProfile.fromJson(await getJson('/api/v1/teachers/$id'));
}

final teachersRepositoryProvider = Provider<TeachersRepository>((ref) => DioTeachersRepository(ref.watch(dioProvider)));

final teacherProfileProvider = FutureProvider.autoDispose.family<TeacherProfile, String>(
  (ref, id) => ref.watch(teachersRepositoryProvider).teacher(id),
);

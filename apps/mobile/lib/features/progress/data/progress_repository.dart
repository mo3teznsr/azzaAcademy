import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../domain/progress_models.dart';

/// `GET /api/v1/me/progress`, `PUT|DELETE /api/v1/me/progress/goal`, `GET /api/v1/me/badges`.
abstract class ProgressRepository {
  Future<LearnerProgress> summary();
  Future<List<EarnedBadge>> badges();
  Future<LearnerProgress> setGoal({required GoalUnit unit, required int target, required bool reminders});
  Future<LearnerProgress> clearGoal();
}

class DioProgressRepository extends DioRepository implements ProgressRepository {
  DioProgressRepository(super.dio);

  @override
  Future<LearnerProgress> summary() async => LearnerProgress.fromJson(await getJson('/api/v1/me/progress'));

  @override
  Future<List<EarnedBadge>> badges() async => [
        for (final b in await getItems('/api/v1/me/badges'))
          if (badgeIds.contains(b['id'])) EarnedBadge.fromJson(b),
      ];

  @override
  Future<LearnerProgress> setGoal({required GoalUnit unit, required int target, required bool reminders}) async =>
      LearnerProgress.fromJson(await putJson('/api/v1/me/progress/goal', {'unit': unit.wire, 'target': target, 'reminders': reminders}));

  @override
  Future<LearnerProgress> clearGoal() => guard(() async {
        final res = await dio.delete<dynamic>('/api/v1/me/progress/goal');
        return LearnerProgress.fromJson(asMap(res.data));
      });
}

final progressRepositoryProvider = Provider<ProgressRepository>((ref) => DioProgressRepository(ref.watch(dioProvider)));

final myProgressProvider = FutureProvider.autoDispose<LearnerProgress>((ref) => ref.watch(progressRepositoryProvider).summary());

final myBadgesProvider = FutureProvider.autoDispose<List<EarnedBadge>>((ref) => ref.watch(progressRepositoryProvider).badges());

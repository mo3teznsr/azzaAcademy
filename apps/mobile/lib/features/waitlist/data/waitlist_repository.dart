import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../domain/waitlist_models.dart';

/// `GET /api/v1/me/waitlist` · `DELETE /api/v1/batches/:id/waitlist`.
abstract class WaitlistRepository {
  Future<WaitlistOverview> mine();
  Future<void> leave(String batchId);
}

class DioWaitlistRepository extends DioRepository implements WaitlistRepository {
  DioWaitlistRepository(super.dio);

  @override
  Future<WaitlistOverview> mine() async => WaitlistOverview.fromJson(await getJson('/api/v1/me/waitlist'));

  @override
  Future<void> leave(String batchId) => guard(() => dio.delete<dynamic>('/api/v1/batches/$batchId/waitlist'));
}

final waitlistRepositoryProvider = Provider<WaitlistRepository>((ref) => DioWaitlistRepository(ref.watch(dioProvider)));

class WaitlistController extends AsyncNotifier<WaitlistOverview> {
  @override
  Future<WaitlistOverview> build() => ref.watch(waitlistRepositoryProvider).mine();

  /// Leaves the waitlist; the row disappears right away and the list is re-read.
  Future<void> leave(String batchId) async {
    await ref.read(waitlistRepositoryProvider).leave(batchId);
    final current = state.value;
    if (current != null) state = AsyncData(current.without(batchId));
    ref.invalidateSelf();
  }
}

final waitlistProvider = AsyncNotifierProvider.autoDispose<WaitlistController, WaitlistOverview>(WaitlistController.new);

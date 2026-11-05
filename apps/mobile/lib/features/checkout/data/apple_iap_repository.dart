import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../domain/checkout_models.dart';

/// Apple In-App Purchase confirmation (`POST /api/v1/payments/apple/verify`).
abstract class AppleIapRepository {
  /// Sends the StoreKit 2 JWS; the API verifies Apple's signature and marks the order PAID (idempotent).
  /// Throws [AppException] — `details.finishTransaction == true` means retrying can never succeed.
  Future<Order> verify({String? orderId, required String signedTransaction});
}

class DioAppleIapRepository extends DioRepository implements AppleIapRepository {
  DioAppleIapRepository(super.dio);

  @override
  Future<Order> verify({String? orderId, required String signedTransaction}) async {
    final res = await postJson('/api/v1/payments/apple/verify', {'orderId': ?orderId, 'signedTransaction': signedTransaction});
    return Order.fromJson(res['order'] as Map<String, dynamic>);
  }
}

final appleIapRepositoryProvider = Provider<AppleIapRepository>((ref) => DioAppleIapRepository(ref.watch(dioProvider)));

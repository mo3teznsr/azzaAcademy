import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../checkout/data/checkout_repository.dart' show DioCheckoutRepository;
import '../../checkout/domain/checkout_models.dart' show PickedFile;
import '../domain/subscription_models.dart';

/// Plans on recorded courses (`/api/v1/courses/:id/subscribe`, `/subscriptions*`, `/me/subscriptions`).
abstract class SubscriptionRepository {
  /// Starts a plan: Stripe → a checkout URL, Apple → the product and `appAccountToken`, transfer → the bank details.
  Future<SubscribeStart> subscribe(String courseId, SubscriptionPlan plan, SubscribeMethod method);

  /// Where a just-started plan stands. Polled by the return screen until it is ACTIVE.
  Future<SubscriptionLookup> byReference(String reference);

  Future<List<MySubscription>> mine();
  Future<void> cancel(String id);
  Future<void> resume(String id);
  Future<void> switchPlan(String id, SubscriptionPlan plan);

  /// A transfer plan moves to a card: Stripe Checkout's page, starting when the paid period ends.
  Future<String> switchToCard(String id);

  /// Stripe's Customer Portal page for updating the card or cancelling.
  Future<String> portalUrl(String id);

  /// Sends the StoreKit 2 JWS of an auto-renewable purchase; the API verifies Apple's signature and activates the plan (idempotent).
  /// Throws [AppException] — `details.finishTransaction == true` means retrying can never succeed.
  Future<void> verifyApple(String signedTransaction);

  /// Uploads the receipt for a transfer payment (it then waits for review).
  Future<void> submitReceipt(String paymentId, PickedFile file);
}

class DioSubscriptionRepository extends DioRepository implements SubscriptionRepository {
  DioSubscriptionRepository(super.dio);

  @override
  Future<SubscribeStart> subscribe(String courseId, SubscriptionPlan plan, SubscribeMethod method) async {
    final res = await postJson('/api/v1/courses/${Uri.encodeComponent(courseId)}/subscribe', {'plan': plan.wire, 'method': method.wire});
    return SubscribeStart.parse(method, res);
  }

  @override
  Future<SubscriptionLookup> byReference(String reference) async =>
      SubscriptionLookup.fromJson(await getJson('/api/v1/subscriptions/by-reference/${Uri.encodeComponent(reference)}'));

  @override
  Future<List<MySubscription>> mine() async => (await getItems('/api/v1/me/subscriptions')).map(MySubscription.fromJson).toList();

  @override
  Future<void> cancel(String id) async => await postJson('/api/v1/subscriptions/$id/cancel');

  @override
  Future<void> resume(String id) async => await postJson('/api/v1/subscriptions/$id/resume');

  @override
  Future<void> switchPlan(String id, SubscriptionPlan plan) async => await postJson('/api/v1/subscriptions/$id/switch', {'plan': plan.wire});

  @override
  Future<String> switchToCard(String id) async => (await postJson('/api/v1/subscriptions/$id/switch-to-card'))['checkoutUrl'] as String? ?? '';

  @override
  Future<String> portalUrl(String id) async => (await postJson('/api/v1/subscriptions/$id/portal'))['url'] as String? ?? '';

  @override
  Future<void> verifyApple(String signedTransaction) async =>
      await postJson('/api/v1/subscriptions/apple/verify', {'signedTransaction': signedTransaction});

  /// `POST /subscription-payments/:id/receipt` (multipart `file`; PDF/PNG/JPG/WEBP/HEIC ≤ 10 MB).
  @override
  Future<void> submitReceipt(String paymentId, PickedFile file) => guard(() async {
        final type = DioCheckoutRepository.mediaTypeFor(file.name);
        final form = FormData.fromMap({
          'file': file.path != null
              ? await MultipartFile.fromFile(file.path!, filename: file.name, contentType: type)
              : MultipartFile.fromBytes(file.bytes ?? const [], filename: file.name, contentType: type),
        });
        await dio.post<dynamic>('/api/v1/subscription-payments/$paymentId/receipt', data: form);
      });
}

final subscriptionRepositoryProvider = Provider<SubscriptionRepository>((ref) => DioSubscriptionRepository(ref.watch(dioProvider)));

/// The signed-in learner's plans; empty for a guest (no call).
final mySubscriptionsProvider = FutureProvider.autoDispose<List<MySubscription>>((ref) async {
  if (ref.watch(currentUserProvider) == null) return const [];
  return ref.watch(subscriptionRepositoryProvider).mine();
});

/// The learner's newest plan on [courseId] (access-granting first), or null.
MySubscription? subscriptionFor(List<MySubscription> all, String courseId) {
  final mine = all.where((s) => s.courseId == courseId).toList();
  if (mine.isEmpty) return null;
  return mine.firstWhere((s) => s.hasAccess, orElse: () => mine.first);
}

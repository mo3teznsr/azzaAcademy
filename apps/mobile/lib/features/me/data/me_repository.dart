import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../auth/domain/app_user.dart';
import '../../catalog/domain/catalog_models.dart';
import '../domain/me_models.dart';

/// `/api/v1/me/*`.
abstract class MeRepository {
  Future<AppUser> me();
  Future<AppUser> updateProfile({String? name, AppLocale? locale, String? timezone, DisplayCurrency? displayCurrency});
  Future<void> registerDevice(String token, DevicePlatform platform);
  Future<void> unregisterDevice(String token);
  Future<List<SessionSummary>> schedule({required DateTime from, required DateTime to});
  Future<List<Enrollment>> enrollments();
  Future<List<AppNotification>> notifications();
  Future<void> markNotificationRead(String id);
  Future<void> markAllNotificationsRead();
}

class DioMeRepository extends DioRepository implements MeRepository {
  DioMeRepository(super.dio);

  @override
  Future<AppUser> me() async {
    final j = await getJson('/api/v1/me');
    return AppUser.fromJson(j['user'] is Map ? asMap(j['user']) : j);
  }

  @override
  Future<AppUser> updateProfile({String? name, AppLocale? locale, String? timezone, DisplayCurrency? displayCurrency}) async {
    final j = await patchJson('/api/v1/me', {
      'name': ?name,
      'locale': ?locale?.wire,
      'timezone': ?timezone,
      'displayCurrency': ?displayCurrency?.wire,
    });
    return AppUser.fromJson(j['user'] is Map ? asMap(j['user']) : j);
  }

  @override
  Future<void> registerDevice(String token, DevicePlatform platform) =>
      postJson('/api/v1/me/devices', {'token': token, 'platform': platform.wire});

  @override
  Future<void> unregisterDevice(String token) =>
      guard(() => dio.delete<dynamic>('/api/v1/me/devices/${Uri.encodeComponent(token)}'));

  @override
  Future<List<SessionSummary>> schedule({required DateTime from, required DateTime to}) async {
    final items = await getItems('/api/v1/me/schedule', query: {
      'from': from.toUtc().toIso8601String(),
      'to': to.toUtc().toIso8601String(),
    });
    return items.map(SessionSummary.fromJson).toList()..sort((a, b) => a.startsAt.compareTo(b.startsAt));
  }

  @override
  Future<List<Enrollment>> enrollments() async =>
      (await getItems('/api/v1/me/enrollments')).map(Enrollment.fromJson).toList();

  @override
  Future<List<AppNotification>> notifications() async =>
      (await getItems('/api/v1/me/notifications')).map(AppNotification.fromJson).toList();

  @override
  Future<void> markNotificationRead(String id) => postJson('/api/v1/me/notifications/$id/read');

  @override
  Future<void> markAllNotificationsRead() => postJson('/api/v1/me/notifications/read-all');
}

final meRepositoryProvider = Provider<MeRepository>((ref) => DioMeRepository(ref.watch(dioProvider)));

DateTime startOfDay(DateTime t) => DateTime(t.year, t.month, t.day);

/// Monday-based week start.
DateTime startOfWeek(DateTime t) => startOfDay(t).subtract(Duration(days: t.weekday - DateTime.monday));

final enrollmentsProvider = FutureProvider.autoDispose<List<Enrollment>>(
  (ref) => ref.watch(meRepositoryProvider).enrollments(),
);

/// Sessions for the week containing [weekStart].
final weekScheduleProvider = FutureProvider.autoDispose.family<List<SessionSummary>, DateTime>((ref, weekStart) {
  return ref.watch(meRepositoryProvider).schedule(from: weekStart, to: weekStart.add(const Duration(days: 7)));
});

/// Today + the next 7 days (home + teacher today).
final upcomingScheduleProvider = FutureProvider.autoDispose<List<SessionSummary>>((ref) {
  final now = DateTime.now();
  return ref.watch(meRepositoryProvider).schedule(from: startOfDay(now), to: startOfDay(now).add(const Duration(days: 8)));
});

class NotificationsController extends AsyncNotifier<List<AppNotification>> {
  @override
  Future<List<AppNotification>> build() => ref.watch(meRepositoryProvider).notifications();

  Future<void> markRead(String id) async {
    final list = state.value ?? const [];
    state = AsyncData([for (final n in list) n.id == id ? n.markRead() : n]);
    await ref.read(meRepositoryProvider).markNotificationRead(id);
  }

  Future<void> markAllRead() async {
    final list = state.value ?? const [];
    state = AsyncData([for (final n in list) n.markRead()]);
    await ref.read(meRepositoryProvider).markAllNotificationsRead();
  }
}

final notificationsProvider =
    AsyncNotifierProvider<NotificationsController, List<AppNotification>>(NotificationsController.new);

final unreadCountProvider = Provider<int>(
  (ref) => ref.watch(notificationsProvider).value?.where((n) => !n.read).length ?? 0,
);

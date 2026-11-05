import 'dart:async';
import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/enums.dart';

/// Port for push notifications. The app runs fine when Firebase isn't configured.
abstract class PushService {
  bool get enabled;
  Future<String?> token();
  Stream<String> get tokenRefresh;

  /// Data payloads of notifications the user tapped (deep links).
  Stream<Map<String, String>> get opened;

  /// The tap that cold-started the app, if any (read once).
  Future<Map<String, String>?> initialOpened();

  /// Shows the OS prompt (once); later calls just report the current answer.
  Future<bool> requestPermission();

  /// Whether the user currently allows notifications.
  Future<bool> permitted();
  DevicePlatform get platform;
}

class DisabledPushService implements PushService {
  const DisabledPushService();
  @override
  bool get enabled => false;
  @override
  Future<String?> token() async => null;
  @override
  Stream<String> get tokenRefresh => const Stream.empty();
  @override
  Stream<Map<String, String>> get opened => const Stream.empty();
  @override
  Future<Map<String, String>?> initialOpened() async => null;
  @override
  Future<bool> requestPermission() async => false;
  @override
  Future<bool> permitted() async => false;
  @override
  DevicePlatform get platform => DevicePlatform.ios;
}

class FirebasePushService implements PushService {
  FirebasePushService._();

  /// Initialises Firebase if `google-services.json` / `GoogleService-Info.plist`
  /// are present; otherwise returns a [DisabledPushService]. The permission prompt is NOT shown
  /// here — it waits until the user has signed in (see `session_hooks.dart`).
  static Future<PushService> init() async {
    try {
      await Firebase.initializeApp();
      return FirebasePushService._();
    } catch (e) {
      debugPrint('[push] Firebase not configured — push disabled ($e)');
      return const DisabledPushService();
    }
  }

  @override
  bool get enabled => true;

  @override
  Future<String?> token() async {
    try {
      final m = FirebaseMessaging.instance;
      final next = m.onRegistered.first;
      await m.register();
      return await next.timeout(const Duration(seconds: 15));
    } catch (_) {
      return null;
    }
  }

  @override
  Stream<String> get tokenRefresh => FirebaseMessaging.instance.onRegistered;

  @override
  Stream<Map<String, String>> get opened => FirebaseMessaging.onMessageOpenedApp.map(_data);

  @override
  Future<Map<String, String>?> initialOpened() async {
    final m = await FirebaseMessaging.instance.getInitialMessage();
    return m == null ? null : _data(m);
  }

  static Map<String, String> _data(RemoteMessage m) => m.data.map((k, v) => MapEntry(k, '$v'));

  static bool _allowed(NotificationSettings s) =>
      s.authorizationStatus == AuthorizationStatus.authorized || s.authorizationStatus == AuthorizationStatus.provisional;

  @override
  Future<bool> requestPermission() async {
    try {
      return _allowed(await FirebaseMessaging.instance.requestPermission());
    } catch (_) {
      return false;
    }
  }

  @override
  Future<bool> permitted() async {
    try {
      return _allowed(await FirebaseMessaging.instance.getNotificationSettings());
    } catch (_) {
      return false;
    }
  }

  @override
  DevicePlatform get platform => Platform.isAndroid ? DevicePlatform.android : DevicePlatform.ios;
}

/// Overridden in `main()` with the initialised service.
final pushServiceProvider = Provider<PushService>((ref) => const DisabledPushService());

/// Current OS permission, refreshed when Profile is reopened.
final pushPermittedProvider = FutureProvider.autoDispose<bool>((ref) => ref.watch(pushServiceProvider).permitted());

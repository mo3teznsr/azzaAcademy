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
  DevicePlatform get platform => DevicePlatform.ios;
}

class FirebasePushService implements PushService {
  FirebasePushService._();

  /// Initialises Firebase if `google-services.json` / `GoogleService-Info.plist`
  /// are present; otherwise returns a [DisabledPushService].
  static Future<PushService> init() async {
    try {
      await Firebase.initializeApp();
      final m = FirebaseMessaging.instance;
      await m.requestPermission();
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
  Stream<Map<String, String>> get opened => FirebaseMessaging.onMessageOpenedApp
      .map((m) => m.data.map((k, v) => MapEntry(k, '$v')));

  @override
  DevicePlatform get platform => Platform.isAndroid ? DevicePlatform.android : DevicePlatform.ios;
}

/// Overridden in `main()` with the initialised service.
final pushServiceProvider = Provider<PushService>((ref) => const DisabledPushService());

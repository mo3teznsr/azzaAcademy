import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'config/app_config.dart';
import 'network/api_client.dart';
import 'realtime/realtime_client.dart';
import 'storage/token_store.dart';

final appConfigProvider = Provider<AppConfig>((ref) => AppConfig.fromEnvironment());

final tokenStoreProvider = Provider<TokenStore>((ref) => SecureTokenStore());

/// Bumped whenever an authenticated API call returns 401; auth listens and signs out.
final unauthorizedSignalProvider = Provider<ValueNotifier<int>>((ref) {
  final n = ValueNotifier<int>(0);
  ref.onDispose(n.dispose);
  return n;
});

final dioProvider = Provider<Dio>((ref) {
  final signal = ref.watch(unauthorizedSignalProvider);
  return buildDio(
    baseUrl: ref.watch(appConfigProvider).apiBaseUrl,
    tokens: ref.watch(tokenStoreProvider),
    onUnauthorized: () => signal.value++,
  );
});

/// One Socket.IO connection per signed-in app session.
final realtimeClientProvider = Provider<RealtimeClient>((ref) {
  final tokens = ref.watch(tokenStoreProvider);
  final client = SocketIoRealtimeClient(baseUrl: ref.watch(appConfigProvider).apiBaseUrl, tokenProvider: tokens.read);
  ref.onDispose(client.dispose);
  return client;
});

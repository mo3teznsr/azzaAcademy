import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/providers.dart';
import '../../me/data/me_repository.dart';
import '../data/auth_repository.dart';
import '../domain/app_user.dart';

/// Side effects after a session is established (profile sync, push token).
/// Overridable so tests and previews stay offline.
typedef SessionHook = Future<void> Function(AppUser user);

/// After sign-in / session restore (the account's saved profile wins).
final postSignInHookProvider = Provider<SessionHook>((ref) => (_) async {});

/// After creating an account (device choices from onboarding are saved to the new profile).
final postSignUpHookProvider = Provider<SessionHook>((ref) => (_) async {});
final preSignOutHookProvider = Provider<SessionHook>((ref) => (_) async {});

/// `AsyncData(null)` = signed out, `AsyncData(user)` = signed in,
/// `AsyncLoading` = restoring the stored token (splash).
class AuthController extends AsyncNotifier<AppUser?> {
  @override
  Future<AppUser?> build() async {
    final signal = ref.watch(unauthorizedSignalProvider);
    void onUnauthorized() {
      if (state.value != null) state = const AsyncData(null);
    }

    signal.addListener(onUnauthorized);
    ref.onDispose(() => signal.removeListener(onUnauthorized));

    final user = await ref.read(authRepositoryProvider).restore();
    if (user != null) unawaited(_runHook(postSignInHookProvider, user));
    return user;
  }

  Future<void> _runHook(Provider<SessionHook> p, AppUser user) async {
    try {
      await ref.read(p)(user);
    } catch (_) {
      // Hooks are best-effort.
    }
  }

  Future<AppUser> signIn(String email, String password) async {
    final user = await ref.read(authRepositoryProvider).signIn(email: email, password: password);
    state = AsyncData(user);
    unawaited(_runHook(postSignInHookProvider, user));
    return user;
  }

  Future<AppUser> signUp(String name, String email, String password) async {
    final user = await ref.read(authRepositoryProvider).signUp(name: name, email: email, password: password);
    state = AsyncData(user);
    unawaited(_runHook(postSignUpHookProvider, user));
    return user;
  }

  Future<void> signOut() async {
    final user = state.value;
    if (user != null) await _runHook(preSignOutHookProvider, user);
    await ref.read(authRepositoryProvider).signOut();
    state = const AsyncData(null);
  }

  /// Deletes the account on the server, then clears the local session.
  Future<void> deleteAccount() async {
    final user = state.value;
    if (user != null) await _runHook(preSignOutHookProvider, user);
    await ref.read(meRepositoryProvider).deleteAccount();
    try {
      await ref.read(authRepositoryProvider).signOut();
    } catch (_) {}
    state = const AsyncData(null);
  }

  void updateUser(AppUser user) => state = AsyncData(user);

  /// Re-fetches the session without passing through splash (e.g. after an admin made the user a teacher).
  /// The router follows the new role on the state change.
  Future<AppUser?> refreshSession() async {
    final user = await ref.read(authRepositoryProvider).restore();
    state = AsyncData(user);
    return user;
  }

  Future<void> retry() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => ref.read(authRepositoryProvider).restore());
  }
}

final authControllerProvider = AsyncNotifierProvider<AuthController, AppUser?>(AuthController.new);

final currentUserProvider = Provider<AppUser?>((ref) => ref.watch(authControllerProvider).value);
final currentRoleProvider = Provider<Role?>((ref) => ref.watch(currentUserProvider)?.role);

/// Signed out with the session check finished: browsing as a guest. (While restoring, or if restoring failed,
/// this is false: the router holds those on splash.)
final isGuestProvider = Provider<bool>((ref) {
  final auth = ref.watch(authControllerProvider);
  return auth is AsyncData<AppUser?> && auth.value == null;
});

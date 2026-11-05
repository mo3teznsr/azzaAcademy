import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/providers.dart';
import '../../../core/storage/token_store.dart';
import '../domain/app_user.dart';

/// better-auth endpoints under `/api/auth/*` with the bearer plugin.
abstract class AuthRepository {
  Future<AppUser> signIn({required String email, required String password});
  Future<AppUser> signUp({required String name, required String email, required String password});

  /// Restores the session from the stored token; `null` when signed out/expired.
  Future<AppUser?> restore();
  Future<void> signOut();
  Future<void> sendVerificationEmail(String email);

  /// Emails a reset link that opens the web's `/reset-password` page ([redirectTo]).
  Future<void> requestPasswordReset(String email, {required String redirectTo});

  /// Signed-in password change; other devices are signed out.
  Future<void> changePassword({required String current, required String next});
}

class DioAuthRepository extends DioRepository implements AuthRepository {
  DioAuthRepository(super.dio, this._tokens);
  final TokenStore _tokens;

  Future<AppUser> _authenticate(String path, Map<String, dynamic> body) => guard(() async {
        final res = await dio.post<dynamic>(path, data: body);
        final data = asMap(res.data);
        final token = (data['token'] as String?) ?? res.headers.value('set-auth-token');
        if (token == null || token.isEmpty) {
          throw const AppException('NO_TOKEN', 'Sign-in succeeded but no session token was returned.');
        }
        await _tokens.write(token);
        final user = data['user'];
        if (user is Map) return AppUser.fromJson(user.cast<String, dynamic>());
        final restored = await restore();
        if (restored == null) throw const AppException('NO_SESSION', 'Could not load your account.');
        return restored;
      });

  @override
  Future<AppUser> signIn({required String email, required String password}) =>
      _authenticate('/api/auth/sign-in/email', {'email': email.trim(), 'password': password});

  @override
  Future<AppUser> signUp({required String name, required String email, required String password}) =>
      _authenticate('/api/auth/sign-up/email', {'name': name.trim(), 'email': email.trim(), 'password': password});

  @override
  Future<AppUser?> restore() async {
    final token = await _tokens.read();
    if (token == null || token.isEmpty) return null;
    try {
      final res = await dio.get<dynamic>('/api/auth/get-session');
      final data = res.data;
      if (data is! Map || data['user'] is! Map) {
        await _tokens.clear();
        return null;
      }
      return AppUser.fromJson((data['user'] as Map).cast<String, dynamic>());
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        await _tokens.clear();
        return null;
      }
      throw AppException.fromDio(e);
    }
  }

  @override
  Future<void> signOut() async {
    try {
      await dio.post<dynamic>('/api/auth/sign-out', data: const <String, dynamic>{});
    } catch (_) {
      // Signing out locally must always succeed.
    } finally {
      await _tokens.clear();
    }
  }

  @override
  Future<void> changePassword({required String current, required String next}) => guard(() async {
        await dio.post<dynamic>('/api/auth/change-password',
            data: {'currentPassword': current, 'newPassword': next, 'revokeOtherSessions': true});
      });

  @override
  Future<void> requestPasswordReset(String email, {required String redirectTo}) => guard(() async {
        await dio.post<dynamic>('/api/auth/request-password-reset', data: {'email': email.trim(), 'redirectTo': redirectTo});
      });

  @override
  Future<void> sendVerificationEmail(String email) =>
      guard(() => dio.post<dynamic>('/api/auth/send-verification-email', data: {'email': email}));
}

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => DioAuthRepository(ref.watch(dioProvider), ref.watch(tokenStoreProvider)),
);

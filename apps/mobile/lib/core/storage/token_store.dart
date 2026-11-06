import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists the better-auth bearer token. Abstract so tests use [InMemoryTokenStore].
abstract class TokenStore {
  Future<String?> read();
  Future<void> write(String token);
  Future<void> clear();
}

class SecureTokenStore implements TokenStore {
  SecureTokenStore([FlutterSecureStorage? storage])
      : _storage = storage ??
            const FlutterSecureStorage(
              // The data-protection keychain needs a signed keychain-access-groups entitlement, which the local
              // macOS desktop build doesn't have: writes failed and sign-in looked like "No connection".
              mOptions: MacOsOptions(usesDataProtectionKeychain: false),
            );

  static const _key = 'azza.session_token';
  final FlutterSecureStorage _storage;
  String? _cache;

  @override
  Future<String?> read() async => _cache ??= await _storage.read(key: _key);

  @override
  Future<void> write(String token) async {
    _cache = token;
    await _storage.write(key: _key, value: token);
  }

  @override
  Future<void> clear() async {
    _cache = null;
    await _storage.delete(key: _key);
  }
}

class InMemoryTokenStore implements TokenStore {
  InMemoryTokenStore([this._token]);
  String? _token;

  @override
  Future<String?> read() async => _token;

  @override
  Future<void> write(String token) async => _token = token;

  @override
  Future<void> clear() async => _token = null;
}

import 'package:dio/dio.dart';

import '../storage/token_store.dart';
import 'app_exception.dart';

/// Adds `Authorization: Bearer <token>` from [TokenStore] and captures a
/// rotated token from better-auth's `set-auth-token` response header.
class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._tokens, {this.onUnauthorized});

  final TokenStore _tokens;
  final void Function()? onUnauthorized;

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _tokens.read();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onResponse(Response<dynamic> response, ResponseInterceptorHandler handler) async {
    final rotated = response.headers.value('set-auth-token');
    if (rotated != null && rotated.isNotEmpty) await _tokens.write(rotated);
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final path = err.requestOptions.path;
    if (err.response?.statusCode == 401 && !path.startsWith('/api/auth/')) onUnauthorized?.call();
    handler.next(err);
  }
}

Dio buildDio({required String baseUrl, required TokenStore tokens, void Function()? onUnauthorized}) {
  final dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 12),
    receiveTimeout: const Duration(seconds: 20),
    contentType: Headers.jsonContentType,
    responseType: ResponseType.json,
  ));
  dio.interceptors.add(AuthInterceptor(tokens, onUnauthorized: onUnauthorized));
  return dio;
}

/// Base for Dio-backed repositories: every call funnels errors into [AppException].
abstract class DioRepository {
  const DioRepository(this.dio);
  final Dio dio;

  Future<T> guard<T>(Future<T> Function() run) async {
    try {
      return await run();
    } catch (e) {
      throw AppException.from(e);
    }
  }

  Future<Map<String, dynamic>> getJson(String path, {Map<String, dynamic>? query}) => guard(() async {
        final res = await dio.get<dynamic>(path, queryParameters: query);
        return asMap(res.data);
      });

  Future<Map<String, dynamic>> postJson(String path, [Object? body]) => guard(() async {
        final res = await dio.post<dynamic>(path, data: body ?? const <String, dynamic>{});
        return asMap(res.data);
      });

  Future<Map<String, dynamic>> putJson(String path, Object body) => guard(() async {
        final res = await dio.put<dynamic>(path, data: body);
        return asMap(res.data);
      });

  Future<Map<String, dynamic>> patchJson(String path, Object body) => guard(() async {
        final res = await dio.patch<dynamic>(path, data: body);
        return asMap(res.data);
      });

  Future<List<Map<String, dynamic>>> getItems(String path, {Map<String, dynamic>? query}) => guard(() async {
        final res = await dio.get<dynamic>(path, queryParameters: query);
        return itemsOf(res.data);
      });
}

Map<String, dynamic> asMap(Object? data) {
  if (data is Map<String, dynamic>) return data;
  if (data is Map) return data.cast<String, dynamic>();
  return <String, dynamic>{};
}

/// Accepts both a paginated envelope `{ items: [...] }` and a bare list.
List<Map<String, dynamic>> itemsOf(Object? data) {
  final raw = data is Map ? (data['items'] ?? data['data'] ?? const []) : data;
  if (raw is List) return raw.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList();
  return const [];
}

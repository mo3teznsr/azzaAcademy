import 'package:dio/dio.dart';

/// The only error type that leaves the data layer. Screens render [message].
class AppException implements Exception {
  const AppException(this.code, this.message, {this.statusCode, this.details});

  /// Machine code from the API envelope `{ error: { code, message, details } }`
  /// or a client-side code (`NETWORK`, `TIMEOUT`, `UNKNOWN`, `CANCELLED`).
  final String code;
  final String message;
  final int? statusCode;
  final Object? details;

  bool get isUnauthorized => statusCode == 401;
  bool get isNetwork => code == 'NETWORK' || code == 'TIMEOUT';

  @override
  String toString() => 'AppException($code, $statusCode): $message';

  static AppException from(Object error) {
    if (error is AppException) return error;
    if (error is DioException) return fromDio(error);
    return AppException('UNKNOWN', error.toString());
  }

  static AppException fromDio(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.transformTimeout:
        return const AppException('TIMEOUT', 'The server took too long to answer.');
      case DioExceptionType.connectionError:
        return const AppException('NETWORK', 'No connection to Azza. Check your network.');
      case DioExceptionType.cancel:
        return const AppException('CANCELLED', 'Request cancelled.');
      case DioExceptionType.badCertificate:
      case DioExceptionType.badResponse:
      case DioExceptionType.unknown:
        final res = e.response;
        final data = res?.data;
        if (data is Map) {
          final err = data['error'];
          if (err is Map) {
            return AppException(
              '${err['code'] ?? 'HTTP_${res?.statusCode}'}',
              '${err['message'] ?? 'Request failed'}',
              statusCode: res?.statusCode,
              details: err['details'],
            );
          }
          // better-auth error shape: { code, message }
          if (data['message'] != null) {
            return AppException('${data['code'] ?? 'HTTP_${res?.statusCode}'}', '${data['message']}',
                statusCode: res?.statusCode);
          }
        }
        if (res == null) return const AppException('NETWORK', 'No connection to Azza. Check your network.');
        return AppException('HTTP_${res.statusCode}', 'Request failed (${res.statusCode}).', statusCode: res.statusCode);
    }
  }
}

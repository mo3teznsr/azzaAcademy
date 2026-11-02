import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';

/// Loads a JSON fixture captured from the live API (`test/fixtures/<name>.json`).
Object? fixture(String name) => jsonDecode(File('test/fixtures/$name.json').readAsStringSync());

/// A Dio adapter that answers `METHOD /path` from captured fixtures, so the real
/// `Dio*Repository` classes are exercised against real response shapes.
class FixtureAdapter implements HttpClientAdapter {
  FixtureAdapter(this.routes);

  /// `'GET /api/v1/me'` → fixture name, or `(name, statusCode)`.
  final Map<String, Object> routes;
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async {
    requests.add(options);
    final key = '${options.method} ${options.path}';
    final route = routes[key];
    if (route == null) {
      return ResponseBody.fromString(
        jsonEncode({'error': {'code': 'NO_FIXTURE', 'message': 'No fixture for $key'}}),
        599,
        headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
      );
    }
    final (name, status) = route is (String, int) ? route : (route as String, 200);
    return ResponseBody.fromString(
      File('test/fixtures/$name.json').readAsStringSync(),
      status,
      headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
    );
  }

  @override
  void close({bool force = false}) {}
}

Dio fixtureDio(Map<String, Object> routes) => Dio(BaseOptions(baseUrl: 'http://api.test'))..httpClientAdapter = FixtureAdapter(routes);

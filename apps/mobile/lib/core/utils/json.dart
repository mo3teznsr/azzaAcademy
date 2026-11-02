/// Tolerant JSON readers: the API is being built in parallel, so models never
/// crash on a missing field — they fall back to a neutral default.
typedef Json = Map<String, dynamic>;

String str(Json j, String key, [String fallback = '']) {
  final v = j[key];
  if (v == null) return fallback;
  return '$v';
}

String? strOrNull(Json j, String key) {
  final v = j[key];
  if (v == null) return null;
  final s = '$v';
  return s.isEmpty ? null : s;
}

int integer(Json j, String key, [int fallback = 0]) {
  final v = j[key];
  if (v is int) return v;
  if (v is num) return v.round();
  if (v is String) return int.tryParse(v) ?? double.tryParse(v)?.round() ?? fallback;
  return fallback;
}

int? intOrNull(Json j, String key) => j[key] == null ? null : integer(j, key);

double dbl(Json j, String key, [double fallback = 0]) {
  final v = j[key];
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v) ?? fallback;
  return fallback;
}

bool boolean(Json j, String key, [bool fallback = false]) {
  final v = j[key];
  if (v is bool) return v;
  if (v is String) return v == 'true';
  return fallback;
}

DateTime? date(Json j, String key) {
  final v = j[key];
  if (v is String) return DateTime.tryParse(v)?.toLocal();
  if (v is int) return DateTime.fromMillisecondsSinceEpoch(v).toLocal();
  return null;
}

DateTime dateOr(Json j, String key, DateTime fallback) => date(j, key) ?? fallback;

Json obj(Json j, String key) {
  final v = j[key];
  if (v is Map<String, dynamic>) return v;
  if (v is Map) return v.cast<String, dynamic>();
  return <String, dynamic>{};
}

Json? objOrNull(Json j, String key) {
  final v = j[key];
  if (v is Map) return v.cast<String, dynamic>();
  return null;
}

List<Json> list(Json j, String key) {
  final v = j[key];
  if (v is List) return v.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList();
  return const [];
}

List<String> strings(Json j, String key) {
  final v = j[key];
  if (v is List) return v.map((e) => '$e').toList();
  return const [];
}

T enumByName<T extends Enum>(List<T> values, Object? raw, T fallback) {
  if (raw == null) return fallback;
  final s = '$raw';
  for (final v in values) {
    if (v.name == s) return v;
  }
  return fallback;
}

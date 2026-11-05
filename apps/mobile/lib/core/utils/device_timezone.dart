import 'package:flutter_timezone/flutter_timezone.dart';

/// The phone's IANA timezone (e.g. `Asia/Dubai`); null when the platform can't tell.
Future<String?> deviceTimezone() async {
  try {
    final id = (await FlutterTimezone.getLocalTimezone()).identifier;
    return id.contains('/') ? id : null;
  } catch (_) {
    return null;
  }
}

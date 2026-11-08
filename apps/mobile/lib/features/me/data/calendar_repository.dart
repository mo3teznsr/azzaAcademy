import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/utils/json.dart';

/// `GET /api/v1/me/calendar` → the signed ICS feed (`/api/calendar/:userId/:token.ics`), as https and webcal.
@immutable
class CalendarFeed {
  const CalendarFeed({required this.url, required this.webcalUrl});
  factory CalendarFeed.fromJson(Json j) => CalendarFeed(url: str(j, 'url'), webcalUrl: str(j, 'webcalUrl'));
  final String url;
  final String webcalUrl;
}

abstract class CalendarRepository {
  Future<CalendarFeed> feed();
}

class DioCalendarRepository extends DioRepository implements CalendarRepository {
  DioCalendarRepository(super.dio);

  @override
  Future<CalendarFeed> feed() async => CalendarFeed.fromJson(await getJson('/api/v1/me/calendar'));
}

final calendarRepositoryProvider = Provider<CalendarRepository>((ref) => DioCalendarRepository(ref.watch(dioProvider)));

/// Opens a URL in another app (the system calendar for webcal://). Returns false when nothing handled it.
typedef ExternalUrlOpener = Future<bool> Function(Uri uri);

final externalUrlOpenerProvider = Provider<ExternalUrlOpener>(
  (ref) => (uri) async {
    try {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      return false;
    }
  },
);

/// Copies text to the clipboard. Overridable in tests.
final clipboardWriterProvider = Provider<Future<void> Function(String text)>(
  (ref) => (text) => Clipboard.setData(ClipboardData(text: text)),
);

enum CalendarSubscribeResult { opened, copied }

/// Subscribes through the system calendar: webcal:// first, then the https feed; when no app takes either,
/// the https link is copied so it can be pasted into any calendar app.
final calendarSubscribeProvider = Provider<Future<CalendarSubscribeResult> Function()>(
  (ref) => () async {
    final feed = await ref.read(calendarRepositoryProvider).feed();
    final open = ref.read(externalUrlOpenerProvider);
    for (final raw in [feed.webcalUrl, feed.url]) {
      final uri = raw.isEmpty ? null : Uri.tryParse(raw);
      if (uri != null && uri.hasScheme && await open(uri)) return CalendarSubscribeResult.opened;
    }
    await ref.read(clipboardWriterProvider)(feed.url);
    return CalendarSubscribeResult.copied;
  },
);

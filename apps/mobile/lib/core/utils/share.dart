import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

/// Opens the system share sheet for a link. Overridable in tests.
typedef ShareLink = Future<void> Function(Uri uri, {String? subject});

final shareLinkProvider = Provider<ShareLink>(
  (ref) => (uri, {subject}) async {
    await SharePlus.instance.share(ShareParams(uri: uri, subject: subject));
  },
);

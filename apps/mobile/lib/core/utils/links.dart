import 'package:flutter/widgets.dart';
import 'package:url_launcher/url_launcher.dart';

import '../widgets/ui.dart';

/// Opens recordings, materials and receipts in the system viewer.
Future<void> openExternal(BuildContext context, String? url) async {
  final uri = url == null ? null : Uri.tryParse(url);
  if (uri == null) return;
  final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
  if (!ok && context.mounted) showToast(context, url!);
}

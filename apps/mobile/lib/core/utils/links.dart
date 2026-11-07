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

/// Opens a web page inside the app (SFSafariViewController / Chrome Custom Tab) when the platform supports it,
/// else in the system browser. Used for Stripe Checkout's hosted payment page. Returns false when nothing opened.
Future<bool> openInAppBrowser(String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null || !uri.hasScheme) return false;
  try {
    if (await supportsLaunchMode(LaunchMode.inAppBrowserView) && await launchUrl(uri, mode: LaunchMode.inAppBrowserView)) {
      return true;
    }
  } catch (_) {
    // Fall through to the system browser.
  }
  try {
    return await launchUrl(uri, mode: LaunchMode.externalApplication);
  } catch (_) {
    return false;
  }
}

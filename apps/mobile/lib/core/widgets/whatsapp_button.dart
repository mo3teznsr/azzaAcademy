import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../l10n/l10n.dart';
import '../site/site_settings.dart';
import 'ui.dart';

/// Opens a URL in the external app. Overridable in tests.
final externalLauncherProvider = Provider<Future<bool> Function(Uri uri)>(
  (ref) => (uri) => launchUrl(uri, mode: LaunchMode.externalApplication),
);

/// "Chat on WhatsApp": a secondary button that opens `https://wa.me/<digits>?text=<message>`.
/// Renders nothing until an admin has set a WhatsApp number.
class WhatsAppButton extends ConsumerWidget {
  const WhatsAppButton({super.key, required this.message, this.expand = true});

  /// The prefilled text (already localised).
  final String message;
  final bool expand;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uri = ref.watch(siteSettingsProvider).value?.whatsappUri(message);
    if (uri == null) return const SizedBox.shrink();
    final l = context.l10n;
    final button = OutlinedButton.icon(
      key: const Key('whatsapp-button'),
      style: OutlinedButton.styleFrom(minimumSize: const Size(0, 48)),
      onPressed: () async {
        var ok = false;
        try {
          ok = await ref.read(externalLauncherProvider)(uri);
        } catch (_) {}
        if (!ok && context.mounted) showToast(context, l.whatsappOpenFailed);
      },
      icon: const Icon(Icons.chat_rounded),
      label: Text(l.whatsappChat),
    );
    return expand ? SizedBox(width: double.infinity, child: button) : button;
  }
}

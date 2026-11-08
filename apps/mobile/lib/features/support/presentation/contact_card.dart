import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/site/site_settings.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/links.dart';
import '../../../core/widgets/ui.dart';

/// Profile → Help & support: how to reach Azza (email, phone, WhatsApp, address) and the social links.
/// Anything the admin has not set is hidden; the email always shows (falls back to the built-in address).
class ContactCard extends ConsumerWidget {
  const ContactCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final site = ref.watch(siteSettingsProvider).value ?? SiteSettings.empty;
    final arabic = ref.watch(localeProvider) == AppLocale.ar;
    final wa = site.whatsappUri(l.whatsappGeneralMessage);
    final address = site.address(arabic);

    Widget row(Key key, IconData icon, String title, String value, VoidCallback onTap) => ListTile(
          key: key,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
          minTileHeight: 56,
          leading: Icon(icon, color: p.accent),
          title: Text(title),
          subtitle: Text(value, textDirection: TextDirection.ltr, textAlign: TextAlign.start),
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: onTap,
        );

    return Column(key: const Key('contact-card'), crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      CardGroup(title: l.contactUs, children: [
        row(const Key('contact-email'), Icons.mail_outline_rounded, l.contactEmail, site.supportEmail, () => openExternal(context, 'mailto:${site.supportEmail}')),
        if (site.contactPhone != null)
          row(const Key('contact-phone'), Icons.call_outlined, l.contactPhone, site.contactPhone!,
              () => openExternal(context, 'tel:${site.contactPhone!.replaceAll(RegExp(r'[^\d+]'), '')}')),
        if (wa != null) row(const Key('contact-whatsapp'), Icons.chat_rounded, 'WhatsApp', '+${site.whatsappNumber}', () => openExternal(context, wa.toString())),
        if (address != null)
          ListTile(
            key: const Key('contact-address'),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16),
            leading: Icon(Icons.place_outlined, color: p.accent),
            title: Text(l.contactAddress),
            subtitle: Text(address),
          ),
      ]),
      if (site.socials.isNotEmpty)
        CardGroup(title: l.followUs, children: [
          for (final key in socialNetworks)
            if (site.socials[key] != null)
              row(Key('social-$key'), Icons.link_rounded, socialLabels[key]!, site.socials[key]!.replaceFirst(RegExp(r'^https?://(www\.)?'), ''),
                  () => openExternal(context, site.socials[key])),
        ]),
    ]);
  }
}

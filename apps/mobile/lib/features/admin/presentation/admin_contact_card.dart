import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/site/site_settings.dart';
import '../../../core/widgets/phone_field.dart';
import '../../../core/widgets/ui.dart';
import '../../teacher/presentation/proposal_widgets.dart' show BusyButton;
import '../data/back_office_repository.dart';

/// Settings → Contact & social: email, phone, WhatsApp (digits with country code), address and social links.
/// Empty fields are cleared; the app shows only what is set.
class ContactSettingsCard extends ConsumerStatefulWidget {
  const ContactSettingsCard({super.key, required this.settings});
  final PlatformSettings settings;

  @override
  ConsumerState<ContactSettingsCard> createState() => _ContactSettingsCardState();
}

class _ContactSettingsCardState extends ConsumerState<ContactSettingsCard> {
  static const _contactKeys = ['contactEmail', 'whatsappNumber', 'addressEn', 'addressAr'];
  late final Map<String, TextEditingController> _c = {
    for (final k in _contactKeys) k: TextEditingController(text: widget.settings.contact[k] ?? ''),
    for (final k in socialNetworks) 'social:$k': TextEditingController(text: widget.settings.socials[k] ?? ''),
  };
  late final _phone = PhoneController(initialE164: widget.settings.contact['contactPhone']);
  final Map<String, String?> _errors = {};
  bool _busy = false;

  @override
  void dispose() {
    for (final c in _c.values) {
      c.dispose();
    }
    _phone.dispose();
    super.dispose();
  }

  String _text(String key) => _c[key]!.text.trim();
  String? _opt(String key) => _text(key).isEmpty ? null : _text(key);

  Future<void> _save() async {
    final l = context.l10n;
    final errors = <String, String?>{};
    final email = _text('contactEmail');
    if (email.isNotEmpty && !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)) errors['contactEmail'] = l.adminEmailInvalid;
    final phoneError = _phone.error(l, required: false, languageCode: Localizations.localeOf(context).languageCode);
    if (phoneError != null) errors['contactPhone'] = phoneError;
    final wa = _text('whatsappNumber');
    if (wa.isNotEmpty && !RegExp(r'^\d{8,15}$').hasMatch(wa)) errors['whatsappNumber'] = l.adminWhatsappInvalid;
    for (final k in ['addressEn', 'addressAr']) {
      if (_text(k).length > 300) errors[k] = l.adminAddressTooLong;
    }
    for (final k in socialNetworks) {
      final v = _text('social:$k');
      if (v.isNotEmpty && !(v.startsWith('https://') && Uri.tryParse(v)?.hasAuthority == true)) errors['social:$k'] = l.adminSocialInvalid;
    }
    setState(() {
      _errors
        ..clear()
        ..addAll(errors);
    });
    if (errors.isNotEmpty) return;
    setState(() => _busy = true);
    try {
      await ref.read(backOfficeRepositoryProvider).saveContact({
        for (final k in _contactKeys) k: _opt(k),
        'contactPhone': _phone.e164OrNull,
        'socials': {for (final k in socialNetworks) k: _opt('social:$k')},
      });
      ref
        ..invalidate(platformSettingsProvider)
        ..invalidate(siteSettingsProvider);
      if (mounted) showToast(context, l.adminContactSaved);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    Widget field(String key, String label, IconData icon,
            {String? hint, String? helper, TextInputType? type, bool ltr = true, int maxLines = 1, String? prefix}) =>
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: TextField(
            key: Key('contact-field-$key'),
            controller: _c[key],
            keyboardType: type,
            maxLines: maxLines,
            textDirection: ltr ? TextDirection.ltr : TextDirection.rtl,
            decoration: fieldDecoration(label: label, icon: icon, hint: hint, helper: helper, prefixText: prefix).copyWith(errorText: _errors[key]),
          ),
        );
    return SectionCard(
      key: const Key('contact-settings'),
      title: l.adminContactTitle,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(l.adminContactBody, style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 12),
        field('contactEmail', l.contactEmail, Icons.mail_outline_rounded, hint: 'support@azza.academy', type: TextInputType.emailAddress),
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: PhoneField(key: const Key('contact-field-contactPhone'), controller: _phone, label: l.contactPhone, errorText: _errors['contactPhone']),
        ),
        field('whatsappNumber', 'WhatsApp', Icons.chat_rounded, hint: '971501234567', helper: l.adminWhatsappHelper, type: TextInputType.number),
        field('addressEn', l.adminAddressEn, Icons.place_outlined, ltr: true, maxLines: 2),
        field('addressAr', l.adminAddressAr, Icons.place_outlined, ltr: false, maxLines: 2),
        for (final k in socialNetworks)
          field('social:$k', socialLabels[k]!, Icons.link_rounded, hint: 'https://', type: TextInputType.url),
        BusyButton(key: const Key('contact-save'), label: l.adminContactSave, busy: _busy, onPressed: _save),
      ]),
    );
  }
}

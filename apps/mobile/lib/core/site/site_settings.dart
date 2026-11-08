import 'package:flutter/foundation.dart' show immutable;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import '../network/api_client.dart';
import '../providers.dart';

/// Social networks in the order the app lists them (keys match the API's `socials` object).
const socialNetworks = ['instagram', 'x', 'facebook', 'linkedin', 'youtube', 'tiktok', 'snapchat'];

/// Display names for [socialNetworks] (brand names are not translated).
const socialLabels = {
  'instagram': 'Instagram',
  'x': 'X',
  'facebook': 'Facebook',
  'linkedin': 'LinkedIn',
  'youtube': 'YouTube',
  'tiktok': 'TikTok',
  'snapchat': 'Snapchat',
};

String? _clean(Object? v) => v is String && v.trim().isNotEmpty ? v.trim() : null;

/// `GET /site-settings` (public): contact details and social links the admin set.
@immutable
class SiteSettings {
  const SiteSettings({this.contactEmail, this.contactPhone, this.whatsappNumber, this.addressEn, this.addressAr, this.socials = const {}});

  factory SiteSettings.fromJson(Map<String, dynamic> j) {
    final raw = j['socials'];
    return SiteSettings(
      contactEmail: _clean(j['contactEmail']),
      contactPhone: _clean(j['contactPhone']),
      whatsappNumber: _clean(j['whatsappNumber']),
      addressEn: _clean(j['addressEn']),
      addressAr: _clean(j['addressAr']),
      socials: {
        if (raw is Map)
          for (final e in raw.entries)
            if (_clean(e.value) != null) '${e.key}': _clean(e.value)!,
      },
    );
  }

  static const empty = SiteSettings();

  final String? contactEmail;
  final String? contactPhone;

  /// Digits with the country code, no `+` or spaces.
  final String? whatsappNumber;
  final String? addressEn;
  final String? addressAr;
  final Map<String, String> socials;

  /// The configured email, else the built-in support address.
  String get supportEmail => contactEmail ?? AppConfig.supportEmail;

  /// `https://wa.me/<digits>?text=<message>`, or null when no WhatsApp number is set.
  Uri? whatsappUri(String message) {
    final digits = whatsappNumber?.replaceAll(RegExp(r'\D'), '');
    if (digits == null || digits.isEmpty) return null;
    return Uri.parse('https://wa.me/$digits?text=${Uri.encodeQueryComponent(message).replaceAll('+', '%20')}');
  }

  String? address(bool arabic) => arabic ? (addressAr ?? addressEn) : (addressEn ?? addressAr);
}

class SiteSettingsRepository extends DioRepository {
  const SiteSettingsRepository(super.dio);
  Future<SiteSettings> fetch() async => SiteSettings.fromJson(await getJson('/api/v1/site-settings'));
}

/// Cached for the app session once it loads; the admin saving contact settings invalidates it. A failure is not
/// cached as "nothing set": the provider errors (consumers treat that as unset) and is retried or refreshed.
final siteSettingsProvider = FutureProvider<SiteSettings>((ref) => SiteSettingsRepository(ref.watch(dioProvider)).fetch());

/// The support email: site settings, else [AppConfig.supportEmail] (also while loading).
final supportEmailProvider = Provider<String>((ref) => ref.watch(siteSettingsProvider).value?.supportEmail ?? AppConfig.supportEmail);

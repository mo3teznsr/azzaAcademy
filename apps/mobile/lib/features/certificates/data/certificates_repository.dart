import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/network/api_client.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/providers.dart';
import '../domain/certificate_models.dart';

/// `GET /api/v1/me/certificates` (issues newly earned ones) and the public `GET /api/v1/certificates/:code`.
abstract class CertificatesRepository {
  Future<CertificatesOverview> mine();
  Future<Certificate> verify(String code);
}

class DioCertificatesRepository extends DioRepository implements CertificatesRepository {
  DioCertificatesRepository(super.dio);

  @override
  Future<CertificatesOverview> mine() async => CertificatesOverview.fromJson(await getJson('/api/v1/me/certificates'));

  @override
  Future<Certificate> verify(String code) async =>
      Certificate.fromJson(await getJson('/api/v1/certificates/${Uri.encodeComponent(code)}'));
}

final certificatesRepositoryProvider =
    Provider<CertificatesRepository>((ref) => DioCertificatesRepository(ref.watch(dioProvider)));

final myCertificatesProvider = FutureProvider.autoDispose<CertificatesOverview>(
  (ref) => ref.watch(certificatesRepositoryProvider).mine(),
);

/// One certificate by code: from my list when present, else the public verify endpoint.
final certificateProvider = FutureProvider.autoDispose.family<Certificate, String>((ref, code) async {
  final mine = await ref.watch(myCertificatesProvider.future);
  final hit = mine.items.where((c) => c.code.toUpperCase() == code.toUpperCase()).firstOrNull;
  return hit ?? await ref.read(certificatesRepositoryProvider).verify(code);
});

/// Codes the student has already opened — a code not in here is "new" (course-complete moment).
class SeenCertificates {
  SeenCertificates(this._prefs);
  final SharedPreferences _prefs;
  static const _key = 'azza.seen_certificates';

  Set<String> get _codes => {...?_prefs.getStringList(_key)};

  bool isNew(String code) => !_codes.contains(code);

  Future<void> markSeen(String code) async {
    final codes = _codes;
    if (codes.add(code)) await _prefs.setStringList(_key, codes.toList());
  }
}

final seenCertificatesProvider = Provider<SeenCertificates>((ref) => SeenCertificates(ref.watch(sharedPreferencesProvider)));

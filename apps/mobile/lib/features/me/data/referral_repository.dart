import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/utils/json.dart';
import '../../../core/utils/share.dart';

/// `GET /api/v1/referrals/me` → the reader's invite link (`https://azza.academy/?ref=CODE`).
@immutable
class InviteLink {
  const InviteLink({required this.code, required this.link});
  factory InviteLink.fromJson(Json j) => InviteLink(code: str(j, 'code'), link: str(j, 'link'));
  final String code;
  final String link;
}

abstract class ReferralRepository {
  Future<InviteLink> mine();
}

class DioReferralRepository extends DioRepository implements ReferralRepository {
  DioReferralRepository(super.dio);

  @override
  Future<InviteLink> mine() async => InviteLink.fromJson(await getJson('/api/v1/referrals/me'));
}

final referralRepositoryProvider = Provider<ReferralRepository>((ref) => DioReferralRepository(ref.watch(dioProvider)));

/// Fetches the invite link and opens the system share sheet with it.
final shareInviteProvider = Provider<Future<void> Function({String? subject})>(
  (ref) => ({subject}) async {
    final invite = await ref.read(referralRepositoryProvider).mine();
    await ref.read(shareLinkProvider)(Uri.parse(invite.link), subject: subject);
  },
);

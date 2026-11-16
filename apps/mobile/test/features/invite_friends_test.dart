import 'package:azza/core/utils/share.dart';
import 'package:azza/features/auth/data/auth_repository.dart';
import 'package:azza/features/me/data/me_repository.dart';
import 'package:azza/features/me/data/referral_repository.dart';
import 'package:azza/features/me/presentation/profile_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';

class _FakeReferrals implements ReferralRepository {
  int calls = 0;
  @override
  Future<InviteLink> mine() async {
    calls++;
    return const InviteLink(code: 'AB3K9QZ', link: 'https://azza.academy/?ref=AB3K9QZ');
  }
}

void main() {
  for (final (user, shown) in [(student, true), (teacher, true), (admin, false)]) {
    testWidgets('Invite friends on the profile: ${user.role.name} ${shown ? 'shares the link' : 'does not see it'}', (tester) async {
      final referrals = _FakeReferrals();
      final shared = <(Uri, String?)>[];
      await pumpScreen(tester, const ProfileScreen(), overrides: [
        authRepositoryProvider.overrideWithValue(FakeAuthRepository(user)),
        meRepositoryProvider.overrideWithValue(FakeMeRepository()),
        referralRepositoryProvider.overrideWithValue(referrals),
        shareLinkProvider.overrideWithValue((uri, {subject}) async => shared.add((uri, subject))),
      ]);
      tester.view.physicalSize = const Size(1170, 6000);
      await settle(tester, 12);
      final row = find.byKey(const Key('invite-friends'), skipOffstage: false);
      if (!shown) {
        expect(row, findsNothing);
        return;
      }
      expect(find.text('Invite friends', skipOffstage: false), findsOneWidget);
      await tester.ensureVisible(row);
      await tester.tap(row);
      await settle(tester);
      expect(referrals.calls, 1);
      expect(shared.single.$1.toString(), 'https://azza.academy/?ref=AB3K9QZ');
      expect(shared.single.$2, 'Join me on Azza');
    });
  }
}

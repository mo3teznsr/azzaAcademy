import 'package:azza/features/auth/domain/app_user.dart';
import 'package:azza/router/redirect.dart';
import 'package:azza/router/routes.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';

String? go(AsyncValue<AppUser?> auth, String location, {bool onboarded = true}) =>
    computeRedirect(auth: auth, onboarded: onboarded, location: location);

void main() {
  group('computeRedirect', () {
    test('holds on splash while the session is restoring', () {
      expect(go(const AsyncLoading(), Routes.studentHome), Routes.splash);
      expect(go(const AsyncLoading(), Routes.splash), isNull);
    });

    test('stays on splash when restoring failed (splash shows retry)', () {
      expect(go(AsyncError(Exception('offline'), StackTrace.empty), Routes.adminOverview), Routes.splash);
    });

    test('unauthenticated users go to sign-in', () {
      expect(go(const AsyncData(null), Routes.splash), Routes.signIn);
      expect(go(const AsyncData(null), Routes.studentHome), Routes.signIn);
      expect(go(const AsyncData(null), Routes.teacherToday), Routes.signIn);
      expect(go(const AsyncData(null), '/checkout/b1'), Routes.signIn);
      expect(go(const AsyncData(null), Routes.signIn), isNull);
      expect(go(const AsyncData(null), Routes.signUp), isNull);
    });

    test('first run goes to the language picker before sign-in', () {
      expect(go(const AsyncData(null), Routes.splash, onboarded: false), Routes.welcome);
      expect(go(const AsyncData(null), Routes.signIn, onboarded: false), Routes.welcome);
      expect(go(const AsyncData(null), Routes.interests, onboarded: false), isNull);
    });

    test('each role lands in its own tree', () {
      expect(go(const AsyncData(student), Routes.splash), Routes.studentHome);
      expect(go(const AsyncData(teacher), Routes.splash), Routes.teacherToday);
      expect(go(const AsyncData(admin), Routes.splash), Routes.adminOverview);
      expect(go(const AsyncData(admin), Routes.signIn), Routes.adminOverview);
    });

    test("a role cannot enter another role's tree", () {
      expect(go(const AsyncData(student), Routes.teacherEarnings), Routes.studentHome);
      expect(go(const AsyncData(student), Routes.adminApprovals), Routes.studentHome);
      expect(go(const AsyncData(teacher), Routes.studentExplore), Routes.teacherToday);
      expect(go(const AsyncData(teacher), '/admin/approvals/transfers/o1'), Routes.teacherToday);
      expect(go(const AsyncData(admin), Routes.teacherPayoutMethod), Routes.adminOverview);
    });

    test('own tree and shared routes are allowed', () {
      expect(go(const AsyncData(student), Routes.studentLibrary), isNull);
      expect(go(const AsyncData(student), '/courses/product-design'), isNull);
      expect(go(const AsyncData(student), '/orders/o1/bank-transfer'), isNull);
      expect(go(const AsyncData(teacher), '/sessions/s1/prep'), isNull);
      expect(go(const AsyncData(teacher), Routes.teacherPayoutMethod), isNull);
      expect(go(const AsyncData(admin), '/admin/batches/b1'), isNull);
      expect(go(const AsyncData(admin), '/sessions/s1/live'), isNull);
    });

    test('bare role root goes to the role home', () {
      expect(go(const AsyncData(teacher), '/teacher'), Routes.teacherToday);
    });
  });
}

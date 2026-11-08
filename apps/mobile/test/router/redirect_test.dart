import 'package:azza/features/auth/domain/app_user.dart';
import 'package:azza/router/redirect.dart';
import 'package:azza/router/routes.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';

String? go(AsyncValue<AppUser?> auth, String location, {bool onboarded = true, String? current}) =>
    computeRedirect(auth: auth, onboarded: onboarded, location: location, current: current);

void main() {
  group('computeRedirect', () {
    test('holds on splash while the session is restoring', () {
      expect(go(const AsyncLoading(), Routes.studentHome), Routes.splash);
      expect(go(const AsyncLoading(), Routes.splash), isNull);
    });

    test('stays on splash when restoring failed (splash shows retry)', () {
      expect(go(AsyncError(Exception('offline'), StackTrace.empty), Routes.adminOverview), Routes.splash);
    });

    test('signed out: the app opens on Welcome; sign-in and sign-up stay put', () {
      expect(go(const AsyncData(null), Routes.splash), Routes.welcome);
      expect(go(const AsyncData(null), '/'), Routes.welcome);
      expect(go(const AsyncData(null), Routes.welcome), isNull);
      expect(go(const AsyncData(null), Routes.signIn), isNull);
      expect(go(const AsyncData(null), Routes.signUp), isNull);
      expect(go(const AsyncData(null), '/sign-in?from=%2Fcourses%2Fux'), isNull);
    });

    test('guests may browse the public paths', () {
      for (final path in [
        Routes.studentExplore,
        Routes.studentHome,
        Routes.studentMe,
        '/student/explore/courses/product-design',
        '/student/home/batches/b7/schedule',
        '/student/explore/teachers/t1',
        '/student/explore/instructors',
        '/verify/AZ-CERT-7Q4K',
      ]) {
        expect(go(const AsyncData(null), path), isNull, reason: path);
      }
      // Shared paths open inside the student shell (cold link: the default tab; otherwise the tab the guest is on).
      expect(go(const AsyncData(null), '/courses/product-design'), '/student/explore/courses/product-design');
      expect(go(const AsyncData(null), '/batches/b7/schedule'), '/student/home/batches/b7/schedule');
      expect(go(const AsyncData(null), '/teachers/t1', current: Routes.studentMe), '/student/me/teachers/t1');
      expect(go(const AsyncData(null), Routes.instructors), '/student/explore/instructors');
      expect(go(const AsyncData(null), Routes.teachOnAzza), '/student/me/teach');
      // Public paths work from a cold deep link too, before first-run onboarding.
      expect(go(const AsyncData(null), '/verify/AZ-CERT-7Q4K', onboarded: false), isNull);
      expect(go(const AsyncData(null), '/courses/ux', onboarded: false), '/student/explore/courses/ux');
    });

    test('a guest inside a tab is still gated on what needs an account', () {
      expect(go(const AsyncData(null), '/student/home/quizzes/q1'), '/sign-in?from=%2Fstudent%2Fhome%2Fquizzes%2Fq1');
      expect(go(const AsyncData(null), '/student/explore/courses/c1/batches'), '/sign-in?from=%2Fstudent%2Fexplore%2Fcourses%2Fc1%2Fbatches');
    });

    test('gated paths send guests to sign-in with the way back', () {
      expect(go(const AsyncData(null), '/checkout/b1'), '/sign-in?from=%2Fcheckout%2Fb1');
      expect(go(const AsyncData(null), '/courses/c1/batches'), '/sign-in?from=%2Fcourses%2Fc1%2Fbatches');
      expect(go(const AsyncData(null), '/courses/c1/lessons/l1'), '/sign-in?from=%2Fcourses%2Fc1%2Flessons%2Fl1');
      expect(go(const AsyncData(null), Routes.messages), '/sign-in?from=%2Fmessages');
      expect(go(const AsyncData(null), Routes.savedCourses), '/sign-in?from=%2Fme%2Fsaved');
      expect(go(const AsyncData(null), Routes.teacherToday), '/sign-in?from=%2Fteacher%2Ftoday');
      expect(go(const AsyncData(null), '/support/new?orderId=o1'), '/sign-in?from=%2Fsupport%2Fnew%3ForderId%3Do1');
    });

    test('after signing in or up, the visitor resumes where they were', () {
      expect(go(const AsyncData(student), '/sign-in?from=%2Fcourses%2Fux'), '/courses/ux');
      expect(go(const AsyncData(student), '/sign-up?from=%2Fcheckout%2Fb1'), '/checkout/b1');
      expect(go(const AsyncData(student), '/welcome?from=%2Fteach'), '/teach');
      // No `from`: the role's home, as before.
      expect(go(const AsyncData(student), Routes.signIn), Routes.studentHome);
      // `from` never leaves the app and never loops back into an auth step.
      expect(go(const AsyncData(student), '/sign-in?from=https%3A%2F%2Fevil.example'), Routes.studentHome);
      expect(go(const AsyncData(student), '/sign-in?from=%2F%2Fevil.example'), Routes.studentHome);
      expect(go(const AsyncData(student), '/sign-in?from=%2Fsign-up'), Routes.studentHome);
      // Another role's tree is still off limits: the next pass bounces home.
      expect(go(const AsyncData(teacher), '/sign-in?from=%2Fstudent%2Fexplore'), Routes.studentExplore);
      expect(go(const AsyncData(teacher), Routes.studentExplore), Routes.teacherToday);
    });

    test('a new student goes through the photo step and still resumes', () {
      final noPhoto = student.copyWithImage(null);
      expect(go(AsyncData(noPhoto), '/sign-up?from=%2Fcourses%2Fux'), '/profile-photo?from=%2Fcourses%2Fux');
      expect(go(AsyncData(noPhoto), '/profile-photo?from=%2Fcourses%2Fux'), isNull);
      expect(go(const AsyncData(student), '/profile-photo?from=%2Fcourses%2Fux'), '/courses/ux');
      expect(go(AsyncData(noPhoto), '/courses/ux'), '/profile-photo?from=%2Fcourses%2Fux');
    });

    test('first run keeps a gated deep link through Welcome', () {
      expect(go(const AsyncData(null), '/checkout/b1', onboarded: false), '/welcome?from=%2Fcheckout%2Fb1');
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
      expect(go(const AsyncData(student), '/student/explore/courses/product-design'), isNull);
      expect(go(const AsyncData(student), '/orders/o1/bank-transfer'), isNull);
      expect(go(const AsyncData(teacher), '/teacher/today/sessions/s1/prep'), isNull);
      expect(go(const AsyncData(teacher), Routes.teacherPayoutMethod), isNull);
      expect(go(const AsyncData(admin), '/admin/batches/b1'), isNull);
      expect(go(const AsyncData(admin), '/sessions/s1/live'), isNull);
    });

    test('a shared detail opens inside the tab the reader is on, query kept', () {
      expect(go(const AsyncData(student), '/courses/ux', current: Routes.studentHome), '/student/home/courses/ux');
      expect(go(const AsyncData(student), '/courses/ux/batches', current: '/student/home/courses/ux'), '/student/home/courses/ux/batches');
      expect(go(const AsyncData(student), '/messages/c1', current: '/student/library'), '/student/library/messages/c1');
      expect(go(const AsyncData(student), '/support/new?orderId=o1', current: Routes.studentMe), '/student/me/support/new?orderId=o1');
      expect(go(const AsyncData(student), Routes.myPlans, current: Routes.studentMe), '/student/me/me/plans', reason: 'Your plans keeps the tab bar');
      expect(go(const AsyncData(student), '/me/certificates', current: '/student/me'), '/student/me/me/certificates');
      expect(go(const AsyncData(teacher), '/batches/b1/roster?tab=quizzes', current: Routes.teacherBatches),
          '/teacher/batches/batches/b1/roster?tab=quizzes');
      expect(go(const AsyncData(admin), '/batches/b1/roster', current: Routes.adminOverview), '/admin/overview/batches/b1/roster');
      // Cold link (or straight after an auth step): the detail's default tab.
      expect(go(const AsyncData(student), '/courses/product-design'), '/student/explore/courses/product-design');
      expect(go(const AsyncData(student), '/quizzes/q1', current: Routes.splash), '/student/home/quizzes/q1');
      expect(go(const AsyncData(teacher), '/sessions/s1/prep'), '/teacher/today/sessions/s1/prep');
    });

    test('full-screen flows cover the tabs, and so does what they open', () {
      for (final path in ['/checkout/b1', '/orders/o1', '/sessions/s1/lobby', '/sessions/s1/live', '/quizzes/q1/take', '/sessions/s1/after']) {
        expect(go(const AsyncData(student), path, current: Routes.studentHome), isNull, reason: path);
      }
      // Opened from a full-screen flow, a detail stays on top of it so back returns there.
      expect(go(const AsyncData(student), '/quizzes/q1/attempts/a1', current: '/quizzes/q1/take'), isNull);
      expect(go(const AsyncData(student), '/support/new?orderId=o1', current: '/orders/o1'), isNull);
      // Details a role doesn't open in a tab stay shared: teachers edit courses under Batches → My courses.
      expect(go(const AsyncData(teacher), '/courses/c1', current: Routes.teacherBatches), isNull);
      expect(go(const AsyncData(admin), '/support/t1', current: Routes.adminOverview), isNull);
    });

    test('bare role root goes to the role home', () {
      expect(go(const AsyncData(teacher), '/teacher'), Routes.teacherToday);
    });
  });
}

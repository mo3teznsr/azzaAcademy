import 'dart:convert';
import 'dart:io';

import 'package:azza/core/prefs/app_prefs.dart';
import 'package:azza/core/theme/app_theme.dart';
import 'package:azza/core/theme/tokens.dart';
import 'package:azza/core/l10n/l10n.dart';
import 'package:azza/features/auth/presentation/auth_controller.dart';
import 'package:azza/features/certificates/data/certificates_repository.dart';
import 'package:azza/features/certificates/domain/certificate_models.dart';
import 'package:azza/features/certificates/presentation/certificate_detail_screen.dart';
import 'package:azza/features/certificates/presentation/certificates_screen.dart';
import 'package:azza/features/teachers/data/teachers_repository.dart';
import 'package:azza/features/teachers/domain/teacher_models.dart';
import 'package:azza/features/teachers/presentation/teacher_profile_screen.dart';
import 'package:azza/features/waitlist/data/waitlist_repository.dart';
import 'package:azza/features/waitlist/domain/waitlist_models.dart';
import 'package:azza/features/waitlist/presentation/waitlist_section.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';

Map<String, dynamic> _json(String name) => (jsonDecode(File('test/fixtures/$name.json').readAsStringSync()) as Map).cast();

/// Like [pumpScreen] but with a chosen locale (RTL check) and the widget inside a Scaffold.
Future<void> _pumpLocale(WidgetTester tester, Widget child, Locale locale, List<Override> overrides) async {
  tester.view.physicalSize = const Size(1170, 2532);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final prefs = await testPrefs({'azza.locale': locale.languageCode, 'azza.onboarded': true});
  await tester.pumpWidget(ProviderScope(
    retry: (_, _) => null,
    overrides: [sharedPreferencesProvider.overrideWithValue(prefs), ...overrides],
    child: MaterialApp(
      theme: AzzaTheme.build(ThemeVariant.student),
      locale: locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: localizationDelegates,
      home: child,
    ),
  ));
}

void main() {
  final certs = CertificatesOverview.fromJson(_json('my_certificates'));
  final waitlist = WaitlistOverview.fromJson(_json('my_waitlist'));
  final teacherProfile = TeacherProfile.fromJson(_json('teacher_profile'));

  group('certificates', () {
    testWidgets('list shows earned cards and in-progress attendance', (tester) async {
      await pumpScreen(tester, const CertificatesScreen(), overrides: [
        certificatesRepositoryProvider.overrideWithValue(FakeCertificatesRepository(certs)),
      ]);
      await settle(tester, 12);

      expect(find.text('Earned'), findsOneWidget);
      expect(find.text('AZ-CERT-7Q4K'), findsOneWidget);
      expect(find.text('ATTENDED 11/12'), findsOneWidget);
      expect(find.textContaining('with Lina Haddad'), findsWidgets);
      expect(find.text('NEW'), findsNWidgets(2));

      await tester.scrollUntilVisible(find.text('6 more sessions needed'), 200);
      expect(find.text('In progress'), findsOneWidget);
      expect(find.byType(LinearProgressIndicator), findsWidgets);
      await tester.scrollUntilVisible(find.text('Not enough sessions left to reach 80% in this class.'), 200);
    });

    testWidgets('empty state', (tester) async {
      await pumpScreen(tester, const CertificatesScreen(), overrides: [
        certificatesRepositoryProvider.overrideWithValue(FakeCertificatesRepository()),
      ]);
      await settle(tester);
      expect(find.text('Proof you learned it'), findsOneWidget);
    });

    testWidgets('detail renders the certificate and shares the verify link', (tester) async {
      String? copied;
      Object? shared;
      const share = MethodChannel('dev.fluttercommunity.plus/share');
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(share, (call) async {
        shared = call.arguments;
        return 'dev.fluttercommunity.plus/share/unavailable';
      });
      addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(share, null));
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
        if (call.method == 'Clipboard.setData') copied = (call.arguments as Map)['text'] as String?;
        return null;
      });
      addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null));

      await pumpScreen(tester, const CertificateDetailScreen(code: 'AZ-CERT-7Q4K'), overrides: [
        currentUserProvider.overrideWithValue(student),
        certificatesRepositoryProvider.overrideWithValue(FakeCertificatesRepository(certs)),
      ]);
      await settle(tester, 40);

      expect(find.text('Course complete.'), findsOneWidget);
      expect(find.byKey(const Key('cert-signal')), findsOneWidget);
      expect(find.byKey(const Key('cert-card')), findsOneWidget);
      expect(find.text('Sara Kamal'), findsOneWidget);
      expect(find.text('Product Design Foundations'), findsOneWidget);
      expect(find.text('B05'), findsOneWidget);
      expect(find.text('Lina Haddad'), findsOneWidget);
      expect(find.text('AZ-CERT-7Q4K'), findsOneWidget);

      await tester.tap(find.byKey(const Key('cert-share')));
      await settle(tester);
      expect('$shared', contains('https://azza.academy/verify/AZ-CERT-7Q4K'));
      expect(copied, isNull);

      // Without a share sheet the link is copied instead.
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(share, (call) async => throw PlatformException(code: 'x'));
      await tester.tap(find.byKey(const Key('cert-share')));
      await settle(tester);
      expect(copied, 'https://azza.academy/verify/AZ-CERT-7Q4K');
      expect(find.text('Verification link copied'), findsOneWidget);
    });

    testWidgets('detail lays out in Arabic (RTL) without overflow', (tester) async {
      await _pumpLocale(tester, const CertificateDetailScreen(code: 'AZ-CERT-7Q4K'), const Locale('ar'), [
        currentUserProvider.overrideWithValue(student),
        certificatesRepositoryProvider.overrideWithValue(FakeCertificatesRepository(certs)),
      ]);
      await settle(tester, 40);
      expect(find.text('اكتملت الدورة.'), findsOneWidget);
      expect(find.text('أساسيات تصميم المنتجات'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  group('waitlist', () {
    Future<FakeWaitlistRepository> pumpSection(WidgetTester tester, {Locale locale = const Locale('en')}) async {
      final repo = FakeWaitlistRepository(waitlist);
      await _pumpLocale(
        tester,
        const Scaffold(body: SingleChildScrollView(padding: EdgeInsets.all(20), child: WaitlistSection())),
        locale,
        [waitlistRepositoryProvider.overrideWithValue(repo)],
      );
      await settle(tester, 12);
      return repo;
    }

    testWidgets('lists positions and the promoted seat with a countdown', (tester) async {
      await pumpSection(tester);
      expect(find.byKey(const Key('waitlist-section')), findsOneWidget);
      expect(find.text('3rd in line · of 7'), findsOneWidget);
      expect(find.text("You're next in line · of 2"), findsOneWidget);
      expect(find.text('A PLACE OPENED FOR YOU'), findsOneWidget);
      expect(find.byKey(const Key('claim-b_c02')), findsOneWidget);
    });

    testWidgets('leave: sheet → confirm → DELETE and the row disappears', (tester) async {
      final repo = await pumpSection(tester);
      await tester.tap(find.byKey(const Key('waitlist-b_b08')));
      await settle(tester, 12);
      expect(find.text('What happens next'), findsOneWidget);
      expect(find.text('Nothing is charged while you wait.'), findsOneWidget);

      await tester.tap(find.byKey(const Key('leave-waitlist')));
      await settle(tester, 12);
      expect(find.text('Leave the waitlist?'), findsOneWidget);
      await tester.tap(find.byKey(const Key('confirm-leave-waitlist')));
      await settle(tester, 20);

      expect(repo.left, ['b_b08']);
      expect(find.byKey(const Key('waitlist-b_b08')), findsNothing);
      expect(find.text('You left the waitlist'), findsOneWidget);
    });

    testWidgets('renders nothing when there is no waitlist', (tester) async {
      await _pumpLocale(tester, const Scaffold(body: WaitlistSection()), const Locale('en'), [
        waitlistRepositoryProvider.overrideWithValue(FakeWaitlistRepository()),
      ]);
      await settle(tester);
      expect(find.byKey(const Key('waitlist-section')), findsNothing);
    });

    testWidgets('Arabic (RTL) position label', (tester) async {
      await pumpSection(tester, locale: const Locale('ar'));
      expect(find.text('رقم 3 في الدور · من 7'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  testWidgets('teacher profile: headline, bio, languages, upcoming batches with seats and AED', (tester) async {
    await pumpScreen(tester, const TeacherProfileScreen(teacherId: 'u_lina'), overrides: [
      teachersRepositoryProvider.overrideWithValue(FakeTeachersRepository(teacherProfile)),
    ]);
    await settle(tester, 12);

    expect(find.text('Lina Haddad'), findsOneWidget);
    expect(find.textContaining('Product designer'), findsOneWidget);
    expect(find.text('About'), findsOneWidget);
    expect(find.text('ENGLISH'), findsOneWidget);

    await tester.scrollUntilVisible(find.byKey(const Key('teacher-batch-b_b09')), 200, scrollable: find.byType(Scrollable).first);
    expect(find.text('9 PLACES LEFT'), findsOneWidget);
    expect(find.text('AED 880.00'), findsOneWidget);
    expect(find.text('Join class B09'), findsOneWidget);
    expect(find.text('FULL'), findsOneWidget);
    expect(find.text('Join waitlist'), findsOneWidget);
  });
}

import 'package:azza/core/phone/countries.dart';
import 'package:azza/core/widgets/phone_field.dart';
import 'package:azza/features/auth/data/auth_repository.dart';
import 'package:azza/features/auth/presentation/sign_in_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';

Widget _host(PhoneController c, {bool required = false}) => Scaffold(body: Padding(padding: const EdgeInsets.all(16), child: PhoneField(controller: c, required: required)));

void main() {
  testWidgets('the picker changes the dial code and search finds countries', (tester) async {
    final c = PhoneController();
    addTearDown(c.dispose);
    await pumpScreen(tester, _host(c), overrides: []);
    await settle(tester);
    expect(find.text('+971'), findsOneWidget);

    await tester.tap(find.byKey(const Key('phone-country-button')));
    await settle(tester);
    // GCC first.
    expect(find.byKey(const Key('phone-country-SA')), findsOneWidget);
    await tester.enterText(find.byKey(const Key('phone-country-search')), 'egypt');
    await settle(tester);
    expect(find.byKey(const Key('phone-country-EG')), findsOneWidget);
    expect(find.byKey(const Key('phone-country-SA')), findsNothing);
    await tester.tap(find.byKey(const Key('phone-country-EG')));
    await settle(tester);

    expect(find.text('+20'), findsOneWidget);
    expect(c.iso2, 'EG');
  });

  testWidgets('emits E.164 and validates against the country', (tester) async {
    final c = PhoneController();
    addTearDown(c.dispose);
    await pumpScreen(tester, _host(c), overrides: []);
    await settle(tester);
    await tester.enterText(find.byKey(const Key('phone-input')), '050 123 4567');
    expect(c.e164, '+971501234567');
    expect(c.isValid, isTrue);
    expect(isValidPhone(c.e164), isTrue);

    await tester.enterText(find.byKey(const Key('phone-input')), '12345');
    expect(c.isValid, isFalse);
    await tester.enterText(find.byKey(const Key('phone-input')), '٠٥٠١٢٣٤٥٦٧');
    expect(c.e164, '+971501234567');
    c.iso2 = 'SA';
    expect(PhoneController(initialE164: '+966512345678').iso2, 'SA');
    expect(PhoneController(initialE164: '+966512345678').text.text, '512345678');
  });

  group('sign-up', () {
    Future<FakeAuthRepository> pump(WidgetTester tester) async {
      final auth = FakeAuthRepository(student);
      await pumpScreen(tester, const SignInScreen(signUp: true), overrides: [authRepositoryProvider.overrideWithValue(auth)]);
      await settle(tester);
      await tester.enterText(find.byKey(const Key('email')), 'sara@example.com');
      return auth;
    }

    Future<void> fillAndSubmit(WidgetTester tester, {String? phone}) async {
      await tester.enterText(find.widgetWithText(TextField, 'Full name'), 'Sara Ali');
      await tester.enterText(find.byKey(const Key('password')), 'longenough1');
      if (phone != null) await tester.enterText(find.byKey(const Key('phone-input')), phone);
      final submit = find.widgetWithText(FilledButton, 'Create account');
      await tester.scrollUntilVisible(submit, 200, scrollable: find.byType(Scrollable).first);
      await settle(tester, 10);
      await tester.tap(submit);
      await settle(tester);
    }

    testWidgets('is blocked without a phone', (tester) async {
      final auth = await pump(tester);
      await fillAndSubmit(tester);
      expect(find.text('Enter your mobile number'), findsOneWidget);
      expect(auth.signUpPhones, isEmpty);
    });

    testWidgets('is blocked with a number that is wrong for the country', (tester) async {
      final auth = await pump(tester);
      await fillAndSubmit(tester, phone: '123');
      expect(find.textContaining("doesn't look right for United Arab Emirates"), findsOneWidget);
      expect(auth.signUpPhones, isEmpty);
    });

    testWidgets('sends the phone as E.164', (tester) async {
      final auth = await pump(tester);
      await fillAndSubmit(tester, phone: '050 123 4567');
      expect(auth.signUpPhones, ['+971501234567']);
    });
  });
}

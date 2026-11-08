import 'dart:typed_data';

import 'package:azza/core/money/money.dart';
import 'package:azza/core/network/app_exception.dart';
import 'package:azza/core/utils/digits.dart';
import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/site/site_settings.dart';
import 'package:azza/core/widgets/whatsapp_button.dart';
import 'package:azza/features/admin/data/back_office_repository.dart';
import 'package:azza/features/admin/presentation/admin_currencies_screen.dart';
import 'package:azza/features/admin/presentation/admin_rules_card.dart';
import 'package:azza/features/admin/presentation/categories_screen.dart';
import 'package:azza/features/me/presentation/avatar_picker.dart' show imagePickerProvider;
import 'package:azza/features/support/presentation/contact_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';

import '../helpers/admin_fakes.dart';
import '../helpers/harness.dart';

class _FakePicker implements ImagePicker {
  @override
  Future<XFile?> pickImage({
    required ImageSource source,
    double? maxWidth,
    double? maxHeight,
    int? imageQuality,
    CameraDevice preferredCameraDevice = CameraDevice.rear,
    bool requestFullMetadata = true,
  }) async =>
      XFile.fromData(Uint8List.fromList([1, 2, 3]), name: 'cat.jpg');

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  group('WhatsApp button', () {
    Future<List<Uri>> pump(WidgetTester tester, SiteSettings site) async {
      final opened = <Uri>[];
      await pumpScreen(tester, const Scaffold(body: WhatsAppButton(message: 'Hi Azza, I have a question about Flutter & Dart (B07).')), overrides: [
        siteSettingsProvider.overrideWith((ref) async => site),
        externalLauncherProvider.overrideWithValue((uri) async {
          opened.add(uri);
          return true;
        }),
      ]);
      await settle(tester);
      return opened;
    }

    testWidgets('is hidden when no number is set', (tester) async {
      await pump(tester, const SiteSettings(contactEmail: 'a@b.co'));
      expect(find.byKey(const Key('whatsapp-button')), findsNothing);
    });

    testWidgets('opens wa.me with the digits and the encoded message', (tester) async {
      final opened = await pump(tester, const SiteSettings(whatsappNumber: '971501234567'));
      expect(find.byKey(const Key('whatsapp-button')), findsOneWidget);
      await tester.tap(find.byKey(const Key('whatsapp-button')));
      await settle(tester);
      final uri = opened.single;
      expect(uri.scheme, 'https');
      expect(uri.host, 'wa.me');
      expect(uri.path, '/971501234567');
      expect(uri.queryParameters['text'], 'Hi Azza, I have a question about Flutter & Dart (B07).');
      expect(uri.toString(), contains('text=Hi%20Azza%2C%20I%20have'));
    });
  });

  testWidgets('contact card shows what is set and hides the rest', (tester) async {
    await pumpScreen(tester, const Scaffold(body: SingleChildScrollView(child: ContactCard())), overrides: [
      siteSettingsProvider.overrideWith((ref) async => const SiteSettings(contactPhone: '+971 4 123 4567', socials: {'instagram': 'https://instagram.com/azza'})),
    ]);
    await settle(tester);
    expect(find.byKey(const Key('contact-email')), findsOneWidget);
    expect(find.text('support@azza.academy'), findsOneWidget);
    expect(find.byKey(const Key('contact-phone')), findsOneWidget);
    expect(find.byKey(const Key('contact-whatsapp')), findsNothing);
    expect(find.byKey(const Key('social-instagram')), findsOneWidget);
    expect(find.byKey(const Key('social-youtube')), findsNothing);
  });

  group('rules', () {
    testWidgets('a customised rule shows its default and resets with null', (tester) async {
      final repo = FakeBackOfficeRepository();
      await pumpScreen(tester, Scaffold(body: ListView(children: [BusinessRulesCard(settings: repo.platformSettings)])), overrides: [
        backOfficeRepositoryProvider.overrideWithValue(repo),
      ]);
      await settle(tester);
      expect(find.text('Default: 5%'), findsOneWidget);
      // Only VAT differs from its default.
      expect(find.byKey(const Key('rule-reset-EARNING_HOLD_DAYS')), findsNothing);
      await tester.tap(find.byKey(const Key('rule-reset-VAT_PERCENT')));
      await settle(tester);
      expect(repo.savedRules.single, {'vatPercent': null});
      expect(tester.widget<TextField>(find.byKey(const Key('rule-VAT_PERCENT'))).controller!.text, '5');
      expect(find.byKey(const Key('rule-reset-VAT_PERCENT')), findsNothing);
    });

    testWidgets('save sends only what changed and rejects out-of-range values', (tester) async {
      final repo = FakeBackOfficeRepository();
      await pumpScreen(tester, Scaffold(body: ListView(children: [BusinessRulesCard(settings: repo.platformSettings)])), overrides: [
        backOfficeRepositoryProvider.overrideWithValue(repo),
      ]);
      await settle(tester);
      await tester.enterText(find.byKey(const Key('rule-VAT_PERCENT')), '99');
      await tester.ensureVisible(find.byKey(const Key('rules-save')));
      await tester.tap(find.byKey(const Key('rules-save')));
      await settle(tester);
      expect(repo.savedRules, isEmpty);
      expect(find.text('Enter a whole number from 0 to 30.'), findsOneWidget);
      await tester.enterText(find.byKey(const Key('rule-VAT_PERCENT')), '12');
      await tester.tap(find.byKey(const Key('rules-save')));
      await settle(tester);
      expect(repo.savedRules.single, {'vatPercent': 12});
    });
  });

  group('currencies admin', () {
    testWidgets('adds a currency', (tester) async {
      final repo = FakeBackOfficeRepository();
      await pumpScreen(tester, const CurrenciesScreen(), overrides: [backOfficeRepositoryProvider.overrideWithValue(repo)]);
      await settle(tester);
      await tester.tap(find.byKey(const Key('new-currency')));
      await settle(tester);
      await tester.enterText(find.byKey(const Key('currency-code')), 'eur');
      await tester.enterText(find.byKey(const Key('currency-name-en')), 'Euro');
      await tester.enterText(find.byKey(const Key('currency-name-ar')), 'يورو');
      await tester.enterText(find.byKey(const Key('currency-rate')), '0.25');
      await tester.ensureVisible(find.byKey(const Key('save-currency')));
      await tester.tap(find.byKey(const Key('save-currency')));
      await settle(tester);
      expect(repo.createdCurrencies.single['code'], 'EUR');
      expect(repo.createdCurrencies.single['ratePerAed'], 0.25);
      expect(repo.createdCurrencies.single['decimals'], 2);
      expect(repo.createdCurrencies.single['nameAr'], 'يورو');
      expect(find.byKey(const Key('currency-EUR')), findsOneWidget);
    });

    testWidgets('a blank Arabic name is refused before sending', (tester) async {
      final repo = FakeBackOfficeRepository();
      await pumpScreen(tester, const CurrenciesScreen(), overrides: [backOfficeRepositoryProvider.overrideWithValue(repo)]);
      await settle(tester);
      await tester.tap(find.byKey(const Key('new-currency')));
      await settle(tester);
      await tester.enterText(find.byKey(const Key('currency-code')), 'EUR');
      await tester.enterText(find.byKey(const Key('currency-name-en')), 'Euro');
      await tester.enterText(find.byKey(const Key('currency-rate')), '0.25');
      await tester.ensureVisible(find.byKey(const Key('save-currency')));
      await tester.tap(find.byKey(const Key('save-currency')));
      await settle(tester);
      expect(find.text('Enter the Arabic name.'), findsOneWidget);
      expect(repo.createdCurrencies, isEmpty);
      // The fake mirrors the API: a null Arabic name would be rejected.
      expect(() => repo.createCurrency({'code': 'EUR', 'nameEn': 'Euro', 'nameAr': null, 'ratePerAed': 1.0, 'decimals': 2}), throwsA(isA<AppException>()));
    });

    testWidgets('deleting explains the AED fallback and asks first', (tester) async {
      final repo = FakeBackOfficeRepository();
      await pumpScreen(tester, const CurrenciesScreen(), overrides: [backOfficeRepositoryProvider.overrideWithValue(repo)]);
      await settle(tester);
      await tester.tap(find.byKey(const Key('currency-delete-SAR')));
      await settle(tester);
      expect(find.textContaining('see prices in AED instead'), findsOneWidget);
      expect(repo.deletedCurrencies, isEmpty);
      await tester.tap(find.byKey(const Key('confirm-ok')));
      await settle(tester);
      expect(repo.deletedCurrencies, ['SAR']);
      expect(find.byKey(const Key('currency-SAR')), findsNothing);
    });

    testWidgets('AED is locked: no delete, switch disabled', (tester) async {
      final repo = FakeBackOfficeRepository();
      await pumpScreen(tester, const CurrenciesScreen(), overrides: [backOfficeRepositoryProvider.overrideWithValue(repo)]);
      await settle(tester);
      expect(find.byKey(const Key('currency-delete-AED')), findsNothing);
      expect(find.byKey(const Key('currency-locked-AED')), findsOneWidget);
      expect(tester.widget<Switch>(find.byKey(const Key('currency-enabled-AED'))).onChanged, isNull);
      expect(tester.widget<Switch>(find.byKey(const Key('currency-enabled-SAR'))).onChanged, isNotNull);
    });

    testWidgets('enable switch and reorder send patches', (tester) async {
      final repo = FakeBackOfficeRepository();
      await pumpScreen(tester, const CurrenciesScreen(), overrides: [backOfficeRepositoryProvider.overrideWithValue(repo)]);
      await settle(tester);
      await tester.tap(find.byKey(const Key('currency-enabled-SAR')));
      await settle(tester);
      expect(repo.updatedCurrencies.single.$1, 'SAR');
      expect(repo.updatedCurrencies.single.$2, {'enabled': false});
      repo.updatedCurrencies.clear();
      await tester.tap(find.byKey(const Key('currency-up-SAR')));
      await settle(tester);
      expect(repo.updatedCurrencies.map((e) => e.$1).toSet(), {'AED', 'SAR'});
    });
  });

  testWidgets('category image: pick uploads, preview shows, remove clears', (tester) async {
    final repo = FakeBackOfficeRepository(categoryList: const [AdminCategory(slug: 'design', nameEn: 'Design')]);
    await pumpScreen(tester, const CategoriesScreen(), overrides: [
      backOfficeRepositoryProvider.overrideWithValue(repo),
      imagePickerProvider.overrideWithValue(_FakePicker()),
    ]);
    await settle(tester);
    await tester.tap(find.byKey(const Key('category-design')));
    await settle(tester);
    expect(find.byKey(const Key('category-image-remove')), findsNothing);
    await tester.tap(find.byKey(const Key('category-image-pick')));
    await settle(tester);
    await tester.tap(find.byKey(const Key('category-image-library')));
    await settle(tester);
    expect(repo.uploadedCategoryImages, ['design']);
    expect(find.byKey(const Key('category-image-remove')), findsOneWidget);
    await tester.tap(find.byKey(const Key('category-image-remove')));
    await settle(tester);
    expect(repo.removedCategoryImages, ['design']);
    expect(find.byKey(const Key('category-image-remove')), findsNothing);
  });

  test('Arabic-Indic digits become Latin', () {
    expect(Digits.toLatin('٠٥٠ ١٢٣ ۴۵۶'), '050 123 456');
    expect(FxRates.fromJson({'items': [{'code': 'AED', 'decimals': 0}]}).decimalsFor(DisplayCurrency.aed), 2);
  });

  group('currency formatting', () {
    test('uses each currency decimals and drops unlisted currencies to AED', () {
      final fx = FxRates.fromJson({
        'base': 'AED',
        'items': [
          {'code': 'AED', 'decimals': 2, 'ratePerAed': 1, 'sortOrder': 0},
          {'code': 'KWD', 'nameEn': 'Kuwaiti dinar', 'decimals': 3, 'ratePerAed': 0.0836, 'sortOrder': 1},
        ],
      });
      final kwd = DisplayCurrency('KWD');
      expect(fx.decimalsFor(kwd), 3);
      expect(Money.display(88000, kwd, fx.rateFor(kwd), decimals: fx.decimalsFor(kwd)), '≈ KWD 73.568');
      expect(fx.has(DisplayCurrency('SAR')), isFalse);
      expect(fx.currencies, [DisplayCurrency.aed, kwd]);
    });
  });
}

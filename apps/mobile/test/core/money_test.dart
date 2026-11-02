import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/money/money.dart';
import 'package:azza/core/utils/formatters.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Money (mirrors packages/shared/src/money.ts)', () {
    test('fils <-> AED conversion is integer-safe', () {
      expect(Money.aedToFils(880), 88000);
      expect(Money.aedToFils(19.99), 1999);
      expect(Money.aedToFils(0.1 + 0.2), 30);
      expect(Money.filsToAed(502832), 5028.32);
    });

    test('AED (base) formats exactly with 2 decimals and no approx sign', () {
      expect(Money.aed(88000), 'AED 880.00');
      expect(Money.aed(502832), 'AED 5,028.32');
      expect(Money.aed(0), 'AED 0.00');
      expect(Money.format(1909336 / 100, DisplayCurrency.aed), 'AED 19,093.36');
    });

    test('display currencies are rounded whole units with ≈', () {
      // 880 AED × 1.0211 = 898.57 → ≈ SAR 899 (the board's example)
      expect(Money.convertFromAed(88000, DisplayCurrency.sar, 1.0211), 899);
      expect(Money.display(88000, DisplayCurrency.sar, 1.0211), '≈ SAR 899');
      expect(Money.display(502832, DisplayCurrency.usd, 0.2723), '≈ USD 1,369');
      expect(Money.display(502832, DisplayCurrency.qar, 0.9912), '≈ QAR 4,984');
    });

    test('AED display ignores the rate', () {
      expect(Money.display(88000, DisplayCurrency.aed, 3.5), 'AED 880.00');
    });

    test('Arabic-Indic digits are applied when requested', () {
      expect(Money.aed(88000, arabicDigits: true), 'AED ٨٨٠.٠٠');
      expect(Money.display(88000, DisplayCurrency.sar, 1.0211, arabicDigits: true), '≈ SAR ٨٩٩');
    });

    test('percentOf rounds to the nearest fil', () {
      expect(Money.percentOf(88000, 60), 52800);
      expect(Money.percentOf(333, 5), 17);
    });

    test('compact AED for dashboards', () {
      expect(Money.aedCompact(3148200), 'AED 31,482');
    });
  });

  group('FxRates', () {
    test('parses the /fx-rates payload and falls back to 1 for AED', () {
      final fx = FxRates.fromJson({
        'base': 'AED',
        'rates': {'SAR': 1.0211, 'QAR': '0.9912', 'USD': 0.2723},
        'updatedAt': '2026-11-01T10:00:00Z',
      });
      expect(fx.rateFor(DisplayCurrency.aed), 1);
      expect(fx.rateFor(DisplayCurrency.sar), 1.0211);
      expect(fx.rateFor(DisplayCurrency.qar), 0.9912);
      expect(fx.has(DisplayCurrency.usd), isTrue);
      expect(fx.updatedAt, isNotNull);
    });

    test('fallback only knows AED', () {
      expect(FxRates.fallback.has(DisplayCurrency.sar), isFalse);
      expect(FxRates.fallback.rateFor(DisplayCurrency.sar), 1);
    });
  });

  group('Fmt', () {
    test('timecodes and slates stay Latin', () {
      expect(Fmt.timecode(const Duration(hours: 1, minutes: 24, seconds: 9)), '01:24:09');
      expect(Fmt.holdClock(const Duration(hours: 47, minutes: 58, seconds: 12)), '47:58:12');
      expect(Fmt.holdClock(const Duration(seconds: -5)), '00:00:00');
      expect(Fmt.slate('B07', 5), 'B07 · S05');
    });

    test('money via Fmt honours the Arabic digits preference', () {
      const en = Fmt();
      const ar = Fmt(locale: AppLocale.ar, arabicDigits: true);
      expect(en.aed(88000), 'AED 880.00');
      expect(ar.aed(88000), 'AED ٨٨٠.٠٠');
      expect(en.money(88000, DisplayCurrency.sar, 1.0211), '≈ SAR 899');
    });

    test('time formatting is 24h', () {
      expect(const Fmt().time(DateTime(2026, 11, 24, 19, 0)), '19:00');
    });
  });
}

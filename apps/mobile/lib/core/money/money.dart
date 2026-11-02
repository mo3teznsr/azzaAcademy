import 'package:intl/intl.dart';

import '../domain/enums.dart';
import '../utils/digits.dart';

/// Money helpers mirroring packages/shared/src/money.ts.
/// Amounts are integers in fils (1 AED = 100 fils) everywhere outside the UI.
abstract final class Money {
  static int aedToFils(num aed) => (aed * 100).round();
  static double filsToAed(int fils) => fils / 100;

  /// [rate] = units of [currency] per 1 AED. Non-AED amounts are rounded to whole units.
  static num convertFromAed(int fils, DisplayCurrency currency, double rate) {
    if (currency.isBase) return filsToAed(fils);
    return (filsToAed(fils) * rate).round();
  }

  /// `AED 880.00` for the base currency; `≈ SAR 899` for display currencies.
  static String format(num amount, DisplayCurrency currency, {String locale = 'en', bool arabicDigits = false}) {
    final digits = currency.isBase ? 2 : 0;
    final pattern = digits == 2 ? '#,##0.00' : '#,##0';
    final num = NumberFormat(pattern, 'en').format(amount);
    final approx = currency.isBase ? '' : '≈ ';
    final out = '$approx${currency.wire} $num';
    return arabicDigits ? Digits.toArabicIndic(out) : out;
  }

  /// Formats an AED amount in fils, always exact (what is charged / paid out).
  static String aed(int fils, {bool arabicDigits = false}) =>
      format(filsToAed(fils), DisplayCurrency.aed, arabicDigits: arabicDigits);

  /// Formats fils in a display currency using [rate]; AED stays exact.
  static String display(int fils, DisplayCurrency currency, double rate, {bool arabicDigits = false}) =>
      format(convertFromAed(fils, currency, rate), currency, arabicDigits: arabicDigits);

  /// Compact AED (no decimals) for dashboards: `AED 31,482`.
  static String aedCompact(int fils, {bool arabicDigits = false}) {
    final out = 'AED ${NumberFormat('#,##0', 'en').format(filsToAed(fils).round())}';
    return arabicDigits ? Digits.toArabicIndic(out) : out;
  }

  static int percentOf(int fils, num percent) => (fils * percent / 100).round();
}

/// FX snapshot from `GET /api/v1/fx-rates`.
class FxRates {
  const FxRates({required this.rates, this.updatedAt});

  factory FxRates.fromJson(Map<String, dynamic> json) {
    final raw = json['rates'];
    final rates = <DisplayCurrency, double>{DisplayCurrency.aed: 1};
    if (raw is Map) {
      raw.forEach((k, v) {
        final c = DisplayCurrency.parse(k);
        if (c != DisplayCurrency.aed || k == 'AED') {
          rates[c] = v is num ? v.toDouble() : double.tryParse('$v') ?? 1;
        }
      });
    }
    return FxRates(rates: rates, updatedAt: DateTime.tryParse('${json['updatedAt']}'));
  }

  static const fallback = FxRates(rates: {DisplayCurrency.aed: 1});

  final Map<DisplayCurrency, double> rates;
  final DateTime? updatedAt;

  double rateFor(DisplayCurrency c) => c.isBase ? 1 : (rates[c] ?? 1);
  bool has(DisplayCurrency c) => c.isBase || rates.containsKey(c);
}

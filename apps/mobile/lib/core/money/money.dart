import 'dart:math' as math;

import 'package:flutter/foundation.dart' show immutable;
import 'package:intl/intl.dart';

import '../domain/enums.dart';
import '../utils/digits.dart';

/// Money helpers mirroring packages/shared/src/money.ts.
/// Amounts are integers in fils (1 AED = 100 fils) everywhere outside the UI.
abstract final class Money {
  static int aedToFils(num aed) => (aed * 100).round();
  static double filsToAed(int fils) => fils / 100;

  /// Decimals used when the currency list does not say: 2 for AED, whole units for the rest.
  static int defaultDecimals(DisplayCurrency c) => c.isBase ? 2 : 0;

  /// [rate] = units of [currency] per 1 AED. Non-AED amounts are rounded to [decimals].
  static num convertFromAed(int fils, DisplayCurrency currency, double rate, {int? decimals}) {
    if (currency.isBase) return filsToAed(fils);
    final d = decimals ?? defaultDecimals(currency);
    final raw = filsToAed(fils) * rate;
    if (d == 0) return raw.round();
    final scale = math.pow(10, d);
    return (raw * scale).round() / scale;
  }

  /// `AED 880.00` for the base currency; `≈ SAR 899` for display currencies (each uses its own [decimals]).
  static String format(num amount, DisplayCurrency currency, {String locale = 'en', bool arabicDigits = false, int? decimals}) {
    final d = decimals ?? defaultDecimals(currency);
    final pattern = d == 0 ? '#,##0' : '#,##0.${'0' * d}';
    final num = NumberFormat(pattern, 'en').format(amount);
    final approx = currency.isBase ? '' : '≈ ';
    final out = '$approx${currency.wire} $num';
    return arabicDigits ? Digits.toArabicIndic(out) : out;
  }

  /// Formats an AED amount in fils, always exact (what is charged / paid out).
  static String aed(int fils, {bool arabicDigits = false}) =>
      format(filsToAed(fils), DisplayCurrency.aed, arabicDigits: arabicDigits);

  /// Formats fils in a display currency using [rate]; AED stays exact.
  static String display(int fils, DisplayCurrency currency, double rate, {bool arabicDigits = false, int? decimals}) =>
      format(convertFromAed(fils, currency, rate, decimals: decimals), currency, arabicDigits: arabicDigits, decimals: decimals);

  /// Compact AED (no decimals) for dashboards: `AED 31,482`.
  static String aedCompact(int fils, {bool arabicDigits = false}) {
    final out = 'AED ${NumberFormat('#,##0', 'en').format(filsToAed(fils).round())}';
    return arabicDigits ? Digits.toArabicIndic(out) : out;
  }

  static int percentOf(int fils, num percent) => (fils * percent / 100).round();
}

/// One currency from `GET /currencies` (or `GET /admin/currencies`, which also lists disabled ones).
@immutable
class CurrencyInfo {
  const CurrencyInfo({
    required this.code,
    this.nameEn = '',
    this.nameAr,
    this.symbol,
    this.decimals = 2,
    this.ratePerAed = 1,
    this.sortOrder = 0,
    this.enabled = true,
  });

  factory CurrencyInfo.fromJson(Map<String, dynamic> j) {
    final code = '${j['code'] ?? ''}'.toUpperCase();
    final rate = j['ratePerAed'];
    final dec = j['decimals'];
    final order = j['sortOrder'];
    return CurrencyInfo(
      code: code,
      nameEn: j['nameEn'] is String && (j['nameEn'] as String).isNotEmpty ? j['nameEn'] as String : code,
      nameAr: j['nameAr'] is String && (j['nameAr'] as String).isNotEmpty ? j['nameAr'] as String : null,
      symbol: j['symbol'] is String && (j['symbol'] as String).isNotEmpty ? j['symbol'] as String : null,
      decimals: dec is num ? dec.toInt() : (code == 'AED' ? 2 : 0),
      ratePerAed: rate is num ? rate.toDouble() : double.tryParse('$rate') ?? 1,
      sortOrder: order is num ? order.toInt() : 0,
      enabled: j['enabled'] != false,
    );
  }

  final String code;
  final String nameEn;
  final String? nameAr;
  final String? symbol;
  final int decimals;
  final double ratePerAed;
  final int sortOrder;
  final bool enabled;

  DisplayCurrency get currency => DisplayCurrency(code);
  bool get isBase => code == 'AED';
  String name(bool arabic) => arabic && nameAr != null ? nameAr! : nameEn;
}

/// The enabled display currencies (`GET /currencies`). A currency that is not listed has no rate, so amounts
/// in it fall back to AED.
class FxRates {
  /// [rates] alone is enough for tests and old `{ rates: { SAR: 3.67 } }` payloads; [info] adds names and decimals.
  const FxRates({required this.rates, this.updatedAt, this.info = const {}});

  factory FxRates.fromJson(Map<String, dynamic> json) {
    final rates = <DisplayCurrency, double>{DisplayCurrency.aed: 1};
    final info = <DisplayCurrency, CurrencyInfo>{};
    final items = json['items'];
    if (items is List) {
      for (final raw in items) {
        if (raw is! Map) continue;
        final c = CurrencyInfo.fromJson(raw.cast<String, dynamic>());
        if (!RegExp(r'^[A-Z]{3}$').hasMatch(c.code) || c.enabled == false) continue;
        info[c.currency] = c;
        rates[c.currency] = c.isBase ? 1 : c.ratePerAed;
      }
    } else if (json['rates'] is Map) {
      (json['rates'] as Map).forEach((k, v) {
        final c = DisplayCurrency.parse(k);
        if (!c.isBase || k == 'AED') rates[c] = v is num ? v.toDouble() : double.tryParse('$v') ?? 1;
      });
    }
    return FxRates(rates: rates, info: info, updatedAt: DateTime.tryParse('${json['updatedAt']}'));
  }

  static const fallback = FxRates(rates: {DisplayCurrency.aed: 1});

  final Map<DisplayCurrency, double> rates;
  final Map<DisplayCurrency, CurrencyInfo> info;
  final DateTime? updatedAt;

  double rateFor(DisplayCurrency c) => c.isBase ? 1 : (rates[c] ?? 1);
  bool has(DisplayCurrency c) => c.isBase || rates.containsKey(c);
  int decimalsFor(DisplayCurrency c) => c.isBase ? 2 : (info[c]?.decimals ?? Money.defaultDecimals(c));

  /// Every listed currency, in the server's order (AED is always first when the server omits it).
  List<DisplayCurrency> get currencies {
    final listed = info.values.toList()..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    final out = [for (final i in listed) i.currency];
    for (final c in rates.keys) {
      if (!out.contains(c)) out.add(c);
    }
    if (!out.contains(DisplayCurrency.aed)) out.insert(0, DisplayCurrency.aed);
    return out;
  }

  /// Listed currencies other than AED.
  List<DisplayCurrency> get others => [for (final c in currencies) if (!c.isBase) c];

  /// `Saudi riyal`-style name for pickers, or null when the list carried none.
  String? nameOf(DisplayCurrency c, {required bool arabic}) => info[c]?.name(arabic);
}

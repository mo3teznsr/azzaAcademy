import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../domain/enums.dart';
import '../money/money.dart';
import '../prefs/app_prefs.dart';
import 'digits.dart';

/// Locale-aware date/number formatting. Timecodes and slate IDs stay Latin.
class Fmt {
  const Fmt({this.locale = AppLocale.en, this.arabicDigits = false});

  final AppLocale locale;
  final bool arabicDigits;

  String get _l => locale.wire;

  String _d(String pattern, DateTime t) => DateFormat(pattern, _l).format(t).digits(arabicDigits);

  /// `19:00`
  String time(DateTime t) => _d('HH:mm', t);

  /// `Tue · Nov 24`
  String dayLabel(DateTime t) => '${_d('EEE', t)} · ${_d('MMM d', t)}';

  /// `Tue Nov 24 · 19:00`
  String dayTime(DateTime t) => '${_d('EEE MMM d', t)} · ${time(t)}';

  /// `Nov 24`
  String shortDate(DateTime t) => _d('MMM d', t);

  /// `Tue`
  String weekday(DateTime t) => _d('EEE', t);

  /// `24`
  String dayNumber(DateTime t) => _d('d', t);

  /// `Tuesday 24 November 2026`
  String longDate(DateTime t) => _d('EEEE d MMMM y', t);

  /// `Nov 2026`
  String monthYear(DateTime t) => _d('MMM y', t);

  String number(num n) => NumberFormat.decimalPattern('en').format(n).digits(arabicDigits);

  String percent(num p) => '${number(p.round())}%';

  /// `00:05:12` — always Latin digits (timecode).
  static String timecode(Duration d) {
    final s = d.inSeconds.abs();
    String two(int v) => v.toString().padLeft(2, '0');
    return '${two(s ~/ 3600)}:${two((s % 3600) ~/ 60)}:${two(s % 60)}';
  }

  /// `47:58:12` style hold countdown (hours can exceed 24).
  static String holdClock(Duration d) => timecode(d.isNegative ? Duration.zero : d);

  /// `B07 · S05`
  static String slate(String batchCode, int sessionNumber) =>
      '$batchCode · S${sessionNumber.toString().padLeft(2, '0')}';

  String aed(int fils) => Money.aed(fils, arabicDigits: arabicDigits);
  String money(int fils, DisplayCurrency c, double rate) => Money.display(fils, c, rate, arabicDigits: arabicDigits);
  String n(Object v) => '$v'.digits(arabicDigits);
}

final fmtProvider = Provider<Fmt>(
  (ref) => Fmt(locale: ref.watch(localeProvider), arabicDigits: ref.watch(useArabicDigitsProvider)),
);

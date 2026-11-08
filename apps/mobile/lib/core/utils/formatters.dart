import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../domain/enums.dart';
import '../l10n/l10n.dart';
import '../money/money.dart';
import '../prefs/app_prefs.dart';
import 'digits.dart';

/// Locale-aware date/number formatting. Timecodes and slate IDs stay Latin.
class Fmt {
  const Fmt({this.locale = AppLocale.en, this.arabicDigits = false});

  final AppLocale locale;
  final bool arabicDigits;

  String get _l => locale.wire;

  /// Formats with an intl locale skeleton (`DateFormat.MMMd(locale)` and friends), so word order
  /// follows the language: «7 نوفمبر» in Arabic, "Nov 7" in English.
  String _s(DateFormat Function(String locale) skeleton, DateTime t) => skeleton(_l).format(t).digits(arabicDigits);

  /// Left-to-right isolate (LRI … PDI): keeps a time range in reading order inside RTL text.
  static const lri = '\u2066';

  /// First-strong isolate (FSI … PDI).
  static const fsi = '\u2068';

  /// Pop directional isolate.
  static const pdi = '\u2069';

  /// Wraps [s] in an LTR isolate so it never reverses or breaks apart in an RTL line.
  static String ltr(String s) => '$lri$s$pdi';

  /// `19:00` (24-hour in both languages).
  String time(DateTime t) => _s(DateFormat.Hm, t);

  /// `19:00–20:30`, isolated so it reads start → end in Arabic too and never wraps at the dash.
  String timeRange(DateTime start, DateTime? end) =>
      end == null ? ltr('${time(start)}–') : ltr('${time(start)}\u2060–\u2060${time(end)}');

  /// `Tue · Nov 24` / «الثلاثاء · 24 نوفمبر»
  String dayLabel(DateTime t) => '${weekday(t)} · ${shortDate(t)}';

  /// `Tue, Nov 24 · 19:00`
  String dayTime(DateTime t) => '${_s(DateFormat.MMMEd, t)} · ${time(t)}';

  /// `Tue, Nov 24`
  String dayDate(DateTime t) => _s(DateFormat.MMMEd, t);

  /// `Nov 24` / «24 نوفمبر»
  String shortDate(DateTime t) => _s(DateFormat.MMMd, t);

  /// `Nov 24, 2026` / «24 نوفمبر 2026»
  String mediumDate(DateTime t) => _s(DateFormat.yMMMd, t);

  /// `Tue`
  String weekday(DateTime t) => _s(DateFormat.E, t);

  /// `24`
  String dayNumber(DateTime t) => _s(DateFormat.d, t);

  /// `Tuesday, November 24, 2026`
  String longDate(DateTime t) => _s(DateFormat.yMMMMEEEEd, t);

  /// `Nov 2026`
  String monthYear(DateTime t) => _s(DateFormat.yMMM, t);

  /// Two dates as one range. Same month collapses: `2–8 Nov` / «2–8 نوفمبر»; otherwise
  /// `Nov 28 – Dec 4`, with years only when they differ.
  String dateRange(DateTime a, DateTime b) {
    if (a.year == b.year && a.month == b.month) {
      if (a.day == b.day) return shortDate(a);
      return '${dayNumber(a)}–${dayNumber(b)} ${_s(DateFormat.MMM, b)}';
    }
    if (a.year == b.year) return '${shortDate(a)} – ${shortDate(b)}';
    return '${mediumDate(a)} – ${mediumDate(b)}';
  }

  /// Joins words the way the language does: `Tue & Thu`, `Sun, Tue & Thu`; «الثلاثاء والخميس»,
  /// «الأحد، الثلاثاء والخميس».
  String joinList(Iterable<String> items) {
    final list = items.where((e) => e.isNotEmpty).toList();
    if (list.length <= 1) return list.join();
    final ar = locale == AppLocale.ar;
    final head = list.sublist(0, list.length - 1).join(ar ? '، ' : ', ');
    return ar ? '$head و${list.last}' : '$head & ${list.last}';
  }

  /// Weekday names for schedule rules (0 = Sunday), joined for the locale.
  String weekdays(Iterable<int> days) => joinList(days.map((d) => weekday(DateTime(2023, 1, 1 + d))));

  /// "Today 18:00", "Tomorrow 18:00", "Thu 18:00" (within the week), else "Tue, Nov 24 · 18:00".
  String relativeDay(AppLocalizations l, DateTime at, DateTime now) {
    final days = _startOfDay(at).difference(_startOfDay(now)).inDays;
    if (days == 0) return l.teacherTodayAt(time(at));
    if (days == 1) return l.teacherTomorrowAt(time(at));
    if (days > 1 && days < 7) return '${weekday(at)} ${time(at)}';
    return dayTime(at);
  }

  /// Like [relativeDay], but the next three hours read as a countdown: "in 25 min", "in 2 h".
  String relative(AppLocalizations l, DateTime at, DateTime now) {
    final until = at.difference(now);
    if (!until.isNegative && until < const Duration(hours: 1)) return l.fmtInMinutes(n(until.inMinutes));
    if (!until.isNegative && until < const Duration(hours: 3)) return l.fmtInHours(n(until.inHours));
    return relativeDay(l, at, now);
  }

  static DateTime _startOfDay(DateTime t) => DateTime(t.year, t.month, t.day);

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

  /// Queue position: `3rd` in English, plain (locale digits) in Arabic.
  String ordinal(int n) => locale == AppLocale.ar ? this.n(n) : ordinalEn(n);

  static String ordinalEn(int n) {
    final mod100 = n % 100;
    final suffix = (mod100 >= 11 && mod100 <= 13)
        ? 'th'
        : switch (n % 10) {
            1 => 'st',
            2 => 'nd',
            3 => 'rd',
            _ => 'th',
          };
    return '$n$suffix';
  }
}

final fmtProvider = Provider<Fmt>(
  (ref) => Fmt(locale: ref.watch(localeProvider), arabicDigits: ref.watch(useArabicDigitsProvider)),
);

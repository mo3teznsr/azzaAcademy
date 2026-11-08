import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/utils/formatters.dart';
import 'package:azza/l10n/app_localizations.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const en = Fmt();
  const ar = Fmt(locale: AppLocale.ar);
  final nov7 = DateTime(2026, 11, 7, 18);

  group('dates follow the locale', () {
    test('short dates: day before month in Arabic', () {
      expect(en.shortDate(nov7), 'Nov 7');
      expect(ar.shortDate(nov7), '7 نوفمبر');
    });

    test('Western digits by default, Arabic-Indic only on request', () {
      expect(ar.shortDate(nov7), contains('7'));
      expect(const Fmt(locale: AppLocale.ar, arabicDigits: true).shortDate(nov7), contains('٧'));
    });

    test('date ranges collapse within a month', () {
      expect(en.dateRange(DateTime(2026, 11, 2), DateTime(2026, 11, 8)), '2–8 Nov');
      expect(ar.dateRange(DateTime(2026, 11, 2), DateTime(2026, 11, 8)), '2–8 نوفمبر');
      expect(en.dateRange(DateTime(2026, 11, 28), DateTime(2026, 12, 4)), 'Nov 28 – Dec 4');
      expect(en.dateRange(DateTime(2026, 12, 28), DateTime(2027, 1, 3)), 'Dec 28, 2026 – Jan 3, 2027');
      expect(en.dateRange(nov7, nov7), 'Nov 7');
    });
  });

  group('times', () {
    test('ranges are isolated left-to-right and never break at the dash', () {
      final r = ar.timeRange(DateTime(2026, 1, 1, 19), DateTime(2026, 1, 1, 20, 30));
      expect(r.startsWith(Fmt.lri), isTrue);
      expect(r.endsWith(Fmt.pdi), isTrue);
      expect(r.replaceAll(RegExp('[\u2066\u2069\u2060]'), ''), '19:00–20:30');
    });

    test('relative day and countdown', () {
      final l = lookupAppLocalizations(const Locale('en'));
      final now = DateTime(2026, 11, 9, 9);
      expect(en.relative(l, DateTime(2026, 11, 9, 9, 25), now), 'in 25 min');
      expect(en.relative(l, DateTime(2026, 11, 9, 11, 10), now), 'in 2 h');
      expect(en.relative(l, DateTime(2026, 11, 9, 18), now), 'Today 18:00');
      expect(en.relative(l, DateTime(2026, 11, 10, 18), now), 'Tomorrow 18:00');
    });
  });

  group('lists', () {
    test('weekday lists use the language’s conjunction', () {
      expect(en.weekdays([2, 4]), 'Tue & Thu');
      expect(en.weekdays([0, 2, 4]), 'Sun, Tue & Thu');
      expect(ar.joinList(['الثلاثاء', 'الخميس']), 'الثلاثاء والخميس');
      expect(ar.joinList(['الأحد', 'الثلاثاء', 'الخميس']), 'الأحد، الثلاثاء والخميس');
    });
  });
}

import 'package:azza/l10n/app_localizations_ar.dart';
import 'package:azza/l10n/app_localizations_en.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final en = AppLocalizationsEn();
  final ar = AppLocalizationsAr();

  test('English counts agree with their number', () {
    expect([for (final n in [1, 3]) en.lessonsCountN(n)], ['1 lesson', '3 lessons']);
    expect(en.seatsLeft(1), '1 place left');
    expect(en.joiningLate(1, 5), contains('1 session already ran'));
    expect(en.joiningLate(1, 5), endsWith('5 live sessions left.'));
    expect(en.enrolledBody('UX', 'B07', 1, '1'), endsWith('your 1 live session is in your schedule.'));
    expect(en.quizStudentsAttempted(1, 2), '1 student tried · 2 attempts');
  });

  test('Arabic uses all six plural forms, with Western digits', () {
    expect([for (final n in [0, 1, 2, 3, 11, 100]) ar.lessonsCountN(n)], ['لا دروس', 'درس واحد', 'درسان', '3 دروس', '11 درسًا', '100 درس']);
    expect([for (final n in [1, 2, 4, 15]) ar.seatsLeft(n)], ['بقي مكان واحد', 'بقي مكانان', 'بقيت 4 أماكن', 'بقي 15 مكانًا']);
    expect(ar.liveSessionsN(2), 'حصّتان مباشرتان');
    expect(ar.studentsN(12), '12 طالبًا');
    expect(ar.filesAttachHint(5, '5', 'PDF', '10'), 'حتى 5 ملفات · PDF · 10 ميغابايت للملف');
  });
}

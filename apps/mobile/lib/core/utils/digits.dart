abstract final class Digits {
  static const _western = '0123456789';
  static const _arabicIndic = '٠١٢٣٤٥٦٧٨٩';

  /// Arabic-Indic (٠-٩) and Persian (۰-۹) digits to Western; everything else is untouched.
  static String toLatin(String input) {
    final b = StringBuffer();
    for (final r in input.runes) {
      if (r >= 0x0660 && r <= 0x0669) {
        b.write(r - 0x0660);
      } else if (r >= 0x06F0 && r <= 0x06F9) {
        b.write(r - 0x06F0);
      } else {
        b.writeCharCode(r);
      }
    }
    return b.toString();
  }

  static String toArabicIndic(String input) {
    final b = StringBuffer();
    for (final ch in input.split('')) {
      final i = _western.indexOf(ch);
      b.write(i >= 0 ? _arabicIndic[i] : ch);
    }
    return b.toString();
  }
}

extension DigitsX on String {
  /// Normalises Arabic-Indic digits to Western, then applies the user's preference.
  String digits(bool arabic) {
    const arabicIndic = '٠١٢٣٤٥٦٧٨٩';
    final b = StringBuffer();
    for (final ch in split('')) {
      final i = arabicIndic.indexOf(ch);
      b.write(i >= 0 ? '$i' : ch);
    }
    final western = b.toString();
    return arabic ? Digits.toArabicIndic(western) : western;
  }
}

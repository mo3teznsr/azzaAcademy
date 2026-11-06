import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Font roles from docs/BRAND.md:
/// display and body = Almarai (Arabic and English; weights 300/400/700/800),
/// data/timecodes = JetBrains Mono. Headings use 800, body text 400.
abstract final class AzzaFonts {
  /// Tests switch this off so no font is fetched over the network.
  static bool useGoogleFonts = true;

  static const family = 'Almarai';

  static TextStyle _almarai(TextStyle base) =>
      useGoogleFonts ? GoogleFonts.almarai(textStyle: base) : base.copyWith(fontFamily: family);

  /// Headings. Line height follows the brand scale (32/40, 24/32, 20/28); Arabic gets more room for its marks.
  static TextStyle display({required bool arabic, double size = 32, FontWeight weight = FontWeight.w800, Color? color}) {
    return _almarai(TextStyle(
      fontSize: size,
      fontWeight: weight,
      color: color,
      height: arabic ? 1.5 : 1.25,
      letterSpacing: arabic ? 0 : -0.01 * size,
    ));
  }

  /// Body text: 1.7 line height in Arabic, 1.55 in English.
  static TextStyle body({required bool arabic, double size = 15, FontWeight weight = FontWeight.w400, Color? color}) {
    return _almarai(TextStyle(fontSize: size, fontWeight: weight, color: color, height: arabic ? 1.7 : 1.55));
  }

  /// Mono labels are uppercase with tracking; timecodes/slates stay LTR.
  static TextStyle mono({double size = 11, FontWeight weight = FontWeight.w500, Color? color, double tracking = 0.1}) {
    final base = TextStyle(fontSize: size, fontWeight: weight, color: color, letterSpacing: tracking * size, height: 1.3);
    if (!useGoogleFonts) return base.copyWith(fontFamily: 'JetBrains Mono');
    return GoogleFonts.jetBrainsMono(textStyle: base);
  }

  /// Brand scale: display 32, h1 24, h2 20, h3 16, body 14–15, small 13, caption 12.
  static TextTheme textTheme({required bool arabic, required Color color, required Color muted}) {
    TextStyle b(double s, [FontWeight w = FontWeight.w400, Color? c]) => body(arabic: arabic, size: s, weight: w, color: c ?? color);
    TextStyle d(double s) => display(arabic: arabic, size: s, color: color);
    return TextTheme(
      displayLarge: d(56),
      displayMedium: d(40),
      displaySmall: d(32),
      headlineLarge: d(28),
      headlineMedium: d(24),
      headlineSmall: d(20),
      titleLarge: b(18, FontWeight.w700),
      titleMedium: b(16, FontWeight.w700),
      titleSmall: b(14, FontWeight.w700),
      bodyLarge: b(16),
      bodyMedium: b(15),
      bodySmall: b(13, FontWeight.w400, muted),
      labelLarge: b(15, FontWeight.w700),
      labelMedium: b(13, FontWeight.w400),
      labelSmall: mono(color: muted),
    );
  }
}

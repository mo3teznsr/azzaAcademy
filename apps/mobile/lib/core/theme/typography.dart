import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Font roles from the design system:
/// display = Bricolage Grotesque (AR: Readex Pro), body = Inter Tight
/// (AR: IBM Plex Sans Arabic), data/timecodes = JetBrains Mono.
abstract final class AzzaFonts {
  /// Tests switch this off so no font is fetched over the network.
  static bool useGoogleFonts = true;

  static TextStyle display({required bool arabic, double size = 32, FontWeight weight = FontWeight.w700, Color? color}) {
    final base = TextStyle(
      fontSize: size,
      fontWeight: weight,
      color: color,
      height: arabic ? 1.25 : 0.98,
      letterSpacing: arabic ? 0 : -0.035 * size,
    );
    if (!useGoogleFonts) return base.copyWith(fontFamily: arabic ? 'Readex Pro' : 'Bricolage Grotesque');
    return arabic ? GoogleFonts.readexPro(textStyle: base) : GoogleFonts.bricolageGrotesque(textStyle: base);
  }

  static TextStyle body({required bool arabic, double size = 15, FontWeight weight = FontWeight.w400, Color? color}) {
    final base = TextStyle(fontSize: size, fontWeight: weight, color: color, height: arabic ? 1.6 : 1.45);
    if (!useGoogleFonts) return base.copyWith(fontFamily: arabic ? 'IBM Plex Sans Arabic' : 'Inter Tight');
    return arabic ? GoogleFonts.ibmPlexSansArabic(textStyle: base) : GoogleFonts.interTight(textStyle: base);
  }

  /// Mono labels are uppercase with tracking; timecodes/slates stay LTR.
  static TextStyle mono({double size = 11, FontWeight weight = FontWeight.w500, Color? color, double tracking = 0.1}) {
    final base = TextStyle(fontSize: size, fontWeight: weight, color: color, letterSpacing: tracking * size, height: 1.3);
    if (!useGoogleFonts) return base.copyWith(fontFamily: 'JetBrains Mono');
    return GoogleFonts.jetBrainsMono(textStyle: base);
  }

  static TextTheme textTheme({required bool arabic, required Color color, required Color muted}) {
    TextStyle b(double s, [FontWeight w = FontWeight.w400, Color? c]) => body(arabic: arabic, size: s, weight: w, color: c ?? color);
    TextStyle d(double s, [FontWeight w = FontWeight.w700]) => display(arabic: arabic, size: s, weight: w, color: color);
    return TextTheme(
      displayLarge: d(64, FontWeight.w800),
      displayMedium: d(44, FontWeight.w800),
      displaySmall: d(34),
      headlineLarge: d(30),
      headlineMedium: d(26),
      headlineSmall: d(22),
      titleLarge: b(19, FontWeight.w600),
      titleMedium: b(16, FontWeight.w600),
      titleSmall: b(14, FontWeight.w600),
      bodyLarge: b(16),
      bodyMedium: b(15),
      bodySmall: b(13, FontWeight.w400, muted),
      labelLarge: b(15, FontWeight.w600),
      labelMedium: b(13, FontWeight.w500),
      labelSmall: mono(color: muted),
    );
  }
}

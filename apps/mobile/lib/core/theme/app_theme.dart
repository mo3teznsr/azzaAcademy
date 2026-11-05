import 'package:flutter/material.dart';

import 'tokens.dart';
import 'typography.dart';

abstract final class AzzaTheme {
  static ThemeData light(ThemeVariant variant, {bool arabic = false}) => build(variant, brightness: Brightness.light, arabic: arabic);
  static ThemeData dark(ThemeVariant variant, {bool arabic = false}) => build(variant, brightness: Brightness.dark, arabic: arabic);

  static ThemeData build(ThemeVariant variant, {Brightness brightness = Brightness.dark, bool arabic = false}) {
    final p = AzzaPalette.forVariant(variant, brightness);
    final scheme = ColorScheme(
      brightness: p.isDark ? Brightness.dark : Brightness.light,
      primary: p.accent,
      onPrimary: p.onAccent,
      secondary: AzzaColors.sun,
      onSecondary: AzzaColors.ink,
      error: AzzaColors.onAir,
      onError: AzzaColors.ink,
      surface: p.ground,
      onSurface: p.text,
      surfaceContainerHighest: p.raised,
      surfaceContainer: p.raised,
      outline: p.line,
      outlineVariant: p.line,
    );
    final text = AzzaFonts.textTheme(arabic: arabic, color: p.text, muted: p.muted);
    final pill = RoundedRectangleBorder(borderRadius: BorderRadius.circular(999));
    final buttonText = AzzaFonts.body(arabic: arabic, size: 15, weight: FontWeight.w600);

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      brightness: scheme.brightness,
      scaffoldBackgroundColor: p.ground,
      canvasColor: p.ground,
      textTheme: text,
      extensions: [p],
      splashFactory: InkSparkle.splashFactory,
      dividerTheme: DividerThemeData(color: p.line, thickness: 1, space: 1),
      appBarTheme: AppBarTheme(
        backgroundColor: p.ground,
        foregroundColor: p.text,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: AzzaFonts.display(arabic: arabic, size: 22, color: p.text),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: p.accent,
          foregroundColor: p.onAccent,
          minimumSize: const Size(48, 52),
          padding: const EdgeInsets.symmetric(horizontal: 22),
          shape: pill,
          textStyle: buttonText,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: p.text,
          minimumSize: const Size(48, 52),
          side: BorderSide(color: p.line),
          padding: const EdgeInsets.symmetric(horizontal: 20),
          shape: pill,
          textStyle: buttonText,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: p.isDark ? p.accent : p.text, textStyle: buttonText),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: p.raised,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
        labelStyle: TextStyle(color: p.muted),
        hintStyle: TextStyle(color: p.muted),
        prefixIconColor: WidgetStateColor.resolveWith((s) => s.contains(WidgetState.focused) ? p.accent : p.muted),
        suffixIconColor: WidgetStateColor.resolveWith((s) => s.contains(WidgetState.focused) ? p.text : p.muted),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AzzaSpace.radiusSm),
          borderSide: BorderSide(color: p.isDark ? AzzaColors.fieldLine : p.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AzzaSpace.radiusSm),
          borderSide: BorderSide(color: p.isDark ? AzzaColors.fieldLine : p.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AzzaSpace.radiusSm),
          borderSide: BorderSide(color: p.accent, width: 1.5),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: p.ground,
        indicatorColor: p.accent,
        surfaceTintColor: Colors.transparent,
        height: 68,
        labelTextStyle: WidgetStatePropertyAll(AzzaFonts.mono(size: 10, color: p.muted)),
        iconTheme: WidgetStateProperty.resolveWith(
          (s) => IconThemeData(color: s.contains(WidgetState.selected) ? p.onAccent : p.muted),
        ),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: p.raised,
        modalBackgroundColor: p.raised,
        showDragHandle: true,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: p.text,
        contentTextStyle: TextStyle(color: p.ground),
        behavior: SnackBarBehavior.floating,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: p.raised,
        selectedColor: p.accent,
        side: BorderSide(color: p.line),
        shape: pill,
        labelStyle: AzzaFonts.body(arabic: arabic, size: 13, weight: FontWeight.w500, color: p.text),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(color: p.accent, linearTrackColor: p.line),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? p.onAccent : p.muted),
        trackColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? p.accent : p.raised),
      ),
    );
  }
}

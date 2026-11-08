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
      primary: p.primary,
      onPrimary: p.onPrimary,
      secondary: AzzaColors.green,
      onSecondary: AzzaColors.inkDeep,
      tertiary: p.accent,
      onTertiary: p.onAccent,
      error: p.danger,
      onError: p.isDark ? AzzaColors.inkDeep : AzzaColors.ivory,
      surface: p.ground,
      onSurface: p.text,
      onSurfaceVariant: p.muted,
      surfaceContainerLowest: p.ground,
      surfaceContainerLow: p.raised,
      surfaceContainer: p.raised,
      surfaceContainerHigh: p.isDark ? AzzaColors.ink3 : AzzaColors.raised,
      surfaceContainerHighest: p.isDark ? AzzaColors.ink3 : AzzaColors.raised,
      outline: p.fieldLine,
      outlineVariant: p.line,
      inverseSurface: p.text,
      onInverseSurface: p.ground,
      inversePrimary: AzzaColors.green,
    );
    final text = AzzaFonts.textTheme(arabic: arabic, color: p.text, muted: p.textSecondary);
    const pill = StadiumBorder();
    final buttonText = AzzaFonts.body(arabic: arabic, size: 15, weight: FontWeight.w700);
    final card = RoundedRectangleBorder(borderRadius: BorderRadius.circular(AzzaSpace.radius), side: BorderSide(color: p.line));
    final popover = p.isDark ? AzzaColors.ink3 : AzzaColors.surface;
    final greenTint = AzzaColors.green.withValues(alpha: p.isDark ? 0.22 : 0.18);
    final focusRing = p.isDark ? AzzaColors.green : AzzaColors.greenDeep;
    OutlineInputBorder field(Color c, [double w = 1]) =>
        OutlineInputBorder(borderRadius: BorderRadius.circular(AzzaSpace.radiusSm), borderSide: BorderSide(color: c, width: w));

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      brightness: scheme.brightness,
      scaffoldBackgroundColor: p.ground,
      canvasColor: p.ground,
      textTheme: text,
      extensions: [p],
      splashFactory: InkSparkle.splashFactory,
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: focusRing,
        selectionColor: greenTint,
        selectionHandleColor: focusRing,
      ),
      dividerTheme: DividerThemeData(color: p.isDark ? p.line : AzzaColors.borderSoft, thickness: 1, space: 1),
      appBarTheme: AppBarTheme(
        backgroundColor: p.ground,
        foregroundColor: p.text,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        titleTextStyle: AzzaFonts.display(arabic: arabic, size: 20, color: p.text),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: p.primary,
          foregroundColor: p.onPrimary,
          disabledBackgroundColor: p.line,
          disabledForegroundColor: p.muted,
          minimumSize: const Size(48, 52),
          padding: const EdgeInsets.symmetric(horizontal: 22),
          shape: pill,
          textStyle: buttonText,
        ).copyWith(
          // Hover / press: greenDeep on light, mint on dark.
          overlayColor: WidgetStateProperty.resolveWith(
            (s) => s.contains(WidgetState.pressed) || s.contains(WidgetState.hovered)
                ? (p.isDark ? AzzaColors.mint : AzzaColors.greenDeep).withValues(alpha: 0.24)
                : null,
          ),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AzzaColors.green,
          foregroundColor: AzzaColors.inkDeep,
          elevation: 0,
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
          side: BorderSide(color: p.fieldLine),
          padding: const EdgeInsets.symmetric(horizontal: 20),
          shape: pill,
          textStyle: buttonText,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: p.isDark ? AzzaColors.mint : AzzaColors.greenDarker, shape: pill, textStyle: buttonText),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: p.raised,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
        labelStyle: TextStyle(color: p.textSecondary),
        floatingLabelStyle: WidgetStateTextStyle.resolveWith((s) => TextStyle(color: s.contains(WidgetState.focused) ? focusRing : p.muted)),
        hintStyle: TextStyle(color: p.hint),
        prefixIconColor: WidgetStateColor.resolveWith((s) => s.contains(WidgetState.focused) ? focusRing : p.muted),
        suffixIconColor: WidgetStateColor.resolveWith((s) => s.contains(WidgetState.focused) ? focusRing : p.muted),
        border: field(p.fieldLine),
        enabledBorder: field(p.fieldLine),
        focusedBorder: field(focusRing, 1.6),
        errorBorder: field(p.danger),
        focusedErrorBorder: field(p.danger, 1.6),
        errorStyle: TextStyle(color: p.danger),
      ),
      cardTheme: CardThemeData(
        color: p.raised,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: card,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: popover,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        titleTextStyle: AzzaFonts.display(arabic: arabic, size: 20, color: p.text),
        contentTextStyle: AzzaFonts.body(arabic: arabic, size: 15, color: p.text),
      ),
      popupMenuTheme: PopupMenuThemeData(
        color: popover,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AzzaSpace.radiusSm), side: BorderSide(color: p.line)),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: p.ground,
        indicatorColor: greenTint,
        surfaceTintColor: Colors.transparent,
        height: 68,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (s) => AzzaFonts.body(arabic: arabic, size: 12, weight: FontWeight.w700, color: s.contains(WidgetState.selected) ? p.text : p.textSecondary),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (s) => IconThemeData(color: s.contains(WidgetState.selected) ? p.text : p.muted),
        ),
      ),
      tabBarTheme: TabBarThemeData(
        labelColor: p.text,
        unselectedLabelColor: p.textSecondary,
        indicatorColor: AzzaColors.green,
        dividerColor: p.line,
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: popover,
        modalBackgroundColor: popover,
        surfaceTintColor: Colors.transparent,
        dragHandleColor: p.fieldLine,
        showDragHandle: true,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: p.isDark ? AzzaColors.cream : AzzaColors.ink,
        contentTextStyle: AzzaFonts.body(arabic: arabic, size: 14, color: p.isDark ? AzzaColors.inkDeep : AzzaColors.cream),
        actionTextColor: p.isDark ? AzzaColors.greenDarker : AzzaColors.green,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AzzaSpace.radiusSm)),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: p.raised,
        selectedColor: p.accent,
        checkmarkColor: p.onAccent,
        side: BorderSide(color: p.line),
        shape: pill,
        labelStyle: AzzaFonts.body(arabic: arabic, size: 13, weight: FontWeight.w400, color: p.text),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: AzzaColors.green,
        linearTrackColor: p.line,
        circularTrackColor: Colors.transparent,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? AzzaColors.inkDeep : p.muted),
        trackColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? AzzaColors.green : p.raised),
        trackOutlineColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? AzzaColors.green : p.fieldLine),
      ),
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? AzzaColors.green : null),
        checkColor: const WidgetStatePropertyAll(AzzaColors.inkDeep),
      ),
      radioTheme: RadioThemeData(
        fillColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? p.accent : p.muted),
      ),
    );
  }
}

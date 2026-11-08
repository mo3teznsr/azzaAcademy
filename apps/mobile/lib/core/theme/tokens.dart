import 'package:flutter/material.dart';

/// Raw palette from docs/BRAND.md (the green theme). Use [AzzaPalette] in
/// widgets so they adapt to the light (page) and dark (inkDeep) grounds.
///
/// The historical names (sun, sage, sky, peach, navy…) are kept so call sites
/// compile; their values now follow the green system.
abstract final class AzzaColors {
  // ── Ink (deep green) ──────────────────────────────────────────────────────
  /// Text, primary button fill (light), logo on light.
  static const ink = Color(0xFF102018);

  /// Dark ground, auth panel, app icon and launch-screen ground.
  static const inkDeep = Color(0xFF07110D);

  /// Dark card.
  static const ink2 = Color(0xFF16291F);

  /// Dark raised / hover.
  static const ink3 = Color(0xFF1D3328);

  /// Dark border.
  static const line = Color(0xFF26402F);

  /// Dark strong border / input outline.
  static const fieldLine = Color(0xFF33503F);

  // ── Green ─────────────────────────────────────────────────────────────────
  /// Brand accent: fills, rings, accent buttons. Never takes white text (inkDeep instead).
  static const green = Color(0xFF25D366);

  /// Hover / links on light; focused input border.
  static const greenDeep = Color(0xFF159454);

  /// Green as text on light (≥ 4.5:1 on page and white).
  static const greenDarker = Color(0xFF117443);

  /// Accent hover; green as text on dark.
  static const mint = Color(0xFF57ED99);

  /// The one loud colour: whole sections/bands only, with inkDeep text.
  static const lime = Color(0xFFDFFF69);

  // ── Light grounds ─────────────────────────────────────────────────────────
  /// Text on dark; light raised alt.
  static const cream = Color(0xFFF1F1E9);

  /// Light ground.
  static const page = Color(0xFFF5F7F3);

  /// Light card.
  static const surface = Color(0xFFFFFFFF);

  /// Light raised / popover.
  static const raised = Color(0xFFF8F8F2);

  /// White: text on ink fills, certificate paper.
  static const ivory = Color(0xFFFFFFFF);

  /// Light border.
  static const creamLine = Color(0xFFE6EBE4);

  /// Light strong border / input outline.
  static const borderStrong = Color(0xFFD8E0D6);

  /// Light divider.
  static const borderSoft = Color(0xFFEFF3ED);

  /// Light raised (alias kept for older call sites).
  static const creamRaised = raised;

  /// Placeholder and hint (light); secondary text on dark. Too faint for text on light (about 2.2:1).
  static const muted = Color(0xFF9DABA3);

  /// Secondary text on light (BRAND text2, ≥ 4.5:1 on page and white).
  static const mutedDeep = Color(0xFF55655C);

  /// Tertiary (BRAND text3): placeholders on dark, large text only on light.
  static const text3 = Color(0xFF7D8C84);

  // ── Status (legacy names) ─────────────────────────────────────────────────
  /// Old yellow accent → the brand green (inkDeep text on it).
  static const sun = green;

  /// Info tint (was the student sky blue).
  static const sky = Color(0xFFE8EDFB);

  /// Success tint (was sage).
  static const sage = Color(0xFFE7F8EE);

  /// Warning tint (was peach).
  static const peach = Color(0xFFFDF3DF);

  /// Danger tint.
  static const dangerTint = Color(0xFFFBE9E9);

  /// Dark-ground versions of the tints above.
  static const sageDark = Color(0xFF123A27);
  static const skyDark = Color(0xFF17254A);
  static const peachDark = Color(0xFF3A2A10);
  static const dangerTintDark = Color(0xFF2A1212);

  /// Text variants on light grounds (AA ≥ 4.5:1 on page, white and their tint).
  static const skyDeep = Color(0xFF2F5BD6);
  static const sunDeep = greenDarker;
  static const warnDeep = Color(0xFF8A5A12);
  static const dangerDeep = Color(0xFFB83232);

  /// Text variants on dark grounds.
  static const skyLight = Color(0xFF9DB4FF);
  static const warnLight = Color(0xFFF2C46B);
  static const dangerLight = Color(0xFFFF9C9C);

  /// Warning icon (non-text) on light.
  static const warnIcon = Color(0xFFB4741F);

  /// Former brand navy of the عازة logo; now the ink it is tinted with on light.
  static const navy = ink;

  /// On-air: used ONLY when a LiveKit room is actually live. White text on it.
  static const onAir = Color(0xFFD64545);

  /// On-air on dark grounds (inkDeep text on it).
  static const onAirDark = Color(0xFFFF6B6B);
}

abstract final class AzzaMotion {
  static const ease = Cubic(0.23, 1, 0.32, 1);
  static const quick = Duration(milliseconds: 240);
  static const entrance = Duration(milliseconds: 700);
}

abstract final class AzzaSpace {
  static const gutter = 20.0;

  /// Cards.
  static const radius = 16.0;

  /// Inputs and small boxes.
  static const radiusSm = 14.0;

  /// Controls and buttons.
  static const radiusPill = 999.0;
}

/// Which role's accent the theme carries. Light/dark comes from [ThemeMode] (System by default).
enum ThemeVariant { student, teacher, admin }

/// Semantic colours for the active ground.
///
/// - [primary]/[onPrimary]: the main action (ink + white on light, green + inkDeep on dark).
/// - [accent]/[onAccent]: green as text, icon or selection fill — readable on [ground] and [raised].
@immutable
class AzzaPalette extends ThemeExtension<AzzaPalette> {
  const AzzaPalette({
    required this.ground,
    required this.raised,
    required this.line,
    required this.text,
    required this.muted,
    required this.accent,
    required this.onAccent,
    required this.primary,
    required this.onPrimary,
    required this.isDark,
  });

  static const _dark = AzzaPalette(
    ground: AzzaColors.inkDeep,
    raised: AzzaColors.ink2,
    line: AzzaColors.line,
    text: AzzaColors.cream,
    muted: AzzaColors.muted,
    accent: AzzaColors.green,
    onAccent: AzzaColors.inkDeep,
    primary: AzzaColors.green,
    onPrimary: AzzaColors.inkDeep,
    isDark: true,
  );

  static const _light = AzzaPalette(
    ground: AzzaColors.page,
    raised: AzzaColors.surface,
    line: AzzaColors.creamLine,
    text: AzzaColors.ink,
    muted: AzzaColors.mutedDeep,
    accent: AzzaColors.greenDarker,
    onAccent: AzzaColors.ivory,
    primary: AzzaColors.ink,
    onPrimary: AzzaColors.ivory,
    isDark: false,
  );

  // Teacher and admin share the same green system (docs/BRAND.md).
  static const studentDark = _dark;
  static const studentLight = _light;
  static const teacherDark = _dark;
  static const teacherLight = _light;
  static const adminDark = _dark;
  static const adminLight = _light;

  static AzzaPalette forVariant(ThemeVariant v, Brightness b) {
    final dark = b == Brightness.dark;
    return switch (v) {
      ThemeVariant.student => dark ? studentDark : studentLight,
      ThemeVariant.teacher => dark ? teacherDark : teacherLight,
      ThemeVariant.admin => dark ? adminDark : adminLight,
    };
  }

  static AzzaPalette of(BuildContext context) =>
      Theme.of(context).extension<AzzaPalette>() ?? AzzaPalette.studentDark;

  final Color ground;
  final Color raised;
  final Color line;
  final Color text;
  final Color muted;
  final Color accent;
  final Color onAccent;
  final Color primary;
  final Color onPrimary;
  final bool isDark;

  /// Secondary text: captions, subtitles, kickers, empty-state bodies (text2 on light, textMuted on dark).
  /// At least 4.5:1 on [ground] and [raised] in both themes. [muted] carries the same value for
  /// older call sites; prefer this for text.
  Color get textSecondary => isDark ? AzzaColors.muted : AzzaColors.mutedDeep;

  /// Hints and placeholders only (never body or secondary text).
  Color get hint => isDark ? AzzaColors.text3 : AzzaColors.muted;

  /// Input outline.
  Color get fieldLine => isDark ? AzzaColors.fieldLine : AzzaColors.borderStrong;

  // Status pairs: a tint to fill with and a foreground readable on the tint and on [ground].
  Color get success => isDark ? AzzaColors.mint : AzzaColors.greenDarker;
  Color get successBg => isDark ? AzzaColors.sageDark : AzzaColors.sage;
  Color get info => isDark ? AzzaColors.skyLight : AzzaColors.skyDeep;
  Color get infoBg => isDark ? AzzaColors.skyDark : AzzaColors.sky;
  Color get warning => isDark ? AzzaColors.warnLight : AzzaColors.warnDeep;
  Color get warningBg => isDark ? AzzaColors.peachDark : AzzaColors.peach;
  Color get danger => isDark ? AzzaColors.dangerLight : AzzaColors.dangerDeep;
  Color get dangerBg => isDark ? AzzaColors.dangerTintDark : AzzaColors.dangerTint;

  /// Live fill and the text on it.
  Color get live => isDark ? AzzaColors.onAirDark : AzzaColors.onAir;
  Color get onLive => isDark ? AzzaColors.inkDeep : AzzaColors.ivory;

  @override
  AzzaPalette copyWith({
    Color? ground,
    Color? raised,
    Color? line,
    Color? text,
    Color? muted,
    Color? accent,
    Color? onAccent,
    Color? primary,
    Color? onPrimary,
    bool? isDark,
  }) =>
      AzzaPalette(
        ground: ground ?? this.ground,
        raised: raised ?? this.raised,
        line: line ?? this.line,
        text: text ?? this.text,
        muted: muted ?? this.muted,
        accent: accent ?? this.accent,
        onAccent: onAccent ?? this.onAccent,
        primary: primary ?? this.primary,
        onPrimary: onPrimary ?? this.onPrimary,
        isDark: isDark ?? this.isDark,
      );

  @override
  AzzaPalette lerp(ThemeExtension<AzzaPalette>? other, double t) {
    if (other is! AzzaPalette) return this;
    return AzzaPalette(
      ground: Color.lerp(ground, other.ground, t)!,
      raised: Color.lerp(raised, other.raised, t)!,
      line: Color.lerp(line, other.line, t)!,
      text: Color.lerp(text, other.text, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
      onAccent: Color.lerp(onAccent, other.onAccent, t)!,
      primary: Color.lerp(primary, other.primary, t)!,
      onPrimary: Color.lerp(onPrimary, other.onPrimary, t)!,
      isDark: t < 0.5 ? isDark : other.isDark,
    );
  }
}

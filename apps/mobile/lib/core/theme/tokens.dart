import 'package:flutter/material.dart';

/// Raw palette from the "Main" design board. Use [AzzaPalette] in widgets so
/// they adapt to the ink (student/teacher) and cream (admin) grounds.
abstract final class AzzaColors {
  static const ink = Color(0xFF121110);
  static const ink2 = Color(0xFF1C1A18);
  static const line = Color(0xFF2E2B27);
  static const fieldLine = Color(0xFF3A3631);
  static const cream = Color(0xFFF5EFE4);
  static const ivory = Color(0xFFFBF8F2);
  static const muted = Color(0xFFA39B90);
  static const mutedDeep = Color(0xFF6B645B);
  static const creamLine = Color(0xFFD9D0C2);
  static const creamRaised = Color(0xFFFBF8F2);
  static const warnDeep = Color(0xFFB5641F);

  /// Teacher accent / "next up".
  static const sun = Color(0xFFFFD24A);

  /// Student accent / "scheduled".
  static const sky = Color(0xFFBFD8F2);

  /// "Enrolling".
  static const sage = Color(0xFFCFE3C9);

  /// "Full / warn".
  static const peach = Color(0xFFFFC7A6);

  /// On-air: used ONLY when a LiveKit room is actually live.
  static const onAir = Color(0xFFFF5A36);
}

abstract final class AzzaMotion {
  static const ease = Cubic(0.16, 1, 0.3, 1);
  static const quick = Duration(milliseconds: 240);
  static const entrance = Duration(milliseconds: 700);
}

abstract final class AzzaSpace {
  static const gutter = 20.0;
  static const radius = 20.0;
  static const radiusSm = 12.0;
}

enum ThemeVariant { studentInk, teacherInk, adminCream }

/// Semantic colours for the active ground.
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
    required this.isDark,
  });

  static const studentInk = AzzaPalette(
    ground: AzzaColors.ink,
    raised: AzzaColors.ink2,
    line: AzzaColors.line,
    text: AzzaColors.ivory,
    muted: AzzaColors.muted,
    accent: AzzaColors.sky,
    onAccent: AzzaColors.ink,
    isDark: true,
  );

  static const teacherInk = AzzaPalette(
    ground: AzzaColors.ink,
    raised: AzzaColors.ink2,
    line: AzzaColors.line,
    text: AzzaColors.ivory,
    muted: AzzaColors.muted,
    accent: AzzaColors.sun,
    onAccent: AzzaColors.ink,
    isDark: true,
  );

  static const adminCream = AzzaPalette(
    ground: AzzaColors.cream,
    raised: AzzaColors.creamRaised,
    line: AzzaColors.creamLine,
    text: AzzaColors.ink,
    muted: AzzaColors.mutedDeep,
    accent: AzzaColors.ink,
    onAccent: AzzaColors.ivory,
    isDark: false,
  );

  static AzzaPalette of(BuildContext context) =>
      Theme.of(context).extension<AzzaPalette>() ?? AzzaPalette.studentInk;

  final Color ground;
  final Color raised;
  final Color line;
  final Color text;
  final Color muted;
  final Color accent;
  final Color onAccent;
  final bool isDark;

  @override
  AzzaPalette copyWith({
    Color? ground,
    Color? raised,
    Color? line,
    Color? text,
    Color? muted,
    Color? accent,
    Color? onAccent,
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
      isDark: t < 0.5 ? isDark : other.isDark,
    );
  }
}

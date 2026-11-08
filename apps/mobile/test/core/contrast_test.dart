import 'package:azza/core/theme/tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

double contrast(Color a, Color b) {
  final la = a.computeLuminance();
  final lb = b.computeLuminance();
  final hi = la > lb ? la : lb;
  final lo = la > lb ? lb : la;
  return (hi + 0.05) / (lo + 0.05);
}

void main() {
  const themes = {'light': AzzaPalette.studentLight, 'dark': AzzaPalette.studentDark};

  group('secondary text meets 4.5:1 (docs/BRAND.md)', () {
    for (final MapEntry(key: name, value: p) in themes.entries) {
      test('$name: textSecondary on ground and card', () {
        expect(contrast(p.textSecondary, p.ground), greaterThanOrEqualTo(4.5));
        expect(contrast(p.textSecondary, p.raised), greaterThanOrEqualTo(4.5));
      });

      test('$name: muted (kept for older call sites) on ground and card', () {
        expect(contrast(p.muted, p.ground), greaterThanOrEqualTo(4.5));
        expect(contrast(p.muted, p.raised), greaterThanOrEqualTo(4.5));
      });

      test('$name: body text and accent on ground and card', () {
        for (final fg in [p.text, p.accent, p.success, p.info, p.warning, p.danger]) {
          expect(contrast(fg, p.ground), greaterThanOrEqualTo(4.5));
          expect(contrast(fg, p.raised), greaterThanOrEqualTo(4.5));
        }
      });
    }

    test('the light hint colour is too faint for text, so it stays for hints only', () {
      expect(contrast(AzzaColors.muted, AzzaColors.page), lessThan(4.5));
      expect(AzzaPalette.studentLight.hint, AzzaColors.muted);
      expect(AzzaPalette.studentLight.textSecondary, isNot(AzzaColors.muted));
    });
  });
}

import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// Decorative photo for onboarding and auth screens (`assets/images/<name>.jpg`), shown clean —
/// no scrim and no text on it. The screen's title carries the meaning, so it's hidden from screen readers.
class SceneImage extends StatelessWidget {
  const SceneImage(this.name, {super.key, this.height, this.alignment = Alignment.center});
  final String name;

  /// Null fills the space the parent gives it (e.g. inside [Expanded]).
  final double? height;
  final Alignment alignment;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    return ClipRRect(
      borderRadius: BorderRadius.circular(24), // media radius (docs/BRAND.md)
      child: SizedBox(
        height: height,
        width: double.infinity,
        child: Image.asset(
          'assets/images/$name.jpg',
          fit: BoxFit.cover,
          alignment: alignment,
          excludeFromSemantics: true,
          errorBuilder: (_, _, _) => ColoredBox(color: p.raised),
        ),
      ),
    );
  }
}

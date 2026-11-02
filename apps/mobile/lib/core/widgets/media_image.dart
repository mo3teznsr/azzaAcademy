import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';

/// Network image for API media paths (`/media/...`). Shows [fallback] while loading and on error,
/// so a missing file never leaves a hole in the layout.
class MediaImage extends ConsumerWidget {
  const MediaImage(this.path, {super.key, required this.fallback, this.fit = BoxFit.cover, this.cacheWidth});
  final String? path;
  final Widget fallback;
  final BoxFit fit;

  /// Decode width in logical pixels (scaled by device pixel ratio) — keeps avatars cheap.
  final double? cacheWidth;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final url = ref.watch(appConfigProvider).resolveMediaUrl(path);
    if (url == null) return fallback;
    final dpr = MediaQuery.devicePixelRatioOf(context);
    return Image.network(
      url,
      fit: fit,
      cacheWidth: cacheWidth == null ? null : (cacheWidth! * dpr).round(),
      excludeFromSemantics: true,
      frameBuilder: (context, child, frame, sync) => sync || frame != null ? child : fallback,
      errorBuilder: (context, error, stack) => fallback,
    );
  }
}

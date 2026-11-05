import 'package:flutter/material.dart';

import '../theme/tokens.dart';
import '../theme/typography.dart';

/// Screen with a full-bleed cover at the top: the image is shown clean (no scrim, no text on it),
/// round back/action buttons float over it, and a regular header with [title] fades in once the
/// cover has scrolled away.
class CoverScrollView extends StatelessWidget {
  const CoverScrollView({
    super.key,
    required this.cover,
    required this.title,
    required this.slivers,
    this.expandedHeight = 300,
    this.actions = const [],
  });

  final Widget cover;
  final String title;
  final List<Widget> slivers;
  final double expandedHeight;

  /// Extra round buttons on the trailing side, e.g. `CoverButton(icon: Icons.ios_share, ...)`.
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    final canPop = Navigator.of(context).canPop();
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          pinned: true,
          stretch: true,
          expandedHeight: expandedHeight,
          automaticallyImplyLeading: false,
          backgroundColor: p.ground,
          surfaceTintColor: Colors.transparent,
          flexibleSpace: LayoutBuilder(
            builder: (context, box) {
              final top = MediaQuery.paddingOf(context).top;
              final range = expandedHeight - kToolbarHeight;
              // 1 = fully open, 0 = collapsed to the toolbar.
              final open = ((box.maxHeight - kToolbarHeight - top) / range).clamp(0.0, 1.0);
              final titleOpacity = ((0.3 - open) / 0.3).clamp(0.0, 1.0);
              return Stack(
                fit: StackFit.expand,
                children: [
                  Opacity(opacity: open, child: cover),
                  if (titleOpacity > 0)
                    Opacity(
                      opacity: titleOpacity,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: p.ground,
                          border: Border(bottom: BorderSide(color: p.line)),
                        ),
                      ),
                    ),
                  PositionedDirectional(
                    top: top,
                    start: 0,
                    end: 0,
                    height: kToolbarHeight,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Row(
                        children: [
                          if (canPop)
                            CoverButton(
                              icon: Icons.arrow_back_rounded,
                              tooltip: MaterialLocalizations.of(context).backButtonTooltip,
                              onPressed: () => Navigator.of(context).maybePop(),
                              flat: titleOpacity > 0.5,
                            ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: titleOpacity == 0
                                ? const SizedBox.shrink()
                                : Opacity(
                                    opacity: titleOpacity,
                                    child: Text(
                                      title,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: AzzaFonts.display(
                                        arabic: Directionality.of(context) == TextDirection.rtl,
                                        size: 20,
                                        color: p.text,
                                      ),
                                    ),
                                  ),
                          ),
                          ...actions,
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
        ...slivers,
      ],
    );
  }
}

/// Round icon button that stays readable on any photo: a solid ground-coloured disc, no scrim on the image.
class CoverButton extends StatelessWidget {
  const CoverButton({super.key, required this.icon, required this.onPressed, required this.tooltip, this.flat = false});
  final IconData icon;
  final VoidCallback onPressed;
  final String tooltip;

  /// Once the header has collapsed the disc is dropped and it reads as a normal app-bar button.
  final bool flat;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    return Tooltip(
      message: tooltip,
      child: Material(
        color: flat ? Colors.transparent : p.ground.withValues(alpha: 0.92),
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: SizedBox.square(dimension: 44, child: Icon(icon, color: p.text, size: 22)),
        ),
      ),
    );
  }
}

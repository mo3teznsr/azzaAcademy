import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/progress_repository.dart';
import 'progress_widgets.dart';

/// Student Home: streak, this week, the weekly goal and the latest badges in one calm card.
/// Stays out of the way while loading or when the progress can't be loaded.
class ProgressCard extends ConsumerWidget {
  const ProgressCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final progress = ref.watch(myProgressProvider).value;
    if (progress == null) return const SizedBox.shrink();
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final p = AzzaPalette.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(l.progressCardTitle, action: l.progressTitle, onAction: () => context.push(Routes.myProgress)),
        RaisedCard(
          key: const Key('home-progress'),
          onTap: () => context.push(Routes.myProgress),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              StreakSummary(progress: progress),
              const SizedBox(height: 16),
              WeekStrip(progress: progress),
              const SizedBox(height: 16),
              GoalSummary(progress: progress),
              if (progress.latestBadges.isNotEmpty) ...[
                const SizedBox(height: 16),
                Row(
                  children: [
                    for (final b in progress.latestBadges) ...[
                      Tooltip(message: badgeCopy(l, b.id).$1, child: BadgeMark(id: b.id, earned: true, size: 36)),
                      const SizedBox(width: 8),
                    ],
                    const Spacer(),
                    Text(
                      l.progressBadgesCount(f.n(progress.badgesEarned), f.n(progress.badgesTotal)),
                      style: TextStyle(fontSize: 12, color: p.muted),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

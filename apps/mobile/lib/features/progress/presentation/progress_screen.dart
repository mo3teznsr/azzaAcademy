import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../data/progress_repository.dart';
import '../domain/progress_models.dart';
import 'progress_widgets.dart';

/// "My progress": streak, this week and the goal, then every badge (earned and not yet) and the rules in plain words.
class ProgressScreen extends ConsumerWidget {
  const ProgressScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final summary = ref.watch(myProgressProvider);
    final badges = ref.watch(myBadgesProvider);

    Future<void> refresh() async {
      ref.invalidate(myProgressProvider);
      ref.invalidate(myBadgesProvider);
      await ref.read(myProgressProvider.future);
    }

    return Scaffold(
      appBar: AppBar(title: Text(l.progressTitle)),
      body: AsyncView<LearnerProgress>(
        value: summary,
        onRetry: () => ref.invalidate(myProgressProvider),
        data: (progress) => RefreshList(
          onRefresh: refresh,
          children: [
            Text(l.progressIntro, style: TextStyle(color: p.muted)),
            const SizedBox(height: 16),
            RaisedCard(child: StreakSummary(progress: progress)),
            const SizedBox(height: 12),
            RaisedCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Kicker(l.progressWeek, color: p.muted),
                  const SizedBox(height: 12),
                  WeekStrip(progress: progress),
                  const SizedBox(height: 16),
                  GoalSummary(progress: progress),
                ],
              ),
            ),
            SectionHeader(l.progressBadges),
            AsyncView<List<EarnedBadge>>(
              value: badges,
              compact: true,
              onRetry: () => ref.invalidate(myBadgesProvider),
              data: (list) => Column(
                children: [
                  for (final b in list) ...[_BadgeTile(badge: b), const SizedBox(height: 8)],
                ],
              ),
            ),
            const SizedBox(height: 4),
            Text(l.progressPrivate, style: TextStyle(fontSize: 13, color: p.muted)),
            SectionHeader(l.progressRulesTitle),
            for (final r in [l.progressRule1, l.progressRule2, l.progressRule3])
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('•  ', style: TextStyle(color: p.muted)),
                    Expanded(child: Text(r, style: TextStyle(fontSize: 13, color: p.muted))),
                  ],
                ),
              ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _BadgeTile extends ConsumerWidget {
  const _BadgeTile({required this.badge});
  final EarnedBadge badge;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final p = AzzaPalette.of(context);
    final (title, body) = badgeCopy(l, badge.id);
    final status = badge.earnedAt == null ? l.progressLocked : l.progressEarnedOn(f.shortDate(badge.earnedAt!));
    return Semantics(
      label: '$title. $body. $status',
      excludeSemantics: true,
      child: RaisedCard(
        key: Key('badge-${badge.id}'),
        color: badge.earned ? null : Colors.transparent,
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            BadgeMark(id: badge.id, earned: badge.earned),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontWeight: FontWeight.w600, color: badge.earned ? p.text : p.muted)),
                  const SizedBox(height: 2),
                  Text(body, style: TextStyle(fontSize: 13, color: p.muted)),
                  const SizedBox(height: 2),
                  Text(status, style: TextStyle(fontSize: 12, color: p.muted)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

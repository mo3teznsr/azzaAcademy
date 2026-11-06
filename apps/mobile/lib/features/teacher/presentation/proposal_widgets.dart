import 'package:flutter/material.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';

String levelLabel(AppLocalizations l, CourseLevel level) => switch (level) {
      CourseLevel.beginner => l.levelBeginner,
      CourseLevel.intermediate => l.levelIntermediate,
      CourseLevel.advanced => l.levelAdvanced,
    };

String languageLabel(AppLocalizations l, SessionLanguage lang) => switch (lang) {
      SessionLanguage.en => l.languageEnglish,
      SessionLanguage.ar => l.languageArabic,
    };

/// A tinted notice inside a proposal: the admin's send-back note, "waiting for review", or "published".
class ProposalNotice extends StatelessWidget {
  const ProposalNotice({super.key, required this.title, required this.body, required this.icon, required this.tint});

  /// The admin sent it back: shows [note] under "Changes requested".
  factory ProposalNotice.changes(BuildContext context, String note, {Key? key}) => ProposalNotice(
        key: key ?? const Key('review-note'),
        title: context.l10n.changesRequested,
        body: note,
        icon: Icons.edit_note_rounded,
        tint: AzzaPalette.of(context).warning,
      );

  factory ProposalNotice.pending(BuildContext context, String body, {Key? key}) => ProposalNotice(
        key: key ?? const Key('pending-review'),
        title: context.l10n.statusPendingReview,
        body: body,
        icon: Icons.hourglass_top_rounded,
        tint: AzzaPalette.of(context).accent,
      );

  factory ProposalNotice.published(BuildContext context, {Key? key}) => ProposalNotice(
        key: key ?? const Key('published-locked'),
        title: context.l10n.statusPublished,
        body: context.l10n.publishedLockedBody,
        icon: Icons.lock_outline_rounded,
        tint: AzzaPalette.of(context).success,
      );

  final String title;
  final String body;
  final IconData icon;
  final Color tint;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: tint.withValues(alpha: p.isDark ? 0.14 : 0.08),
        borderRadius: BorderRadius.circular(AzzaSpace.radiusSm),
        border: Border.all(color: tint.withValues(alpha: 0.5)),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 20, color: tint),
        const SizedBox(width: 10),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: t.titleSmall),
            const SizedBox(height: 2),
            Text(body, style: t.bodyMedium),
          ]),
        ),
      ]),
    );
  }
}

/// A full-width button with a busy spinner, at least 48pt tall.
class BusyButton extends StatelessWidget {
  const BusyButton({super.key, required this.label, required this.onPressed, this.busy = false, this.filled = true, this.icon});
  final String label;
  final VoidCallback? onPressed;
  final bool busy;
  final bool filled;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final child = busy
        ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
        : Row(mainAxisSize: MainAxisSize.min, children: [
            if (icon != null) ...[Icon(icon, size: 18), const SizedBox(width: 8)],
            Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
          ]);
    const size = Size.fromHeight(48);
    return filled
        ? FilledButton(style: FilledButton.styleFrom(minimumSize: size), onPressed: busy ? null : onPressed, child: child)
        : OutlinedButton(style: OutlinedButton.styleFrom(minimumSize: size), onPressed: busy ? null : onPressed, child: child);
  }
}

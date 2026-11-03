import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/waitlist_repository.dart';
import '../domain/waitlist_models.dart';

/// `3rd in line · of 7`, or "You're next in line".
String waitlistPositionLabel(AppLocalizations l, Fmt f, WaitlistEntry e) =>
    e.isNext ? '${l.waitlistNextInLine} · ${l.waitlistOfTotal(f.n(e.total))}' : l.waitlistPosition(f.ordinal(e.position), f.n(e.total));

/// Home section: seats offered to me (claim before the hold ends) and batches I'm waiting for.
/// Renders nothing until there is something to show — the waitlist is secondary to "My batches".
class WaitlistSection extends ConsumerWidget {
  const WaitlistSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final w = ref.watch(waitlistProvider).value;
    if (w == null || w.isEmpty) return const SizedBox.shrink();
    var i = 0;
    return Column(
      key: const Key('waitlist-section'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(l.waitlist),
        for (final s in w.promoted) ...[
          FadeSlideIn(index: i++, child: _PromotedCard(seat: s)),
          const SizedBox(height: 10),
        ],
        for (final e in w.items) ...[
          FadeSlideIn(index: i++, child: _WaitlistTile(entry: e)),
          const SizedBox(height: 10),
        ],
      ],
    );
  }
}

class _PromotedCard extends ConsumerWidget {
  const _PromotedCard({required this.seat});
  final PromotedSeat seat;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    return RaisedCard(
      key: Key('promoted-${seat.batchId}'),
      color: AzzaColors.sun,
      border: false,
      padding: const EdgeInsets.all(18),
      child: Ticker(builder: (context, now) {
        final expired = seat.expired(now);
        final left = seat.remaining(now);
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            PulsingDot(color: AzzaColors.ink, size: 7, active: !expired),
            const SizedBox(width: 4),
            Expanded(child: MonoLabel(l.waitlistSeatOpen, color: AzzaColors.ink)),
            MonoLabel(seat.batchCode, color: AzzaColors.ink),
          ]),
          const SizedBox(height: 10),
          DisplayText(seat.courseName(locale), size: 24, color: AzzaColors.ink, maxLines: 2),
          const SizedBox(height: 6),
          Text(
            expired
                ? l.waitlistHoldExpired
                : left == null
                    ? l.waitlistStepHold
                    : l.waitlistHeldFor(Fmt.holdClock(left)),
            style: left != null && !expired
                ? AzzaFonts.mono(size: 13, color: AzzaColors.ink, tracking: 0.04)
                : t.bodySmall?.copyWith(color: AzzaColors.ink),
          ),
          const SizedBox(height: 14),
          FilledButton(
            key: Key('claim-${seat.batchId}'),
            style: FilledButton.styleFrom(backgroundColor: AzzaColors.ink, foregroundColor: AzzaColors.ivory),
            onPressed: expired ? null : () => context.push(Routes.checkout(seat.batchId)),
            child: Text(l.waitlistClaimSeat),
          ),
        ]);
      }),
    );
  }
}

class _WaitlistTile extends ConsumerWidget {
  const _WaitlistTile({required this.entry});
  final WaitlistEntry entry;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    return RaisedCard(
      key: Key('waitlist-${entry.batchId}'),
      onTap: () => showWaitlistSheet(context, entry),
      child: Row(children: [
        _PositionBadge(position: entry.position, fmt: f, color: entry.isNext ? p.accent : null),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            MonoLabel([entry.batchCode, if (entry.startsOn != null) l.startsOnDate(f.shortDate(entry.startsOn!))].join(' · ')),
            const SizedBox(height: 2),
            Text(entry.courseName(locale), style: t.titleSmall, maxLines: 1, overflow: TextOverflow.ellipsis),
            Text(waitlistPositionLabel(l, f, entry), style: t.bodySmall),
          ]),
        ),
        const Icon(Icons.chevron_right_rounded),
      ]),
    );
  }
}

/// The place in line as a big mono numeral.
class _PositionBadge extends StatelessWidget {
  const _PositionBadge({required this.position, required this.fmt, this.color});
  final int position;
  final Fmt fmt;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    final filled = color != null;
    return Container(
      width: 48,
      height: 48,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: filled ? color : null,
        borderRadius: BorderRadius.circular(AzzaSpace.radiusSm),
        border: filled ? null : Border.all(color: p.line),
      ),
      child: Text(
        fmt.n(position),
        style: AzzaFonts.mono(size: 20, weight: FontWeight.w600, color: filled ? p.onAccent : p.text, tracking: 0),
      ),
    );
  }
}

Future<void> showWaitlistSheet(BuildContext context, WaitlistEntry entry) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => WaitlistSheet(entry: entry),
    );

/// What happens next + "Leave waitlist".
class WaitlistSheet extends ConsumerStatefulWidget {
  const WaitlistSheet({super.key, required this.entry});
  final WaitlistEntry entry;

  @override
  ConsumerState<WaitlistSheet> createState() => _WaitlistSheetState();
}

class _WaitlistSheetState extends ConsumerState<WaitlistSheet> {
  bool _busy = false;

  Future<void> _leave() async {
    final l = context.l10n;
    final e = widget.entry;
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l.waitlistLeaveConfirmTitle),
        content: Text(l.waitlistLeaveConfirmBody(e.batchCode)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.waitlistStay)),
          TextButton(
            key: const Key('confirm-leave-waitlist'),
            onPressed: () => Navigator.pop(context, true),
            child: Text(l.waitlistLeave),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref.read(waitlistProvider.notifier).leave(e.batchId);
      if (!mounted) return;
      final messenger = ScaffoldMessenger.of(context);
      Navigator.pop(context);
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(l.waitlistLeft)));
    } catch (err) {
      if (!mounted) return;
      setState(() => _busy = false);
      showToast(context, AppException.from(err).message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final e = widget.entry;

    Widget step(int n, String text) => Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            SizedBox(width: 32, child: Text(n.toString().padLeft(2, '0'), style: AzzaFonts.mono(size: 13, color: p.muted))),
            Expanded(child: Text(text, style: t.bodyMedium)),
          ]),
        );

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 16),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          MonoLabel([e.batchCode, if (e.startsOn != null) l.startsOnDate(f.shortDate(e.startsOn!))].join(' · ')),
          const SizedBox(height: 6),
          DisplayText(e.courseName(locale), size: 26),
          const SizedBox(height: 16),
          Row(children: [
            _PositionBadge(position: e.position, fmt: f, color: p.accent),
            const SizedBox(width: 14),
            Expanded(child: Text(waitlistPositionLabel(l, f, e), style: t.titleMedium)),
          ]),
          SectionHeader(l.waitlistWhatNext, padding: const EdgeInsets.only(top: 24, bottom: 12)),
          step(1, l.waitlistStepSeat),
          step(2, l.waitlistStepNotify),
          step(3, l.waitlistStepHold),
          Text(l.waitlistNoCharge, style: t.bodySmall),
          const SizedBox(height: 20),
          OutlinedButton(
            key: const Key('leave-waitlist'),
            onPressed: _busy ? null : _leave,
            child: _busy ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : Text(l.waitlistLeave),
          ),
        ]),
      ),
    );
  }
}

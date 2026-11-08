import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart' show AppLocale;
import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../checkout/domain/apple_iap.dart' show usesAppStorePayments;
import '../data/subscription_repository.dart';
import '../domain/subscription_models.dart';
import 'plan_actions.dart';
import 'plan_picker.dart' show planName;

/// "Your plans" (Me): every plan on a recorded course, with what the learner can do with each.
/// Card plans cancel, resume, switch and update the card; App Store plans point at the App Store;
/// transfer plans renew by transfer or move to a card. iOS offers no new transfer or card purchase.
class MyPlansScreen extends ConsumerWidget {
  const MyPlansScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final plans = ref.watch(mySubscriptionsProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.plansTitle)),
      body: AsyncView<List<MySubscription>>(
        value: plans,
        onRetry: () => ref.invalidate(mySubscriptionsProvider),
        isEmpty: (list) => list.isEmpty,
        empty: EmptyState(
          title: l.plansEmptyTitle,
          body: l.plansEmptyBody,
          icon: Icons.autorenew_rounded,
          action: l.plansFind,
          onAction: () => context.go(Routes.studentExplore),
        ),
        data: (list) => RefreshList(
          onRefresh: () async => ref.invalidate(mySubscriptionsProvider),
          children: [
            for (final s in list) ...[
              _PlanCard(subscription: s),
              const SizedBox(height: 12),
            ],
          ],
        ),
      ),
    );
  }
}

class _PlanCard extends ConsumerStatefulWidget {
  const _PlanCard({required this.subscription});
  final MySubscription subscription;

  @override
  ConsumerState<_PlanCard> createState() => _PlanCardState();
}

class _PlanCardState extends ConsumerState<_PlanCard> {
  bool _busy = false;

  MySubscription get s => widget.subscription;

  Future<void> _guard(Future<void> Function() body) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await body();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// A new transfer payment for the next period (or the one waiting for its receipt): the instructions screen.
  Future<void> _renewByTransfer() => _guard(() async {
        try {
          final start = await ref.read(subscriptionRepositoryProvider).subscribe(s.courseId, s.plan, SubscribeMethod.bankTransfer) as TransferStart;
          if (mounted) unawaited(context.push(Routes.planTransfer(start.paymentId), extra: start));
        } catch (e) {
          if (mounted) showToast(context, errorText(context, e));
        }
      });

  Future<void> _uploadReceipt() {
    final pending = s.pendingPayment;
    final bank = pending?.bankAccount;
    if (pending == null || bank == null) {
      // The API hands back the open payment's details. Without them a new transfer would have to be started, which iOS never does.
      if (usesAppStorePayments) {
        showToast(context, context.l10n.planTransferNotOnIos);
        return Future.value();
      }
      return _renewByTransfer();
    }
    final start = TransferStart(bankAccount: bank, reference: pending.reference, amountFils: pending.amountFils, expiresAt: pending.expiresAt, paymentId: pending.id);
    unawaited(context.push(Routes.planTransfer(pending.id), extra: start));
    return Future.value();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final actions = PlanActions(context, ref);
    final onIos = usesAppStorePayments;
    final end = s.currentPeriodEnd == null ? null : f.mediumDate(s.currentPeriodEnd!);
    final title = locale == AppLocale.ar && (s.courseTitleAr?.trim().isNotEmpty ?? false) ? s.courseTitleAr! : s.courseTitleEn;
    final providerLabel = switch (s.provider) {
      SubscriptionProvider.stripe => l.planProviderCard,
      SubscriptionProvider.apple => l.planProviderApple,
      SubscriptionProvider.bankTransfer => l.bankTransfer,
    };
    final statusLine = switch ((end, s.status, s.provider)) {
      (_, SubscriptionStatus.expired, _) => l.planEnded,
      (_, SubscriptionStatus.pastDue, _) => l.planPastDue,
      (final d?, _, SubscriptionProvider.bankTransfer) => l.planPaidUntilShort(d),
      (final d?, _, _) when s.ends => l.planEnds(d),
      (final d?, _, _) => l.planRenews(d),
      _ => null,
    };

    final stripe = s.provider == SubscriptionProvider.stripe;
    final transfer = s.provider == SubscriptionProvider.bankTransfer;
    final live = s.status == SubscriptionStatus.active || s.status == SubscriptionStatus.cancelling || s.status == SubscriptionStatus.pastDue;
    final buttons = <Widget>[
      if (stripe && live) ...[
        if (s.status == SubscriptionStatus.cancelling || s.cancelAtPeriodEnd)
          _Action(key: Key('plan-resume-${s.id}'), label: l.planResume, icon: Icons.restart_alt_rounded, filled: true, onPressed: () => _guard(() => actions.resume(s)))
        else ...[
          _Action(
            key: Key('plan-switch-${s.id}'),
            label: s.plan == SubscriptionPlan.yearly ? l.planSwitchToMonthly : l.planSwitchToYearly,
            icon: Icons.swap_horiz_rounded,
            onPressed: () => _guard(() => actions.switchPlan(s)),
          ),
        ],
        _Action(key: Key('plan-card-${s.id}'), label: l.planUpdateCard, icon: Icons.credit_card_rounded, filled: s.status == SubscriptionStatus.pastDue, onPressed: () => _guard(() => actions.updateCard(s))),
        if (s.status != SubscriptionStatus.cancelling && !s.cancelAtPeriodEnd)
          _Action(key: Key('plan-cancel-${s.id}'), label: l.planCancel, icon: Icons.close_rounded, danger: true, onPressed: () => _guard(() => actions.cancel(s))),
      ],
      if (s.provider == SubscriptionProvider.apple && s.status != SubscriptionStatus.incomplete)
        _Action(key: Key('plan-apple-${s.id}'), label: l.planManageAppStore, icon: Icons.apple_rounded, filled: true, onPressed: actions.manageInAppStore),
      if (transfer && !onIos && s.status != SubscriptionStatus.incomplete) ...[
        _Action(key: Key('plan-renew-${s.id}'), label: l.planRenewTransfer, icon: Icons.account_balance_rounded, filled: true, onPressed: _renewByTransfer),
        if (s.status != SubscriptionStatus.expired)
          _Action(key: Key('plan-tocard-${s.id}'), label: l.planSwitchToCard, icon: Icons.credit_card_rounded, onPressed: () => _guard(() => actions.switchToCard(s))),
      ],
    ];

    final pending = s.pendingPayment;
    return RaisedCard(
      key: Key('plan-${s.id}'),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: Text(title, style: t.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis)),
          const SizedBox(width: 8),
          Flexible(child: StatusChip(label: providerLabel, look: ChipLook.outline, color: p.text)),
        ]),
        const SizedBox(height: 4),
        Kicker(planName(l, s.plan)),
        if (statusLine != null) ...[const SizedBox(height: 6), Text(statusLine, key: Key('plan-line-${s.id}'), style: t.bodyMedium)],
        if (pending != null) ...[const SizedBox(height: 10), _PendingNote(payment: pending, onUpload: _uploadReceipt)],
        if (buttons.isNotEmpty) ...[
          const SizedBox(height: 12),
          Wrap(spacing: 8, runSpacing: 8, children: buttons),
          if (stripe && live && s.status != SubscriptionStatus.cancelling && !s.cancelAtPeriodEnd) ...[
            const SizedBox(height: 8),
            Text(l.planSwitchNote, key: Key('plan-switch-note-${s.id}'), style: t.bodySmall),
          ],
        ],
        const SizedBox(height: 4),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: TextButton(
            key: Key('plan-open-${s.id}'),
            style: TextButton.styleFrom(minimumSize: const Size(48, 44), padding: const EdgeInsets.symmetric(horizontal: 8)),
            onPressed: () => context.push(Routes.course(s.courseId)),
            child: Text(l.plansOpenCourse),
          ),
        ),
      ]),
    );
  }
}

/// A transfer waiting on the learner (a receipt), on us (a review) or sent back (rejected, with our note).
class _PendingNote extends StatelessWidget {
  const _PendingNote({required this.payment, required this.onUpload});
  final PendingPayment payment;
  final VoidCallback onUpload;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final note = payment.reviewNote?.trim() ?? '';
    final (text, icon) = switch (payment.status) {
      PendingPaymentStatus.awaitingReceipt => (l.planPendingReceipt, Icons.receipt_long_outlined),
      PendingPaymentStatus.awaitingReview => (l.planPendingReview, Icons.hourglass_top_rounded),
      PendingPaymentStatus.rejected => (note.isEmpty ? l.planPendingRejectedPlain : l.planPendingRejected(note), Icons.error_outline_rounded),
    };
    return Container(
      key: const Key('plan-pending'),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: payment.status == PendingPaymentStatus.rejected ? p.warningBg : p.infoBg,
        borderRadius: BorderRadius.circular(AzzaSpace.radiusSm),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, size: 20, color: p.text),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: t.bodyMedium)),
        ]),
        if (payment.status == PendingPaymentStatus.awaitingReceipt)
          TextButton(
            key: const Key('plan-upload-receipt'),
            style: TextButton.styleFrom(minimumSize: const Size(48, 44), padding: const EdgeInsets.symmetric(horizontal: 8)),
            onPressed: onUpload,
            child: Text(l.planUploadReceipt),
          ),
      ]),
    );
  }
}

class _Action extends StatelessWidget {
  const _Action({super.key, required this.label, required this.icon, required this.onPressed, this.filled = false, this.danger = false});
  final String label;
  final IconData icon;
  final VoidCallback onPressed;
  final bool filled;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    const size = Size(48, 48);
    final child = Text(label, textAlign: TextAlign.center);
    if (filled) {
      return FilledButton.icon(style: FilledButton.styleFrom(minimumSize: size), onPressed: onPressed, icon: Icon(icon, size: 18), label: child);
    }
    return OutlinedButton.icon(
      style: OutlinedButton.styleFrom(minimumSize: size, foregroundColor: danger ? p.danger : null),
      onPressed: onPressed,
      icon: Icon(icon, size: 18),
      label: child,
    );
  }
}

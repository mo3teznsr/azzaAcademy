import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../subscriptions/domain/subscription_models.dart';
import '../../subscriptions/presentation/plan_picker.dart' show planName;
import '../data/back_office_repository.dart';
import 'admin_widgets.dart';

String _providerLabel(AppLocalizations l, SubscriptionProvider p) => switch (p) {
      SubscriptionProvider.stripe => l.planProviderCard,
      SubscriptionProvider.apple => l.planProviderApple,
      SubscriptionProvider.bankTransfer => l.bankTransfer,
    };

String _statusLabel(AppLocalizations l, SubscriptionStatus s) => switch (s) {
      SubscriptionStatus.incomplete => l.planSettingUpChip,
      SubscriptionStatus.active => l.planActiveChip,
      SubscriptionStatus.pastDue => l.planPastDueChip,
      SubscriptionStatus.cancelling => l.planCancellingChip,
      SubscriptionStatus.expired => l.planExpiredChip,
    };

/// Admin: every plan on a recorded course, filtered by status and provider, with cancel (and an optional refund of the last payment).
/// App Store plans are billed by Apple, so they can be read here but not cancelled.
class AdminSubscriptionsScreen extends ConsumerStatefulWidget {
  const AdminSubscriptionsScreen({super.key});

  @override
  ConsumerState<AdminSubscriptionsScreen> createState() => _AdminSubscriptionsScreenState();
}

class _AdminSubscriptionsScreenState extends ConsumerState<AdminSubscriptionsScreen> {
  SubscriptionStatus? _status;
  SubscriptionProvider? _provider;

  SubscriptionQuery get _query => (status: _status, provider: _provider, courseId: null);

  Future<void> _cancel(AdminSubscription s) async {
    final l = context.l10n;
    final choice = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l.adminSubCancelTitle),
        content: Text(l.adminSubCancelBody),
        actions: [
          TextButton(key: const Key('sub-cancel-none'), onPressed: () => Navigator.pop(context, false), child: Text(l.adminRefundNone)),
          TextButton(
            key: const Key('sub-cancel-full'),
            style: TextButton.styleFrom(foregroundColor: AzzaPalette.of(context).danger),
            onPressed: () => Navigator.pop(context, true),
            child: Text(l.adminRefundFull),
          ),
          FilledButton(key: const Key('sub-cancel-back'), onPressed: () => Navigator.pop(context), child: Text(l.back)),
        ],
      ),
    );
    if (choice == null || !mounted) return;
    try {
      final receiptHeld = await ref.read(backOfficeRepositoryProvider).cancelSubscription(s.id, refund: choice);
      ref.invalidate(adminSubscriptionsProvider(_query));
      if (!mounted) return;
      if (receiptHeld) {
        // A transfer receipt was under review: the money is not returned automatically, so say so and keep it on screen.
        await showDialog<void>(
          context: context,
          builder: (context) => AlertDialog(
            key: const Key('sub-cancel-receipt-warning'),
            title: Text(l.adminSubCancelled),
            content: Text(l.adminSubReceiptReturnByHand),
            actions: [FilledButton(onPressed: () => Navigator.pop(context), child: Text(l.close))],
          ),
        );
      } else {
        showToast(context, l.adminSubCancelled);
      }
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final subs = ref.watch(adminSubscriptionsProvider(_query));
    return Scaffold(
      appBar: AppBar(title: Text(l.adminSubsTitle)),
      body: Column(children: [
        ChoiceChipsRow<SubscriptionStatus>(
          keyPrefix: 'sub-status',
          values: const [null, SubscriptionStatus.active, SubscriptionStatus.pastDue, SubscriptionStatus.cancelling, SubscriptionStatus.expired],
          selected: _status,
          label: (s) => s == null ? l.adminSubsAll : _statusLabel(l, s),
          onSelected: (s) => setState(() => _status = s),
        ),
        ChoiceChipsRow<SubscriptionProvider>(
          keyPrefix: 'sub-provider',
          values: const [null, SubscriptionProvider.stripe, SubscriptionProvider.apple, SubscriptionProvider.bankTransfer],
          selected: _provider,
          label: (p) => p == null ? l.adminAnyMethod : _providerLabel(l, p),
          onSelected: (p) => setState(() => _provider = p),
        ),
        Expanded(
          child: AsyncView<List<AdminSubscription>>(
            value: subs,
            onRetry: () => ref.invalidate(adminSubscriptionsProvider(_query)),
            isEmpty: (list) => list.isEmpty,
            empty: EmptyState(title: l.adminSubsEmpty, icon: Icons.autorenew_rounded),
            data: (list) => RefreshList(
              onRefresh: () async => ref.invalidate(adminSubscriptionsProvider(_query)),
              children: [
                for (final s in list) ...[
                  RaisedCard(
                    key: Key('sub-${s.id}'),
                    padding: const EdgeInsets.all(14),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(s.userName, style: t.titleSmall),
                            Text(s.userEmail, style: t.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                          ]),
                        ),
                        const SizedBox(width: 8),
                        Flexible(child: StatusChip(label: _statusLabel(l, s.status), look: ChipLook.outline, color: AzzaPalette.of(context).text)),
                      ]),
                      const SizedBox(height: 6),
                      Text(s.courseTitle(locale), style: t.bodyMedium),
                      Text(
                        [
                          planName(l, s.plan),
                          _providerLabel(l, s.provider),
                          if (s.currentPeriodEnd != null) f.mediumDate(s.currentPeriodEnd!),
                          if (s.lastPaymentFils != null) l.adminSubLastPayment(f.aed(s.lastPaymentFils!)),
                        ].join(' · '),
                        style: t.bodySmall,
                      ),
                      if (s.managedByApple)
                        Padding(padding: const EdgeInsets.only(top: 8), child: Text(l.adminSubApple, key: Key('sub-apple-${s.id}'), style: t.labelLarge))
                      else if (s.cancellable)
                        Align(
                          alignment: AlignmentDirectional.centerStart,
                          child: TextButton(
                            key: Key('sub-cancel-${s.id}'),
                            style: TextButton.styleFrom(minimumSize: const Size(48, 44), foregroundColor: AzzaPalette.of(context).danger, padding: const EdgeInsets.symmetric(horizontal: 8)),
                            onPressed: () => _cancel(s),
                            child: Text(l.adminSubCancel),
                          ),
                        ),
                    ]),
                  ),
                  const SizedBox(height: 10),
                ],
              ],
            ),
          ),
        ),
      ]),
    );
  }
}

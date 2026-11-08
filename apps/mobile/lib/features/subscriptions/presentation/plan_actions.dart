import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../checkout/data/checkout_repository.dart' show checkoutPageOpenerProvider;
import '../data/subscription_repository.dart';
import '../domain/subscription_models.dart';

/// Where an App Store subscription is managed. Apple owns cancelling and changing it.
const appleSubscriptionsUrl = 'https://apps.apple.com/account/subscriptions';

/// The two-step cancel dialog: the first screen says what the learner keeps, the second asks once more.
/// "Keep my plan" is the safe choice on both. Returns true only after the learner confirms the second step.
Future<bool> confirmCancelPlan(BuildContext context, String date) async {
  final l = context.l10n;
  final first = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(l.planCancelTitle),
      content: Text(l.planCancelBody(date)),
      actions: [
        TextButton(key: const Key('cancel-continue'), onPressed: () => Navigator.pop(context, true), child: Text(l.continueLabel)),
        FilledButton(key: const Key('cancel-keep'), onPressed: () => Navigator.pop(context, false), child: Text(l.planKeep)),
      ],
    ),
  );
  if (first != true || !context.mounted) return false;
  final second = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(l.planCancelStep2Title),
      content: Text(l.planCancelStep2Body(date)),
      actions: [
        TextButton(
          key: const Key('cancel-confirm'),
          style: TextButton.styleFrom(foregroundColor: AzzaPalette.of(context).danger),
          onPressed: () => Navigator.pop(context, true),
          child: Text(l.planCancelConfirm),
        ),
        FilledButton(key: const Key('cancel-keep-2'), onPressed: () => Navigator.pop(context, false), child: Text(l.planKeep)),
      ],
    ),
  );
  return second == true;
}

/// The actions a plan row and the banners share. Each toasts its own failure and refreshes the plans on success.
class PlanActions {
  PlanActions(this.context, this.ref);
  final BuildContext context;
  final WidgetRef ref;

  Future<void> _run(Future<void> Function() body) async {
    try {
      await body();
    } catch (e) {
      if (context.mounted) showToast(context, errorText(context, e));
    }
  }

  Future<void> _open(String url) async {
    final opened = await ref.read(checkoutPageOpenerProvider)(url);
    if (!opened && context.mounted) showToast(context, context.l10n.errGeneric);
  }

  /// Stripe's Customer Portal: update the card.
  Future<void> updateCard(MySubscription s) => _run(() async => _open(await ref.read(subscriptionRepositoryProvider).portalUrl(s.id)));

  Future<void> manageInAppStore() => _run(() => _open(appleSubscriptionsUrl));

  Future<void> cancel(MySubscription s) async {
    final f = ref.read(fmtProvider);
    final date = f.mediumDate(s.currentPeriodEnd ?? DateTime.now());
    if (!await confirmCancelPlan(context, date)) return;
    await _run(() async {
      await ref.read(subscriptionRepositoryProvider).cancel(s.id);
      ref.invalidate(mySubscriptionsProvider);
      if (context.mounted) showToast(context, context.l10n.planCancelledToast(date));
    });
  }

  Future<void> resume(MySubscription s) => _run(() async {
        await ref.read(subscriptionRepositoryProvider).resume(s.id);
        ref.invalidate(mySubscriptionsProvider);
        if (context.mounted) showToast(context, context.l10n.planResumedToast);
      });

  Future<void> switchPlan(MySubscription s) => _run(() async {
        final target = s.plan == SubscriptionPlan.yearly ? SubscriptionPlan.monthly : SubscriptionPlan.yearly;
        await ref.read(subscriptionRepositoryProvider).switchPlan(s.id, target);
        ref.invalidate(mySubscriptionsProvider);
        if (context.mounted) showToast(context, context.l10n.planSwitchedToast);
      });

  Future<void> switchToCard(MySubscription s) => _run(() async => _open(await ref.read(subscriptionRepositoryProvider).switchToCard(s.id)));
}

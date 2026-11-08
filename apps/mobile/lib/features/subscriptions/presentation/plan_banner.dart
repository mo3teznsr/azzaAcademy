import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../data/subscription_repository.dart';
import '../domain/subscription_models.dart';
import 'plan_actions.dart';

/// Whether [s] needs the learner's attention on the home screen or the course: a failed payment, or a plan that is ending.
bool needsBanner(MySubscription s) =>
    (s.status == SubscriptionStatus.pastDue && s.provider != SubscriptionProvider.bankTransfer) ||
    (s.hasAccess && s.status == SubscriptionStatus.cancelling && s.provider != SubscriptionProvider.bankTransfer);

/// A calm notice about one plan: PAST_DUE ("update your card") or CANCELLING (ends on a date, with a way back).
/// Card plans act in place; App Store plans point at the App Store; nothing else is offered.
class PlanBanner extends ConsumerWidget {
  const PlanBanner({super.key, required this.subscription});
  final MySubscription subscription;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!needsBanner(subscription)) return const SizedBox.shrink();
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final s = subscription;
    final actions = PlanActions(context, ref);
    final pastDue = s.status == SubscriptionStatus.pastDue;
    final apple = s.provider == SubscriptionProvider.apple;
    final text = pastDue ? l.planPastDue : l.planCancellingBanner(s.currentPeriodEnd == null ? '' : f.mediumDate(s.currentPeriodEnd!));
    final Widget action;
    if (apple) {
      action = _BannerButton(key: Key('banner-apple-${s.id}'), label: l.planManageAppStore, onPressed: actions.manageInAppStore);
    } else if (pastDue) {
      action = _BannerButton(key: Key('banner-card-${s.id}'), label: l.planUpdateCard, onPressed: () => actions.updateCard(s));
    } else {
      action = _BannerButton(key: Key('banner-resume-${s.id}'), label: l.planResume, onPressed: () => actions.resume(s));
    }
    return Container(
      key: Key('plan-banner-${s.id}'),
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: pastDue ? p.warningBg : p.infoBg, borderRadius: BorderRadius.circular(AzzaSpace.radiusSm)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(pastDue ? Icons.credit_card_off_outlined : Icons.event_available_outlined, size: 20, color: p.text),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: t.bodyMedium)),
        ]),
        const SizedBox(height: 6),
        Align(alignment: AlignmentDirectional.centerStart, child: action),
      ]),
    );
  }
}

class _BannerButton extends StatelessWidget {
  const _BannerButton({super.key, required this.label, required this.onPressed});
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => TextButton(
        style: TextButton.styleFrom(minimumSize: const Size(48, 44), padding: const EdgeInsets.symmetric(horizontal: 8)),
        onPressed: onPressed,
        child: Text(label),
      );
}

/// The banners for every plan that needs attention; [courseId] limits it to one course. Nothing while loading or signed out.
class PlanBanners extends ConsumerWidget {
  const PlanBanners({super.key, this.courseId});
  final String? courseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final all = ref.watch(mySubscriptionsProvider).value ?? const <MySubscription>[];
    final due = all.where((s) => needsBanner(s) && (courseId == null || s.courseId == courseId)).toList();
    if (due.isEmpty) return const SizedBox.shrink();
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [for (final s in due) PlanBanner(subscription: s)]);
  }
}

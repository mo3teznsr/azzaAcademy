import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/price.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../catalog/domain/catalog_models.dart';
import '../data/subscription_repository.dart';
import '../domain/subscription_models.dart';
import 'plan_picker.dart';

/// The all-access plan dressed as a recorded course, so the plan picker and its bar (prices, App Store products,
/// card, bank transfer, the return screen) sell it unchanged through `POST /courses/_all-access/subscribe`.
Course allAccessAsCourse(AllAccessPlan plan) => Course(
      id: allAccessId,
      slug: allAccessId,
      titleEn: 'All recorded courses',
      titleAr: 'كل الدورات المسجّلة',
      type: CourseType.recorded,
      status: plan.enabled ? CourseStatus.published : CourseStatus.draft,
      monthlyPriceFils: plan.monthlyPriceFils,
      yearlyPriceFils: plan.yearlyPriceFils,
      monthlyTotalFils: plan.monthlyTotalFils,
      yearlyTotalFils: plan.yearlyTotalFils,
      appleProducts: plan.appleMonthly == null && plan.appleYearly == null ? null : AppleProducts(monthly: plan.appleMonthly, yearly: plan.appleYearly),
    );

/// What the all-access screen shows: the learner's live plan, the offer, or nothing to buy.
enum AllAccessView { owned, onSale, unavailable }

/// A learner with a plan that gives access sees it (even when the plan is no longer sold); otherwise the offer while it is on sale.
AllAccessView allAccessView(AllAccessPlan plan, MySubscription? mine) {
  if (mine != null && mine.hasAccess) return AllAccessView.owned;
  return plan.onSale ? AllAccessView.onSale : AllAccessView.unavailable;
}

/// "All courses" (`/all-access`): one plan for every recorded course. Price, what's included and the learner's status;
/// buying reuses the course plan flow (card or bank transfer off iOS, the App Store on iOS when its products are set).
class AllAccessScreen extends ConsumerWidget {
  const AllAccessScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final plan = ref.watch(allAccessPlanProvider);
    final mine = subscriptionFor(ref.watch(mySubscriptionsProvider).value ?? const [], allAccessId);
    final view = plan.hasValue ? allAccessView(plan.requireValue, mine) : null;
    final course = plan.hasValue ? allAccessAsCourse(plan.requireValue) : null;
    return Scaffold(
      appBar: AppBar(title: Text(l.allAccessTitle)),
      body: AsyncView<AllAccessPlan>(
        value: plan,
        onRetry: () => ref.invalidate(allAccessPlanProvider),
        data: (p) => RefreshList(
          onRefresh: () async {
            ref.invalidate(allAccessPlanProvider);
            ref.invalidate(mySubscriptionsProvider);
          },
          children: [
            _Hero(plan: p),
            if (view == AllAccessView.unavailable)
              Padding(
                padding: const EdgeInsets.only(top: 14),
                child: RaisedCard(key: const Key('all-access-unavailable'), child: Text(l.allAccessUnavailable)),
              )
            else
              PlanPicker(
                course: course!,
                subscription: mine,
                perks: [l.allAccessGetLessons, l.allAccessGetCertificate, l.allAccessGetCancel],
              ),
            if (view == AllAccessView.owned) ...[
              const SizedBox(height: 12),
              OutlinedButton(
                key: const Key('all-access-manage'),
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                onPressed: () => context.push(Routes.myPlans),
                child: Text(l.allAccessManage),
              ),
            ],
          ],
        ),
      ),
      bottomNavigationBar: switch (view) {
        AllAccessView.onSale => PlanStartBar(course: course!, subscription: mine),
        AllAccessView.owned => PlanStartBar(course: course!, subscription: mine, onContinue: () => context.go(Routes.studentExplore)),
        _ => null,
      },
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({required this.plan});
  final AllAccessPlan plan;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Kicker(l.allAccessKicker),
      const SizedBox(height: 6),
      Text(l.allAccessHeadline, style: t.headlineSmall),
      const SizedBox(height: 8),
      Text(l.allAccessBody, style: t.bodyMedium),
      if (plan.courseCount > 0) ...[
        const SizedBox(height: 10),
        Row(children: [
          Icon(Icons.video_library_outlined, size: 18, color: p.success),
          const SizedBox(width: 6),
          Expanded(child: Text(l.allAccessCourseCount(plan.courseCount), key: const Key('all-access-count'), style: t.labelLarge)),
        ]),
      ],
    ]);
  }
}

/// A link to the all-access plan from a recorded course page, the plans screen and Me. Hidden while the plan is not
/// on sale, and for a learner whose all-access plan already gives access (they get [PlanPicker]'s "included" card).
class AllAccessEntryCard extends ConsumerWidget {
  const AllAccessEntryCard({super.key, this.margin = const EdgeInsets.only(top: 14)});
  final EdgeInsetsGeometry margin;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    final plan = ref.watch(allAccessPlanProvider).value;
    final mine = subscriptionFor(ref.watch(mySubscriptionsProvider).value ?? const [], allAccessId);
    if (plan == null || allAccessView(plan, mine) != AllAccessView.onSale) return const SizedBox.shrink();
    final pf = ref.watch(priceFormatProvider);
    return Padding(
      padding: margin,
      child: RaisedCard(
        key: const Key('all-access-entry'),
        onTap: () => context.push(Routes.allAccess),
        child: Row(children: [
          Icon(Icons.all_inclusive_rounded, color: AzzaPalette.of(context).text),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(l.allAccessEntry, style: t.titleSmall),
              const SizedBox(height: 2),
              Text(l.allAccessEntryFrom(pf.display(plan.monthlyTotalFils ?? plan.monthlyPriceFils!)), style: t.bodySmall),
            ]),
          ),
          const Icon(Icons.chevron_right_rounded),
        ]),
      ),
    );
  }
}

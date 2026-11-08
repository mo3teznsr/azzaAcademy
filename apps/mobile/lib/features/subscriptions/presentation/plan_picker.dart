import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/price.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/guest_gate.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../checkout/data/app_store_gateway.dart';
import '../../checkout/data/checkout_repository.dart' show checkoutPageOpenerProvider;
import '../../checkout/domain/apple_iap.dart';
import '../../checkout/presentation/apple_purchase_coordinator.dart';
import '../data/subscription_repository.dart';
import '../domain/subscription_models.dart';

/// What the learner has picked on a recorded course's page. Shared by the [PlanPicker] and the [PlanStartBar].
@immutable
class PlanChoice {
  const PlanChoice({this.plan = SubscriptionPlan.monthly, this.method = SubscribeMethod.stripe});
  final SubscriptionPlan plan;

  /// Card or bank transfer. Only meaningful off iOS: there, the App Store is the only way.
  final SubscribeMethod method;
}

class PlanChoiceController extends Notifier<PlanChoice> {
  PlanChoiceController(this.courseId);
  final String courseId;

  @override
  PlanChoice build() => const PlanChoice();

  void plan(SubscriptionPlan v) => state = PlanChoice(plan: v, method: state.method);
  void method(SubscribeMethod v) => state = PlanChoice(plan: state.plan, method: v);
}

final planChoiceProvider = NotifierProvider.autoDispose.family<PlanChoiceController, PlanChoice, String>(PlanChoiceController.new);

/// Whether the chosen plan can be started in this app right now.
enum PlanAvailability { ready, loading, website }

/// iOS sells plans only as App Store products: with none set up for the chosen plan, it is "on our website for now".
PlanAvailability planAvailability(WidgetRef ref, Course course, PlanChoice choice) {
  if (!usesAppStorePayments) return PlanAvailability.ready;
  final id = course.appleProducts?.forPlan(choice.plan);
  if (id == null) return PlanAvailability.website;
  final product = ref.watch(appStoreProductProvider(id));
  if (product.hasError) return PlanAvailability.website;
  if (!product.hasValue) return PlanAvailability.loading;
  return product.requireValue == null ? PlanAvailability.website : PlanAvailability.ready;
}

/// The date one [plan] period after [from] (a month or a year; the day is clamped to the month's end).
DateTime planPeriodEnd(SubscriptionPlan plan, DateTime from) {
  final months = plan == SubscriptionPlan.yearly ? 12 : 1;
  final target = DateTime(from.year, from.month + months, 1);
  final lastDay = DateTime(target.year, target.month + 1, 0).day;
  return DateTime(target.year, target.month, from.day > lastDay ? lastDay : from.day);
}

String planName(AppLocalizations l, SubscriptionPlan plan) => plan == SubscriptionPlan.yearly ? l.planYearly : l.planMonthly;

/// A recorded course's plan section: Monthly or Yearly, what you get, how you pay, and what happens next.
/// A learner who already has the plan sees its status instead. The Start button lives in [PlanStartBar].
class PlanPicker extends ConsumerWidget {
  const PlanPicker({super.key, required this.course, this.subscription});
  final Course course;
  final MySubscription? subscription;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final pf = ref.watch(priceFormatProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final choice = ref.watch(planChoiceProvider(course.id));
    final controller = ref.read(planChoiceProvider(course.id).notifier);
    final sub = subscription;

    if (sub != null && sub.hasAccess) return _PlanStatus(course: course, subscription: sub);

    final monthly = course.monthlyPriceFils ?? course.priceFils;
    final yearly = course.yearlyPriceFils;
    final saving = monthly != null && yearly != null ? yearlySavingMonths(monthly, yearly) : 0;
    final availability = planAvailability(ref, course, choice);
    final onIos = usesAppStorePayments;

    // iOS prices come from StoreKit; elsewhere from the course (shown in the learner's display currency).
    String? storePrice(SubscriptionPlan plan) {
      final id = course.appleProducts?.forPlan(plan);
      return id == null ? null : ref.watch(appStoreProductProvider(id)).value?.price;
    }

    String? priceLine(SubscriptionPlan plan) {
      final fils = plan == SubscriptionPlan.yearly ? yearly : monthly;
      final shown = onIos ? storePrice(plan) : (fils == null ? null : pf.display(fils));
      if (shown == null) return null;
      return plan == SubscriptionPlan.yearly ? l.pricePerYear(shown) : l.pricePerMonth(shown);
    }

    final yearlyDetail = !onIos && yearly != null ? l.planYearlyDetail(pf.display((yearly / 12).round())) : null;
    final today = DateTime.now();
    final nextCharge = f.mediumDate(planPeriodEnd(choice.plan, today));
    final transfer = !onIos && choice.method == SubscribeMethod.bankTransfer;

    return SectionCard(
      key: const Key('plan-picker'),
      title: l.planTitle,
      margin: const EdgeInsets.only(top: 14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(l.planIntro, style: t.bodyMedium),
        // Only a plan that really ran out: an INCOMPLETE row (an abandoned checkout) hasn't "ended".
        if (sub != null && sub.status == SubscriptionStatus.expired) ...[
          const SizedBox(height: 10),
          Container(
            key: const Key('plan-ended'),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: p.warningBg, borderRadius: BorderRadius.circular(AzzaSpace.radiusSm)),
            child: Text(l.planEnded, style: t.bodyMedium),
          ),
        ],
        const SizedBox(height: 14),
        for (final plan in SubscriptionPlan.values) ...[
          OptionTile(
            key: Key('plan-${plan.name}'),
            title: planName(l, plan),
            subtitle: [
              ?priceLine(plan),
              if (plan == SubscriptionPlan.yearly) ?yearlyDetail,
            ].join('\n'),
            selected: choice.plan == plan,
            onTap: () => controller.plan(plan),
          ),
          // Under the tile, not beside it: large text would squeeze the plan's own words.
          if (plan == SubscriptionPlan.yearly && saving > 0)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 0),
              child: Row(children: [
                Icon(Icons.savings_outlined, size: 18, color: p.success),
                const SizedBox(width: 6),
                Expanded(child: Text(l.planSaveMonths(saving), style: t.labelLarge?.copyWith(color: p.success))),
              ]),
            ),
          const SizedBox(height: 8),
        ],
        const SizedBox(height: 6),
        Kicker(l.planYouGet),
        const SizedBox(height: 8),
        for (final line in [l.planGetLessons, l.planGetCertificate, l.planGetCancel])
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Padding(padding: const EdgeInsets.only(top: 2), child: Icon(Icons.check_rounded, size: 18, color: p.success)),
              const SizedBox(width: 8),
              Expanded(child: Text(line, style: t.bodyMedium)),
            ]),
          ),
        if (course.previewLessonId != null) ...[
          const SizedBox(height: 6),
          OutlinedButton.icon(
            key: const Key('plan-preview'),
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
            onPressed: () => context.push(Routes.previewLesson(course.previewLessonId!)),
            icon: const Icon(Icons.play_circle_outline_rounded, size: 20),
            label: Text(l.planWatchFree),
          ),
        ],
        const SizedBox(height: 14),
        if (onIos) ...[
          if (availability == PlanAvailability.website)
            RaisedCard(
              key: const Key('plan-website-only'),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(l.planWebsiteOnly, style: t.titleSmall),
                const SizedBox(height: 4),
                Text(l.planWebsiteOnlyBody, style: t.bodySmall),
              ]),
            )
          else ...[
            Row(children: [
              Icon(Icons.apple_rounded, color: p.text),
              const SizedBox(width: 8),
              Expanded(child: Text(l.payAppStoreSub, style: t.bodyMedium)),
            ]),
          ],
        ] else ...[
          Kicker(l.payWith),
          const SizedBox(height: 8),
          OptionTile(
            key: const Key('method-card'),
            title: l.payByCard,
            leading: const Icon(Icons.credit_card_rounded),
            selected: choice.method == SubscribeMethod.stripe,
            onTap: () => controller.method(SubscribeMethod.stripe),
          ),
          const SizedBox(height: 8),
          OptionTile(
            key: const Key('method-bank'),
            title: l.bankTransfer,
            leading: const Icon(Icons.account_balance_rounded),
            selected: choice.method == SubscribeMethod.bankTransfer,
            onTap: () => controller.method(SubscribeMethod.bankTransfer),
          ),
        ],
        if (availability != PlanAvailability.website) ...[
          const SizedBox(height: 14),
          Text(transfer ? l.planPaidUntil(nextCharge) : l.planNextCharge(nextCharge), key: const Key('plan-next-charge'), style: t.titleSmall),
          const SizedBox(height: 4),
          Text(transfer ? l.planTransferNote : l.planCancelLine, style: t.bodySmall),
          if (onIos) ...[const SizedBox(height: 4), Text(l.planAppleNote, style: t.bodySmall)],
          if (!onIos) ...[const SizedBox(height: 4), Text(l.planVatNote, style: t.bodySmall)],
        ],
      ]),
    );
  }
}

/// A learner who has the plan: where it stands, in one card.
class _PlanStatus extends ConsumerWidget {
  const _PlanStatus({required this.course, required this.subscription});
  final Course course;
  final MySubscription subscription;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final s = subscription;
    final end = s.currentPeriodEnd == null ? null : f.mediumDate(s.currentPeriodEnd!);
    final line = switch ((end, s.provider)) {
      (null, _) => null,
      (final d?, SubscriptionProvider.bankTransfer) => l.planPaidUntilShort(d),
      (final d?, _) when s.ends => l.planEnds(d),
      (final d?, _) => l.planRenews(d),
    };
    return SectionCard(
      key: const Key('plan-status'),
      title: l.planYourPlan,
      margin: const EdgeInsets.only(top: 14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(planName(l, s.plan), style: t.titleSmall),
        if (line != null) ...[const SizedBox(height: 2), Text(line, style: t.bodyMedium)],
      ]),
    );
  }
}

/// The recorded course's bottom bar: the chosen plan's price and Start learning (or Continue for a learner who has a plan).
class PlanStartBar extends ConsumerStatefulWidget {
  const PlanStartBar({super.key, required this.course, this.subscription});
  final Course course;
  final MySubscription? subscription;

  @override
  ConsumerState<PlanStartBar> createState() => _PlanStartBarState();
}

class _PlanStartBarState extends ConsumerState<PlanStartBar> {
  StreamSubscription<ApplePurchaseEvent>? _events;

  /// App Store product → the reference of the plan being bought, to follow on the return screen.
  final _pending = <String, String>{};
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    if (usesAppStorePayments) _events = ref.read(appleIapCoordinatorProvider).events.listen(_onApple);
  }

  @override
  void dispose() {
    _events?.cancel();
    super.dispose();
  }

  void _onApple(ApplePurchaseEvent e) {
    if (!mounted || !isAppleSubscriptionProduct(e.productId) || !_pending.containsKey(e.productId)) return;
    final l = context.l10n;
    switch (e.phase) {
      case ApplePurchasePhase.paid:
        final reference = _pending.remove(e.productId)!;
        setState(() => _busy = false);
        ref.invalidate(mySubscriptionsProvider);
        unawaited(context.push(Routes.recordedReturn(reference)));
      case ApplePurchasePhase.confirming:
        setState(() => _busy = true);
      case ApplePurchasePhase.cancelled:
        _pending.remove(e.productId);
        setState(() => _busy = false);
        showToast(context, l.paymentCancelled);
      case ApplePurchasePhase.pending:
        setState(() => _busy = false);
        showToast(context, l.appStorePending);
      case ApplePurchasePhase.failed:
        _pending.remove(e.productId);
        setState(() => _busy = false);
        showToast(context, [l.appStoreFailed, ?e.message].join(' '));
      case ApplePurchasePhase.retryLater:
        setState(() => _busy = false);
        showToast(context, l.appStoreRetryLater);
      case ApplePurchasePhase.rejected:
        _pending.remove(e.productId);
        setState(() => _busy = false);
        showToast(context, l.appStoreRejected);
    }
  }

  Future<void> _start() async {
    // A plan needs an account: a guest signs in (or up) and comes back to this course.
    if (!requireAccount(context, ref)) return;
    final course = widget.course;
    final choice = ref.read(planChoiceProvider(course.id));
    final repo = ref.read(subscriptionRepositoryProvider);
    setState(() => _busy = true);
    try {
      if (usesAppStorePayments) {
        final start = await repo.subscribe(course.id, choice.plan, SubscribeMethod.appleIap) as AppleStart;
        _pending[start.productId] = start.reference;
        await ref.read(appleIapCoordinatorProvider).buySubscription(productId: start.productId, appAccountToken: start.appAccountToken);
      } else if (choice.method == SubscribeMethod.bankTransfer) {
        final start = await repo.subscribe(course.id, choice.plan, SubscribeMethod.bankTransfer) as TransferStart;
        if (mounted) unawaited(context.push(Routes.planTransfer(start.paymentId), extra: start));
      } else {
        final start = await repo.subscribe(course.id, choice.plan, SubscribeMethod.stripe) as StripeStart;
        final opened = await ref.read(checkoutPageOpenerProvider)(start.checkoutUrl);
        if (!mounted) return;
        if (!opened) {
          showToast(context, context.l10n.errGeneric);
        } else {
          // Payment is confirmed by the webhook; the return screen waits for it, also when the browser sends us back.
          unawaited(context.push(Routes.recordedReturn(start.reference)));
        }
      }
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      // On iOS the App Store sheet's outcome arrives on the coordinator's events; only `confirming` makes this busy again.
      if (mounted && _busy) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final course = widget.course;
    final sub = widget.subscription;
    final p = AzzaPalette.of(context);

    if (sub != null && sub.hasAccess) {
      return BottomActionBar(children: [
        FilledButton(
          key: const Key('plan-continue'),
          onPressed: () => context.push(Routes.courseLessons(course.id)),
          child: Text(l.continueLabel),
        ),
      ]);
    }

    final choice = ref.watch(planChoiceProvider(course.id));
    final availability = planAvailability(ref, course, choice);
    final pf = ref.watch(priceFormatProvider);
    final fils = choice.plan == SubscriptionPlan.yearly ? course.yearlyPriceFils : (course.monthlyPriceFils ?? course.priceFils);
    final storeId = course.appleProducts?.forPlan(choice.plan);
    final storePrice = usesAppStorePayments && storeId != null ? ref.watch(appStoreProductProvider(storeId)).value?.price : null;
    final shown = usesAppStorePayments ? storePrice : (fils == null ? null : pf.display(fils));
    final priceText = shown == null ? null : (choice.plan == SubscriptionPlan.yearly ? l.pricePerYear(shown) : l.pricePerMonth(shown));

    return BottomActionBar(children: [
      Row(children: [
        Expanded(
          child: priceText == null
              ? const SizedBox.shrink()
              : Text(priceText, key: const Key('plan-bar-price'), style: Theme.of(context).textTheme.titleMedium),
        ),
        const SizedBox(width: 12),
        // Capped so a long label (or a large text size) ellipsises instead of crushing the price.
        ConstrainedBox(
          constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.6),
          child: FilledButton(
            key: const Key('plan-start'),
            onPressed: availability != PlanAvailability.ready || _busy ? null : _start,
            child: _busy
                ? SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2, color: p.onPrimary))
                : Text(l.planStart, maxLines: 1, overflow: TextOverflow.ellipsis),
          ),
        ),
      ]),
    ]);
  }
}

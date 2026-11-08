import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/money/money.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../checkout/data/checkout_repository.dart';
import '../data/teacher_repository.dart';

/// Teacher earnings: AED, earned per delivered session; other currencies are display only.
class EarningsScreen extends ConsumerWidget {
  const EarningsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final earnings = ref.watch(earningsProvider);
    final fx = ref.watch(fxRatesProvider).value ?? FxRates.fallback;
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final now = DateTime.now();

    return Scaffold(
      appBar: AppBar(
        title: Text(l.earningsTitle),
        actions: [
          IconButton(tooltip: l.payoutMethod, onPressed: () => context.go(Routes.teacherPayoutMethod), icon: const Icon(Icons.account_balance_outlined)),
        ],
      ),
      body: AsyncView<EarningsSummary>(
        value: earnings,
        onRetry: () => ref.invalidate(earningsProvider),
        data: (e) {
          final others = fx.others;
          return RefreshList(
            onRefresh: () async => ref.invalidate(earningsProvider),
            children: [
              Kicker(f.monthYear(now)),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: AzzaColors.sun, borderRadius: BorderRadius.circular(AzzaSpace.radius)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Kicker(
                    [l.earnedSoFar, if (e.nextPayout != null) l.nextPayoutOn(f.shortDate(e.nextPayout!))].join(' · '),
                    color: AzzaColors.ink,
                  ),
                  const SizedBox(height: 8),
                  DisplayText(f.aed(e.earnedThisMonthFils), size: 40, weight: FontWeight.w800, color: AzzaColors.ink),
                  if (others.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      '${others.map((c) => f.money(e.earnedThisMonthFils, c, fx.rateFor(c), decimals: fx.decimalsFor(c))).join(' · ')}. ${l.displayOnly}',
                      style: const TextStyle(color: AzzaColors.ink),
                    ),
                  ],
                ]),
              ),
              const SizedBox(height: 12),
              Row(children: [
                _Card(label: l.pendingLabel, value: f.aed(e.scheduledRestOfMonthFils), sub: l.scheduledRest),
                const SizedBox(width: 10),
                _Card(label: l.lifetimePaid, value: Money.aedCompact(e.lifetimePaidFils, arabicDigits: f.arabicDigits), sub: '${l.availableLabel} ${f.aed(e.availableFils)}'),
              ]),
              SectionCard(
                title: l.byBatch,
                margin: const EdgeInsets.only(top: 24),
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  if (e.batches.isEmpty) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(l.emptyGeneric, style: t.bodySmall)),
                  for (final (i, b) in e.batches.indexed)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(border: i == 0 ? null : Border(top: BorderSide(color: p.line))),
                      child: Row(children: [
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('${b.code} · ${b.title(ref.watch(localeProvider))}', style: t.titleSmall),
                            Text(
                              [f.n(l.sessionsDelivered(b.sessionsDelivered)), if (b.perSessionFils != null) '${f.aed(b.perSessionFils!)} / S'].join(' · '),
                              style: t.bodySmall,
                            ),
                          ]),
                        ),
                        Text(f.aed(b.amountFils), style: t.titleSmall),
                      ]),
                    ),
                ]),
              ),
              if (e.courses.isNotEmpty)
                SectionCard(
                  key: const Key('earnings-courses'),
                  title: l.earningsRecordedCourses,
                  margin: const EdgeInsets.only(top: 16),
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    for (final (i, c) in e.courses.indexed)
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(border: i == 0 ? null : Border(top: BorderSide(color: p.line))),
                        child: Row(children: [
                          Expanded(child: Text(c.title(ref.watch(localeProvider)), style: t.titleSmall)),
                          const SizedBox(width: 12),
                          Text(f.aed(c.amountFils), style: t.titleSmall),
                        ]),
                      ),
                  ]),
                ),
              const SizedBox(height: 16),
              Text(l.netRevenueNote, style: t.bodySmall),
            ],
          );
        },
      ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.label, required this.value, required this.sub});
  final String label;
  final String value;
  final String sub;

  @override
  Widget build(BuildContext context) => Expanded(
        child: RaisedCard(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Kicker(label),
            const SizedBox(height: 4),
            Text(value, style: Theme.of(context).textTheme.titleMedium),
            Text(sub, style: Theme.of(context).textTheme.bodySmall),
          ]),
        ),
      );
}

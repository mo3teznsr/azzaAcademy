import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
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
          final others = [DisplayCurrency.sar, DisplayCurrency.qar, DisplayCurrency.usd].where(fx.has);
          return RefreshList(
            onRefresh: () async => ref.invalidate(earningsProvider),
            children: [
              MonoLabel(f.monthYear(now)),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: AzzaColors.sun, borderRadius: BorderRadius.circular(AzzaSpace.radius)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  MonoLabel(
                    [l.earnedSoFar, if (e.nextPayout != null) l.nextPayoutOn(f.shortDate(e.nextPayout!))].join(' · '),
                    color: AzzaColors.ink,
                  ),
                  const SizedBox(height: 8),
                  DisplayText(f.aed(e.earnedThisMonthFils), size: 40, weight: FontWeight.w800, color: AzzaColors.ink),
                  if (others.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      '${others.map((c) => f.money(e.earnedThisMonthFils, c, fx.rateFor(c))).join(' · ')}. ${l.displayOnly}',
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
              SectionHeader(l.byBatch),
              if (e.batches.isEmpty) Text(l.emptyGeneric, style: t.bodySmall),
              for (final b in e.batches)
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(border: Border(top: BorderSide(color: p.line))),
                  child: Row(children: [
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('${b.code} · ${b.courseTitle}', style: t.titleSmall),
                        Text(
                          [l.sessionsDelivered(f.n(b.sessionsDelivered)), if (b.perSessionFils != null) '${f.aed(b.perSessionFils!)} / S'].join(' · '),
                          style: t.bodySmall,
                        ),
                      ]),
                    ),
                    Text(f.aed(b.amountFils), style: t.titleSmall),
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
            MonoLabel(label),
            const SizedBox(height: 4),
            Text(value, style: Theme.of(context).textTheme.titleMedium),
            Text(sub, style: Theme.of(context).textTheme.bodySmall),
          ]),
        ),
      );
}

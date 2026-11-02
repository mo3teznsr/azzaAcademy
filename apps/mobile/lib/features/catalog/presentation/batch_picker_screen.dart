import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/money/money.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../checkout/data/checkout_repository.dart';
import '../data/catalog_repository.dart';
import '../domain/catalog_models.dart';
import 'catalog_widgets.dart';

/// Batch picker: same course, different seasons — times in your timezone.
class BatchPickerScreen extends ConsumerStatefulWidget {
  const BatchPickerScreen({super.key, required this.courseId});
  final String courseId;

  @override
  ConsumerState<BatchPickerScreen> createState() => _BatchPickerScreenState();
}

class _BatchPickerScreenState extends ConsumerState<BatchPickerScreen> {
  String? _selected;
  SessionLanguage? _lang;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final course = ref.watch(courseProvider(widget.courseId)).value;
    final batches = ref.watch(courseBatchesProvider(widget.courseId));
    final currency = ref.watch(displayCurrencyProvider);
    final fx = ref.watch(fxRatesProvider).value ?? FxRates.fallback;
    final tz = '${DateTime.now().timeZoneName} · GMT${DateTime.now().timeZoneOffset.isNegative ? '-' : '+'}${DateTime.now().timeZoneOffset.inHours.abs()}';
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(course?.title(locale) ?? '', style: t.titleSmall)),
      body: AsyncView<List<Batch>>(
        value: batches,
        onRetry: () => ref.invalidate(courseBatchesProvider(widget.courseId)),
        isEmpty: (list) => list.isEmpty,
        empty: EmptyState(title: l.noOpenBatches),
        data: (all) {
          final list = _lang == null ? all : all.where((b) => b.language == _lang).toList();
          _selected ??= list.where((b) => b.status.canEnroll && b.seatsLeft > 0).firstOrNull?.id ?? list.firstOrNull?.id;
          return ListView(
            padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 24),
            children: [
              DisplayText(l.pickBatch, size: 38),
              const SizedBox(height: 6),
              MonoLabel(l.timesShownIn(tz)),
              const SizedBox(height: 12),
              Wrap(spacing: 8, children: [
                for (final opt in [null, SessionLanguage.ar, SessionLanguage.en])
                  ChoiceChip(
                    label: Text(opt == null ? l.allFilter : (opt == SessionLanguage.ar ? 'العربية' : 'English')),
                    selected: _lang == opt,
                    showCheckmark: false,
                    labelStyle: TextStyle(color: _lang == opt ? p.onAccent : p.text),
                    onSelected: (_) => setState(() {
                      _lang = opt;
                      _selected = null;
                    }),
                  ),
              ]),
              const SizedBox(height: 16),
              for (final b in list) ...[
                _BatchOption(
                  batch: b,
                  fmt: f,
                  selected: b.id == _selected,
                  price: f.money(b.effectivePriceFils, currency, fx.rateFor(currency)),
                  onTap: () => setState(() => _selected = b.id),
                ),
                const SizedBox(height: 12),
              ],
            ],
          );
        },
      ),
      bottomNavigationBar: _selected == null
          ? null
          : Builder(builder: (context) {
              final b = batches.value?.where((e) => e.id == _selected).firstOrNull;
              if (b == null) return const SizedBox.shrink();
              final full = b.status == BatchStatus.full || b.seatsLeft == 0;
              return BottomActionBar(children: [
                Row(children: [
                  Expanded(
                    child: OutlinedButton(onPressed: () => context.push(Routes.batchSchedule(b.id)), child: Text(l.fullSchedule)),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton(
                      onPressed: full && !b.waitlistEnabled ? null : () => context.push(Routes.checkout(b.id)),
                      child: Text(full ? l.joinWaitlist : l.enrollIn(b.code), maxLines: 1, overflow: TextOverflow.ellipsis),
                    ),
                  ),
                ]),
              ]);
            }),
    );
  }
}

class _BatchOption extends StatelessWidget {
  const _BatchOption({required this.batch, required this.fmt, required this.selected, required this.price, required this.onTap});
  final Batch batch;
  final Fmt fmt;
  final bool selected;
  final String price;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final b = batch;
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: p.raised,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AzzaSpace.radius),
          side: BorderSide(color: selected ? p.accent : p.line, width: selected ? 1.6 : 1),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(AzzaSpace.radius),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Slate(b.code, inverted: selected, color: selected ? p.accent : null),
                const Spacer(),
                StatusChip.batch(context, b.status, taken: b.seatsTaken, capacity: b.capacity),
              ]),
              const SizedBox(height: 12),
              DisplayText(scheduleLabel(fmt, b.schedule), size: 22),
              const SizedBox(height: 6),
              Text(
                [
                  if (b.startsOn != null && b.endsOn != null) '${fmt.shortDate(b.startsOn!)} → ${fmt.shortDate(b.endsOn!)}',
                  b.language == SessionLanguage.ar ? 'العربية' : 'English',
                ].join(' · '),
                style: t.bodySmall,
              ),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(child: Text(b.teacher?.name ?? '', style: t.bodyMedium)),
                if (b.seatsLeft > 0 && b.seatsLeft <= 5) ...[MonoLabel(l.seatsLeft(fmt.n(b.seatsLeft)), color: AzzaColors.peach), const SizedBox(width: 10)],
                Text(price, style: t.titleSmall),
              ]),
            ]),
          ),
        ),
      ),
    );
  }
}

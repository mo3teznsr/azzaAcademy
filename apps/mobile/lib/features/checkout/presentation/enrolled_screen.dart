import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../catalog/presentation/batch_schedule_screen.dart';
import '../../me/data/me_repository.dart';
import '../data/checkout_repository.dart';
import '../domain/checkout_models.dart';

/// "You're in." — confirmation, countdown to the next take, calendar sync.
class EnrolledScreen extends ConsumerWidget {
  const EnrolledScreen({super.key, required this.orderId});
  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final order = ref.watch(orderProvider(orderId));
    return Scaffold(
      appBar: AppBar(leading: CloseButton(onPressed: () => context.go(Routes.studentHome))),
      body: AsyncView<Order>(
        value: order,
        onRetry: () => ref.invalidate(orderProvider(orderId)),
        data: (o) {
          final batchId = o.batch?.id;
          if (batchId == null) return EmptyState(title: l.youreIn);
          final batch = ref.watch(batchProvider(batchId));
          return AsyncView<Batch>(
            value: batch,
            onRetry: () => ref.invalidate(batchProvider(batchId)),
            data: (b) => _Body(order: o, batch: b),
          );
        },
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.order, required this.batch});
  final Order order;
  final Batch batch;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final now = DateTime.now();
    final upcoming = batch.sessions.where((s) => s.startsAt.isAfter(now) && s.status == SessionStatus.scheduled).toList();
    final next = upcoming.firstOrNull;
    final courseTitle = batch.course?.title(locale) ?? '';

    return ListView(
      padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 24),
      children: [
        Kicker(l.orderRef(order.reference)),
        const SizedBox(height: 12),
        DisplayText(l.youreIn, size: 64, weight: FontWeight.w800),
        const SizedBox(height: 12),
        Text(l.enrolledBody(courseTitle, batch.code, upcoming.length, f.n(upcoming.length)), style: t.bodyLarge),
        if (next != null) ...[
          const SizedBox(height: 24),
          RaisedCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Kicker('${l.nextTake} · S${next.number.toString().padLeft(2, '0')}'),
                const Spacer(),
                StatusChip.session(context, next.status, startsAt: next.startsAt),
              ]),
              const SizedBox(height: 8),
              Text(next.title, style: t.titleMedium),
              const SizedBox(height: 16),
              Ticker(
                interval: const Duration(seconds: 30),
                builder: (_, now) {
                  final d = next.startsAt.difference(now);
                  Widget cell(int v, String label) => Expanded(
                        child: Column(children: [
                          Text(v.toString().padLeft(2, '0'), style: AzzaFonts.mono(size: 34, color: p.text, tracking: 0)),
                          Kicker(label),
                        ]),
                      );
                  return Row(children: [
                    cell(d.inDays, l.days),
                    cell(d.inHours % 24, l.hrs),
                    cell(d.inMinutes % 60, l.mins),
                  ]);
                },
              ),
              const SizedBox(height: 12),
              Text('${f.dayTime(next.startsAt)} · ${l.lobbyOpensAt(f.time(next.startsAt.subtract(const Duration(minutes: 15))))}', style: t.bodySmall),
            ]),
          ),
        ],
        const SizedBox(height: 24),
        FilledButton.icon(
          onPressed: upcoming.isEmpty ? null : () => addSessionsToCalendar(upcoming, courseTitle),
          icon: const Icon(Icons.event_available_rounded),
          label: Text(f.n(l.syncCalendar(upcoming.length))),
        ),
        const SizedBox(height: 10),
        OutlinedButton(
          onPressed: () {
            ref.invalidate(enrollmentsProvider);
            context.go(Routes.studentLibrary);
          },
          child: Text(l.watchRecordings),
        ),
      ],
    );
  }
}

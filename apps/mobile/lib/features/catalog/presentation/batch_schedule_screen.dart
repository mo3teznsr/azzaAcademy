import 'package:add_2_calendar/add_2_calendar.dart' as cal;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/price.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../announcements/presentation/class_hub.dart';
import '../../me/data/me_repository.dart';
import '../data/catalog_repository.dart';
import '../domain/catalog_models.dart';
import 'catalog_widgets.dart';

Future<void> addSessionsToCalendar(List<SessionSummary> sessions, String courseTitle) async {
  for (final s in sessions) {
    await cal.Add2Calendar.addEvent2Cal(cal.Event(
      title: '${Fmt.slate(s.batchCode, s.number)} · ${s.title}',
      description: courseTitle,
      startDate: s.startsAt,
      endDate: s.endsAt,
    ));
  }
}

/// Batch schedule: every session as a slate, before you pay (or after, as an enrolled student).
class BatchScheduleScreen extends ConsumerWidget {
  const BatchScheduleScreen({super.key, required this.batchId});
  final String batchId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final batch = ref.watch(batchProvider(batchId));
    final enrolled = ref.watch(enrollmentsProvider).value?.any((e) => e.batch.id == batchId && e.isActive) ?? false;
    final price = ref.watch(priceFormatProvider);
    final now = DateTime.now();

    return Scaffold(
      appBar: AppBar(),
      body: AsyncView<Batch>(
        value: batch,
        onRetry: () => ref.invalidate(batchProvider(batchId)),
        data: (b) {
          final ran = b.sessionsDone(now);
          final left = b.sessions.length - ran;
          final t = Theme.of(context).textTheme;
          return ListView(
            padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 24),
            children: [
              StatusChip.batch(context, b.status, taken: b.seatsTaken, capacity: b.capacity),
              const SizedBox(height: 12),
              DisplayText(b.code, size: 64, weight: FontWeight.w800),
              Text(scheduleLabel(f, b.schedule), style: t.titleMedium),
              if (b.course != null) Text(b.course!.title(locale), style: t.bodySmall),
              if (!enrolled && ran > 0 && left > 0) ...[
                const SizedBox(height: 16),
                RaisedCard(
                  color: AzzaColors.sun.withValues(alpha: 0.12),
                  child: Text(l.joiningLate(f.n(ran), f.n(left)), style: t.bodyMedium),
                ),
              ],
              if (enrolled) ...[const SizedBox(height: 4), ClassHub(batchId: b.id)],
              const SizedBox(height: 16),
              if (b.sessions.isEmpty)
                EmptyState(title: l.emptyGeneric)
              else
                CardGroup(
                  children: [
                    for (final s in b.sessions)
                      SessionRow(
                        session: s,
                        fmt: f,
                        showDay: true,
                        padding: SessionRow.inCard,
                        subtitle: f.shortDate(s.startsAt),
                        onTap: enrolled ? () => context.push(s.status == SessionStatus.ended ? Routes.afterSession(s.id) : Routes.lobby(s.id)) : null,
                      ),
                  ],
                ),
            ],
          );
        },
      ),
      bottomNavigationBar: batch.hasValue
          ? BottomActionBar(children: [
              Row(children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => addSessionsToCalendar(
                      batch.requireValue.sessions.where((s) => s.startsAt.isAfter(now)).toList(),
                      batch.requireValue.course?.title(locale) ?? '',
                    ),
                    icon: const Icon(Icons.event_rounded),
                    label: Text(l.addToCalendar),
                  ),
                ),
                if (!enrolled && batch.requireValue.status.canEnroll) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton(
                      onPressed: () => context.push(Routes.checkout(batchId)),
                      child: Text(l.continueWithPrice(price.display(batch.requireValue.effectivePriceFils))),
                    ),
                  ),
                ],
              ]),
            ])
          : null,
    );
  }
}

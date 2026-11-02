import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../catalog/presentation/catalog_widgets.dart';

final adminBatchesProvider = FutureProvider.autoDispose.family<List<Batch>, BatchStatus?>(
  (ref, status) => ref.watch(catalogRepositoryProvider).batches(status: status?.wire),
);

class AdminBatchesScreen extends ConsumerStatefulWidget {
  const AdminBatchesScreen({super.key});

  @override
  ConsumerState<AdminBatchesScreen> createState() => _AdminBatchesScreenState();
}

class _AdminBatchesScreenState extends ConsumerState<AdminBatchesScreen> {
  BatchStatus? _status;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final batches = ref.watch(adminBatchesProvider(_status));
    final t = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: Text(l.batchesTitle)),
      body: Column(children: [
        SizedBox(
          height: 44,
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            children: [
              for (final s in <BatchStatus?>[null, BatchStatus.running, BatchStatus.enrolling, BatchStatus.full, BatchStatus.draft, BatchStatus.completed])
                Padding(
                  padding: const EdgeInsetsDirectional.only(end: 8),
                  child: ChoiceChip(
                    label: Text(s == null ? l.allFilter : s.wire.toLowerCase()),
                    selected: _status == s,
                    showCheckmark: false,
                    labelStyle: TextStyle(color: _status == s ? AzzaPalette.of(context).onAccent : AzzaPalette.of(context).text),
                    onSelected: (_) => setState(() => _status = s),
                  ),
                ),
            ],
          ),
        ),
        Expanded(
          child: AsyncView<List<Batch>>(
            value: batches,
            onRetry: () => ref.invalidate(adminBatchesProvider(_status)),
            isEmpty: (list) => list.isEmpty,
            empty: EmptyState(title: l.emptyGeneric),
            data: (list) => RefreshList(
              onRefresh: () async => ref.invalidate(adminBatchesProvider(_status)),
              children: [
                for (final b in list) ...[
                  RaisedCard(
                    onTap: () => context.go(Routes.adminBatch(b.id)),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Slate(b.code),
                        const SizedBox(width: 8),
                        Expanded(child: Text(b.course?.title(locale) ?? '', style: t.titleSmall, maxLines: 1, overflow: TextOverflow.ellipsis)),
                        StatusChip.batch(context, b.status, taken: b.seatsTaken, capacity: b.capacity),
                      ]),
                      const SizedBox(height: 6),
                      Text('${scheduleLabel(f, b.schedule)} · ${b.teacher?.name ?? ''}', style: t.bodySmall),
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

/// Batch quick view: seats, next session, teacher — on the go.
class BatchQuickViewScreen extends ConsumerWidget {
  const BatchQuickViewScreen({super.key, required this.batchId});
  final String batchId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final batch = ref.watch(batchProvider(batchId));
    final t = Theme.of(context).textTheme;
    final now = DateTime.now();

    return Scaffold(
      appBar: AppBar(),
      body: AsyncView<Batch>(
        value: batch,
        onRetry: () => ref.invalidate(batchProvider(batchId)),
        data: (b) {
          final next = b.nextSession(now);
          return RefreshList(
            onRefresh: () async => ref.invalidate(batchProvider(batchId)),
            children: [
              MonoLabel(b.course?.title(locale) ?? ''),
              Row(children: [
                DisplayText(b.code, size: 56, weight: FontWeight.w800),
                const Spacer(),
                StatusChip.batch(context, b.status),
              ]),
              Text('${scheduleLabel(f, b.schedule)} · ${b.timezone}', style: t.bodyMedium),
              const SizedBox(height: 16),
              RaisedCard(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  DisplayText('${f.n(b.seatsTaken)} / ${f.n(b.capacity)}', size: 34),
                  MonoLabel([l.seatsLabel, if (b.waitlistCount != null) '${f.n(b.waitlistCount!)} ${l.waitlist}'].join(' · ')),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(value: b.capacity == 0 ? 0 : b.seatsTaken / b.capacity, minHeight: 6, borderRadius: BorderRadius.circular(3)),
                  const SizedBox(height: 8),
                  Text(
                    [
                      if (b.startsOn != null && b.endsOn != null) '${f.shortDate(b.startsOn!)} → ${f.shortDate(b.endsOn!)}',
                      if (b.sessions.isNotEmpty) l.sessionsRun(f.n(b.sessionsDone(now)), f.n(b.sessionCount)),
                    ].join(' · '),
                    style: t.bodySmall,
                  ),
                ]),
              ),
              if (next != null) ...[
                SectionHeader(l.nextSession),
                RaisedCard(
                  onTap: next.isLive ? () => context.push(Routes.liveRoom(next.id)) : null,
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      MonoLabel(Fmt.slate(b.code, next.number)),
                      const Spacer(),
                      StatusChip.session(context, next.status, startsAt: next.startsAt, moved: next.movedFrom != null),
                    ]),
                    const SizedBox(height: 6),
                    Text(next.title, style: t.titleSmall),
                    Text(f.dayTime(next.startsAt), style: t.bodySmall),
                  ]),
                ),
              ],
              if (b.teacher != null) ...[
                SectionHeader(l.teacherLabel),
                Row(children: [
                  InitialsAvatar(b.teacher!.name),
                  const SizedBox(width: 12),
                  Text(b.teacher!.name, style: t.titleSmall),
                ]),
              ],
            ],
          );
        },
      ),
    );
  }
}

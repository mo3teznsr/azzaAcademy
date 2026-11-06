import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/links.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../me/data/me_repository.dart';
import '../../me/domain/me_models.dart';
import '../data/learn_repository.dart';

/// Library: every take per batch with watch progress, plus materials.
class LibraryScreen extends ConsumerStatefulWidget {
  const LibraryScreen({super.key});

  @override
  ConsumerState<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends ConsumerState<LibraryScreen> {
  String? _batchId;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final enrollments = ref.watch(enrollmentsProvider);
    final locale = ref.watch(localeProvider);
    final p = AzzaPalette.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l.libraryTitle),
        actions: [
          TextButton.icon(
            onPressed: () => context.push(Uri(path: Routes.assignments, queryParameters: {'batchId': ?_batchId}).toString()),
            icon: const Icon(Icons.assignment_outlined),
            label: Text(l.assignments),
          ),
        ],
      ),
      body: AsyncView<List<Enrollment>>(
        value: enrollments,
        onRetry: () => ref.invalidate(enrollmentsProvider),
        isEmpty: (list) => list.where((e) => e.isActive).isEmpty,
        empty: EmptyState(title: l.noRecordings, body: l.enrollFirst, action: l.exploreCta, onAction: () => context.go(Routes.studentExplore)),
        data: (list) {
          final active = list.where((e) => e.isActive).toList();
          final batchId = _batchId ?? active.first.batch.id;
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            SizedBox(
              height: 44,
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: AzzaSpace.gutter),
                scrollDirection: Axis.horizontal,
                children: [
                  for (final e in active)
                    Padding(
                      padding: const EdgeInsetsDirectional.only(end: 8),
                      child: ChoiceChip(
                        label: Text('${e.batch.course?.title(locale) ?? ''} · ${e.batch.code}'),
                        selected: e.batch.id == batchId,
                        showCheckmark: false,
                        labelStyle: TextStyle(color: e.batch.id == batchId ? p.onAccent : p.text),
                        onSelected: (_) => setState(() => _batchId = e.batch.id),
                      ),
                    ),
                ],
              ),
            ),
            Expanded(child: _BatchLibrary(batchId: batchId)),
          ]);
        },
      ),
    );
  }
}

class _BatchLibrary extends ConsumerWidget {
  const _BatchLibrary({required this.batchId});
  final String batchId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final recordings = ref.watch(recordingsProvider);
    final materials = ref.watch(materialsProvider(batchId));
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    return RefreshList(
      onRefresh: () async {
        ref.invalidate(recordingsProvider);
        ref.invalidate(materialsProvider(batchId));
      },
      children: [
        AsyncView<List<Recording>>(
          value: recordings,
          compact: true,
          onRetry: () => ref.invalidate(recordingsProvider),
          isEmpty: (all) => all.where((r) => r.batchId == batchId).isEmpty,
          empty: EmptyState(title: l.noRecordings, icon: Icons.videocam_off_outlined),
          data: (all) {
            final list = all.where((r) => r.batchId == batchId).toList()..sort((a, b) => b.number.compareTo(a.number));
            final resume = list.where((r) => r.progress > 0 && r.progress < 0.98).firstOrNull;
            return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              if (resume != null) ...[
                RaisedCard(
                  onTap: () => openExternal(context, resume.url),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    MonoLabel(
                      'S${resume.number.toString().padLeft(2, '0')} · ${l.continueAt('${Fmt.timecode(Duration(seconds: resume.progressSec ?? 0))} / ${Fmt.timecode(Duration(seconds: resume.durationSec ?? 0))}')}',
                      color: p.accent,
                    ),
                    const SizedBox(height: 8),
                    DisplayText(resume.title, size: 24),
                    const SizedBox(height: 10),
                    LinearProgressIndicator(value: resume.progress, minHeight: 4, borderRadius: BorderRadius.circular(2)),
                  ]),
                ),
                const SizedBox(height: 8),
              ],
              CardGroup(title: l.allRecordingsN(f.n(list.length)), children: [
                for (final r in list)
                  ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                    leading: Slate('S${r.number.toString().padLeft(2, '0')}'),
                    title: Text(r.title, style: t.titleSmall),
                    subtitle: Text(
                      [
                        if (r.recordedAt != null) f.shortDate(r.recordedAt!),
                        if (r.durationSec != null) '${f.n((r.durationSec! / 60).round())} min',
                        if (r.url == null) l.recordingProcessing,
                      ].join(' · '),
                    ),
                    trailing: Icon(r.url == null ? Icons.hourglass_top_rounded : Icons.play_circle_outline_rounded),
                    onTap: r.url == null ? null : () => openExternal(context, r.url),
                  ),
              ]),
            ]);
          },
        ),
        AsyncView(
          value: materials,
          compact: true,
          onRetry: () => ref.invalidate(materialsProvider(batchId)),
          isEmpty: (List<CourseMaterial> list) => list.isEmpty,
          empty: SectionCard(title: l.materials, margin: const EdgeInsets.only(top: 24), child: Text(l.noMaterials, style: t.bodySmall)),
          data: (List<CourseMaterial> list) => CardGroup(title: l.materials, children: [
            for (final m in list)
              ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                leading: Slate(m.kind),
                title: Text(m.title, style: t.titleSmall),
                trailing: const Icon(Icons.open_in_new_rounded, size: 18),
                onTap: () => openExternal(context, m.url),
              ),
          ]),
        ),
      ],
    );
  }
}

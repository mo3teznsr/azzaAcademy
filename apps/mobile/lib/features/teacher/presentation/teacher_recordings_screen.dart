import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/links.dart';
import '../../../core/utils/share.dart';
import '../../../core/widgets/ui.dart';
import '../../learn/data/learn_repository.dart';

/// Recordings of the sessions you taught, grouped by batch. Every session is recorded automatically
/// when the host presses Start; play opens the video, share hands the file link to Files / AirDrop / mail.
class TeacherRecordingsScreen extends ConsumerWidget {
  const TeacherRecordingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final arabic = ref.watch(localeProvider) == AppLocale.ar;
    final t = Theme.of(context).textTheme;
    final recordings = ref.watch(recordingsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l.teacherRecordingsTitle)),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(recordingsProvider),
        child: AsyncView<List<Recording>>(
          value: recordings,
          onRetry: () => ref.invalidate(recordingsProvider),
          isEmpty: (list) => list.isEmpty,
          empty: EmptyState(title: l.teacherRecordingsEmpty, body: l.teacherRecordingsLede, icon: Icons.videocam_outlined),
          data: (list) {
            final byBatch = <String, List<Recording>>{};
            for (final r in list) {
              (byBatch[r.batchId] ??= []).add(r);
            }
            return ListView(
              padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 32),
              children: [
                Text(l.teacherRecordingsLede, style: t.bodySmall),
                for (final group in byBatch.values)
                  CardGroup(
                    title:
                        '${arabic && (group.first.courseTitleAr ?? '').isNotEmpty ? group.first.courseTitleAr : group.first.courseTitle} · ${group.first.batchCode}',
                    children: [
                      for (final r in (group..sort((a, b) => b.number.compareTo(a.number))))
                        ListTile(
                          key: Key('teacher-recording-${r.sessionId}'),
                          contentPadding: const EdgeInsetsDirectional.only(start: 16, end: 4),
                          leading: Slate('S${r.number.toString().padLeft(2, '0')}'),
                          title: Text(r.title, style: t.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
                          subtitle: Text(
                            [
                              if (r.recordedAt != null) f.shortDate(r.recordedAt!),
                              if (r.durationSec != null) '${f.n((r.durationSec! / 60).round())} min',
                              if (r.url == null) l.recordingProcessing,
                            ].join(' · '),
                          ),
                          trailing: r.url == null
                              ? const Padding(padding: EdgeInsets.all(12), child: Icon(Icons.hourglass_top_rounded))
                              : Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      key: Key('share-recording-${r.sessionId}'),
                                      tooltip: l.shareRecording,
                                      icon: const Icon(Icons.ios_share_rounded),
                                      onPressed: () => ref.read(shareLinkProvider)(Uri.parse(r.url!), subject: r.title),
                                    ),
                                    IconButton(
                                      tooltip: l.playRecording,
                                      icon: const Icon(Icons.play_circle_outline_rounded),
                                      onPressed: () => openExternal(context, r.url),
                                    ),
                                  ],
                                ),
                          onTap: r.url == null ? null : () => openExternal(context, r.url),
                        ),
                    ],
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

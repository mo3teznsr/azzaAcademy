import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/download_manager.dart';
import '../data/lesson_media_repository.dart';
import '../data/lesson_progress_repository.dart';
import '../domain/download_policy.dart';
import '../domain/lesson_media_models.dart';
import 'lesson_video_tracker.dart';

/// "1.2 GB", "340 MB" — Western digits, like the rest of the app's numbers.
String formatBytes(int bytes) {
  const mb = 1024 * 1024;
  if (bytes >= 1024 * mb) return '${(bytes / (1024 * mb)).toStringAsFixed(1)} GB';
  return '${(bytes / mb).ceil()} MB';
}

/// The message for a download that could not start or finish.
String downloadFailureText(BuildContext context, Object e) {
  final l = context.l10n;
  return switch (e is DownloadFailure ? e.block : null) {
    DownloadBlock.offline => l.downloadOffline,
    DownloadBlock.needsWifi => l.downloadNeedsWifi,
    DownloadBlock.storageFull => l.downloadStorageFull,
    null => l.downloadFailed,
  };
}

/// Under a lesson's video: save it for offline viewing, follow the download, or delete the saved copy.
class LessonDownloadButton extends ConsumerWidget {
  const LessonDownloadButton({super.key, required this.lessonId, required this.courseId, required this.titleEn, this.titleAr});
  final String lessonId;
  final String courseId;
  final String titleEn;
  final String? titleAr;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final playback = ref.watch(lessonPlaybackProvider(lessonId)).value;
    if (playback == null || !playback.downloadable) return const SizedBox.shrink();
    final downloads = ref.watch(downloadManagerProvider);
    final manager = ref.read(downloadManagerProvider.notifier);
    final progress = downloads.active[lessonId];
    final saved = downloads.entry(lessonId);
    if (progress != null) {
      return Row(
        key: const Key('lesson-downloading'),
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l.downloadingLesson),
                const SizedBox(height: 6),
                LinearProgressIndicator(value: progress > 0 ? progress : null),
              ],
            ),
          ),
          IconButton(tooltip: l.downloadCancel, onPressed: () => manager.cancel(lessonId), icon: const Icon(Icons.close_rounded)),
        ],
      );
    }
    if (saved != null) {
      return Row(
        key: const Key('lesson-downloaded'),
        children: [
          Icon(Icons.download_done_rounded, color: AzzaPalette.of(context).success),
          const SizedBox(width: 8),
          Expanded(child: Text('${l.downloadedLesson} · ${formatBytes(saved.bytes)}')),
          IconButton(tooltip: l.downloadDelete, onPressed: () => unawaited(manager.delete(lessonId)), icon: const Icon(Icons.delete_outline_rounded)),
        ],
      );
    }
    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: OutlinedButton.icon(
        key: const Key('lesson-download'),
        onPressed: () async {
          final messenger = ScaffoldMessenger.of(context);
          try {
            await manager.start(lessonId: lessonId, courseId: courseId, titleEn: titleEn, titleAr: titleAr);
          } catch (e) {
            if (!context.mounted) return;
            messenger
              ..hideCurrentSnackBar()
              ..showSnackBar(SnackBar(content: Text(downloadFailureText(context, e))));
          }
        },
        icon: const Icon(Icons.download_rounded, size: 18),
        label: Text(l.downloadLesson),
      ),
    );
  }
}

/// Saved lessons: play offline, delete, and the Wi-Fi only / data saver settings.
class DownloadsScreen extends ConsumerWidget {
  const DownloadsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final locale = ref.watch(localeProvider);
    final fmt = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final state = ref.watch(downloadManagerProvider);
    final now = DateTime.now();
    return Scaffold(
      appBar: AppBar(title: Text(l.downloadsTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 32),
        children: [
          CardGroup(
            children: [
              SwitchListTile(
                key: const Key('downloads-wifi-only'),
                title: Text(l.downloadsWifiOnly),
                subtitle: Text(l.downloadsWifiOnlyHint),
                value: ref.watch(downloadsWifiOnlyProvider),
                onChanged: (v) => unawaited(ref.read(downloadsWifiOnlyProvider.notifier).set(v)),
              ),
              SwitchListTile(
                key: const Key('downloads-data-saver'),
                title: Text(l.lessonVideoDataSaver),
                subtitle: Text(l.lessonVideoDataSaverHint),
                value: ref.watch(dataSaverProvider),
                onChanged: (v) => unawaited(ref.read(dataSaverProvider.notifier).set(v)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(l.downloadsStorage(formatBytes(state.usedBytes), formatBytes(ref.watch(downloadBudgetProvider))), style: t.bodySmall?.copyWith(color: p.muted)),
          const SizedBox(height: 12),
          if (state.entries.isEmpty)
            EmptyState(key: const Key('downloads-empty'), title: l.downloadsEmpty, body: l.downloadsEmptyBody, icon: Icons.download_for_offline_outlined)
          else
            CardGroup(
              children: [
                for (final e in state.entries)
                  ListTile(
                    key: Key('download-${e.lessonId}'),
                    leading: Icon(isPlayableOffline(e, now) ? Icons.play_circle_outline_rounded : Icons.wifi_off_rounded),
                    title: Text(e.title(locale), style: t.titleSmall),
                    subtitle: Text(
                      isPlayableOffline(e, now) ? '${formatBytes(e.bytes)} · ${l.downloadPlaysUntil(fmt.shortDate(e.offlineUntil.toLocal()))}' : l.downloadExpired,
                    ),
                    onTap: isPlayableOffline(e, now) ? () => context.push(Routes.offlineLesson(e.lessonId)) : null,
                    trailing: IconButton(
                      tooltip: l.downloadDelete,
                      onPressed: () => unawaited(ref.read(downloadManagerProvider.notifier).delete(e.lessonId)),
                      icon: const Icon(Icons.delete_outline_rounded),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

/// Plays a saved copy without a connection. Positions are kept with the copy and sent to the server when possible.
class OfflineLessonScreen extends ConsumerWidget {
  const OfflineLessonScreen({super.key, required this.lessonId});
  final String lessonId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final locale = ref.watch(localeProvider);
    final entry = ref.watch(downloadManagerProvider.select((s) => s.entry(lessonId)));
    final builder = ref.watch(lessonPlayerBuilderProvider);
    final path = ref.watch(_offlinePathProvider(lessonId));
    return Scaffold(
      appBar: AppBar(title: Text(entry?.title(locale) ?? l.downloadsTitle)),
      body: switch ((entry, path.value)) {
        (final DownloadEntry e, final String file) when builder != null => ListView(
            padding: const EdgeInsets.all(AzzaSpace.gutter),
            children: [
              ResumableLessonVideo(
                key: Key('offline-$lessonId'),
                lessonId: lessonId,
                url: pickLessonVideoUrl(fileUrl: file, offlinePath: file),
                startSec: e.positionSec,
                builder: builder,
                save: (sec, {durationSec, ended = false}) async {
                  await ref.read(downloadManagerProvider.notifier).savePosition(lessonId, sec);
                  // Best effort: online, the server keeps watch progress too.
                  try {
                    await ref.read(lessonProgressRepositoryProvider).saveVideoPosition(lessonId, sec, durationSec: durationSec, ended: ended);
                  } catch (_) {}
                },
              ),
            ],
          ),
        _ when path.isLoading => const Center(child: CircularProgressIndicator()),
        _ => EmptyState(title: l.downloadExpired, icon: Icons.wifi_off_rounded),
      },
    );
  }
}

final _offlinePathProvider = FutureProvider.autoDispose.family<String?, String>(
  (ref, lessonId) => ref.read(downloadManagerProvider.notifier).playablePath(lessonId),
);

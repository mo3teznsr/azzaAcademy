import 'lesson_media_models.dart';

/// The connection the phone has right now.
enum NetworkKind { none, wifi, cellular }

/// Why a download can't start.
enum DownloadBlock { offline, needsWifi, storageFull }

/// All saved lesson videos together may use at most this much space (each copy is the low rendition when there is one).
const defaultDownloadBudgetBytes = 2 * 1024 * 1024 * 1024;

/// Pure: may a download start? Wi-Fi only (the default) refuses mobile data; the budget counts what is saved already
/// plus the expected size when known.
DownloadBlock? downloadBlock({
  required NetworkKind network,
  required bool wifiOnly,
  required int usedBytes,
  int? expectedBytes,
  int budgetBytes = defaultDownloadBudgetBytes,
}) {
  if (network == NetworkKind.none) return DownloadBlock.offline;
  if (wifiOnly && network != NetworkKind.wifi) return DownloadBlock.needsWifi;
  if (usedBytes >= budgetBytes) return DownloadBlock.storageFull;
  if (expectedBytes != null && usedBytes + expectedBytes > budgetBytes) return DownloadBlock.storageFull;
  return null;
}

/// Pure: a saved copy plays offline until its `offlineUntil` (the plan's end, at most 30 days after the last online check).
bool isPlayableOffline(DownloadEntry e, DateTime now) => now.isBefore(e.offlineUntil);

/// Pure: the result of the online launch check — entries to keep (with renewed windows) and lessons whose files go.
({List<DownloadEntry> keep, List<String> remove}) reconcileDownloads(List<DownloadEntry> entries, List<DownloadStatusItem> status) {
  final byId = {for (final s in status) s.lessonId: s};
  final keep = <DownloadEntry>[];
  final remove = <String>[];
  for (final e in entries) {
    final s = byId[e.lessonId];
    // Not in the answer: leave it as it is until the next check.
    if (s == null) {
      keep.add(e);
    } else if (!s.allowed) {
      remove.add(e.lessonId);
    } else {
      keep.add(e.copyWith(offlineUntil: s.offlineUntil ?? e.offlineUntil, accessUntil: s.accessUntil));
    }
  }
  return (keep: keep, remove: remove);
}

/// Pure: which URL the in-app player opens.
/// 1. A saved copy that may still play offline (the local file);
/// 2. data saver: the lowest MP4 rendition, which `video_player` can't pick out of an HLS playlist itself;
/// 3. a ready HLS stream (adaptive: the platform player switches renditions);
/// 4. the uploaded file.
String pickLessonVideoUrl({required String fileUrl, LessonPlayback? playback, bool dataSaver = false, String? offlinePath}) {
  if (offlinePath != null) return Uri.file(offlinePath).toString();
  if (playback != null && playback.ready) {
    if (dataSaver && playback.lowMp4Url != null) return playback.lowMp4Url!;
    if (playback.hlsUrl != null) return playback.hlsUrl!;
  }
  return fileUrl;
}

/// Pure: total bytes used by saved copies.
int usedDownloadBytes(Iterable<DownloadEntry> entries) => entries.fold(0, (t, e) => t + e.bytes);

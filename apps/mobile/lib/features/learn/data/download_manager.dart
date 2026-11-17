import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

import '../../../core/prefs/app_prefs.dart';
import '../../auth/presentation/auth_controller.dart';
import '../domain/download_policy.dart';
import '../domain/lesson_media_models.dart';
import 'lesson_media_repository.dart';

// ───────── Ports (fakes in tests) ─────────

/// Where the list of saved lessons is kept.
abstract class DownloadStore {
  List<DownloadEntry> load();
  Future<void> save(List<DownloadEntry> entries);
}

class PrefsDownloadStore implements DownloadStore {
  PrefsDownloadStore(this._read);
  final String? Function() _read;
  late final Future<void> Function(String) write;
  static const key = 'azza.downloads.v1';

  @override
  List<DownloadEntry> load() {
    final raw = _read();
    if (raw == null || raw.isEmpty) return const [];
    try {
      return (jsonDecode(raw) as List).whereType<Map<dynamic, dynamic>>().map((m) => DownloadEntry.fromJson(m.cast<String, dynamic>())).toList();
    } catch (_) {
      return const [];
    }
  }

  @override
  Future<void> save(List<DownloadEntry> entries) => write(jsonEncode(entries.map((e) => e.toJson()).toList()));
}

/// The folder the video files live in.
abstract class DownloadFiles {
  Future<String> pathOf(String fileName);
  Future<void> delete(String fileName);
  Future<bool> exists(String fileName);
}

class AppDocumentsDownloadFiles implements DownloadFiles {
  Future<Directory> _dir() async {
    final base = await getApplicationSupportDirectory();
    final dir = Directory('${base.path}/lesson_downloads');
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir;
  }

  @override
  Future<String> pathOf(String fileName) async => '${(await _dir()).path}/$fileName';

  @override
  Future<void> delete(String fileName) async {
    final f = File(await pathOf(fileName));
    if (await f.exists()) await f.delete();
  }

  @override
  Future<bool> exists(String fileName) async => File(await pathOf(fileName)).exists();
}

/// Fetches one file to a path. Throws [DownloadTooLarge] past [maxBytes].
abstract class FileDownloader {
  Future<int> download(String url, String path, {required int maxBytes, void Function(double progress)? onProgress, CancelToken? cancel});
}

class DownloadTooLarge implements Exception {
  const DownloadTooLarge();
}

/// A bare Dio: the signed URL needs no session, and the bearer token must never reach the CDN.
class DioFileDownloader implements FileDownloader {
  DioFileDownloader([Dio? dio]) : _dio = dio ?? Dio(BaseOptions(connectTimeout: const Duration(seconds: 20), receiveTimeout: const Duration(minutes: 2)));
  final Dio _dio;

  @override
  Future<int> download(String url, String path, {required int maxBytes, void Function(double progress)? onProgress, CancelToken? cancel}) async {
    final token = cancel ?? CancelToken();
    var tooLarge = false;
    try {
      await _dio.download(url, path, cancelToken: token, deleteOnError: true, onReceiveProgress: (got, total) {
        if (got > maxBytes || (total > 0 && total > maxBytes)) {
          tooLarge = true;
          token.cancel('too large');
          return;
        }
        if (total > 0) onProgress?.call(got / total);
      });
    } on DioException catch (e) {
      if (tooLarge && CancelToken.isCancel(e)) throw const DownloadTooLarge();
      rethrow;
    }
    return File(path).length();
  }
}

abstract class NetworkProbe {
  Future<NetworkKind> current();
}

class ConnectivityNetworkProbe implements NetworkProbe {
  @override
  Future<NetworkKind> current() async {
    final kinds = await Connectivity().checkConnectivity();
    if (kinds.contains(ConnectivityResult.wifi) || kinds.contains(ConnectivityResult.ethernet)) return NetworkKind.wifi;
    if (kinds.contains(ConnectivityResult.mobile) || kinds.contains(ConnectivityResult.vpn) || kinds.contains(ConnectivityResult.other)) return NetworkKind.cellular;
    return NetworkKind.none;
  }
}

final downloadStoreProvider = Provider<DownloadStore>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  return PrefsDownloadStore(() => prefs.getString(PrefsDownloadStore.key))..write = (v) => prefs.setString(PrefsDownloadStore.key, v);
});
final downloadFilesProvider = Provider<DownloadFiles>((ref) => AppDocumentsDownloadFiles());
final fileDownloaderProvider = Provider<FileDownloader>((ref) => DioFileDownloader());
final networkProbeProvider = Provider<NetworkProbe>((ref) => ConnectivityNetworkProbe());
/// The space all saved lessons may use together.
final downloadBudgetProvider = Provider<int>((ref) => defaultDownloadBudgetBytes);

// ───────── Manager ─────────

@immutable
class DownloadsState {
  const DownloadsState({this.entries = const [], this.active = const {}});

  /// The signed-in account's saved lessons, newest first.
  final List<DownloadEntry> entries;

  /// Lessons being downloaded → progress 0–1 (0 while the size is unknown).
  final Map<String, double> active;

  DownloadEntry? entry(String lessonId) => entries.where((e) => e.lessonId == lessonId).firstOrNull;
  int get usedBytes => usedDownloadBytes(entries);
}

/// Why [DownloadManager.start] did not save the lesson.
class DownloadFailure implements Exception {
  const DownloadFailure(this.block, [this.cause]);
  final DownloadBlock? block;
  final Object? cause;
}

/// Saves lesson videos for offline viewing, lists and deletes them, and drops the ones whose access ended.
/// - Starts only on Wi-Fi unless the learner allowed mobile data; refuses past the storage budget.
/// - The link comes from `POST /lessons/:id/download` (access-checked, 15 minutes) and is fetched without the session.
/// - [syncOnLaunch] asks the API on the next online launch which copies may stay; the rest are deleted. A copy past its
///   `offlineUntil` doesn't play until that check renews it.
class DownloadManager extends Notifier<DownloadsState> {
  final _cancels = <String, CancelToken>{};

  String? get _userId => ref.read(currentUserProvider)?.id;

  @override
  DownloadsState build() {
    final userId = ref.watch(currentUserProvider.select((u) => u?.id));
    if (userId == null) return const DownloadsState();
    final mine = ref.read(downloadStoreProvider).load().where((e) => e.userId == userId).toList()
      ..sort((a, b) => b.downloadedAt.compareTo(a.downloadedAt));
    return DownloadsState(entries: mine);
  }

  Future<void> _persist(List<DownloadEntry> mine) async {
    final store = ref.read(downloadStoreProvider);
    final others = store.load().where((e) => e.userId != _userId);
    await store.save([...others, ...mine]);
  }

  /// Downloads [lessonId]. Throws [DownloadFailure] (with the [DownloadBlock] when a rule stopped it).
  Future<void> start({required String lessonId, required String courseId, required String titleEn, String? titleAr}) async {
    final userId = _userId;
    if (userId == null || state.active.containsKey(lessonId) || state.entry(lessonId) != null) return;
    final budget = ref.read(downloadBudgetProvider);
    final block = downloadBlock(
      network: await ref.read(networkProbeProvider).current(),
      wifiOnly: ref.read(downloadsWifiOnlyProvider),
      usedBytes: state.usedBytes,
      budgetBytes: budget,
    );
    if (block != null) throw DownloadFailure(block);
    state = DownloadsState(entries: state.entries, active: {...state.active, lessonId: 0});
    final files = ref.read(downloadFilesProvider);
    final fileName = '${lessonId.replaceAll(RegExp(r'[^A-Za-z0-9_-]'), '_')}.mp4';
    final cancel = _cancels[lessonId] = CancelToken();
    try {
      final ticket = await ref.read(lessonMediaRepositoryProvider).requestDownload(lessonId);
      final bytes = await ref.read(fileDownloaderProvider).download(
            ticket.url,
            await files.pathOf(fileName),
            maxBytes: budget - state.usedBytes,
            cancel: cancel,
            onProgress: (p) {
              if (state.active.containsKey(lessonId)) state = DownloadsState(entries: state.entries, active: {...state.active, lessonId: p});
            },
          );
      final entry = DownloadEntry(
        lessonId: lessonId,
        courseId: courseId,
        titleEn: titleEn,
        titleAr: titleAr,
        fileName: fileName,
        bytes: bytes,
        downloadedAt: DateTime.now(),
        offlineUntil: ticket.offlineUntil,
        accessUntil: ticket.accessUntil,
        quality: ticket.quality,
        durationSec: ticket.durationSec,
        userId: userId,
      );
      final entries = [entry, ...state.entries];
      state = DownloadsState(entries: entries, active: {...state.active}..remove(lessonId));
      await _persist(entries);
    } catch (e) {
      state = DownloadsState(entries: state.entries, active: {...state.active}..remove(lessonId));
      unawaited(files.delete(fileName).catchError((_) {}));
      if (e is DioException && CancelToken.isCancel(e)) return; // the learner cancelled
      if (e is DownloadTooLarge || (e is FileSystemException && e.osError?.errorCode == 28)) throw DownloadFailure(DownloadBlock.storageFull, e);
      throw DownloadFailure(null, e);
    } finally {
      _cancels.remove(lessonId);
    }
  }

  void cancel(String lessonId) => _cancels[lessonId]?.cancel('cancelled');

  Future<void> delete(String lessonId) async {
    final e = state.entry(lessonId);
    if (e == null) return;
    await ref.read(downloadFilesProvider).delete(e.fileName).catchError((_) {});
    final entries = state.entries.where((x) => x.lessonId != lessonId).toList();
    state = DownloadsState(entries: entries, active: state.active);
    await _persist(entries);
  }

  /// The local file to play, or null when there is none or it may no longer play offline.
  Future<String?> playablePath(String lessonId, {DateTime? now}) async {
    final e = state.entry(lessonId);
    if (e == null || !isPlayableOffline(e, now ?? DateTime.now())) return null;
    final files = ref.read(downloadFilesProvider);
    if (!await files.exists(e.fileName)) return null;
    return files.pathOf(e.fileName);
  }

  Future<void> savePosition(String lessonId, int sec) async {
    final e = state.entry(lessonId);
    if (e == null) return;
    final entries = [for (final x in state.entries) x.lessonId == lessonId ? x.copyWith(positionSec: sec) : x];
    state = DownloadsState(entries: entries, active: state.active);
    await _persist(entries);
  }

  /// On launch, when online and signed in: drop copies the learner may no longer read, renew the others.
  Future<int> syncOnLaunch() async {
    if (_userId == null || state.entries.isEmpty) return 0;
    if (await ref.read(networkProbeProvider).current() == NetworkKind.none) return 0;
    final List<DownloadStatusItem> status;
    try {
      status = await ref.read(lessonMediaRepositoryProvider).downloadStatus(state.entries.map((e) => e.lessonId).toList());
    } catch (_) {
      return 0; // next launch
    }
    final r = reconcileDownloads(state.entries, status);
    final files = ref.read(downloadFilesProvider);
    for (final id in r.remove) {
      final e = state.entry(id);
      if (e != null) await files.delete(e.fileName).catchError((_) {});
    }
    state = DownloadsState(entries: r.keep, active: state.active);
    await _persist(r.keep);
    return r.remove.length;
  }
}

final downloadManagerProvider = NotifierProvider<DownloadManager, DownloadsState>(DownloadManager.new);

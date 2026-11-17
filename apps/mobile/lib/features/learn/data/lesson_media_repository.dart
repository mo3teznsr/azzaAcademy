import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/providers.dart';
import '../../../core/utils/json.dart';
import '../domain/lesson_media_models.dart';

/// Streaming and offline downloads of lesson videos.
abstract class LessonMediaRepository {
  /// `GET /lessons/:id` → the saved position, the signed stream URLs and `downloadable`.
  Future<LessonPlayback> playback(String lessonId);

  /// `POST /lessons/:id/download` → a 15-minute link to the smallest file (access-checked by the API).
  Future<DownloadTicket> requestDownload(String lessonId);

  /// `POST /me/lesson-downloads/status` → which saved lessons may stay (checked on the next online launch).
  Future<List<DownloadStatusItem>> downloadStatus(List<String> lessonIds);
}

class DioLessonMediaRepository extends DioRepository implements LessonMediaRepository {
  DioLessonMediaRepository(super.dio);

  @override
  Future<LessonPlayback> playback(String lessonId) async => LessonPlayback.fromJson(await getJson('/api/v1/lessons/${Uri.encodeComponent(lessonId)}'));

  @override
  Future<DownloadTicket> requestDownload(String lessonId) async =>
      DownloadTicket.fromJson(await postJson('/api/v1/lessons/${Uri.encodeComponent(lessonId)}/download'));

  @override
  Future<List<DownloadStatusItem>> downloadStatus(List<String> lessonIds) async =>
      list(await postJson('/api/v1/me/lesson-downloads/status', {'lessonIds': lessonIds}), 'items').map(DownloadStatusItem.fromJson).toList();
}

final lessonMediaRepositoryProvider = Provider<LessonMediaRepository>((ref) => DioLessonMediaRepository(ref.watch(dioProvider)));

/// One lesson's playback info for the in-app player.
final lessonPlaybackProvider = FutureProvider.autoDispose.family<LessonPlayback, String>(
  (ref, lessonId) => ref.watch(lessonMediaRepositoryProvider).playback(lessonId),
);

abstract final class _Keys {
  static const dataSaver = 'azza.data_saver';
  static const wifiOnly = 'azza.downloads_wifi_only';
}

/// Data saver: lesson videos play the lowest rendition. Remembered on this device.
class DataSaverController extends Notifier<bool> {
  @override
  bool build() => ref.watch(sharedPreferencesProvider).getBool(_Keys.dataSaver) ?? false;

  Future<void> set(bool on) async {
    state = on;
    await ref.read(sharedPreferencesProvider).setBool(_Keys.dataSaver, on);
  }
}

final dataSaverProvider = NotifierProvider<DataSaverController, bool>(DataSaverController.new);

/// Downloads wait for Wi-Fi unless the learner allows mobile data (on by default).
class WifiOnlyController extends Notifier<bool> {
  @override
  bool build() => ref.watch(sharedPreferencesProvider).getBool(_Keys.wifiOnly) ?? true;

  Future<void> set(bool on) async {
    state = on;
    await ref.read(sharedPreferencesProvider).setBool(_Keys.wifiOnly, on);
  }
}

final downloadsWifiOnlyProvider = NotifierProvider<WifiOnlyController, bool>(WifiOnlyController.new);

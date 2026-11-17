import 'package:azza/core/prefs/app_prefs.dart';
import 'package:azza/features/auth/presentation/auth_controller.dart';
import 'package:azza/features/learn/data/download_manager.dart';
import 'package:azza/features/learn/data/lesson_media_repository.dart';
import 'package:azza/features/learn/domain/download_policy.dart';
import 'package:azza/features/learn/domain/lesson_media_models.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/fakes.dart' show student, teacher;

DownloadEntry entry(String id, {int bytes = 100, DateTime? until, String? userId = 'u-s'}) => DownloadEntry(
      lessonId: id,
      courseId: 'c1',
      titleEn: 'Lesson $id',
      fileName: '$id.mp4',
      bytes: bytes,
      downloadedAt: DateTime.utc(2026, 11, 1),
      offlineUntil: until ?? DateTime.utc(2026, 12, 1),
      userId: userId,
    );

void main() {
  group('download policy', () {
    test('Wi-Fi only by default refuses mobile data; offline never starts', () {
      expect(downloadBlock(network: NetworkKind.none, wifiOnly: false, usedBytes: 0), DownloadBlock.offline);
      expect(downloadBlock(network: NetworkKind.cellular, wifiOnly: true, usedBytes: 0), DownloadBlock.needsWifi);
      expect(downloadBlock(network: NetworkKind.cellular, wifiOnly: false, usedBytes: 0), isNull);
      expect(downloadBlock(network: NetworkKind.wifi, wifiOnly: true, usedBytes: 0), isNull);
    });

    test('the storage budget counts what is saved and the expected size', () {
      expect(downloadBlock(network: NetworkKind.wifi, wifiOnly: true, usedBytes: 900, budgetBytes: 1000), isNull);
      expect(downloadBlock(network: NetworkKind.wifi, wifiOnly: true, usedBytes: 900, expectedBytes: 200, budgetBytes: 1000), DownloadBlock.storageFull);
      expect(downloadBlock(network: NetworkKind.wifi, wifiOnly: true, usedBytes: 1000, budgetBytes: 1000), DownloadBlock.storageFull);
    });

    test('a copy plays offline until offlineUntil', () {
      final e = entry('l1', until: DateTime.utc(2026, 11, 20));
      expect(isPlayableOffline(e, DateTime.utc(2026, 11, 19)), isTrue);
      expect(isPlayableOffline(e, DateTime.utc(2026, 11, 20)), isFalse);
    });

    test('the launch check removes lapsed lessons, renews the others and leaves unknown ones', () {
      final renewed = DateTime.utc(2027, 1, 1);
      final r = reconcileDownloads(
        [entry('ok'), entry('lapsed'), entry('unchecked')],
        [DownloadStatusItem(lessonId: 'ok', allowed: true, offlineUntil: renewed), const DownloadStatusItem(lessonId: 'lapsed', allowed: false)],
      );
      expect(r.remove, ['lapsed']);
      expect(r.keep.map((e) => e.lessonId), ['ok', 'unchecked']);
      expect(r.keep.first.offlineUntil, renewed);
    });

    test('player source: saved copy, then data saver low MP4, then HLS, then the file', () {
      const ready = LessonPlayback(status: LessonStreamStatus.ready, hlsUrl: 'https://cdn/x/playlist.m3u8', lowMp4Url: 'https://cdn/x/play_240p.mp4');
      expect(pickLessonVideoUrl(fileUrl: 'https://f/v.mp4', playback: ready, offlinePath: '/data/l1.mp4'), 'file:///data/l1.mp4');
      expect(pickLessonVideoUrl(fileUrl: 'https://f/v.mp4', playback: ready, dataSaver: true), 'https://cdn/x/play_240p.mp4');
      expect(pickLessonVideoUrl(fileUrl: 'https://f/v.mp4', playback: ready), 'https://cdn/x/playlist.m3u8');
      expect(pickLessonVideoUrl(fileUrl: 'https://f/v.mp4', playback: const LessonPlayback(status: LessonStreamStatus.processing)), 'https://f/v.mp4');
      expect(pickLessonVideoUrl(fileUrl: 'https://f/v.mp4', dataSaver: true), 'https://f/v.mp4');
    });

    test('playback and entries parse from JSON and round-trip', () {
      final pb = LessonPlayback.fromJson({
        'videoPositionSec': 42,
        'downloadable': true,
        'stream': {'status': 'READY', 'hlsUrl': 'h', 'lowMp4Url': 'l', 'durationSec': 300},
      });
      expect(pb.ready, isTrue);
      expect(pb.positionSec, 42);
      expect(pb.lowMp4Url, 'l');
      final e = entry('l1');
      expect(DownloadEntry.fromJson(e.toJson()).toJson(), e.toJson());
    });
  });

  group('DownloadManager', () {
    late _Store store;
    late _Files files;
    late _Media media;
    late _Net net;

    Future<ProviderContainer> make({List<DownloadEntry> saved = const [], user = student}) async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      store = _Store([...saved]);
      files = _Files();
      media = _Media();
      net = _Net();
      final c = ProviderContainer(overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        currentUserProvider.overrideWithValue(user),
        downloadStoreProvider.overrideWithValue(store),
        downloadFilesProvider.overrideWithValue(files),
        fileDownloaderProvider.overrideWithValue(_Downloader()),
        networkProbeProvider.overrideWithValue(net),
        lessonMediaRepositoryProvider.overrideWithValue(media),
        downloadBudgetProvider.overrideWithValue(1000),
      ]);
      addTearDown(c.dispose);
      return c;
    }

    test("lists only the signed-in account's downloads", () async {
      final c = await make(saved: [entry('mine'), entry('theirs', userId: 'u-t')]);
      expect(c.read(downloadManagerProvider).entries.map((e) => e.lessonId), ['mine']);
      final t = await make(saved: [entry('mine'), entry('theirs', userId: 'u-t')], user: teacher);
      expect(t.read(downloadManagerProvider).entries.map((e) => e.lessonId), ['theirs']);
    });

    test('downloads on Wi-Fi with the access-checked link and saves the entry', () async {
      final c = await make();
      await c.read(downloadManagerProvider.notifier).start(lessonId: 'l1', courseId: 'c1', titleEn: 'One');
      final e = c.read(downloadManagerProvider).entry('l1')!;
      expect(e.bytes, 300);
      expect(e.quality, 'low');
      expect(media.requested, ['l1']);
      expect(store.saved.single.lessonId, 'l1');
    });

    test('refuses mobile data by default', () async {
      final c = await make();
      net.kind = NetworkKind.cellular;
      await expectLater(
        c.read(downloadManagerProvider.notifier).start(lessonId: 'l1', courseId: 'c1', titleEn: 'One'),
        throwsA(isA<DownloadFailure>().having((f) => f.block, 'block', DownloadBlock.needsWifi)),
      );
      expect(media.requested, isEmpty);
    });

    test('the launch check deletes lessons whose access ended', () async {
      final c = await make(saved: [entry('ok'), entry('lapsed')]);
      media.status = [const DownloadStatusItem(lessonId: 'ok', allowed: true), const DownloadStatusItem(lessonId: 'lapsed', allowed: false)];
      expect(await c.read(downloadManagerProvider.notifier).syncOnLaunch(), 1);
      expect(c.read(downloadManagerProvider).entries.map((e) => e.lessonId), ['ok']);
      expect(files.deleted, ['lapsed.mp4']);
    });

    test('offline, the launch check waits for the next launch', () async {
      final c = await make(saved: [entry('l1')]);
      net.kind = NetworkKind.none;
      media.status = [const DownloadStatusItem(lessonId: 'l1', allowed: false)];
      expect(await c.read(downloadManagerProvider.notifier).syncOnLaunch(), 0);
      expect(c.read(downloadManagerProvider).entries, hasLength(1));
    });

    test('delete removes the file and the entry', () async {
      final c = await make(saved: [entry('l1')]);
      await c.read(downloadManagerProvider.notifier).delete('l1');
      expect(c.read(downloadManagerProvider).entries, isEmpty);
      expect(files.deleted, ['l1.mp4']);
    });
  });
}

class _Store implements DownloadStore {
  _Store(this.saved);
  List<DownloadEntry> saved;
  @override
  List<DownloadEntry> load() => saved;
  @override
  Future<void> save(List<DownloadEntry> entries) async => saved = entries;
}

class _Files implements DownloadFiles {
  final deleted = <String>[];
  @override
  Future<void> delete(String fileName) async => deleted.add(fileName);
  @override
  Future<bool> exists(String fileName) async => true;
  @override
  Future<String> pathOf(String fileName) async => '/tmp/$fileName';
}

class _Downloader implements FileDownloader {
  @override
  Future<int> download(String url, String path, {required int maxBytes, void Function(double progress)? onProgress, CancelToken? cancel}) async {
    onProgress?.call(1);
    return 300;
  }
}

class _Net implements NetworkProbe {
  NetworkKind kind = NetworkKind.wifi;
  @override
  Future<NetworkKind> current() async => kind;
}

class _Media implements LessonMediaRepository {
  final requested = <String>[];
  List<DownloadStatusItem> status = const [];
  @override
  Future<LessonPlayback> playback(String lessonId) async => const LessonPlayback();
  @override
  Future<DownloadTicket> requestDownload(String lessonId) async {
    requested.add(lessonId);
    return DownloadTicket(url: 'https://cdn/$lessonId.mp4', expiresAt: DateTime.utc(2030), offlineUntil: DateTime.utc(2030), quality: 'low');
  }

  @override
  Future<List<DownloadStatusItem>> downloadStatus(List<String> lessonIds) async => status;
}

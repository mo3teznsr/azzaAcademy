import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../domain/announcement_models.dart';

/// Class and platform announcements (docs/COMMUNICATIONS.md → Announcements).
abstract class AnnouncementsRepository {
  /// Platform announcements for my role plus my classes' announcements, pinned first, then newest.
  Future<AnnouncementsPage> mine({int page = 1});
  Future<AnnouncementsPage> forBatch(String batchId, {int page = 1});

  /// The class teacher or an admin.
  Future<Announcement> postToBatch(String batchId, AnnouncementDraft draft);

  /// Admin only; [AnnouncementDraft.audience] picks who it reaches.
  Future<Announcement> postPlatform(AnnouncementDraft draft);

  /// The author or an admin.
  Future<void> delete(String id);
}

class DioAnnouncementsRepository extends DioRepository implements AnnouncementsRepository {
  DioAnnouncementsRepository(super.dio);

  @override
  Future<AnnouncementsPage> mine({int page = 1}) async =>
      AnnouncementsPage.fromJson(await getJson('/api/v1/me/announcements', query: {'page': page}));

  @override
  Future<AnnouncementsPage> forBatch(String batchId, {int page = 1}) async =>
      AnnouncementsPage.fromJson(await getJson('/api/v1/batches/$batchId/announcements', query: {'page': page}));

  @override
  Future<Announcement> postToBatch(String batchId, AnnouncementDraft draft) async =>
      Announcement.fromJson(await postJson('/api/v1/batches/$batchId/announcements', draft.toJson()));

  @override
  Future<Announcement> postPlatform(AnnouncementDraft draft) async =>
      Announcement.fromJson(await postJson('/api/v1/announcements', draft.toJson()));

  @override
  Future<void> delete(String id) => guard(() => dio.delete<dynamic>('/api/v1/announcements/$id'));
}

final announcementsRepositoryProvider =
    Provider<AnnouncementsRepository>((ref) => DioAnnouncementsRepository(ref.watch(dioProvider)));

final myAnnouncementsProvider = FutureProvider.autoDispose<AnnouncementsPage>((ref) => ref.watch(announcementsRepositoryProvider).mine());

final batchAnnouncementsProvider = FutureProvider.autoDispose.family<AnnouncementsPage, String>(
  (ref, batchId) => ref.watch(announcementsRepositoryProvider).forBatch(batchId),
);

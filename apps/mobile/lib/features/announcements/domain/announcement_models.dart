import 'package:flutter/foundation.dart';

import '../../../core/domain/class_ref.dart';
import '../../../core/domain/enums.dart';
import '../../../core/utils/json.dart';

enum AnnouncementScope { batch, platform }

/// Who a platform announcement reaches.
enum AnnouncementAudience implements WireEnum {
  all('ALL'),
  students('STUDENTS'),
  teachers('TEACHERS');

  const AnnouncementAudience(this.wire);
  @override
  final String wire;
  static AnnouncementAudience parse(Object? raw) => values.where((v) => v.wire == raw).firstOrNull ?? all;
}

/// `GET /me/announcements` and `GET /batches/:id/announcements` item.
@immutable
class Announcement {
  const Announcement({
    required this.id,
    required this.scope,
    required this.title,
    required this.body,
    required this.createdAt,
    this.audience = AnnouncementAudience.all,
    this.batch,
    this.pinned = false,
    this.author,
    this.updatedAt,
  });

  factory Announcement.fromJson(Json j) => Announcement(
        id: str(j, 'id'),
        scope: j['scope'] == 'PLATFORM' ? AnnouncementScope.platform : AnnouncementScope.batch,
        audience: AnnouncementAudience.parse(j['audience']),
        batch: ClassRef.maybe(j, 'batch'),
        title: str(j, 'title'),
        body: str(j, 'body'),
        pinned: boolean(j, 'pinned'),
        author: objOrNull(j, 'author') == null ? null : Person.fromJson(obj(j, 'author')),
        createdAt: dateOr(j, 'createdAt', DateTime.now()),
        updatedAt: date(j, 'updatedAt'),
      );

  final String id;
  final AnnouncementScope scope;
  final AnnouncementAudience audience;

  /// The class it was posted to; null for a platform announcement.
  final ClassRef? batch;
  final String title;

  /// Markdown.
  final String body;
  final bool pinned;
  final Person? author;
  final DateTime createdAt;
  final DateTime? updatedAt;

  bool get isPlatform => scope == AnnouncementScope.platform;
}

@immutable
class AnnouncementsPage {
  const AnnouncementsPage({this.items = const [], this.total = 0});
  factory AnnouncementsPage.fromJson(Json j) {
    final items = list(j, 'items').map(Announcement.fromJson).toList();
    return AnnouncementsPage(items: items, total: j['total'] == null ? items.length : integer(j, 'total'));
  }
  final List<Announcement> items;
  final int total;
}

/// What a teacher (class) or an admin (platform) writes.
@immutable
class AnnouncementDraft {
  const AnnouncementDraft({required this.title, required this.body, this.pinned = false, this.notify = true, this.audience});
  final String title;
  final String body;
  final bool pinned;
  final bool notify;

  /// Platform announcements only.
  final AnnouncementAudience? audience;

  Json toJson() => {'title': title, 'body': body, 'pinned': pinned, 'notify': notify, if (audience != null) 'audience': audience!.wire};
}

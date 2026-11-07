import 'package:flutter/foundation.dart';

import '../../../core/domain/class_ref.dart';
import '../../../core/domain/enums.dart';
import '../../../core/utils/json.dart';

enum ConversationType implements WireEnum {
  classChat('CLASS'),
  direct('DIRECT');

  const ConversationType(this.wire);
  @override
  final String wire;
  static ConversationType parse(Object? raw) => raw == 'DIRECT' ? direct : classChat;
}

/// `lastMessage` on a conversation row.
@immutable
class LastMessage {
  const LastMessage({required this.body, required this.senderName, required this.createdAt});
  factory LastMessage.fromJson(Json j) =>
      LastMessage(body: str(j, 'body'), senderName: str(j, 'senderName'), createdAt: dateOr(j, 'createdAt', DateTime.now()));
  final String body;
  final String senderName;
  final DateTime createdAt;
}

/// `GET /me/conversations` item (also `GET /batches/:id/conversation` and `POST /batches/:id/dm`).
@immutable
class Conversation {
  const Conversation({
    required this.id,
    required this.type,
    required this.batch,
    this.counterpart,
    this.lastMessage,
    this.lastMessageAt,
    this.createdAt,
    this.unread = 0,
    this.closed = false,
  });

  factory Conversation.fromJson(Json j) => Conversation(
        id: str(j, 'id'),
        type: ConversationType.parse(j['type']),
        batch: ClassRef.fromJson(obj(j, 'batch')),
        counterpart: objOrNull(j, 'counterpart') == null ? null : Person.fromJson(obj(j, 'counterpart')),
        lastMessage: objOrNull(j, 'lastMessage') == null ? null : LastMessage.fromJson(obj(j, 'lastMessage')),
        lastMessageAt: date(j, 'lastMessageAt'),
        createdAt: date(j, 'createdAt'),
        unread: integer(j, 'unread'),
        closed: boolean(j, 'closed'),
      );

  final String id;
  final ConversationType type;
  final ClassRef batch;

  /// The other person in a private chat; null for a class chat.
  final Person? counterpart;
  final LastMessage? lastMessage;
  final DateTime? lastMessageAt;
  final DateTime? createdAt;
  final int unread;

  /// The class has ended: the chat is read-only.
  final bool closed;

  bool get isClass => type == ConversationType.classChat;
  DateTime get activityAt => lastMessageAt ?? lastMessage?.createdAt ?? createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);

  Conversation copyWith({int? unread, LastMessage? lastMessage, DateTime? lastMessageAt, bool? closed}) => Conversation(
        id: id,
        type: type,
        batch: batch,
        counterpart: counterpart,
        lastMessage: lastMessage ?? this.lastMessage,
        lastMessageAt: lastMessageAt ?? this.lastMessageAt,
        createdAt: createdAt,
        unread: unread ?? this.unread,
        closed: closed ?? this.closed,
      );
}

@immutable
class ConversationsOverview {
  const ConversationsOverview({this.items = const [], this.unreadTotal = 0});

  factory ConversationsOverview.fromJson(Json j) {
    final items = list(j, 'items').map(Conversation.fromJson).toList();
    return ConversationsOverview(
      items: items,
      unreadTotal: j['unreadTotal'] == null ? items.fold(0, (s, c) => s + c.unread) : integer(j, 'unreadTotal'),
    );
  }

  final List<Conversation> items;
  final int unreadTotal;

  Conversation? byId(String id) => items.where((c) => c.id == id).firstOrNull;

  /// Recomputes [unreadTotal] and keeps the most recent activity first.
  ConversationsOverview withItems(List<Conversation> next) {
    final sorted = [...next]..sort((a, b) => b.activityAt.compareTo(a.activityAt));
    return ConversationsOverview(items: sorted, unreadTotal: sorted.fold(0, (s, c) => s + c.unread));
  }
}

/// A message in a conversation thread. [pending] and [failed] are client-only (optimistic sends).
@immutable
class ThreadMessage {
  const ThreadMessage({
    required this.id,
    required this.sender,
    required this.body,
    required this.createdAt,
    this.deleted = false,
    this.pending = false,
    this.failed = false,
  });

  factory ThreadMessage.fromJson(Json j) => ThreadMessage(
        id: str(j, 'id'),
        sender: Person.fromJson(obj(j, 'sender')),
        body: str(j, 'body'),
        createdAt: dateOr(j, 'createdAt', DateTime.now()),
        deleted: boolean(j, 'deleted'),
      );

  final String id;
  final Person sender;
  final String body;
  final DateTime createdAt;
  final bool deleted;
  final bool pending;
  final bool failed;

  ThreadMessage asDeleted() => ThreadMessage(id: id, sender: sender, body: '', createdAt: createdAt, deleted: true);
  ThreadMessage asFailed() => ThreadMessage(id: id, sender: sender, body: body, createdAt: createdAt, pending: false, failed: true);
}

@immutable
class MessagesPage {
  const MessagesPage({this.items = const [], this.hasMore = false});
  factory MessagesPage.fromJson(Json j) =>
      MessagesPage(items: list(j, 'items').map(ThreadMessage.fromJson).toList(), hasMore: boolean(j, 'hasMore'));

  /// Oldest first (newest last), as the API sends them.
  final List<ThreadMessage> items;
  final bool hasMore;
}

import 'package:flutter/foundation.dart';

import '../../../core/domain/class_ref.dart';
import '../../../core/domain/enums.dart';
import '../../../core/utils/json.dart';

enum SupportCategory implements WireEnum {
  payment('PAYMENT'),
  classIssue('CLASS'),
  account('ACCOUNT'),
  technical('TECHNICAL'),
  other('OTHER');

  const SupportCategory(this.wire);
  @override
  final String wire;
  static SupportCategory parse(Object? raw) => values.where((v) => v.wire == raw).firstOrNull ?? other;
}

enum SupportStatus implements WireEnum {
  open('OPEN'),
  awaitingUser('AWAITING_USER'),
  resolved('RESOLVED');

  const SupportStatus(this.wire);
  @override
  final String wire;
  static SupportStatus parse(Object? raw) => values.where((v) => v.wire == raw).firstOrNull ?? open;
}

@immutable
class TicketUser {
  const TicketUser({required this.id, required this.name, this.email = ''});
  factory TicketUser.fromJson(Json j) => TicketUser(id: str(j, 'id'), name: str(j, 'name'), email: str(j, 'email'));
  final String id;
  final String name;
  final String email;
}

/// `GET /support/tickets` item.
@immutable
class TicketSummary {
  const TicketSummary({
    required this.id,
    required this.subject,
    required this.category,
    required this.status,
    required this.lastMessageAt,
    this.user,
    this.assigneeId,
    this.createdAt,
    this.unreadForMe = false,
  });

  factory TicketSummary.fromJson(Json j) => TicketSummary(
        id: str(j, 'id'),
        subject: str(j, 'subject'),
        category: SupportCategory.parse(j['category']),
        status: SupportStatus.parse(j['status']),
        user: objOrNull(j, 'user') == null ? null : TicketUser.fromJson(obj(j, 'user')),
        assigneeId: strOrNull(j, 'assigneeId'),
        createdAt: date(j, 'createdAt'),
        lastMessageAt: date(j, 'lastMessageAt') ?? date(j, 'updatedAt') ?? date(j, 'createdAt') ?? DateTime.now(),
        unreadForMe: boolean(j, 'unreadForMe'),
      );

  final String id;
  final String subject;
  final SupportCategory category;
  final SupportStatus status;
  final TicketUser? user;
  final String? assigneeId;
  final DateTime? createdAt;
  final DateTime lastMessageAt;

  /// The other side wrote last (staff, for the owner; the owner, for admins).
  final bool unreadForMe;
}

@immutable
class TicketsPage {
  const TicketsPage({this.items = const [], this.total = 0});
  factory TicketsPage.fromJson(Json j) {
    final items = list(j, 'items').map(TicketSummary.fromJson).toList();
    return TicketsPage(items: items, total: j['total'] == null ? items.length : integer(j, 'total'));
  }
  final List<TicketSummary> items;
  final int total;
}

@immutable
class SupportMessage {
  const SupportMessage({required this.id, required this.authorId, required this.body, required this.createdAt, this.author, this.fromStaff = false});
  factory SupportMessage.fromJson(Json j) {
    final author = objOrNull(j, 'author') == null ? null : Person.fromJson(obj(j, 'author'));
    return SupportMessage(
      id: str(j, 'id'),
      authorId: str(j, 'authorId', author?.id ?? ''),
      author: author,
      body: str(j, 'body'),
      fromStaff: boolean(j, 'fromStaff'),
      createdAt: dateOr(j, 'createdAt', DateTime.now()),
    );
  }
  final String id;
  final String authorId;
  final Person? author;
  final String body;
  final bool fromStaff;
  final DateTime createdAt;
}

/// The order a ticket is about: `{ id, reference, status, totalFils, createdAt }`.
@immutable
class TicketOrder {
  const TicketOrder({required this.id, required this.reference, required this.status, this.totalFils = 0});
  factory TicketOrder.fromJson(Json j) =>
      TicketOrder(id: str(j, 'id'), reference: str(j, 'reference'), status: OrderStatus.parse(j['status']), totalFils: integer(j, 'totalFils'));
  final String id;
  final String reference;
  final OrderStatus status;
  final int totalFils;
}

/// `GET /support/tickets/:id` (also what creating, replying and updating return).
@immutable
class TicketDetail {
  const TicketDetail({required this.summary, this.messages = const [], this.order, this.batch});

  factory TicketDetail.fromJson(Json j) => TicketDetail(
        summary: TicketSummary.fromJson(j),
        messages: list(j, 'messages').map(SupportMessage.fromJson).toList(),
        order: objOrNull(j, 'order') == null ? null : TicketOrder.fromJson(obj(j, 'order')),
        batch: ClassRef.maybe(j, 'batch'),
      );

  final TicketSummary summary;

  /// Oldest first.
  final List<SupportMessage> messages;
  final TicketOrder? order;
  final ClassRef? batch;

  String get id => summary.id;
  SupportStatus get status => summary.status;
}

@immutable
class TicketDraft {
  const TicketDraft({required this.subject, required this.category, required this.body, this.orderId, this.batchId});
  final String subject;
  final SupportCategory category;
  final String body;
  final String? orderId;
  final String? batchId;

  Json toJson() => {'subject': subject, 'category': category.wire, 'body': body, 'orderId': ?orderId, 'batchId': ?batchId};
}

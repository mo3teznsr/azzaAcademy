import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../domain/support_models.dart';

/// Support tickets (docs/COMMUNICATIONS.md → Support). Owners see their own tickets; admins see all.
abstract class SupportRepository {
  Future<TicketsPage> tickets({SupportStatus? status, SupportCategory? category, int page = 1});
  Future<TicketDetail> ticket(String id);
  Future<TicketDetail> open(TicketDraft draft);
  Future<TicketDetail> reply(String id, String body);

  /// Admins may set any status; an owner may only mark their ticket resolved.
  Future<TicketDetail> setStatus(String id, SupportStatus status);
}

class DioSupportRepository extends DioRepository implements SupportRepository {
  DioSupportRepository(super.dio);

  @override
  Future<TicketsPage> tickets({SupportStatus? status, SupportCategory? category, int page = 1}) async =>
      TicketsPage.fromJson(await getJson('/api/v1/support/tickets', query: {
        'page': page,
        'status': ?status?.wire,
        'category': ?category?.wire,
      }));

  @override
  Future<TicketDetail> ticket(String id) async => TicketDetail.fromJson(await getJson('/api/v1/support/tickets/$id'));

  @override
  Future<TicketDetail> open(TicketDraft draft) async => TicketDetail.fromJson(await postJson('/api/v1/support/tickets', draft.toJson()));

  @override
  Future<TicketDetail> reply(String id, String body) async =>
      TicketDetail.fromJson(await postJson('/api/v1/support/tickets/$id/messages', {'body': body}));

  @override
  Future<TicketDetail> setStatus(String id, SupportStatus status) async =>
      TicketDetail.fromJson(await patchJson('/api/v1/support/tickets/$id', {'status': status.wire}));
}

final supportRepositoryProvider = Provider<SupportRepository>((ref) => DioSupportRepository(ref.watch(dioProvider)));

/// A filter on the tickets list (both null = everything).
typedef TicketFilter = ({SupportStatus? status, SupportCategory? category});

final ticketsProvider = FutureProvider.autoDispose.family<TicketsPage, TicketFilter>(
  (ref, f) => ref.watch(supportRepositoryProvider).tickets(status: f.status, category: f.category),
);

/// Open tickets waiting for the team (the admin badge).
final openTicketsCountProvider = FutureProvider.autoDispose<int>(
  (ref) async => (await ref.watch(supportRepositoryProvider).tickets(status: SupportStatus.open)).total,
);

final ticketProvider = FutureProvider.autoDispose.family<TicketDetail, String>((ref, id) => ref.watch(supportRepositoryProvider).ticket(id));

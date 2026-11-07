import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/realtime/socket_events.dart';
import '../../../core/utils/json.dart';
import '../domain/chat_models.dart';

/// Class chats and private student ↔ teacher chats (docs/COMMUNICATIONS.md → Chat).
abstract class ChatRepository {
  Future<ConversationsOverview> conversations();

  /// The class's group chat (created if missing).
  Future<Conversation> classConversation(String batchId);

  /// A student's private chat with the class teacher (created if missing).
  Future<Conversation> openDirect(String batchId);

  /// Newest last; [before] pages back through history.
  Future<MessagesPage> messages(String conversationId, {DateTime? before, int limit = 50});
  Future<ThreadMessage> send(String conversationId, String body);
  Future<void> markRead(String conversationId);
  Future<void> deleteMessage(String messageId);
}

class DioChatRepository extends DioRepository implements ChatRepository {
  DioChatRepository(super.dio);

  @override
  Future<ConversationsOverview> conversations() async => ConversationsOverview.fromJson(await getJson('/api/v1/me/conversations'));

  @override
  Future<Conversation> classConversation(String batchId) async =>
      Conversation.fromJson(await getJson('/api/v1/batches/$batchId/conversation'));

  @override
  Future<Conversation> openDirect(String batchId) async => Conversation.fromJson(await postJson('/api/v1/batches/$batchId/dm'));

  @override
  Future<MessagesPage> messages(String conversationId, {DateTime? before, int limit = 50}) async =>
      MessagesPage.fromJson(await getJson('/api/v1/conversations/$conversationId/messages', query: {
        'limit': limit,
        if (before != null) 'before': before.toUtc().toIso8601String(),
      }));

  @override
  Future<ThreadMessage> send(String conversationId, String body) async =>
      ThreadMessage.fromJson(await postJson('/api/v1/conversations/$conversationId/messages', {'body': body}));

  @override
  Future<void> markRead(String conversationId) => postJson('/api/v1/conversations/$conversationId/read');

  @override
  Future<void> deleteMessage(String messageId) => guard(() => dio.delete<dynamic>('/api/v1/messages/$messageId'));
}

final chatRepositoryProvider = Provider<ChatRepository>((ref) => DioChatRepository(ref.watch(dioProvider)));

/// My conversations with live unread counts: socket messages bump the row (or refetch when it's new to us).
class ConversationsController extends AsyncNotifier<ConversationsOverview> {
  /// The conversation whose thread is on screen: new messages there don't count as unread.
  String? openId;

  @override
  Future<ConversationsOverview> build() async {
    _listen();
    return ref.watch(chatRepositoryProvider).conversations();
  }

  void _listen() {
    final rt = ref.watch(realtimeClientProvider);
    final unsubs = <void Function()>[];
    var disposed = false;
    ref.onDispose(() {
      disposed = true;
      for (final u in unsubs) {
        u();
      }
    });
    unawaited(rt.connect().then((_) {
      if (disposed) return;
      unsubs.add(rt.on(SocketEvents.conversationMessage, _onMessage));
    }, onError: (_) {}));
  }

  void _onMessage(Json payload) {
    final id = '${payload['conversationId'] ?? ''}';
    final current = state.value;
    if (id.isEmpty || current == null) return;
    final conv = current.byId(id);
    if (conv == null) {
      // A chat we haven't listed yet (e.g. a student just opened a private chat with us).
      ref.invalidateSelf();
      return;
    }
    final msg = ThreadMessage.fromJson(obj(payload, 'message'));
    final open = openId == id;
    final updated = conv.copyWith(
      unread: open ? 0 : conv.unread + 1,
      lastMessage: LastMessage(body: msg.body, senderName: msg.sender.name, createdAt: msg.createdAt),
      lastMessageAt: msg.createdAt,
    );
    state = AsyncData(current.withItems([for (final c in current.items) c.id == id ? updated : c]));
  }

  /// After opening a thread (and telling the API), clear its badge.
  void markReadLocally(String id) {
    final current = state.value;
    final conv = current?.byId(id);
    if (current == null || conv == null || conv.unread == 0) return;
    state = AsyncData(current.withItems([for (final c in current.items) c.id == id ? c.copyWith(unread: 0) : c]));
  }

  /// Keeps the row's preview in step with a message I just sent.
  void noteSent(String id, ThreadMessage msg) {
    final current = state.value;
    final conv = current?.byId(id);
    if (current == null || conv == null) return;
    state = AsyncData(current.withItems([
      for (final c in current.items)
        c.id == id
            ? c.copyWith(lastMessage: LastMessage(body: msg.body, senderName: msg.sender.name, createdAt: msg.createdAt), lastMessageAt: msg.createdAt)
            : c,
    ]));
  }
}

final conversationsProvider = AsyncNotifierProvider<ConversationsController, ConversationsOverview>(ConversationsController.new);

/// Total unread chat messages (the Messages badge).
final messagesUnreadProvider = Provider<int>((ref) => ref.watch(conversationsProvider).value?.unreadTotal ?? 0);

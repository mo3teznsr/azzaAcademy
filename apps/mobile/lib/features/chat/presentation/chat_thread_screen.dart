import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/class_ref.dart';
import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/providers.dart';
import '../../../core/realtime/socket_events.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/json.dart';
import '../../../core/widgets/thread.dart';
import '../../../core/widgets/ui.dart';
import '../../auth/domain/app_user.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../me/data/me_repository.dart';
import '../data/chat_repository.dart';
import '../domain/chat_models.dart';

/// Who may delete [m]: your own messages; in a class chat also the teacher; admins always.
/// A closed (ended) class chat is read-only for everyone but admins.
bool canDeleteMessage({required ThreadMessage m, required AppUser user, required Conversation? conversation, required bool closed}) {
  if (m.deleted || m.pending || m.failed) return false;
  if (user.role == Role.admin) return true;
  if (closed) return false;
  if (m.sender.id == user.id) return true;
  return user.role == Role.teacher && (conversation?.isClass ?? false);
}

/// A class chat or a private chat: bubbles, live updates, pull for earlier messages, long-press to delete.
class ChatThreadScreen extends ConsumerStatefulWidget {
  const ChatThreadScreen({super.key, required this.conversationId, this.conversation});
  final String conversationId;

  /// The row we came from, when there is one (a notification only carries the id).
  final Conversation? conversation;

  @override
  ConsumerState<ChatThreadScreen> createState() => _ChatThreadScreenState();
}

class _ChatThreadScreenState extends ConsumerState<ChatThreadScreen> {
  final _composer = TextEditingController();
  final _scroll = ScrollController();
  final _unsubs = <void Function()>[];
  late final ConversationsController _list;
  List<ThreadMessage> _messages = const [];
  bool _hasMore = false;
  bool _loading = true;
  bool _loadingEarlier = false;
  bool _closedByServer = false;
  Object? _error;
  int _localSeq = 0;

  String get _id => widget.conversationId;
  ChatRepository get _repo => ref.read(chatRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _list = ref.read(conversationsProvider.notifier)..openId = _id;
    unawaited(_load());
    _listen();
  }

  @override
  void dispose() {
    if (_list.openId == _id) _list.openId = null;
    for (final u in _unsubs) {
      u();
    }
    _composer.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _listen() {
    final rt = ref.read(realtimeClientProvider);
    unawaited(rt.connect().then((_) {
      if (!mounted) return;
      _unsubs
        ..add(rt.on(SocketEvents.conversationMessage, _onSocketMessage))
        ..add(rt.on(SocketEvents.conversationMessageDeleted, _onSocketDeleted));
    }, onError: (_) {}));
  }

  void _onSocketMessage(Json p) {
    if (!mounted || p['conversationId'] != _id) return;
    final m = ThreadMessage.fromJson(obj(p, 'message'));
    if (_messages.any((x) => x.id == m.id)) return;
    final atBottom = !_scroll.hasClients || _scroll.position.extentAfter < 80;
    setState(() => _messages = [..._messages, m]);
    _markRead();
    if (atBottom) _toBottom(animate: true);
  }

  void _onSocketDeleted(Json p) {
    if (!mounted || p['conversationId'] != _id) return;
    final id = '${p['messageId']}';
    setState(() => _messages = [for (final m in _messages) m.id == id ? m.asDeleted() : m]);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final page = await _repo.messages(_id);
      if (!mounted) return;
      setState(() {
        _messages = page.items;
        _hasMore = page.hasMore;
        _loading = false;
      });
      _toBottom();
      _markRead();
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e;
          _loading = false;
        });
      }
    }
  }

  void _markRead() {
    _repo.markRead(_id).then<void>((_) {}, onError: (_) {});
    _list.markReadLocally(_id);
  }

  Future<void> _loadEarlier() async {
    final firstReal = _messages.where((m) => !m.pending && !m.failed).firstOrNull;
    if (!_hasMore || _loadingEarlier || firstReal == null) return;
    setState(() => _loadingEarlier = true);
    try {
      final page = await _repo.messages(_id, before: firstReal.createdAt);
      if (!mounted) return;
      final known = _messages.map((m) => m.id).toSet();
      setState(() {
        _messages = [...page.items.where((m) => !known.contains(m.id)), ..._messages];
        _hasMore = page.hasMore;
      });
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _loadingEarlier = false);
    }
  }

  void _toBottom({bool animate = false}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_scroll.hasClients) return;
      final end = _scroll.position.maxScrollExtent;
      if (animate) {
        _scroll.animateTo(end, duration: AzzaMotion.quick, curve: AzzaMotion.ease);
      } else {
        _scroll.jumpTo(end);
      }
    });
  }

  Future<void> _send([String? retryBody, String? replacing]) async {
    final user = ref.read(currentUserProvider);
    final body = (retryBody ?? _composer.text).trim();
    if (user == null || body.isEmpty) return;
    final local = ThreadMessage(
      id: 'local-${_localSeq++}',
      sender: Person(id: user.id, name: user.name, image: user.image, role: user.role),
      body: body,
      createdAt: DateTime.now(),
      pending: true,
    );
    setState(() => _messages = [..._messages.where((m) => m.id != replacing), local]);
    if (retryBody == null) _composer.clear();
    _toBottom(animate: true);
    try {
      final saved = await _repo.send(_id, body);
      if (!mounted) return;
      setState(() {
        final echoed = _messages.any((m) => m.id == saved.id);
        _messages = [
          for (final m in _messages)
            if (m.id != local.id) m else if (!echoed) saved,
        ];
      });
      _list.noteSent(_id, saved);
    } catch (e) {
      if (!mounted) return;
      final ex = AppException.from(e);
      setState(() {
        if (ex.code == 'CHAT_CLOSED') {
          _closedByServer = true;
          _messages = _messages.where((m) => m.id != local.id).toList();
          if (retryBody == null) _composer.text = body;
        } else {
          _messages = [for (final m in _messages) m.id == local.id ? m.asFailed() : m];
        }
      });
      showToast(context, ex.describe(context));
    }
  }

  Future<void> _confirmDelete(ThreadMessage m) async {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final ok = await showModalBottomSheet<bool>(
      context: context,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 16),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(l.chatDeleteConfirmTitle, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(l.chatDeleteConfirmBody, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: p.muted)),
            const SizedBox(height: 16),
            FilledButton.icon(
              key: const Key('chat-delete-confirm'),
              style: FilledButton.styleFrom(backgroundColor: p.danger, foregroundColor: p.isDark ? AzzaColors.inkDeep : AzzaColors.ivory),
              onPressed: () => Navigator.pop(context, true),
              icon: const Icon(Icons.delete_outline_rounded),
              label: Text(l.chatDeleteMessage),
            ),
            const SizedBox(height: 8),
            TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
          ]),
        ),
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await _repo.deleteMessage(m.id);
      if (mounted) setState(() => _messages = [for (final x in _messages) x.id == m.id ? x.asDeleted() : x]);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final user = ref.watch(currentUserProvider);
    final conv = widget.conversation ?? ref.watch(conversationsProvider).value?.byId(_id);
    final closed = _closedByServer || (conv?.closed ?? false);
    final adminInPrivate = user?.role == Role.admin && conv != null && !conv.isClass;
    final canPost = !closed && !adminInPrivate;
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final today = startOfDay(DateTime.now());

    String stamp(DateTime at) => at.isBefore(today) ? '${f.shortDate(at)} · ${f.time(at)}' : f.time(at);

    final title = conv == null ? l.messagesTitle : (conv.isClass ? conv.batch.title(locale) : (conv.counterpart?.name ?? l.chatPrivateLabel));
    final subtitle = conv == null ? null : '${conv.isClass ? l.classChat : l.chatPrivateLabel} · ${conv.batch.code}';

    Widget body;
    if (_loading) {
      body = const LoadingState();
    } else if (_error != null) {
      body = ErrorState(error: _error!, onRetry: _load);
    } else {
      body = RefreshIndicator(
        color: p.accent,
        onRefresh: _hasMore ? _loadEarlier : () async {},
        child: ListView(
          key: const Key('chat-thread'),
          controller: _scroll,
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 12, AzzaSpace.gutter, 16),
          children: [
            if (_hasMore)
              Center(
                child: TextButton.icon(
                  key: const Key('chat-load-earlier'),
                  onPressed: _loadingEarlier ? null : _loadEarlier,
                  icon: const Icon(Icons.history_rounded, size: 18),
                  label: Text(l.chatLoadEarlier),
                ),
              ),
            if (_messages.isEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 64),
                child: EmptyState(title: l.chatNoMessagesYet, icon: Icons.waving_hand_outlined),
              ),
            for (final m in _messages)
              Builder(builder: (context) {
                final mine = m.sender.id == user?.id;
                final deletable = user != null && canDeleteMessage(m: m, user: user, conversation: conv, closed: closed);
                return ThreadBubble(
                  key: Key('msg-${m.id}'),
                  mine: mine,
                  body: m.body,
                  time: stamp(m.createdAt),
                  deleted: m.deleted,
                  pending: m.pending,
                  failed: m.failed,
                  sender: (conv?.isClass ?? true) ? m.sender.name : null,
                  tag: m.sender.role == Role.teacher ? l.teacherLabel : null,
                  onTap: m.failed && canPost ? () => _send(m.body, m.id) : null,
                  onLongPress: deletable ? () => _confirmDelete(m) : null,
                );
              }),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: t.titleMedium),
          if (subtitle != null) Text(subtitle, style: t.bodySmall?.copyWith(color: p.muted)),
        ]),
      ),
      body: body,
      bottomNavigationBar: _loading && conv == null
          ? null
          : canPost
              ? Padding(
                  padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
                  child: ThreadComposer(
                    controller: _composer,
                    onSend: _send,
                    label: l.chatComposerLabel,
                    hint: l.chatComposerHint,
                  ),
                )
              : ThreadNote(closed ? l.chatClosedNote : l.chatAdminReadOnly, key: const Key('chat-read-only')),
    );
  }
}

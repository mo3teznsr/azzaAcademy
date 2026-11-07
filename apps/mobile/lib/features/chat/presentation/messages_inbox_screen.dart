import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../me/data/me_repository.dart';
import '../data/chat_repository.dart';
import '../domain/chat_models.dart';

/// Inbox: every class chat and private chat I'm in, most recent first, with unread counts.
class MessagesInboxScreen extends ConsumerWidget {
  const MessagesInboxScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final value = ref.watch(conversationsProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.messagesTitle)),
      body: AsyncView<ConversationsOverview>(
        value: value,
        onRetry: () => ref.invalidate(conversationsProvider),
        isEmpty: (o) => o.items.isEmpty,
        empty: EmptyState(title: l.messagesEmptyTitle, body: l.messagesEmptyBody, icon: Icons.forum_outlined),
        data: (o) => RefreshList(
          onRefresh: () => ref.refresh(conversationsProvider.future),
          children: [
            CardGroup(children: [for (final c in o.items) ConversationTile(conversation: c)]),
          ],
        ),
      ),
    );
  }
}

class ConversationTile extends ConsumerWidget {
  const ConversationTile({super.key, required this.conversation});
  final Conversation conversation;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final c = conversation;
    final unread = c.unread > 0;
    final title = c.isClass ? c.batch.title(locale) : (c.counterpart?.name ?? l.chatPrivateLabel);
    final kind = c.isClass ? l.classChat : l.chatPrivateLabel;
    final last = c.lastMessage;
    final today = startOfDay(DateTime.now());
    final at = last?.createdAt;
    return ListTile(
      key: Key('conversation-${c.id}'),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      leading: c.isClass
          ? Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: p.successBg, shape: BoxShape.circle),
              child: Icon(Icons.groups_rounded, color: p.success, size: 22),
            )
          : InitialsAvatar(c.counterpart?.name ?? '?', size: 44, imageUrl: c.counterpart?.image),
      title: Row(children: [
        Expanded(
          child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: t.titleSmall?.copyWith(fontWeight: unread ? FontWeight.w700 : null)),
        ),
        if (at != null) Text(at.isBefore(today) ? f.shortDate(at) : f.time(at), style: t.labelSmall?.copyWith(color: unread ? p.accent : p.muted)),
      ]),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 2),
        child: Row(children: [
          if (c.closed) ...[Icon(Icons.lock_outline_rounded, size: 14, color: p.muted), const SizedBox(width: 4)],
          Expanded(
            child: Text(
              last == null ? '$kind · ${c.batch.code}' : '${last.senderName}: ${last.body}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: t.bodySmall?.copyWith(color: unread ? p.text : p.muted),
            ),
          ),
          if (unread) ...[
            const SizedBox(width: 8),
            Badge(
              key: Key('conversation-unread-${c.id}'),
              backgroundColor: p.accent,
              textColor: p.onAccent,
              label: Text(f.n(c.unread)),
            ),
          ],
        ]),
      ),
      onTap: () => context.push(Routes.chat(c.id), extra: c),
    );
  }
}

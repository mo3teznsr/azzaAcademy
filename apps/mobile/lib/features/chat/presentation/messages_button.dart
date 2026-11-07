import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/chat_repository.dart';
import '../domain/chat_models.dart';

/// Messages entry with the total unread badge. Every role's five tabs are taken, so it sits in the home header.
class MessagesButton extends ConsumerWidget {
  const MessagesButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final unread = ref.watch(messagesUnreadProvider);
    final f = ref.watch(fmtProvider);
    return IconButton(
      key: const Key('messages-button'),
      tooltip: unread > 0 ? '${l.messagesTitle} · ${l.chatUnreadN(f.n(unread))}' : l.messagesTitle,
      onPressed: () => context.push(Routes.messages),
      icon: Badge(
        isLabelVisible: unread > 0,
        label: Text(f.n(unread > 99 ? '99+' : unread)),
        child: const Icon(Icons.chat_bubble_outline_rounded),
      ),
    );
  }
}

/// Opens a conversation fetched by [load] (the class chat or the private chat with the teacher).
Future<void> openConversation(BuildContext context, Future<Conversation> Function() load) async {
  try {
    final c = await load();
    if (context.mounted) await context.push(Routes.chat(c.id), extra: c);
  } catch (e) {
    if (context.mounted) showToast(context, errorText(context, e));
  }
}

Future<void> openClassChat(BuildContext context, WidgetRef ref, String batchId) =>
    openConversation(context, () => ref.read(chatRepositoryProvider).classConversation(batchId));

Future<void> openTeacherChat(BuildContext context, WidgetRef ref, String batchId) =>
    openConversation(context, () => ref.read(chatRepositoryProvider).openDirect(batchId));

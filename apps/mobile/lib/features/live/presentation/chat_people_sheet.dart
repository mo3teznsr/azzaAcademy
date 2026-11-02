import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import 'live_room_controller.dart';

/// Bottom sheet over the room: chat + people (hand queue first; host controls per person).
class ChatPeopleSheet extends ConsumerStatefulWidget {
  const ChatPeopleSheet({super.key, required this.controller, this.initialPeople = false});
  final LiveRoomController controller;
  final bool initialPeople;

  @override
  ConsumerState<ChatPeopleSheet> createState() => _ChatPeopleSheetState();
}

class _ChatPeopleSheetState extends ConsumerState<ChatPeopleSheet> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this, initialIndex: widget.initialPeople ? 1 : 0);
  final _input = TextEditingController();

  @override
  void dispose() {
    _tabs.dispose();
    _input.dispose();
    super.dispose();
  }

  void _send() {
    widget.controller.sendChat(_input.text);
    _input.clear();
  }

  Future<void> _guard(Future<void> Function() run) async {
    try {
      await run();
    } catch (e) {
      if (mounted) showToast(context, AppException.from(e).message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final c = widget.controller;
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;

    return ListenableBuilder(
      listenable: c,
      builder: (context, _) {
        final people = c.video.participants;
        return SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.72,
          child: Column(children: [
            TabBar(
              controller: _tabs,
              indicatorColor: p.accent,
              labelColor: p.text,
              unselectedLabelColor: p.muted,
              tabs: [Tab(text: l.chat), Tab(text: l.peopleN('${people.length}'))],
            ),
            Expanded(
              child: TabBarView(controller: _tabs, children: [
                // ── Chat
                Column(children: [
                  Expanded(
                    child: c.messages.isEmpty
                        ? EmptyState(title: l.noMessages, icon: Icons.chat_bubble_outline_rounded)
                        : ListView.builder(
                            reverse: true,
                            padding: const EdgeInsets.all(16),
                            itemCount: c.messages.length,
                            itemBuilder: (_, i) {
                              final m = c.messages[c.messages.length - 1 - i];
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Row(children: [
                                    Text(m.userName, style: t.titleSmall?.copyWith(color: m.fromHost ? AzzaColors.sun : p.text)),
                                    if (m.fromHost) ...[const SizedBox(width: 6), MonoLabel(l.hostLabel, color: AzzaColors.sun)],
                                    const SizedBox(width: 8),
                                    MonoLabel(f.time(m.createdAt)),
                                  ]),
                                  Text(m.body, style: t.bodyMedium),
                                ]),
                              );
                            },
                          ),
                  ),
                  Padding(
                    padding: EdgeInsets.fromLTRB(12, 4, 12, 12 + MediaQuery.viewInsetsOf(context).bottom),
                    child: Row(children: [
                      Expanded(
                        child: TextField(
                          controller: _input,
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _send(),
                          decoration: InputDecoration(hintText: l.messageHint),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton.filled(tooltip: l.send, onPressed: _send, icon: const Icon(Icons.send_rounded)),
                    ]),
                  ),
                ]),
                // ── People
                ListView(padding: const EdgeInsets.all(16), children: [
                  MonoLabel(l.handsN('${c.hands.length}')),
                  const SizedBox(height: 8),
                  if (c.hands.isEmpty) Text(l.noHands, style: t.bodySmall),
                  for (final (i, h) in c.hands.indexed)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Row(mainAxisSize: MainAxisSize.min, children: [
                        MonoLabel('${i + 1}'),
                        const SizedBox(width: 8),
                        InitialsAvatar(h.name, size: 36),
                      ]),
                      title: Text(h.name),
                      subtitle: MonoLabel(Fmt.timecode(DateTime.now().difference(h.raisedAt)).substring(3)),
                      trailing: c.isHost
                          ? FilledButton(onPressed: () => _guard(() => c.allowSpeak(h.userId)), child: Text(l.allowSpeak))
                          : null,
                    ),
                  const SizedBox(height: 16),
                  MonoLabel(l.inRoom('${people.length}')),
                  for (final person in people)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: InitialsAvatar(person.name, size: 36, speaking: person.isSpeaking),
                      title: Text(person.isLocal ? '${person.name} (${l.you})' : person.name),
                      subtitle: Row(children: [
                        Icon(person.micOn ? Icons.mic_rounded : Icons.mic_off_rounded, size: 14, color: p.muted),
                        const SizedBox(width: 6),
                        Icon(person.camOn ? Icons.videocam_rounded : Icons.videocam_off_rounded, size: 14, color: p.muted),
                      ]),
                      trailing: c.isHost && !person.isLocal
                          ? PopupMenuButton<String>(
                              onSelected: (v) => _guard(() => v == 'mute' ? c.mute(person.id) : c.remove(person.id)),
                              itemBuilder: (_) => [
                                PopupMenuItem(value: 'mute', child: Text(l.mute)),
                                PopupMenuItem(value: 'remove', child: Text(l.remove)),
                              ],
                            )
                          : null,
                    ),
                ]),
              ]),
            ),
          ]),
        );
      },
    );
  }
}

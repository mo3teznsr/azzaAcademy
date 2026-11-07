import 'package:flutter/material.dart';

import '../l10n/l10n.dart';
import '../theme/tokens.dart';
import 'fields.dart';

/// One message in a chat or support thread. Your own messages sit on the end side (right in English,
/// left in Arabic); everyone else's on the start side, with their name above in group threads.
class ThreadBubble extends StatelessWidget {
  const ThreadBubble({
    super.key,
    required this.mine,
    required this.body,
    required this.time,
    this.sender,
    this.tag,
    this.deleted = false,
    this.pending = false,
    this.failed = false,
    this.onLongPress,
    this.onTap,
  });

  final bool mine;
  final String body;
  final String time;

  /// Shown above someone else's message (group chats, support).
  final String? sender;

  /// A small role tag after the sender ("Teacher").
  final String? tag;
  final bool deleted;
  final bool pending;
  final bool failed;
  final VoidCallback? onLongPress;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final fill = mine ? p.primary : p.raised;
    final fg = mine ? p.onPrimary : p.text;
    final status = failed ? l.chatSendFailed : (pending ? l.chatSending : time);
    const r = Radius.circular(18);
    const tight = Radius.circular(6);
    final bubble = Material(
      color: deleted ? Colors.transparent : fill,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadiusDirectional.only(
          topStart: r,
          topEnd: r,
          bottomStart: mine ? r : tight,
          bottomEnd: mine ? tight : r,
        ),
        side: failed ? BorderSide(color: p.danger, width: 1.5) : (mine && !deleted ? BorderSide.none : BorderSide(color: p.line)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onLongPress: onLongPress,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
          child: deleted
              ? Text(l.chatMessageDeleted, style: t.bodyMedium?.copyWith(color: p.muted, fontStyle: FontStyle.italic))
              : Text(body, style: t.bodyMedium?.copyWith(color: fg, height: 1.4)),
        ),
      ),
    );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Align(
        alignment: mine ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.8),
          child: Column(
            crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            children: [
              if (!mine && sender != null)
                Padding(
                  padding: const EdgeInsetsDirectional.only(start: 6, bottom: 3),
                  child: Text.rich(
                    TextSpan(children: [
                      TextSpan(text: sender, style: t.labelMedium?.copyWith(color: p.text, fontWeight: FontWeight.w600)),
                      if (tag != null) TextSpan(text: '  ·  $tag', style: t.labelSmall?.copyWith(color: p.accent)),
                    ]),
                  ),
                ),
              bubble,
              Padding(
                padding: const EdgeInsets.fromLTRB(6, 3, 6, 0),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  if (failed) ...[Icon(Icons.error_outline_rounded, size: 14, color: p.danger), const SizedBox(width: 4)],
                  Flexible(child: Text(status, style: t.labelSmall?.copyWith(color: failed ? p.danger : p.muted))),
                ]),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The composer under a thread: an input group with a send action inside the field.
class ThreadComposer extends StatelessWidget {
  const ThreadComposer({
    super.key,
    required this.controller,
    required this.onSend,
    required this.label,
    this.hint,
    this.sending = false,
    this.maxLength = 2000,
  });

  final TextEditingController controller;
  final VoidCallback onSend;
  final String label;
  final String? hint;
  final bool sending;
  final int maxLength;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(color: p.ground, border: Border(top: BorderSide(color: p.line))),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 10, AzzaSpace.gutter, 10),
          child: ValueListenableBuilder<TextEditingValue>(
            valueListenable: controller,
            builder: (context, value, _) {
              final ready = value.text.trim().isNotEmpty && !sending;
              return TextField(
                key: const Key('thread-composer'),
                controller: controller,
                minLines: 1,
                maxLines: 5,
                maxLength: maxLength,
                textCapitalization: TextCapitalization.sentences,
                keyboardType: TextInputType.multiline,
                buildCounter: (_, {required currentLength, required isFocused, maxLength}) => null,
                decoration: fieldDecoration(
                  label: label,
                  hint: hint,
                  icon: Icons.chat_bubble_outline_rounded,
                  action: Padding(
                    padding: const EdgeInsetsDirectional.only(end: 4),
                    child: IconButton(
                      key: const Key('thread-send'),
                      tooltip: l.send,
                      onPressed: ready ? onSend : null,
                      color: p.accent,
                      icon: sending
                          ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.send_rounded),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

/// A calm, full-width note in place of the composer (read-only threads).
class ThreadNote extends StatelessWidget {
  const ThreadNote(this.text, {super.key, this.icon = Icons.lock_outline_rounded});
  final String text;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(color: p.ground, border: Border(top: BorderSide(color: p.line))),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 14, AzzaSpace.gutter, 14),
          child: Row(children: [
            Icon(icon, size: 18, color: p.muted),
            const SizedBox(width: 10),
            Expanded(child: Text(text, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: p.muted))),
          ]),
        ),
      ),
    );
  }
}

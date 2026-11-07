import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../chat/presentation/messages_button.dart';
import '../data/announcements_repository.dart';
import 'announcement_widgets.dart';

/// On a class I'm in: the latest announcements, the class chat and (students only) a private line to the teacher.
class ClassHub extends ConsumerWidget {
  const ClassHub({super.key, required this.batchId});
  final String batchId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final role = ref.watch(currentUserProvider)?.role;
    final announcements = ref.watch(batchAnnouncementsProvider(batchId));
    final items = announcements.value?.items ?? const [];

    Widget row(String label, IconData icon, VoidCallback onTap, Key key) => ListTile(
          key: key,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
          minTileHeight: 56,
          leading: Icon(icon, color: p.accent),
          title: Text(label),
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: onTap,
        );

    return Column(
      key: const Key('class-hub'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionCard(
          title: l.announcementsTitle,
          trailing: TextButton(
            key: const Key('class-announcements-all'),
            style: TextButton.styleFrom(minimumSize: const Size(48, 40)),
            onPressed: () => context.push(Routes.batchAnnouncements(batchId)),
            child: Text(l.seeAll),
          ),
          child: announcements.isLoading && !announcements.hasValue
              ? const LoadingState(compact: true)
              : items.isEmpty
                  ? Text(l.announcementsEmpty, style: t.bodyMedium?.copyWith(color: p.muted))
                  : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      for (final a in items.take(2))
                        AnnouncementPreview(announcement: a, showSource: false, onTap: () => context.push(Routes.batchAnnouncements(batchId))),
                    ]),
        ),
        const SizedBox(height: 12),
        CardGroup(children: [
          row(l.classChat, Icons.forum_outlined, () => openClassChat(context, ref, batchId), const Key('class-chat')),
          if (role == Role.student)
            row(l.messageYourTeacher, Icons.mark_chat_unread_outlined, () => openTeacherChat(context, ref, batchId), const Key('message-teacher')),
        ]),
      ],
    );
  }
}

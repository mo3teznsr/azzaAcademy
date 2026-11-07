import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/widgets/ui.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/announcements_repository.dart';
import '../domain/announcement_models.dart';
import 'announcement_widgets.dart';

/// Announcements, pinned first then newest: one class's when [batchId] is set, otherwise everything for me.
/// Teachers and admins post to a class from here; admins post platform announcements from the general list.
class AnnouncementsScreen extends ConsumerWidget {
  const AnnouncementsScreen({super.key, this.batchId});
  final String? batchId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final user = ref.watch(currentUserProvider);
    final id = batchId;
    final provider = id == null ? myAnnouncementsProvider : batchAnnouncementsProvider(id);
    final value = ref.watch(provider);
    final role = user?.role;
    final canPost = id == null ? role == Role.admin : (role == Role.teacher || role == Role.admin);

    Future<void> delete(Announcement a) async {
      final ok = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(l.announcementDeleteConfirm),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
            FilledButton(key: const Key('announcement-delete-confirm'), onPressed: () => Navigator.pop(context, true), child: Text(l.announcementDelete)),
          ],
        ),
      );
      if (ok != true) return;
      try {
        await ref.read(announcementsRepositoryProvider).delete(a.id);
        ref.invalidate(provider);
        if (id != null) ref.invalidate(myAnnouncementsProvider);
      } catch (e) {
        if (context.mounted) showToast(context, errorText(context, e));
      }
    }

    return Scaffold(
      appBar: AppBar(title: Text(l.announcementsTitle)),
      floatingActionButton: canPost
          ? FloatingActionButton.extended(
              key: const Key('new-announcement'),
              onPressed: () async {
                if (await showAnnouncementSheet(context, batchId: id)) ref.invalidate(provider);
              },
              icon: const Icon(Icons.campaign_outlined),
              label: Text(id == null ? l.platformAnnouncement : l.newAnnouncement),
            )
          : null,
      body: AsyncView<AnnouncementsPage>(
        value: value,
        onRetry: () => ref.invalidate(provider),
        isEmpty: (page) => page.items.isEmpty,
        empty: EmptyState(title: l.announcementsEmpty, body: l.announcementsEmptyBody, icon: Icons.campaign_outlined),
        data: (page) => RefreshList(
          onRefresh: () => ref.refresh(provider.future),
          children: [
            for (final a in page.items)
              AnnouncementCard(
                announcement: a,
                showSource: id == null,
                onDelete: user != null && (role == Role.admin || a.author?.id == user.id) ? () => delete(a) : null,
              ),
            if (canPost) const SizedBox(height: 72),
          ],
        ),
      ),
    );
  }
}

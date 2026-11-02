import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../data/me_repository.dart';
import '../domain/me_models.dart';

/// Inbox: lobby open, schedule changes, recordings, grades, receipts.
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final items = ref.watch(notificationsProvider);
    final today = startOfDay(DateTime.now());
    return Scaffold(
      appBar: AppBar(
        title: Text(l.inbox),
        actions: [
          TextButton(onPressed: () => ref.read(notificationsProvider.notifier).markAllRead(), child: Text(l.markAllRead)),
        ],
      ),
      body: AsyncView<List<AppNotification>>(
        value: items,
        onRetry: () => ref.invalidate(notificationsProvider),
        isEmpty: (list) => list.isEmpty,
        empty: EmptyState(title: l.noNotifications, icon: Icons.notifications_off_outlined),
        data: (list) {
          final todays = list.where((n) => !n.createdAt.isBefore(today)).toList();
          final earlier = list.where((n) => n.createdAt.isBefore(today)).toList();
          Widget tile(AppNotification n) {
            final p = AzzaPalette.of(context);
            final live = n.type.contains('LIVE');
            return ListTile(
              contentPadding: EdgeInsets.zero,
              leading: SignalMark(size: 22, color: live ? AzzaColors.onAir : (n.read ? p.line : p.accent), live: live && !n.read),
              title: Text(n.title, style: Theme.of(context).textTheme.titleSmall?.copyWith(color: n.read ? p.muted : p.text)),
              subtitle: Text(n.body, maxLines: 2, overflow: TextOverflow.ellipsis),
              trailing: MonoLabel(n.createdAt.isBefore(today) ? f.shortDate(n.createdAt) : f.time(n.createdAt)),
              onTap: () {
                ref.read(notificationsProvider.notifier).markRead(n.id);
                final r = n.route;
                if (r != null) context.push(r);
              },
            );
          }

          return RefreshList(
            onRefresh: () async => ref.invalidate(notificationsProvider),
            children: [
              if (todays.isNotEmpty) ...[MonoLabel(l.today), ...todays.map(tile)],
              if (earlier.isNotEmpty) ...[const SizedBox(height: 16), MonoLabel(l.earlier), ...earlier.map(tile)],
            ],
          );
        },
      ),
    );
  }
}

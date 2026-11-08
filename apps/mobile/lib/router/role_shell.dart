import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/domain/enums.dart';
import '../core/l10n/l10n.dart';
import '../features/admin/data/admin_queue.dart';
import '../features/auth/presentation/auth_controller.dart';
import '../features/me/data/me_repository.dart';

class _Tab {
  const _Tab(this.label, this.icon, this.selectedIcon);
  final String label;
  final IconData icon;
  final IconData selectedIcon;
}

/// Bottom navigation for a role's tree. Each role gets its own five tabs.
class RoleShell extends ConsumerWidget {
  const RoleShell({super.key, required this.shell, required this.role});

  final StatefulNavigationShell shell;
  final Role role;

  List<_Tab> _tabs(AppLocalizations l) => switch (role) {
        Role.student => [
            _Tab(l.navHome, Icons.home_outlined, Icons.home_rounded),
            _Tab(l.navExplore, Icons.search_rounded, Icons.manage_search_rounded),
            _Tab(l.navSchedule, Icons.calendar_today_outlined, Icons.calendar_today_rounded),
            _Tab(l.navLibrary, Icons.video_library_outlined, Icons.video_library_rounded),
            _Tab(l.navMe, Icons.person_outline_rounded, Icons.person_rounded),
          ],
        Role.teacher => [
            _Tab(l.navToday, Icons.wb_twilight_outlined, Icons.wb_twilight_rounded),
            _Tab(l.navBatches, Icons.groups_outlined, Icons.groups_rounded),
            _Tab(l.navCalendar, Icons.calendar_month_outlined, Icons.calendar_month_rounded),
            _Tab(l.navEarnings, Icons.account_balance_wallet_outlined, Icons.account_balance_wallet_rounded),
            _Tab(l.navMe, Icons.person_outline_rounded, Icons.person_rounded),
          ],
        Role.admin => [
            // "Live" made way for "Manage": the overview's "Live now" section and the Manage hub open the monitor.
            _Tab(l.navOverview, Icons.space_dashboard_outlined, Icons.space_dashboard_rounded),
            _Tab(l.navBatches, Icons.view_agenda_outlined, Icons.view_agenda_rounded),
            _Tab(l.navApprovals, Icons.fact_check_outlined, Icons.fact_check_rounded),
            _Tab(l.adminNavManage, Icons.grid_view_outlined, Icons.grid_view_rounded),
            _Tab(l.navMe, Icons.person_outline_rounded, Icons.person_rounded),
          ],
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tabs = _tabs(context.l10n);
    // Guests browse the student shell too; they have no inbox to count.
    final unread = role == Role.student && !ref.watch(isGuestProvider) ? ref.watch(unreadCountProvider) : 0;
    // Admin: decisions waiting on the Approvals tab.
    final approvals = role == Role.admin ? ref.watch(adminQueueProvider).approvalsTotal : 0;
    return Scaffold(
      body: shell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        onDestinationSelected: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
        destinations: [
          for (final (i, t) in tabs.indexed)
            NavigationDestination(
              icon: i == 4 && unread > 0
                  ? Badge(label: Text('$unread'), child: Icon(t.icon))
                  : (role == Role.admin && i == 2 && approvals > 0)
                      ? Badge(key: const Key('approvals-badge'), label: Text('$approvals'), child: Icon(t.icon))
                      : Icon(t.icon),
              selectedIcon: Icon(t.selectedIcon),
              label: t.label,
            ),
        ],
      ),
    );
  }
}

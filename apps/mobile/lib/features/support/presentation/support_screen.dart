import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/site/site_settings.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/support_repository.dart';
import '../domain/support_models.dart';
import 'contact_card.dart';
import 'support_widgets.dart';

const TicketFilter allTickets = (status: null, category: null);

/// Profile → Help & support: my tickets, newest activity first, and "New ticket".
class SupportScreen extends ConsumerWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final value = ref.watch(ticketsProvider(allTickets));

    Future<void> create() async {
      await context.push(Routes.newTicket());
      ref.invalidate(ticketsProvider);
    }

    return Scaffold(
      appBar: AppBar(title: Text(l.helpSupport)),
      floatingActionButton: FloatingActionButton.extended(
        key: const Key('new-ticket'),
        onPressed: create,
        icon: const Icon(Icons.add_comment_outlined),
        label: Text(l.newTicket),
      ),
      // Contact details stay visible while tickets load, and when they fail.
      body: !value.hasValue || value.hasError
          ? RefreshList(
              onRefresh: () async {
                ref.invalidate(siteSettingsProvider);
                ref.invalidate(ticketsProvider(allTickets));
              },
              children: [
                const ContactCard(),
                if (value.hasError) ErrorState(error: value.error!, onRetry: () => ref.invalidate(ticketsProvider(allTickets))) else const LoadingState(compact: true),
              ],
            )
          : AsyncView<TicketsPage>(
        value: value,
        onRetry: () => ref.invalidate(ticketsProvider(allTickets)),
        isEmpty: (p) => p.items.isEmpty,
        empty: ListView(
          padding: const EdgeInsets.only(bottom: 72),
          children: [
            const ContactCard(),
            EmptyState(title: l.supportEmptyTitle, body: l.supportEmptyBody, icon: Icons.support_agent_rounded),
          ],
        ),
        data: (page) => RefreshList(
          onRefresh: () async {
            ref.invalidate(siteSettingsProvider);
            final _ = await ref.refresh(ticketsProvider(allTickets).future);
          },
          children: [
            const ContactCard(),
            CardGroup(children: [
              for (final t in page.items)
                TicketTile(
                  ticket: t,
                  onTap: () async {
                    await context.push(Routes.ticket(t.id));
                    ref.invalidate(ticketsProvider);
                  },
                ),
            ]),
            const SizedBox(height: 72),
          ],
        ),
      ),
    );
  }
}

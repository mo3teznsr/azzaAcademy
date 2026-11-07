import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/support_repository.dart';
import '../domain/support_models.dart';
import 'support_widgets.dart';

/// Admin support inbox: filter by status (Open by default) and topic, newest activity first.
class SupportInboxScreen extends ConsumerStatefulWidget {
  const SupportInboxScreen({super.key});

  @override
  ConsumerState<SupportInboxScreen> createState() => _SupportInboxScreenState();
}

class _SupportInboxScreenState extends ConsumerState<SupportInboxScreen> {
  SupportStatus? _status = SupportStatus.open;
  SupportCategory? _category;

  TicketFilter get _filter => (status: _status, category: _category);

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final value = ref.watch(ticketsProvider(_filter));
    final statuses = <(SupportStatus?, String)>[
      (null, l.supportFilterAll),
      for (final s in SupportStatus.values) (s, supportStatusLabel(l, s, staff: true)),
    ];
    return Scaffold(
      appBar: AppBar(title: Text(l.supportInbox)),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 4, AzzaSpace.gutter, 0),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(children: [
                for (final (s, label) in statuses) ...[
                  ChoiceChip(
                    key: Key('inbox-status-${s?.wire ?? 'ALL'}'),
                    label: Text(label),
                    selected: _status == s,
                    onSelected: (_) => setState(() => _status = s),
                  ),
                  const SizedBox(width: 8),
                ],
              ]),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<SupportCategory?>(
              key: const Key('inbox-category'),
              initialValue: _category,
              decoration: fieldDecoration(label: l.ticketCategory, icon: Icons.label_outline_rounded),
              items: [
                DropdownMenuItem(value: null, child: Text(l.ticketAllCategories)),
                for (final c in SupportCategory.values) DropdownMenuItem(value: c, child: Text(supportCategoryLabel(l, c))),
              ],
              onChanged: (c) => setState(() => _category = c),
            ),
          ]),
        ),
        Expanded(
          child: AsyncView<TicketsPage>(
            value: value,
            onRetry: () => ref.invalidate(ticketsProvider(_filter)),
            isEmpty: (p) => p.items.isEmpty,
            empty: EmptyState(title: l.supportInboxEmpty, icon: Icons.inbox_outlined),
            data: (page) => RefreshList(
              onRefresh: () => ref.refresh(ticketsProvider(_filter).future),
              children: [
                CardGroup(children: [
                  for (final t in page.items)
                    TicketTile(
                      ticket: t,
                      staff: true,
                      onTap: () async {
                        await context.push(Routes.ticket(t.id));
                        ref
                          ..invalidate(ticketsProvider)
                          ..invalidate(openTicketsCountProvider);
                      },
                    ),
                ]),
              ],
            ),
          ),
        ),
      ]),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../me/data/me_repository.dart';
import '../domain/support_models.dart';

String supportCategoryLabel(AppLocalizations l, SupportCategory c) => switch (c) {
      SupportCategory.payment => l.supportCatPayment,
      SupportCategory.classIssue => l.supportCatClass,
      SupportCategory.account => l.supportCatAccount,
      SupportCategory.technical => l.supportCatTechnical,
      SupportCategory.other => l.supportCatOther,
    };

/// [staff] reads AWAITING_USER as "Awaiting user"; the ticket owner reads it as "Waiting for you".
String supportStatusLabel(AppLocalizations l, SupportStatus s, {bool staff = false}) => switch (s) {
      SupportStatus.open => l.ticketStatusOpen,
      SupportStatus.awaitingUser => staff ? l.ticketStatusAwaitingUser : l.ticketStatusAwaitingYou,
      SupportStatus.resolved => l.ticketStatusResolved,
    };

class TicketStatusChip extends StatelessWidget {
  const TicketStatusChip({super.key, required this.status, this.staff = false});
  final SupportStatus status;
  final bool staff;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    final label = supportStatusLabel(context.l10n, status, staff: staff);
    return switch (status) {
      SupportStatus.open => StatusChip(label: label, color: p.infoBg, textColor: p.info),
      SupportStatus.awaitingUser => StatusChip(label: label, color: p.warningBg, textColor: p.warning),
      SupportStatus.resolved => StatusChip(label: label, color: p.successBg, textColor: p.success),
    };
  }
}

/// A ticket in a list: subject (bold when the other side wrote last), topic, last activity and status.
class TicketTile extends ConsumerWidget {
  const TicketTile({super.key, required this.ticket, required this.onTap, this.staff = false});
  final TicketSummary ticket;
  final VoidCallback onTap;
  final bool staff;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final at = ticket.lastMessageAt;
    final when = at.isBefore(startOfDay(DateTime.now())) ? f.shortDate(at) : f.time(at);
    return ListTile(
      key: Key('ticket-${ticket.id}'),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      title: Row(children: [
        if (ticket.unreadForMe) ...[
          Semantics(
            label: l.ticketNewReply,
            child: Container(
              key: Key('ticket-unread-${ticket.id}'),
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: p.accent, shape: BoxShape.circle),
            ),
          ),
          const SizedBox(width: 8),
        ],
        Expanded(
          child: Text(ticket.subject,
              maxLines: 1, overflow: TextOverflow.ellipsis, style: t.titleSmall?.copyWith(fontWeight: ticket.unreadForMe ? FontWeight.w700 : null)),
        ),
        Text(when, style: t.labelSmall?.copyWith(color: p.muted)),
      ]),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Row(children: [
          Expanded(
            child: Text(
              [if (staff && ticket.user != null) ticket.user!.name, supportCategoryLabel(l, ticket.category)].join(' · '),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: t.bodySmall,
            ),
          ),
          const SizedBox(width: 8),
          TicketStatusChip(status: ticket.status, staff: staff),
        ]),
      ),
      onTap: onTap,
    );
  }
}

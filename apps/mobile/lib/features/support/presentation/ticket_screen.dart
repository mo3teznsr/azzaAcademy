import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/thread.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../me/data/me_repository.dart';
import '../data/support_repository.dart';
import '../domain/support_models.dart';
import 'support_widgets.dart';

/// A support ticket's thread. The owner replies and can mark it resolved; an admin replies and sets any status.
/// Replying to a resolved ticket reopens it (the server decides the new status).
class TicketScreen extends ConsumerStatefulWidget {
  const TicketScreen({super.key, required this.ticketId});
  final String ticketId;

  @override
  ConsumerState<TicketScreen> createState() => _TicketScreenState();
}

class _TicketScreenState extends ConsumerState<TicketScreen> {
  final _composer = TextEditingController();
  TicketDetail? _latest;
  bool _busy = false;

  @override
  void dispose() {
    _composer.dispose();
    super.dispose();
  }

  void _adopt(TicketDetail d) {
    setState(() => _latest = d);
    ref
      ..invalidate(ticketsProvider)
      ..invalidate(openTicketsCountProvider);
  }

  Future<void> _run(Future<TicketDetail> Function() call, {String? done}) async {
    setState(() => _busy = true);
    try {
      final d = await call();
      if (!mounted) return;
      _adopt(d);
      if (done != null) showToast(context, done);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reply() async {
    final body = _composer.text.trim();
    if (body.isEmpty) return;
    final repo = ref.read(supportRepositoryProvider);
    await _run(() async {
      final d = await repo.reply(widget.ticketId, body);
      _composer.clear();
      return d;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final user = ref.watch(currentUserProvider);
    final staff = user?.role == Role.admin;
    final fetched = ref.watch(ticketProvider(widget.ticketId));
    final detail = _latest ?? fetched.value;
    final repo = ref.read(supportRepositoryProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(detail?.summary.subject ?? l.helpSupport, maxLines: 1, overflow: TextOverflow.ellipsis),
        actions: [
          if (detail != null && staff)
            PopupMenuButton<SupportStatus>(
              key: const Key('ticket-status-menu'),
              tooltip: l.ticketSetStatus,
              icon: const Icon(Icons.rule_rounded),
              onSelected: (s) => _run(() => repo.setStatus(widget.ticketId, s), done: l.ticketStatusChanged),
              itemBuilder: (_) => [
                for (final s in SupportStatus.values)
                  CheckedPopupMenuItem(
                    key: Key('ticket-status-${s.wire}'),
                    value: s,
                    checked: detail.status == s,
                    child: Text(supportStatusLabel(l, s, staff: true)),
                  ),
              ],
            ),
          if (detail != null && !staff && detail.status != SupportStatus.resolved)
            TextButton(
              key: const Key('ticket-resolve'),
              style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
              onPressed: _busy ? null : () => _run(() => repo.setStatus(widget.ticketId, SupportStatus.resolved), done: l.ticketResolvedNote),
              child: Text(l.ticketMarkResolved),
            ),
          const SizedBox(width: 4),
        ],
      ),
      body: detail == null
          ? AsyncView<TicketDetail>(value: fetched, onRetry: () => ref.invalidate(ticketProvider(widget.ticketId)), data: (_) => const SizedBox())
          : RefreshIndicator(
              color: AzzaPalette.of(context).accent,
              onRefresh: () async {
                setState(() => _latest = null);
                final fresh = await ref.refresh(ticketProvider(widget.ticketId).future);
                if (mounted) setState(() => _latest = fresh);
              },
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 4, AzzaSpace.gutter, 16),
                children: [
                  _TicketHeader(detail: detail, staff: staff),
                  const SizedBox(height: 12),
                  for (final m in detail.messages) _bubble(context, m, staff),
                  if (detail.status == SupportStatus.resolved) ...[
                    const SizedBox(height: 8),
                    Text(l.ticketResolvedReopenHint, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
                  ],
                ],
              ),
            ),
      bottomNavigationBar: detail == null
          ? null
          : Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
              child: ThreadComposer(
                controller: _composer,
                onSend: _reply,
                sending: _busy,
                maxLength: 4000,
                label: l.ticketReplyLabel,
                hint: l.ticketReplyHint,
              ),
            ),
    );
  }

  Widget _bubble(BuildContext context, SupportMessage m, bool staff) {
    final l = context.l10n;
    final f = ref.read(fmtProvider);
    final today = startOfDay(DateTime.now());
    final mine = staff ? m.fromStaff : !m.fromStaff;
    final at = m.createdAt;
    return ThreadBubble(
      key: Key('support-msg-${m.id}'),
      mine: mine,
      body: m.body,
      time: at.isBefore(today) ? '${f.shortDate(at)} · ${f.time(at)}' : f.time(at),
      // The owner sees the team as "Azza support"; staff see who wrote.
      sender: mine ? null : (m.fromStaff && !staff ? l.ticketStaffLabel : (m.author?.name ?? '')),
    );
  }
}

class _TicketHeader extends ConsumerWidget {
  const _TicketHeader({required this.detail, required this.staff});
  final TicketDetail detail;
  final bool staff;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final s = detail.summary;
    return SectionCard(
      key: const Key('ticket-header'),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          TicketStatusChip(key: const Key('ticket-status'), status: s.status, staff: staff),
          const SizedBox(width: 10),
          Expanded(child: Text(supportCategoryLabel(l, s.category), style: t.bodySmall?.copyWith(color: p.muted))),
          if (s.createdAt != null) Text(f.shortDate(s.createdAt!), style: t.labelSmall?.copyWith(color: p.muted)),
        ]),
        if (staff && s.user != null) KeyValueRow(l.ticketFrom, [s.user!.name, if (s.user!.email.isNotEmpty) s.user!.email].join('\n')),
        if (detail.order != null)
          InkWell(
            key: const Key('ticket-order-link'),
            onTap: staff ? null : () => context.push(Routes.order(detail.order!.id)),
            child: KeyValueRow(l.ticketLinkedOrder, '${detail.order!.reference} · ${f.aed(detail.order!.totalFils)}', mono: true),
          ),
        if (detail.batch != null) KeyValueRow(l.ticketLinkedClass, '${detail.batch!.code} · ${detail.batch!.title(locale)}'),
      ]),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../checkout/data/checkout_repository.dart';
import '../../me/data/me_repository.dart';
import '../data/support_repository.dart';
import '../domain/support_models.dart';
import 'support_widgets.dart';

/// New support ticket: subject, topic, an optional order or class, and the message.
/// [orderId] / [batchId] prefill the link (the order screen's "Need help?").
class NewTicketScreen extends ConsumerStatefulWidget {
  const NewTicketScreen({super.key, this.orderId, this.batchId});
  final String? orderId;
  final String? batchId;

  @override
  ConsumerState<NewTicketScreen> createState() => _NewTicketScreenState();
}

class _NewTicketScreenState extends ConsumerState<NewTicketScreen> {
  final _form = GlobalKey<FormState>();
  final _subject = TextEditingController();
  final _body = TextEditingController();
  late SupportCategory _category = widget.orderId != null
      ? SupportCategory.payment
      : (widget.batchId != null ? SupportCategory.classIssue : SupportCategory.other);
  late String? _orderId = widget.orderId;
  late String? _batchId = widget.batchId;
  bool _busy = false;

  @override
  void dispose() {
    _subject.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    try {
      final ticket = await ref.read(supportRepositoryProvider).open(TicketDraft(
            subject: _subject.text.trim(),
            category: _category,
            body: _body.text.trim(),
            orderId: _orderId,
            batchId: _batchId,
          ));
      ref.invalidate(ticketsProvider);
      if (!mounted) return;
      showToast(context, context.l10n.ticketCreated);
      context.pushReplacement(Routes.ticket(ticket.id));
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      showToast(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final locale = ref.watch(localeProvider);
    final student = ref.watch(currentUserProvider)?.role == Role.student;
    final orders = student ? (ref.watch(myOrdersProvider).value ?? const []) : const [];
    final classes = student ? (ref.watch(enrollmentsProvider).value ?? const []).map((e) => e.batch).toList() : const [];

    final orderItems = <DropdownMenuItem<String?>>[
      DropdownMenuItem(value: null, child: Text(l.ticketNone)),
      for (final o in orders) DropdownMenuItem(value: o.id, child: Text(o.batch == null ? o.reference : '${o.reference} · ${o.batch!.code}')),
      if (_orderId != null && !orders.any((o) => o.id == _orderId)) DropdownMenuItem(value: _orderId, child: Text(l.ticketThisOrder)),
    ];
    final classItems = <DropdownMenuItem<String?>>[
      DropdownMenuItem(value: null, child: Text(l.ticketNone)),
      for (final b in classes)
        DropdownMenuItem(value: b.id, child: Text('${b.code} · ${b.course?.title(locale) ?? ''}', overflow: TextOverflow.ellipsis)),
      if (_batchId != null && !classes.any((b) => b.id == _batchId)) DropdownMenuItem(value: _batchId, child: Text(l.ticketThisClass)),
    ];

    return Scaffold(
      appBar: AppBar(title: Text(l.newTicket)),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 24),
          children: [
            Text(l.newTicketIntro, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AzzaPalette.of(context).muted)),
            const SizedBox(height: 16),
            TextFormField(
              key: const Key('ticket-subject'),
              controller: _subject,
              maxLength: 140,
              textCapitalization: TextCapitalization.sentences,
              textInputAction: TextInputAction.next,
              decoration: fieldDecoration(
                label: l.ticketSubject,
                hint: l.ticketSubjectHint,
                icon: Icons.short_text_rounded,
                action: ClearFieldButton(controller: _subject),
              ),
              validator: (v) => (v ?? '').trim().isEmpty ? l.ticketSubjectRequired : null,
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<SupportCategory>(
              key: const Key('ticket-category'),
              initialValue: _category,
              decoration: fieldDecoration(label: l.ticketCategory, icon: Icons.label_outline_rounded),
              items: [for (final c in SupportCategory.values) DropdownMenuItem(value: c, child: Text(supportCategoryLabel(l, c)))],
              onChanged: (c) => setState(() => _category = c ?? _category),
            ),
            if (student || _orderId != null) ...[
              const SizedBox(height: 16),
              DropdownButtonFormField<String?>(
                key: const Key('ticket-order'),
                initialValue: _orderId,
                isExpanded: true,
                decoration: fieldDecoration(label: l.ticketOrder, icon: Icons.receipt_long_outlined),
                items: orderItems,
                onChanged: (v) => setState(() => _orderId = v),
              ),
            ],
            if (student || _batchId != null) ...[
              const SizedBox(height: 16),
              DropdownButtonFormField<String?>(
                key: const Key('ticket-class'),
                initialValue: _batchId,
                isExpanded: true,
                decoration: fieldDecoration(label: l.ticketClass, icon: Icons.groups_outlined),
                items: classItems,
                onChanged: (v) => setState(() => _batchId = v),
              ),
            ],
            const SizedBox(height: 16),
            TextFormField(
              key: const Key('ticket-body'),
              controller: _body,
              minLines: 5,
              maxLines: 12,
              maxLength: 4000,
              textCapitalization: TextCapitalization.sentences,
              keyboardType: TextInputType.multiline,
              decoration: fieldDecoration(label: l.ticketMessage, hint: l.ticketMessageHint, icon: Icons.notes_rounded),
              validator: (v) => (v ?? '').trim().isEmpty ? l.ticketMessageRequired : null,
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomActionBar(children: [
        FilledButton.icon(
          key: const Key('ticket-submit'),
          onPressed: _busy ? null : _submit,
          icon: _busy ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send_rounded),
          label: Text(l.ticketSubmit),
        ),
      ]),
    );
  }
}

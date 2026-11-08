import 'package:flutter/material.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/fields.dart';
import '../../../core/widgets/ui.dart' show TextScaleX;

/// Shared pieces for the admin back office: labels, filter chips, search, confirm dialogs, hub rows.

String orderStatusLabel(AppLocalizations l, OrderStatus s) => switch (s) {
      OrderStatus.awaitingPayment => l.orderAwaitingPayment,
      OrderStatus.awaitingReceipt => l.orderAwaitingReceipt,
      OrderStatus.verifying => l.orderVerifying,
      OrderStatus.amountMismatch => l.orderAmountMismatch,
      OrderStatus.paid => l.orderPaid,
      OrderStatus.failed => l.orderFailed,
      OrderStatus.rejected => l.orderRejected,
      OrderStatus.expired => l.orderExpired,
      OrderStatus.refunded => l.orderRefunded,
    };

String methodLabel(AppLocalizations l, PaymentMethod m) => switch (m) {
      PaymentMethod.stripe => l.payCard,
      PaymentMethod.bankTransfer => l.payBank,
      PaymentMethod.appleIap => l.payAppStore,
    };

String roleLabel(AppLocalizations l, Role r) => switch (r) {
      Role.student => l.adminRoleStudent,
      Role.teacher => l.adminRoleTeacher,
      Role.admin => l.adminRoleAdmin,
    };

String courseStatusLabel(AppLocalizations l, CourseStatus s) => switch (s) {
      CourseStatus.draft => l.batchDraft,
      CourseStatus.pendingReview => l.statusPendingReview,
      CourseStatus.published => l.statusPublished,
      CourseStatus.archived => l.statusArchived,
    };

/// A horizontally scrolling row of single-choice chips (null = "All").
class ChoiceChipsRow<T> extends StatelessWidget {
  const ChoiceChipsRow({super.key, required this.values, required this.selected, required this.label, required this.onSelected, this.keyPrefix = 'filter'});
  final List<T?> values;
  final T? selected;
  final String Function(T? value) label;
  final ValueChanged<T?> onSelected;
  final String keyPrefix;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    return SizedBox(
      height: context.scaled(48),
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: AzzaSpace.gutter),
        scrollDirection: Axis.horizontal,
        children: [
          for (final v in values)
            Padding(
              padding: const EdgeInsetsDirectional.only(end: 8),
              child: ChoiceChip(
                key: Key('$keyPrefix-${v is WireEnum ? v.wire : (v ?? 'all')}'),
                label: Text(label(v)),
                selected: selected == v,
                showCheckmark: false,
                materialTapTargetSize: MaterialTapTargetSize.padded,
                labelStyle: TextStyle(color: selected == v ? p.onAccent : p.text),
                onSelected: (_) => onSelected(v),
              ),
            ),
        ],
      ),
    );
  }
}

/// Search input group used at the top of admin lists.
class AdminSearchField extends StatelessWidget {
  const AdminSearchField({super.key, required this.controller, required this.label, required this.hint, required this.onSubmitted});
  final TextEditingController controller;
  final String label;
  final String hint;
  final ValueChanged<String> onSubmitted;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 4, AzzaSpace.gutter, 8),
        child: TextField(
          key: const Key('admin-search'),
          controller: controller,
          textInputAction: TextInputAction.search,
          onSubmitted: onSubmitted,
          decoration: fieldDecoration(
            label: label,
            hint: hint,
            icon: Icons.search_rounded,
            action: ClearFieldButton(controller: controller, onCleared: () => onSubmitted('')),
          ),
        ),
      );
}

/// Asks before a destructive or money-moving action. Resolves true only on the explicit confirm.
Future<bool> confirmAction(BuildContext context, {required String title, required String body, required String confirm, bool destructive = true}) async {
  final l = context.l10n;
  final p = AzzaPalette.of(context);
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: Text(body),
      actions: [
        TextButton(key: const Key('confirm-cancel'), onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
        FilledButton(
          key: const Key('confirm-ok'),
          style: destructive ? FilledButton.styleFrom(backgroundColor: p.danger, foregroundColor: Colors.white) : null,
          onPressed: () => Navigator.pop(context, true),
          child: Text(confirm),
        ),
      ],
    ),
  );
  return ok ?? false;
}

/// A row on a [CardGroup]: icon, title, optional detail and count, chevron. At least 56pt tall.
class HubRow extends StatelessWidget {
  const HubRow({super.key, required this.icon, required this.title, this.subtitle, this.count, this.urgent = false, required this.onTap});
  final IconData icon;
  final String title;
  final String? subtitle;
  final String? count;
  final bool urgent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    return InkWell(
      onTap: onTap,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 56),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(children: [
            Icon(icon, size: 22, color: urgent ? p.warning : p.muted),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                Text(title, style: t.titleSmall),
                if (subtitle != null) Text(subtitle!, style: t.bodySmall?.copyWith(color: p.muted)),
              ]),
            ),
            if (count != null) ...[
              const SizedBox(width: 8),
              Container(
                constraints: const BoxConstraints(minWidth: 28),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: urgent ? p.warningBg : p.line, borderRadius: BorderRadius.circular(999)),
                child: Text(count!, textAlign: TextAlign.center, style: t.labelMedium?.copyWith(color: urgent ? p.warning : p.text, fontWeight: FontWeight.w700)),
              ),
            ],
            const SizedBox(width: 4),
            Icon(Icons.chevron_right_rounded, color: p.muted),
          ]),
        ),
      ),
    );
  }
}

/// Grabber + title + scrollable body for the admin form sheets; lifts above the keyboard.
class FormSheet extends StatelessWidget {
  const FormSheet({super.key, required this.title, required this.children, this.subtitle});
  final String title;
  final String? subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 16),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(title, style: t.titleLarge),
            if (subtitle != null) ...[const SizedBox(height: 4), Text(subtitle!, style: t.bodySmall)],
            const SizedBox(height: 16),
            ...children,
          ]),
        ),
      ),
    );
  }
}

/// Opens a [FormSheet]-style bottom sheet sized to its content.
Future<T?> showFormSheet<T>(BuildContext context, WidgetBuilder builder) => showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      useSafeArea: true,
      builder: builder,
    );

/// Parses an AED amount typed by an admin (`1,250.5` or `1250,5`); null when not a positive number.
num? parseAed(String raw) {
  final v = num.tryParse(raw.trim().replaceAll(' ', '').replaceAll(RegExp(r',(?=\d{3}\b)'), '').replaceAll(',', '.'));
  return v == null || v <= 0 ? null : v;
}

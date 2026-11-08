import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/money/money.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/back_office_repository.dart';
import 'admin_widgets.dart';

/// Payments: every order, filtered by status and method, searchable by reference / student.
class AdminOrdersScreen extends ConsumerStatefulWidget {
  const AdminOrdersScreen({super.key, this.initialStatus});
  final OrderStatus? initialStatus;

  @override
  ConsumerState<AdminOrdersScreen> createState() => _AdminOrdersScreenState();
}

class _AdminOrdersScreenState extends ConsumerState<AdminOrdersScreen> {
  late OrderStatus? _status = widget.initialStatus;
  PaymentMethod? _method;
  String _q = '';
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  OrderQuery get _query => (status: _status, method: _method, q: _q);

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final orders = ref.watch(adminOrdersProvider(_query));
    final t = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: Text(l.adminPaymentsTitle)),
      body: Column(children: [
        AdminSearchField(
          controller: _search,
          label: l.adminSearchOrders,
          hint: l.adminSearchOrdersHint,
          onSubmitted: (v) => setState(() => _q = v.trim()),
        ),
        ChoiceChipsRow<OrderStatus>(
          keyPrefix: 'order-status',
          values: const [null, OrderStatus.paid, OrderStatus.verifying, OrderStatus.amountMismatch, OrderStatus.awaitingReceipt, OrderStatus.awaitingPayment, OrderStatus.refunded, OrderStatus.failed, OrderStatus.rejected, OrderStatus.expired],
          selected: _status,
          label: (s) => s == null ? l.allFilter : orderStatusLabel(l, s),
          onSelected: (s) => setState(() => _status = s),
        ),
        ChoiceChipsRow<PaymentMethod>(
          keyPrefix: 'order-method',
          values: const [null, PaymentMethod.stripe, PaymentMethod.bankTransfer, PaymentMethod.appleIap],
          selected: _method,
          label: (m) => m == null ? l.adminAnyMethod : methodLabel(l, m),
          onSelected: (m) => setState(() => _method = m),
        ),
        Expanded(
          child: AsyncView<List<AdminOrder>>(
            value: orders,
            onRetry: () => ref.invalidate(adminOrdersProvider(_query)),
            isEmpty: (list) => list.isEmpty,
            empty: EmptyState(title: l.adminNoOrders, body: l.adminNoOrdersBody, icon: Icons.receipt_long_outlined),
            data: (list) => RefreshList(
              onRefresh: () async => ref.invalidate(adminOrdersProvider(_query)),
              children: [
                for (final o in list) ...[
                  RaisedCard(
                    key: Key('order-${o.id}'),
                    padding: const EdgeInsets.all(14),
                    onTap: () => context.push(Routes.adminOrder(o.id)),
                    child: Row(children: [
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          MonoLabel(o.order.reference),
                          const SizedBox(height: 2),
                          Text(o.order.student?.name ?? '', style: t.titleSmall),
                          Text(
                            [
                              if (o.order.batch != null) '${o.order.batch!.code} · ${o.order.batch!.course?.title(locale) ?? ''}',
                              methodLabel(l, o.order.method),
                            ].join(' · '),
                            style: t.bodySmall,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ]),
                      ),
                      const SizedBox(width: 8),
                      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                        Text(f.aed(o.order.totalFils), style: t.titleSmall),
                        const SizedBox(height: 4),
                        StatusChip.order(context, o.order.status),
                      ]),
                    ]),
                  ),
                  const SizedBox(height: 10),
                ],
              ],
            ),
          ),
        ),
      ]),
    );
  }
}

/// One order: amounts, student, class, payment trail, and the refund action.
class AdminOrderScreen extends ConsumerWidget {
  const AdminOrderScreen({super.key, required this.orderId});
  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final value = ref.watch(adminOrderProvider(orderId));
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(value.value?.order.reference ?? l.adminOrderTitle)),
      body: AsyncView<AdminOrder>(
        value: value,
        onRetry: () => ref.invalidate(adminOrderProvider(orderId)),
        data: (a) {
          final o = a.order;
          return RefreshList(
            onRefresh: () async => ref.invalidate(adminOrderProvider(orderId)),
            children: [
              Row(children: [
                Expanded(child: DisplayText(f.aed(o.totalFils), size: 36, weight: FontWeight.w800)),
                StatusChip.order(context, o.status),
              ]),
              if (a.refundedFils > 0) Text(l.adminRefundedSoFar(f.aed(a.refundedFils)), style: t.bodySmall?.copyWith(color: p.warning)),
              SectionCard(
                title: l.adminOrderAmounts,
                child: Column(children: [
                  KeyValueRow(l.adminSubtotal, f.aed(o.subtotalFils)),
                  if (o.discountFils > 0) KeyValueRow(a.couponCode == null ? l.adminDiscount : '${l.adminDiscount} · ${a.couponCode}', '− ${f.aed(o.discountFils)}'),
                  KeyValueRow(l.adminVat, f.aed(o.vatFils)),
                  if (a.feeFils > 0) KeyValueRow(l.adminProcessorFee, f.aed(a.feeFils)),
                  if (o.receivedFils != null) KeyValueRow(l.adminReceived, f.aed(o.receivedFils!)),
                  KeyValueRow(l.adminTotal, f.aed(o.totalFils), emphasize: true),
                ]),
              ),
              SectionCard(
                title: l.adminOrderPeople,
                child: Column(children: [
                  KeyValueRow(l.studentLabel, o.student?.name ?? '—'),
                  if (a.email != null) KeyValueRow(l.email, a.email!),
                  if (o.batch != null) KeyValueRow(l.adminClass, '${o.batch!.code} · ${o.batch!.course?.title(locale) ?? ''}'),
                ]),
              ),
              SectionCard(
                title: l.adminOrderTrail,
                child: Column(children: [
                  KeyValueRow(l.adminMethod, methodLabel(l, o.method)),
                  if (o.createdAt != null) KeyValueRow(l.adminCreated, f.dayTime(o.createdAt!)),
                  if (o.paidAt != null) KeyValueRow(l.adminPaidAt, f.dayTime(o.paidAt!)),
                  if (a.verifiedBy != null) KeyValueRow(l.adminVerifiedBy, a.verifiedBy!),
                  if (o.rejectionReason != null) KeyValueRow(l.reason, o.rejectionReason!),
                ]),
              ),
              if (o.method == PaymentMethod.appleIap && o.status == OrderStatus.paid) ...[
                const SizedBox(height: 12),
                RaisedCard(color: p.infoBg, child: Text(l.adminAppleRefundNote, style: t.bodyMedium)),
              ],
            ],
          );
        },
      ),
      bottomNavigationBar: value.hasValue && value.requireValue.canRefund
          ? BottomActionBar(children: [
              OutlinedButton.icon(
                key: const Key('refund-order'),
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48), foregroundColor: p.danger),
                icon: const Icon(Icons.undo_rounded),
                label: Text(l.adminRefund),
                onPressed: () async {
                  final done = await showRefundSheet(context, value.requireValue);
                  if (done == null || !context.mounted) return;
                  ref
                    ..invalidate(adminOrderProvider(orderId))
                    ..invalidate(adminOrdersProvider);
                  showToast(context, done.manual ? l.adminRefundManualDone(f.aed(done.refundFils)) : l.adminRefundDone(f.aed(done.refundFils)));
                },
              ),
            ])
          : null,
    );
  }
}

/// Amount (defaults to everything refundable) + reason, then a confirm. Resolves with the result once the API accepted it.
Future<RefundResult?> showRefundSheet(BuildContext context, AdminOrder order) =>
    showFormSheet<RefundResult>(context, (_) => _RefundSheet(order: order));

class _RefundSheet extends ConsumerStatefulWidget {
  const _RefundSheet({required this.order});
  final AdminOrder order;

  @override
  ConsumerState<_RefundSheet> createState() => _RefundSheetState();
}

class _RefundSheetState extends ConsumerState<_RefundSheet> {
  late final _amount = TextEditingController(text: Money.filsToAed(widget.order.refundableFils).toStringAsFixed(2));
  final _reason = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _amount.dispose();
    _reason.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l = context.l10n;
    final f = ref.read(fmtProvider);
    final aed = parseAed(_amount.text);
    final fils = aed == null ? null : Money.aedToFils(aed);
    if (fils == null) return setState(() => _error = l.adminAmountInvalid);
    if (fils > widget.order.refundableFils) return setState(() => _error = l.adminRefundTooLarge(f.aed(widget.order.refundableFils)));
    if (_reason.text.trim().length < 3) return setState(() => _error = l.adminReasonRequired);
    setState(() => _error = null);
    final full = fils == widget.order.refundableFils && widget.order.refundedFils == 0;
    final ok = await confirmAction(
      context,
      title: l.adminRefundConfirmTitle(f.aed(fils)),
      body: full ? l.adminRefundConfirmFull : l.adminRefundConfirmPartial,
      confirm: l.adminRefund,
    );
    if (!ok || !mounted) return;
    setState(() => _busy = true);
    try {
      final result = await ref.read(backOfficeRepositoryProvider).refund(widget.order.id, amountFils: fils, reason: _reason.text);
      if (mounted) Navigator.pop(context, result);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final p = AzzaPalette.of(context);
    final o = widget.order;
    return FormSheet(
      title: l.adminRefundTitle,
      subtitle: l.adminRefundSubtitle(o.order.reference, f.aed(o.refundableFils)),
      children: [
        TextField(
          key: const Key('refund-amount'),
          controller: _amount,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
          textDirection: TextDirection.ltr,
          decoration: fieldDecoration(label: l.adminRefundAmount, icon: Icons.payments_outlined, prefixText: 'AED ', helper: l.adminRefundAmountHelper),
        ),
        const SizedBox(height: 12),
        TextField(
          key: const Key('refund-reason'),
          controller: _reason,
          minLines: 2,
          maxLines: 4,
          decoration: fieldDecoration(label: l.reason, icon: Icons.notes_rounded, hint: l.adminRefundReasonHint),
        ),
        if (o.order.method == PaymentMethod.bankTransfer) ...[
          const SizedBox(height: 10),
          Text(l.adminRefundBankNote, style: Theme.of(context).textTheme.bodySmall),
        ],
        if (_error != null) ...[
          const SizedBox(height: 10),
          Text(_error!, key: const Key('refund-error'), style: TextStyle(color: p.danger)),
        ],
        const SizedBox(height: 16),
        FilledButton(
          key: const Key('refund-submit'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48), backgroundColor: p.danger, foregroundColor: Colors.white),
          onPressed: _busy ? null : _submit,
          child: _busy ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : Text(l.adminRefund),
        ),
      ],
    );
  }
}

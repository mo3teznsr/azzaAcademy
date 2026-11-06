import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/config/app_config.dart';
import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/realtime/socket_events.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/links.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/checkout_repository.dart';
import '../domain/apple_iap.dart';
import '../domain/checkout_models.dart';

/// Payment status: timeline while finance verifies, rejected / mismatch variant, success.
class OrderStatusScreen extends ConsumerStatefulWidget {
  const OrderStatusScreen({super.key, required this.orderId});
  final String orderId;

  @override
  ConsumerState<OrderStatusScreen> createState() => _OrderStatusScreenState();
}

class _OrderStatusScreenState extends ConsumerState<OrderStatusScreen> {
  void Function()? _unsub;

  @override
  void initState() {
    super.initState();
    final rt = ref.read(realtimeClientProvider);
    rt.connect().then((_) {
      if (!mounted) return;
      _unsub = rt.on(SocketEvents.orderUpdated, (p) {
        if (p['id'] == widget.orderId || p['orderId'] == widget.orderId) ref.invalidate(orderProvider(widget.orderId));
      });
    }, onError: (_) {});
  }

  @override
  void dispose() {
    _unsub?.call();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final order = ref.watch(orderProvider(widget.orderId));
    return Scaffold(
      appBar: AppBar(title: order.hasValue ? MonoLabel(l.orderRef(order.requireValue.reference)) : null),
      body: AsyncView<Order>(
        value: order,
        onRetry: () => ref.invalidate(orderProvider(widget.orderId)),
        data: (o) => RefreshList(
          onRefresh: () async => ref.invalidate(orderProvider(widget.orderId)),
          children: [_OrderBody(order: o)],
        ),
      ),
    );
  }
}

class _OrderBody extends ConsumerWidget {
  const _OrderBody({required this.order});
  final Order order;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final o = order;
    final code = o.batch?.code ?? '';

    if (o.status == OrderStatus.paid) {
      return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        StatusChip.order(context, o.status),
        const SizedBox(height: 16),
        DisplayText(l.youreIn, size: 56, weight: FontWeight.w800),
        const SizedBox(height: 24),
        FilledButton(onPressed: () => context.pushReplacement(Routes.enrolled(o.id)), child: Text(l.continueLabel)),
      ]);
    }

    final problem = o.status == OrderStatus.rejected || o.status == OrderStatus.amountMismatch;
    final steps = <(String, String?, bool, bool)>[
      (l.tlOrderCreated, o.createdAt == null ? null : f.dayTime(o.createdAt!), true, false),
      (l.tlReceiptUploaded, o.receiptUploadedAt == null ? null : f.dayTime(o.receiptUploadedAt!), o.receiptUploadedAt != null, false),
      (problem ? l.rejectedTitle : l.tlFinanceVerifying, null, o.status == OrderStatus.verifying || problem, problem),
      (l.tlSeatConfirmed, null, false, false),
    ];

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      StatusChip.order(context, o.status),
      const SizedBox(height: 16),
      DisplayText(
        switch (o.status) {
          OrderStatus.failed => l.orderFailed,
          OrderStatus.expired => l.orderExpired,
          OrderStatus.refunded => l.orderRefunded,
          _ => l.almostOnAir,
        },
        size: 44,
      ),
      const SizedBox(height: 10),
      Text(
        switch (o.status) {
          OrderStatus.failed => l.orderFailedBody,
          OrderStatus.expired => l.orderExpiredBody,
          _ => l.verifyingBody(code, f.aed(o.totalFils)),
        },
        style: t.bodyLarge,
      ),
      const SizedBox(height: 24),
      if (o.method == PaymentMethod.bankTransfer && o.status != OrderStatus.expired)
        for (final (i, s) in steps.indexed) _TimelineStep(title: s.$1, sub: s.$2, done: s.$3, problem: s.$4, last: i == steps.length - 1),
      if (problem) ...[
        const SizedBox(height: 16),
        RaisedCard(
          key: const Key('order-rejected'),
          color: AzzaPalette.of(context).warningBg,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(l.rejectedTitle, style: t.titleSmall),
            const SizedBox(height: 6),
            Text(
              [
                if (o.receivedFils != null) '${l.receivedStatement}: ${f.aed(o.receivedFils!)}',
                ?o.rejectionReason,
              ].join('\n'),
              style: t.bodyMedium,
            ),
          ]),
        ),
        const SizedBox(height: 16),
        // iOS never leads to bank transfer (guideline 3.1.1); support can still help.
        if (!usesAppStorePayments) FilledButton(onPressed: () => context.push(Routes.bankTransfer(o.id)), child: Text(l.reupload)),
        const SizedBox(height: 8),
        OutlinedButton(
            onPressed: () => openExternal(context, 'mailto:${AppConfig.supportEmail}?subject=${Uri.encodeComponent('Order ${o.id}')}'),
            child: Text(l.contactSupport)),
      ],
      if (usesAppStorePayments && o.awaitsAppStorePurchase) ...[
        const SizedBox(height: 16),
        FilledButton(
          key: const Key('order-pay-app-store'),
          onPressed: () => context.push(Routes.applePayment(o.id)),
          child: Text(l.payWithAppStore),
        ),
      ],
      if (o.needsReceipt && !problem && !usesAppStorePayments) ...[
        const SizedBox(height: 16),
        FilledButton(onPressed: () => context.push(Routes.bankTransfer(o.id)), child: Text(l.uploadReceipt.split('(').first.trim())),
      ],
      if (o.status == OrderStatus.failed || o.status == OrderStatus.expired) ...[
        const SizedBox(height: 16),
        FilledButton(onPressed: () => context.pushReplacement(Routes.checkout(o.batch?.id ?? '')), child: Text(l.retry)),
      ],
    ]);
  }
}

class _TimelineStep extends StatelessWidget {
  const _TimelineStep({required this.title, this.sub, required this.done, required this.problem, required this.last});
  final String title;
  final String? sub;
  final bool done;
  final bool problem;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    final color = problem ? p.danger : (done ? AzzaColors.green : p.line);
    return IntrinsicHeight(
      child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Column(children: [
          Container(
            width: 18,
            height: 18,
            decoration: BoxDecoration(shape: BoxShape.circle, color: done || problem ? color : null, border: Border.all(color: color, width: 2)),
            child: done && !problem ? const Icon(Icons.check, size: 12, color: AzzaColors.inkDeep) : null,
          ),
          if (!last) Expanded(child: Container(width: 2, color: p.line)),
        ]),
        const SizedBox(width: 14),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 20),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: Theme.of(context).textTheme.titleSmall?.copyWith(color: done || problem ? p.text : p.muted)),
              if (sub != null) Text(sub!, style: Theme.of(context).textTheme.bodySmall),
            ]),
          ),
        ),
      ]),
    );
  }
}

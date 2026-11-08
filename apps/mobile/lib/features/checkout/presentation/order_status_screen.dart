import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/realtime/socket_events.dart';
import '../../../core/site/site_settings.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/links.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/checkout_repository.dart';
import '../domain/apple_iap.dart';
import '../domain/checkout_models.dart';

/// Payment status: timeline while finance verifies, rejected / mismatch variant, success.
/// Card (Stripe Checkout) orders are confirmed only by the webhook, so while one is open the screen polls the
/// order every [pollEvery] and again whenever the app comes back to the foreground (the student returning from
/// the payment page), until it is PAID, FAILED or EXPIRED.
class OrderStatusScreen extends ConsumerStatefulWidget {
  const OrderStatusScreen({super.key, required this.orderId, this.checkoutUrl});
  final String orderId;

  /// Stripe Checkout's page, when we just came from checkout: offered again if the student closed it.
  final String? checkoutUrl;

  static const pollEvery = Duration(seconds: 3);

  /// Statuses that end a card payment; polling stops there.
  static bool settled(OrderStatus s) =>
      s == OrderStatus.paid || s == OrderStatus.failed || s == OrderStatus.expired || s == OrderStatus.refunded;

  @override
  ConsumerState<OrderStatusScreen> createState() => _OrderStatusScreenState();
}

class _OrderStatusScreenState extends ConsumerState<OrderStatusScreen> with WidgetsBindingObserver {
  void Function()? _unsub;
  Timer? _poll;

  bool _shouldPoll(Order? o) => o != null && o.method == PaymentMethod.stripe && !OrderStatusScreen.settled(o.status);

  void _refresh() => ref.invalidate(orderProvider(widget.orderId));

  /// Starts or stops the 3 s poll to match the latest order.
  void _syncPolling(Order? o) {
    if (_shouldPoll(o)) {
      _poll ??= Timer.periodic(OrderStatusScreen.pollEvery, (_) {
        if (mounted) _refresh();
      });
    } else {
      _poll?.cancel();
      _poll = null;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _shouldPoll(ref.read(orderProvider(widget.orderId)).value)) _refresh();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Start polling once the order loads; stop when it settles.
    ref.listenManual(orderProvider(widget.orderId), (_, next) {
      if (next.hasValue) _syncPolling(next.value);
    }, fireImmediately: true);
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
    WidgetsBinding.instance.removeObserver(this);
    _poll?.cancel();
    _unsub?.call();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final order = ref.watch(orderProvider(widget.orderId));
    return Scaffold(
      appBar: AppBar(title: order.hasValue ? Kicker(l.orderRef(order.requireValue.reference)) : null),
      body: AsyncView<Order>(
        value: order,
        onRetry: () => ref.invalidate(orderProvider(widget.orderId)),
        data: (o) => RefreshList(
          onRefresh: () async => ref.invalidate(orderProvider(widget.orderId)),
          children: [_OrderBody(order: o, checkoutUrl: widget.checkoutUrl)],
        ),
      ),
    );
  }
}

class _OrderBody extends ConsumerWidget {
  const _OrderBody({required this.order, this.checkoutUrl});
  final Order order;
  final String? checkoutUrl;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final supportEmail = ref.watch(supportEmailProvider);
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

    final cardPending = o.method == PaymentMethod.stripe && !OrderStatusScreen.settled(o.status);
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
          _ when cardPending => l.confirmingPayment,
          _ => l.almostOnAir,
        },
        size: 44,
      ),
      const SizedBox(height: 10),
      Text(
        switch (o.status) {
          OrderStatus.failed => l.orderFailedBody,
          OrderStatus.expired => l.orderExpiredBody,
          _ when cardPending => l.confirmingPaymentBody(code, f.aed(o.totalFils)),
          _ => l.verifyingBody(code, f.aed(o.totalFils)),
        },
        style: t.bodyLarge,
      ),
      if (cardPending) ...[
        const SizedBox(height: 16),
        Row(key: const Key('order-polling'), children: [
          const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2)),
          const SizedBox(width: 10),
          Expanded(child: Text(l.checkingPayment, style: t.bodySmall)),
        ]),
        if (checkoutUrl != null) ...[
          const SizedBox(height: 16),
          OutlinedButton.icon(
            key: const Key('order-open-payment-page'),
            onPressed: () => ref.read(checkoutPageOpenerProvider)(checkoutUrl!),
            icon: const Icon(Icons.open_in_new_rounded, size: 18),
            label: Text(l.openPaymentPage),
          ),
        ],
      ],
      const SizedBox(height: 12),
      if (o.method == PaymentMethod.bankTransfer && o.status != OrderStatus.expired)
        SectionCard(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            for (final (i, s) in steps.indexed) _TimelineStep(title: s.$1, sub: s.$2, done: s.$3, problem: s.$4, last: i == steps.length - 1),
          ]),
        ),
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
            onPressed: () => openExternal(context, 'mailto:$supportEmail?subject=${Uri.encodeComponent('Order ${o.id}')}'),
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
      const SizedBox(height: 16),
      Center(
        child: TextButton.icon(
          key: const Key('order-need-help'),
          style: TextButton.styleFrom(minimumSize: const Size(48, 44)),
          onPressed: () => context.push(Routes.newTicket(orderId: o.id)),
          icon: const Icon(Icons.support_agent_rounded, size: 20),
          label: Text(l.needHelp),
        ),
      ),
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

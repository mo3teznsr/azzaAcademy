import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/app_store_gateway.dart';
import '../data/checkout_repository.dart';
import '../domain/checkout_models.dart';
import 'apple_purchase_coordinator.dart';

/// iOS: pays an APPLE_IAP order with StoreKit. Shows only the App Store's own (localized, tax-inclusive) price.
class ApplePaymentScreen extends ConsumerStatefulWidget {
  const ApplePaymentScreen({super.key, required this.orderId, this.autoStart = false});
  final String orderId;

  /// Opened straight from checkout: present the App Store sheet without a second tap.
  final bool autoStart;

  @override
  ConsumerState<ApplePaymentScreen> createState() => _ApplePaymentScreenState();
}

class _ApplePaymentScreenState extends ConsumerState<ApplePaymentScreen> {
  StreamSubscription<ApplePurchaseEvent>? _sub;
  ApplePurchasePhase? _phase;
  String? _message;
  bool _busy = false;
  bool _autoStarted = false;

  @override
  void initState() {
    super.initState();
    _sub = ref.read(appleIapCoordinatorProvider).events.listen(_onEvent);
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  void _onEvent(ApplePurchaseEvent e) {
    final order = ref.read(orderProvider(widget.orderId)).value;
    if (!mounted || order == null || e.productId != order.appleProductId) return;
    if (e.phase == ApplePurchasePhase.paid && e.order?.id == widget.orderId) {
      ref.invalidate(orderProvider(widget.orderId));
      context.pushReplacement(Routes.enrolled(widget.orderId));
      return;
    }
    setState(() {
      _phase = e.phase;
      _message = e.message;
      _busy = e.phase == ApplePurchasePhase.confirming;
    });
    if (e.phase == ApplePurchasePhase.cancelled) showToast(context, context.l10n.paymentCancelled);
  }

  Future<void> _buy(Order order) async {
    setState(() {
      _busy = true;
      _phase = null;
      _message = null;
    });
    try {
      await ref.read(appleIapCoordinatorProvider).buy(order);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      // The sheet's outcome arrives on the coordinator's events; only `confirming` keeps the button busy.
      if (mounted && _phase != ApplePurchasePhase.confirming) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final locale = ref.watch(localeProvider);
    final order = ref.watch(orderProvider(widget.orderId));
    final productId = order.value?.appleProductId;
    final product = productId == null ? null : ref.watch(appStoreProductProvider(productId));
    final o = order.value;
    final payable = o != null && o.awaitsAppStorePurchase && product?.value != null;

    if (widget.autoStart && !_autoStarted && payable) {
      _autoStarted = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _buy(o);
      });
    }

    return Scaffold(
      appBar: AppBar(title: Text(l.payWithAppStore)),
      body: AsyncView<Order>(
        value: order,
        onRetry: () => ref.invalidate(orderProvider(widget.orderId)),
        data: (o) {
          if (!o.awaitsAppStorePurchase) {
            return EmptyState(title: l.orderRef(o.reference), action: l.continueLabel, onAction: () => context.pushReplacement(Routes.order(o.id)));
          }
          final status = switch (_phase) {
            ApplePurchasePhase.pending => l.appStorePending,
            ApplePurchasePhase.confirming => l.appStoreConfirming,
            ApplePurchasePhase.failed => [l.appStoreFailed, ?_message].join('\n'),
            ApplePurchasePhase.retryLater => l.appStoreRetryLater,
            ApplePurchasePhase.rejected => [l.appStoreRejected, ?_message].join('\n'),
            _ => null,
          };
          return ListView(
            padding: const EdgeInsets.all(AzzaSpace.gutter),
            children: [
              RaisedCard(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  MonoLabel(l.orderRef(o.reference)),
                  const SizedBox(height: 8),
                  Text(o.batch?.course?.title(locale) ?? o.batch?.code ?? '', style: t.titleMedium),
                  const SizedBox(height: 12),
                  switch (product) {
                    null => const SizedBox.shrink(),
                    AsyncValue(:final value?) => DisplayText(value.price, size: 40),
                    AsyncValue(hasValue: true) => Text(l.enrolOnWebsiteBody, style: t.bodyMedium),
                    AsyncValue(:final error?) => Text(AppException.from(error).message, style: t.bodyMedium),
                    _ => const SizedBox(height: 40, child: Center(child: CircularProgressIndicator(strokeWidth: 2))),
                  },
                ]),
              ),
              const SizedBox(height: 20),
              Row(children: [
                Icon(Icons.apple_rounded, color: p.text),
                const SizedBox(width: 8),
                Expanded(child: Text(l.payAppStoreSub, style: t.bodyMedium)),
              ]),
              const SizedBox(height: 12),
              Text(l.appStoreNote, style: t.bodySmall),
              if (status != null) ...[
                const SizedBox(height: 20),
                RaisedCard(key: const Key('apple-status'), child: Text(status, style: t.bodyMedium)),
              ],
            ],
          );
        },
      ),
      bottomNavigationBar: payable
          ? BottomActionBar(children: [
              FilledButton(
                key: const Key('apple-buy'),
                onPressed: _busy || _phase == ApplePurchasePhase.pending ? null : () => _buy(o),
                child: _busy
                    ? SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2, color: p.onAccent))
                    : Text(l.appStoreBuy(product!.requireValue!.price)),
              ),
            ])
          : null,
    );
  }
}

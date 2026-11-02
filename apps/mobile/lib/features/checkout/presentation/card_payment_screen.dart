import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/checkout_repository.dart';
import '../domain/checkout_models.dart';

/// Card payment via Stripe Payment Sheet (Apple Pay / Google Pay / card, 3-D Secure), charged in AED.
class CardPaymentScreen extends ConsumerStatefulWidget {
  const CardPaymentScreen({super.key, required this.orderId, this.clientSecret});
  final String orderId;
  final String? clientSecret;

  @override
  ConsumerState<CardPaymentScreen> createState() => _CardPaymentScreenState();
}

class _CardPaymentScreenState extends ConsumerState<CardPaymentScreen> {
  bool _busy = false;

  Future<void> _pay() async {
    final secret = widget.clientSecret;
    if (secret == null) return;
    setState(() => _busy = true);
    final l = context.l10n;
    final dark = AzzaPalette.of(context).isDark;
    try {
      final outcome = await ref.read(paymentSheetGatewayProvider).present(clientSecret: secret, merchantName: 'Azza', dark: dark);
      if (!mounted) return;
      if (outcome == PaymentSheetOutcome.completed) {
        // The webhook marks the order PAID; the status screen follows it live.
        context.pushReplacement(Routes.order(widget.orderId));
      } else {
        showToast(context, l.paymentCancelled);
      }
    } catch (e) {
      if (mounted) showToast(context, AppException.from(e).message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final order = ref.watch(orderProvider(widget.orderId));
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final gateway = ref.watch(paymentSheetGatewayProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.payByCard)),
      body: AsyncView<Order>(
        value: order,
        onRetry: () => ref.invalidate(orderProvider(widget.orderId)),
        data: (o) {
          if (widget.clientSecret == null || !gateway.available) {
            return EmptyState(
              title: l.stripeUnavailable,
              action: l.payBank,
              onAction: () => context.pushReplacement(Routes.checkout(o.batch?.id ?? '')),
            );
          }
          return ListView(
            padding: const EdgeInsets.all(AzzaSpace.gutter),
            children: [
              RaisedCard(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  MonoLabel(l.orderRef(o.reference)),
                  const SizedBox(height: 8),
                  Text(o.batch?.course?.title(locale) ?? o.batch?.code ?? '', style: t.titleMedium),
                  const SizedBox(height: 12),
                  DisplayText(f.aed(o.totalFils), size: 40),
                  if (!o.displayCurrency.isBase)
                    Text(f.money(o.totalFils, o.displayCurrency, o.fxRate), style: t.bodySmall),
                ]),
              ),
              const SizedBox(height: 20),
              Row(children: [
                const Icon(Icons.apple_rounded),
                const SizedBox(width: 8),
                const Text('Apple Pay'),
                const SizedBox(width: 20),
                const Icon(Icons.g_mobiledata_rounded, size: 30),
                const Text('Google Pay'),
                const SizedBox(width: 20),
                const Icon(Icons.credit_card_rounded),
              ]),
              const SizedBox(height: 20),
              Text(l.cardNote(f.aed(o.totalFils)), style: t.bodyMedium),
              const SizedBox(height: 20),
              Row(children: [
                Icon(Icons.lock_outline_rounded, size: 16, color: AzzaPalette.of(context).muted),
                const SizedBox(width: 6),
                Expanded(child: Text(l.securedByStripe, style: t.bodySmall)),
              ]),
            ],
          );
        },
      ),
      bottomNavigationBar: order.hasValue && widget.clientSecret != null && gateway.available
          ? BottomActionBar(children: [
              FilledButton(
                onPressed: _busy ? null : _pay,
                child: Text(l.payAmount(f.aed(order.requireValue.totalFils))),
              ),
            ])
          : null,
    );
  }
}

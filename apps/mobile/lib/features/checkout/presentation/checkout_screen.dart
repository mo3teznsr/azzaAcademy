import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/money/money.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../catalog/presentation/catalog_widgets.dart';
import '../data/checkout_repository.dart';
import '../domain/checkout_models.dart';

typedef QuoteKey = ({String batchId, String coupon, DisplayCurrency currency});

final quoteProvider = FutureProvider.autoDispose.family<Quote, QuoteKey>((ref, k) {
  return ref.watch(checkoutRepositoryProvider).quote(CheckoutRequest(
        batchId: k.batchId,
        method: PaymentMethod.stripe,
        couponCode: k.coupon.isEmpty ? null : k.coupon,
        displayCurrency: k.currency,
      ));
});

/// Checkout step 2/3: display currency, coupon, payment method. Always charged in AED.
class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key, required this.batchId});
  final String batchId;

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _coupon = TextEditingController();
  String _appliedCoupon = '';
  PaymentMethod? _method;
  bool _busy = false;

  @override
  void dispose() {
    _coupon.dispose();
    super.dispose();
  }

  Future<void> _continue(DisplayCurrency currency) async {
    final method = _method;
    if (method == null) return;
    setState(() => _busy = true);
    try {
      final result = await ref.read(checkoutRepositoryProvider).checkout(CheckoutRequest(
            batchId: widget.batchId,
            method: method,
            couponCode: _appliedCoupon.isEmpty ? null : _appliedCoupon,
            displayCurrency: currency,
          ));
      if (!mounted) return;
      if (result.waitlisted) {
        // 202 `{ waitlisted: true, enrollment }`: the batch filled up meanwhile.
        showToast(context, context.l10n.waitlist);
        context.go(Routes.studentHome);
        return;
      }
      final id = result.order.id;
      if (method == PaymentMethod.stripe) {
        context.pushReplacement(Routes.cardPayment(id), extra: result.clientSecret);
      } else {
        context.pushReplacement(Routes.bankTransfer(id));
      }
    } catch (e) {
      final err = AppException.from(e);
      final details = err.details;
      // 409 `details: { code: ORDER_IN_PROGRESS, orderId }` → resume that order instead of failing.
      if (mounted && details is Map && details['code'] == 'ORDER_IN_PROGRESS' && details['orderId'] is String) {
        context.pushReplacement(Routes.order(details['orderId'] as String));
        return;
      }
      if (mounted) showToast(context, err.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final currency = ref.watch(displayCurrencyProvider);
    final fx = ref.watch(fxRatesProvider).value ?? FxRates.fallback;
    final rate = fx.rateFor(currency);
    final batch = ref.watch(batchProvider(widget.batchId));
    final key = (batchId: widget.batchId, coupon: _appliedCoupon, currency: currency);
    final quote = ref.watch(quoteProvider(key));
    final stripe = ref.watch(paymentSheetGatewayProvider);
    _method ??= stripe.available ? PaymentMethod.stripe : PaymentMethod.bankTransfer;
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l.checkoutTitle),
        actions: [Padding(padding: const EdgeInsetsDirectional.only(end: 16), child: Center(child: MonoLabel(l.stepOf('2', '3'))))],
      ),
      body: AsyncView<Batch>(
        value: batch,
        onRetry: () => ref.invalidate(batchProvider(widget.batchId)),
        data: (b) => ListView(
          padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 24),
          children: [
            RaisedCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Slate(b.code),
                  const SizedBox(width: 8),
                  MonoLabel('${f.n(b.seatsTaken)}/${f.n(b.capacity)} ${l.seatsLabel}'),
                ]),
                const SizedBox(height: 10),
                Text(b.course?.title(locale) ?? '', style: t.titleMedium),
                const SizedBox(height: 4),
                Text(
                  [
                    scheduleLabel(f, b.schedule),
                    if (b.startsOn != null && b.endsOn != null) '${f.shortDate(b.startsOn!)} → ${f.shortDate(b.endsOn!)}',
                    l.liveSessionsN(f.n(b.sessionCount)),
                    ?b.teacher?.name,
                  ].join(' · '),
                  style: t.bodySmall,
                ),
              ]),
            ),
            SectionHeader(l.showPricesIn),
            Row(children: [
              for (final c in DisplayCurrency.values)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsetsDirectional.only(end: 6),
                    child: _CurrencyChip(
                      code: c.wire,
                      sub: c.isBase ? '× 1' : (fx.has(c) ? '× ${f.n(fx.rateFor(c).toStringAsFixed(2))}' : '—'),
                      selected: c == currency,
                      onTap: fx.has(c) ? () => ref.read(displayCurrencyProvider.notifier).set(c) : null,
                    ),
                  ),
                ),
            ]),
            const SizedBox(height: 20),
            AsyncView<Quote>(
              value: quote,
              compact: true,
              onRetry: () => ref.invalidate(quoteProvider(key)),
              data: (q) => Column(children: [
                KeyValueRow(l.batchPrice, f.money(q.subtotalFils, currency, rate)),
                if (q.discountFils > 0)
                  KeyValueRow('${l.discount}${_appliedCoupon.isEmpty ? '' : ' · $_appliedCoupon'}', '− ${f.money(q.discountFils, currency, rate)}',
                      valueColor: AzzaColors.sage),
                if (q.vatFils > 0) KeyValueRow(l.vat, f.money(q.vatFils, currency, rate)),
                Divider(color: p.line),
                KeyValueRow(l.total, f.money(q.totalFils, currency, rate), emphasize: true),
                const SizedBox(height: 4),
                Text(
                  currency.isBase ? l.chargedExact : l.chargedInAed(f.aed(q.totalFils), currency.wire, f.n(rate.toStringAsFixed(4))),
                  style: t.bodySmall,
                ),
              ]),
            ),
            const SizedBox(height: 16),
            Row(children: [
              Expanded(
                child: TextField(
                  controller: _coupon,
                  textCapitalization: TextCapitalization.characters,
                  decoration: InputDecoration(labelText: l.coupon),
                ),
              ),
              const SizedBox(width: 10),
              OutlinedButton(
                onPressed: () => setState(() => _appliedCoupon = _coupon.text.trim().toUpperCase()),
                child: Text(l.apply),
              ),
            ]),
            if (_appliedCoupon.isNotEmpty && quote.hasError) ...[
              const SizedBox(height: 6),
              Text(l.couponInvalid, style: t.bodySmall?.copyWith(color: AzzaColors.peach)),
            ],
            SectionHeader(l.payWith),
            OptionTile(
              key: const Key('method-card'),
              title: l.payCard,
              subtitle: stripe.available ? l.payCardSub : l.stripeUnavailable,
              leading: const Icon(Icons.credit_card_rounded),
              selected: _method == PaymentMethod.stripe,
              onTap: stripe.available ? () => setState(() => _method = PaymentMethod.stripe) : () => showToast(context, l.stripeUnavailable),
            ),
            const SizedBox(height: 10),
            OptionTile(
              key: const Key('method-bank'),
              title: l.payBank,
              subtitle: l.payBankSub,
              leading: const Icon(Icons.account_balance_rounded),
              selected: _method == PaymentMethod.bankTransfer,
              onTap: () => setState(() => _method = PaymentMethod.bankTransfer),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomActionBar(children: [
        FilledButton(
          onPressed: _busy || !quote.hasValue ? null : () => _continue(currency),
          child: _busy
              ? SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2, color: p.onAccent))
              : Text(l.continueAmount(quote.hasValue ? f.aed(quote.requireValue.totalFils) : '…')),
        ),
      ]),
    );
  }
}

class _CurrencyChip extends StatelessWidget {
  const _CurrencyChip({required this.code, required this.sub, required this.selected, this.onTap});
  final String code;
  final String sub;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    return Semantics(
      selected: selected,
      button: true,
      label: code,
      child: Material(
        color: selected ? p.accent : p.raised,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: selected ? p.accent : p.line)),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Column(children: [
              Text(code, style: Theme.of(context).textTheme.titleSmall?.copyWith(color: selected ? p.onAccent : p.text)),
              MonoLabel(sub, size: 9, color: selected ? p.onAccent : p.muted),
            ]),
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/checkout/data/checkout_repository.dart' show fxRatesProvider;
import '../domain/enums.dart';
import '../l10n/l10n.dart';
import '../money/money.dart';
import '../prefs/app_prefs.dart';
import '../theme/tokens.dart';
import '../utils/formatters.dart';

/// How a student sees an AED amount: in their Display currency (Profile), converted with the latest FX
/// snapshot. Seats are always charged in AED; converted amounts are estimates (`≈`).
@immutable
class PriceFormat {
  const PriceFormat({required this.fmt, required this.currency, this.fx});

  final Fmt fmt;

  /// The student's preferred display currency.
  final DisplayCurrency currency;

  /// Null while the rates are still loading.
  final FxRates? fx;

  /// The preferred currency has no rate (the FX endpoint failed or does not list it): amounts fall back to AED.
  bool get ratesMissing => fx != null && !currency.isBase && !fx!.has(currency);

  /// The currency amounts are actually shown in.
  DisplayCurrency get shown => fx == null || ratesMissing ? DisplayCurrency.aed : currency;

  /// Whether amounts are converted estimates (anything other than AED).
  bool get converted => !shown.isBase;

  double get rate => fx?.rateFor(shown) ?? 1;

  /// `≈ SAR 899` or `AED 880.00`.
  String display(int fils) => fmt.money(fils, shown, rate);

  /// The exact amount charged: `AED 880.00`.
  String aed(int fils) => fmt.aed(fils);
}

/// Rebuilds whenever the Display currency, the language/digits or the FX rates change.
final priceFormatProvider = Provider<PriceFormat>(
  (ref) => PriceFormat(
    fmt: ref.watch(fmtProvider),
    currency: ref.watch(displayCurrencyProvider),
    fx: ref.watch(fxRatesProvider).value,
  ),
);

/// A student-facing price. Shows the display-currency amount (`≈` when not AED) and, with [showCharged],
/// a small "Charged as AED X" line. When the rates are unavailable it shows AED with a small hint.
///
/// [Price.from] is the course's "from" price: "From ≈ SAR 551", or "No open batches" when there is none.
class Price extends ConsumerWidget {
  const Price(
    int this.fils, {
    super.key,
    this.style,
    this.showCharged = false,
    this.label,
    this.crossAxisAlignment = CrossAxisAlignment.start,
    this.textAlign,
  }) : from = false;

  const Price.from(
    this.fils, {
    super.key,
    this.style,
    this.showCharged = false,
    this.crossAxisAlignment = CrossAxisAlignment.start,
    this.textAlign,
  })  : from = true,
        label = null;

  /// Amount in fils (AED × 100). Only null for [Price.from].
  final int? fils;
  final TextStyle? style;
  final bool showCharged;
  final bool from;

  /// Wraps the formatted amount, e.g. `l.continueWithPrice`.
  final String Function(String price)? label;
  final CrossAxisAlignment crossAxisAlignment;
  final TextAlign? textAlign;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final pf = ref.watch(priceFormatProvider);
    final p = AzzaPalette.of(context);
    final small = Theme.of(context).textTheme.bodySmall?.copyWith(color: p.muted);
    final amount = fils;
    if (amount == null) {
      return Text(l.noOpenBatchesShort, key: const Key('price-none'), style: (style ?? small)?.copyWith(color: p.muted), textAlign: textAlign);
    }
    final shown = pf.display(amount);
    final main = from ? l.fromPrice(shown) : (label?.call(shown) ?? shown);
    final lines = <Widget>[
      Text(main, key: const Key('price-amount'), style: style, textAlign: textAlign),
      if (showCharged && pf.converted) Text(l.chargedAsAed(pf.aed(amount)), key: const Key('price-charged'), style: small, textAlign: textAlign),
      if (pf.ratesMissing) Text(l.ratesUnavailableHint, key: const Key('price-rates-missing'), style: small, textAlign: textAlign),
    ];
    if (lines.length == 1) return lines.single;
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: crossAxisAlignment, children: lines);
  }
}

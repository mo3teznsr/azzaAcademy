import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/money/money.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../checkout/data/checkout_repository.dart' show fxRatesProvider;
import '../data/back_office_repository.dart';
import 'admin_widgets.dart';

/// Currencies: AED is the base and is locked (never removed, disabled or re-rated). Every other currency is
/// display-only: add, edit, enable, remove and reorder them here; students see them in the pickers.
class CurrenciesScreen extends ConsumerStatefulWidget {
  const CurrenciesScreen({super.key});

  @override
  ConsumerState<CurrenciesScreen> createState() => _CurrenciesScreenState();
}

class _CurrenciesScreenState extends ConsumerState<CurrenciesScreen> {
  String? _busyCode;

  void _refresh() => ref
    ..invalidate(adminCurrenciesProvider)
    ..invalidate(fxRatesProvider);

  Future<void> _run(String code, Future<void> Function() action, {String? done}) async {
    setState(() => _busyCode = code);
    try {
      await action();
      _refresh();
      if (mounted && done != null) showToast(context, done);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busyCode = null);
    }
  }

  Future<void> _edit([CurrencyInfo? c]) async {
    final saved = await showFormSheet<bool>(context, (_) => _CurrencySheet(currency: c));
    if (saved == true && mounted) {
      _refresh();
      showToast(context, context.l10n.adminCurrencySaved);
    }
  }

  Future<void> _delete(CurrencyInfo c) async {
    final l = context.l10n;
    final ok = await confirmAction(context, title: l.adminCurrencyDeleteTitle(c.code), body: l.adminCurrencyDeleteBody(c.code), confirm: l.adminDelete);
    if (!ok || !mounted) return;
    await _run(c.code, () => ref.read(backOfficeRepositoryProvider).deleteCurrency(c.code), done: l.adminCurrencyDeleted(c.code));
  }

  Future<void> _move(List<CurrencyInfo> list, int i, int delta) async {
    final order = [...list];
    final other = i + delta;
    if (other < 0 || other >= order.length) return;
    order.insert(other, order.removeAt(i));
    await _run(order[other].code, () async {
      final repo = ref.read(backOfficeRepositoryProvider);
      for (final (index, c) in order.indexed) {
        if (c.sortOrder != index) await repo.updateCurrency(c.code, {'sortOrder': index});
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final arabic = ref.watch(localeProvider) == AppLocale.ar;
    final currencies = ref.watch(adminCurrenciesProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l.adminCurrenciesTitle), actions: [
        IconButton(key: const Key('new-currency'), tooltip: l.adminNewCurrency, icon: const Icon(Icons.add_rounded), onPressed: _edit),
      ]),
      body: AsyncView<List<CurrencyInfo>>(
        value: currencies,
        onRetry: () => ref.invalidate(adminCurrenciesProvider),
        isEmpty: (list) => list.isEmpty,
        empty: EmptyState(title: l.adminNoCurrencies, action: l.adminNewCurrency, onAction: _edit),
        data: (list) => RefreshList(
          onRefresh: () async => ref.invalidate(adminCurrenciesProvider),
          children: [
            Text(l.adminCurrenciesBody, style: t.bodyMedium),
            const SizedBox(height: 12),
            for (final (i, c) in list.indexed) ...[
              RaisedCard(
                key: Key('currency-${c.code}'),
                onTap: () => _edit(c),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(
                      child: Text('${c.code} · ${c.name(arabic)}', style: t.titleSmall?.copyWith(color: c.enabled ? null : p.muted)),
                    ),
                    if (c.isBase) StatusChip(label: l.adminCurrencyBase, color: p.muted, look: ChipLook.outline),
                  ]),
                  const SizedBox(height: 2),
                  Text(
                    c.isBase ? l.adminCurrencyBaseHint : '${l.adminCurrencyRateLine(f.n(c.ratePerAed), c.code)} · ${f.n(l.adminCurrencyDecimalsCount(c.decimals))}',
                    style: t.bodySmall,
                  ),
                  Row(children: [
                    Expanded(
                      child: Row(children: [
                        Switch(
                          key: Key('currency-enabled-${c.code}'),
                          value: c.enabled,
                          // AED can never be disabled.
                          onChanged: c.isBase || _busyCode != null
                              ? null
                              : (v) => _run(c.code, () async {
                                    await ref.read(backOfficeRepositoryProvider).updateCurrency(c.code, {'enabled': v});
                                  }),
                        ),
                        const SizedBox(width: 6),
                        Flexible(child: Text(c.isBase ? l.adminCurrencyLocked : (c.enabled ? l.adminActive : l.adminInactive), style: t.bodySmall)),
                        if (c.isBase) ...[const SizedBox(width: 4), Icon(Icons.lock_outline_rounded, key: Key('currency-locked-${c.code}'), size: 16, color: p.muted)],
                      ]),
                    ),
                    IconButton(
                      key: Key('currency-up-${c.code}'),
                      tooltip: l.adminMoveUp,
                      onPressed: i == 0 || _busyCode != null ? null : () => _move(list, i, -1),
                      icon: const Icon(Icons.arrow_upward_rounded),
                    ),
                    IconButton(
                      key: Key('currency-down-${c.code}'),
                      tooltip: l.adminMoveDown,
                      onPressed: i == list.length - 1 || _busyCode != null ? null : () => _move(list, i, 1),
                      icon: const Icon(Icons.arrow_downward_rounded),
                    ),
                    if (!c.isBase)
                      IconButton(
                        key: Key('currency-delete-${c.code}'),
                        tooltip: l.adminDelete,
                        onPressed: _busyCode != null ? null : () => _delete(c),
                        icon: Icon(Icons.delete_outline_rounded, color: p.danger),
                      ),
                  ]),
                ]),
              ),
              const SizedBox(height: 10),
            ],
          ],
        ),
      ),
    );
  }
}

class _CurrencySheet extends ConsumerStatefulWidget {
  const _CurrencySheet({this.currency});
  final CurrencyInfo? currency;

  @override
  ConsumerState<_CurrencySheet> createState() => _CurrencySheetState();
}

class _CurrencySheetState extends ConsumerState<_CurrencySheet> {
  late final _code = TextEditingController(text: widget.currency?.code ?? '');
  late final _nameEn = TextEditingController(text: widget.currency?.nameEn ?? '');
  late final _nameAr = TextEditingController(text: widget.currency?.nameAr ?? '');
  late final _symbol = TextEditingController(text: widget.currency?.symbol ?? '');
  late final _decimals = TextEditingController(text: '${widget.currency?.decimals ?? 2}');
  late final _rate = TextEditingController(text: widget.currency == null ? '' : '${widget.currency!.ratePerAed}');
  late bool _enabled = widget.currency?.enabled ?? true;
  bool _busy = false;
  String? _error;

  bool get _isNew => widget.currency == null;
  bool get _base => widget.currency?.isBase ?? false;

  @override
  void dispose() {
    for (final c in [_code, _nameEn, _nameAr, _symbol, _decimals, _rate]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    final l = context.l10n;
    final code = _code.text.trim().toUpperCase();
    // AED is always shown with 2 decimals.
    final decimals = _base ? 2 : int.tryParse(_decimals.text.trim());
    final rate = _base ? 1.0 : double.tryParse(_rate.text.trim().replaceAll(',', '.'));
    if (_isNew && !RegExp(r'^[A-Z]{3}$').hasMatch(code)) return setState(() => _error = l.adminCurrencyCodeInvalid);
    final nameEn = _nameEn.text.trim();
    final nameAr = _nameAr.text.trim();
    final symbol = _symbol.text.trim();
    if (nameEn.length < 2) return setState(() => _error = l.adminNameRequired);
    if (nameAr.isEmpty) return setState(() => _error = l.adminCurrencyNameArRequired);
    if (nameEn.length > 60 || nameAr.length > 60) return setState(() => _error = l.adminCurrencyNameTooLong);
    if (symbol.length > 8) return setState(() => _error = l.adminCurrencySymbolTooLong);
    if (!_base && (decimals == null || decimals < 0 || decimals > 3)) return setState(() => _error = l.adminCurrencyDecimalsInvalid);
    if (rate == null || rate <= 0) return setState(() => _error = l.adminRateInvalid);
    String? opt(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();
    final body = {
      'nameEn': nameEn,
      'nameAr': nameAr,
      'symbol': opt(_symbol),
      'decimals': decimals ?? 2,
      if (!_base) 'ratePerAed': rate,
      if (!_base) 'enabled': _enabled,
    };
    setState(() {
      _busy = true;
      _error = null;
    });
    final repo = ref.read(backOfficeRepositoryProvider);
    try {
      _isNew ? await repo.createCurrency({'code': code, ...body}) : await repo.updateCurrency(widget.currency!.code, body);
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return FormSheet(
      title: _isNew ? l.adminNewCurrency : l.adminEditCurrency(widget.currency!.code),
      children: [
        TextField(
          key: const Key('currency-code'),
          controller: _code,
          readOnly: !_isNew,
          textCapitalization: TextCapitalization.characters,
          textDirection: TextDirection.ltr,
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp('[A-Za-z]')), LengthLimitingTextInputFormatter(3)],
          decoration: fieldDecoration(label: l.adminCurrencyCode, icon: Icons.currency_exchange_rounded, hint: 'EUR', helper: _isNew ? l.adminCurrencyCodeHelper : null),
        ),
        const SizedBox(height: 12),
        TextField(
          key: const Key('currency-name-en'),
          controller: _nameEn,
          textDirection: TextDirection.ltr,
          inputFormatters: [LengthLimitingTextInputFormatter(60)],
          decoration: fieldDecoration(label: l.adminNameEn, icon: Icons.title_rounded, hint: 'Euro'),
        ),
        const SizedBox(height: 12),
        TextField(
          key: const Key('currency-name-ar'),
          controller: _nameAr,
          textDirection: TextDirection.rtl,
          inputFormatters: [LengthLimitingTextInputFormatter(60)],
          decoration: fieldDecoration(label: l.adminNameAr, icon: Icons.translate_rounded, hint: 'يورو'),
        ),
        const SizedBox(height: 12),
        TextField(
          key: const Key('currency-symbol'),
          controller: _symbol,
          textDirection: TextDirection.ltr,
          inputFormatters: [LengthLimitingTextInputFormatter(8)],
          decoration: fieldDecoration(label: l.adminCurrencySymbol, icon: Icons.euro_rounded, hint: '€'),
        ),
        const SizedBox(height: 12),
        TextField(
          key: const Key('currency-decimals'),
          controller: _decimals,
          readOnly: _base,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(1)],
          textDirection: TextDirection.ltr,
          decoration: fieldDecoration(label: l.adminCurrencyDecimals, icon: Icons.pin_outlined, hint: '2', helper: l.adminCurrencyDecimalsHelper),
        ),
        const SizedBox(height: 12),
        TextField(
          key: const Key('currency-rate'),
          controller: _rate,
          readOnly: _base,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
          textDirection: TextDirection.ltr,
          decoration: fieldDecoration(
            label: _isNew ? l.adminRatePerAed : l.adminRateLabel(widget.currency!.code),
            icon: Icons.swap_horiz_rounded,
            hint: '0.2500',
            helper: _base ? l.adminCurrencyBaseHint : l.adminRatePerAedHelper,
          ),
        ),
        if (!_base)
          SwitchListTile(
            key: const Key('currency-enabled'),
            contentPadding: EdgeInsets.zero,
            title: Text(l.adminCurrencyEnabled),
            value: _enabled,
            onChanged: (v) => setState(() => _enabled = v),
          ),
        if (_error != null) ...[const SizedBox(height: 8), Text(_error!, style: TextStyle(color: AzzaPalette.of(context).danger))],
        const SizedBox(height: 12),
        FilledButton(
          key: const Key('save-currency'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          onPressed: _busy ? null : _save,
          child: Text(l.save),
        ),
      ],
    );
  }
}

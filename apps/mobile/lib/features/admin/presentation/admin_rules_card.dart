import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../teacher/presentation/proposal_widgets.dart' show BusyButton;
import '../data/back_office_repository.dart';

/// Settings → Business rules: VAT, earning hold, minimum payout and bank-transfer hold.
/// Each shows its default (the server environment value) and can be reset to it. Saving only sends what changed.
class BusinessRulesCard extends ConsumerStatefulWidget {
  const BusinessRulesCard({super.key, required this.settings});
  final PlatformSettings settings;

  @override
  ConsumerState<BusinessRulesCard> createState() => _BusinessRulesCardState();
}

class _BusinessRulesCardState extends ConsumerState<BusinessRulesCard> {
  late PlatformSettings _s = widget.settings;
  late final Map<String, TextEditingController> _c = {
    for (final r in editableRules) r.key: TextEditingController(text: '${_s.rules[r.key]?.round() ?? ''}'),
  };
  final Map<String, String?> _errors = {};
  bool _busy = false;
  String? _resetting;

  @override
  void dispose() {
    for (final c in _c.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _adopt(PlatformSettings next) {
    _s = next;
    for (final r in editableRules) {
      _c[r.key]!.text = '${next.rules[r.key]?.round() ?? ''}';
    }
    _errors.clear();
    ref.invalidate(platformSettingsProvider);
  }

  String _label(String key) {
    final l = context.l10n;
    return switch (key) {
      'EARNING_HOLD_DAYS' => l.adminRuleEarningHold,
      'MIN_PAYOUT_AED' => l.adminRuleMinPayout,
      'BANK_TRANSFER_HOLD_HOURS' => l.adminRuleTransferHold,
      'VAT_PERCENT' => l.adminRuleVat,
      _ => key,
    };
  }

  String _show(String key, num v) {
    final l = context.l10n;
    final f = ref.read(fmtProvider);
    return switch (key) {
      'TEACHER_SHARE_PERCENT' || 'VAT_PERCENT' => f.percent(v),
      'MIN_PAYOUT_AED' => f.aed((v * 100).round()),
      'EARNING_HOLD_DAYS' => f.n(l.adminDaysValue(v.round())),
      'BANK_TRANSFER_HOLD_HOURS' => f.n(l.adminHoursValue(v.round())),
      _ => f.number(v),
    };
  }

  Future<void> _save() async {
    final l = context.l10n;
    final changes = <String, int?>{};
    final errors = <String, String?>{};
    for (final r in editableRules) {
      final n = int.tryParse(_c[r.key]!.text.trim());
      if (n == null || n < r.min || n > r.max) {
        errors[r.key] = l.adminRuleRange(r.min, r.max);
      } else if (n != _s.rules[r.key]?.round()) {
        changes[r.field] = n;
      }
    }
    setState(() {
      _errors
        ..clear()
        ..addAll(errors);
    });
    if (errors.isNotEmpty || changes.isEmpty) return;
    setState(() => _busy = true);
    try {
      final next = await ref.read(backOfficeRepositoryProvider).saveRules(changes);
      if (!mounted) return;
      setState(() => _adopt(next));
      showToast(context, l.adminRulesSaved);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reset(({String key, String field, int min, int max}) r) async {
    final l = context.l10n;
    setState(() => _resetting = r.key);
    try {
      final next = await ref.read(backOfficeRepositoryProvider).saveRules({r.field: null});
      if (!mounted) return;
      setState(() => _adopt(next));
      showToast(context, l.adminRuleResetDone(_label(r.key)));
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _resetting = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    return SectionCard(
      key: const Key('business-rules'),
      title: l.adminRules,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(l.adminRulesBody, style: t.bodySmall),
        const SizedBox(height: 12),
        for (final r in editableRules) ...[
          TextField(
            key: Key('rule-${r.key}'),
            controller: _c[r.key],
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
            textDirection: TextDirection.ltr,
            decoration: fieldDecoration(
              label: _label(r.key),
              icon: Icons.tune_rounded,
              helper: _s.ruleDefaults[r.key] == null ? null : l.adminRuleDefault(_show(r.key, _s.ruleDefaults[r.key]!)),
            ).copyWith(errorText: _errors[r.key]),
          ),
          if (_s.ruleDefaults[r.key] != null && _s.rules[r.key] != _s.ruleDefaults[r.key])
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                key: Key('rule-reset-${r.key}'),
                style: TextButton.styleFrom(minimumSize: const Size(48, 44)),
                onPressed: _resetting != null || _busy ? null : () => _reset(r),
                icon: const Icon(Icons.restart_alt_rounded, size: 18),
                label: Text(l.adminRuleReset),
              ),
            ),
          const SizedBox(height: 12),
        ],
        if (_s.rules['TEACHER_SHARE_PERCENT'] != null) KeyValueRow(l.adminRuleTeacherShare, _show('TEACHER_SHARE_PERCENT', _s.rules['TEACHER_SHARE_PERCENT']!)),
        const SizedBox(height: 8),
        BusyButton(key: const Key('rules-save'), label: l.adminRulesSave, busy: _busy, onPressed: _save),
      ]),
    );
  }
}

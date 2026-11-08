import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/money/money.dart';
import '../../../core/network/error_text.dart';
import '../../../core/widgets/ui.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../teacher/presentation/proposal_widgets.dart' show BusyButton;
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../data/back_office_repository.dart';
import 'admin_app_store_card.dart' show appleSyncLabel;

/// The money settings of one course in the admin editor: the teacher's cut for this course (for rare cases),
/// and for a recorded course its two prices (before VAT) and the App Store product ids.
class AdminCourseMoney extends ConsumerStatefulWidget {
  const AdminCourseMoney({super.key, required this.course});
  final Course course;

  @override
  ConsumerState<AdminCourseMoney> createState() => _AdminCourseMoneyState();
}

class _AdminCourseMoneyState extends ConsumerState<AdminCourseMoney> {
  late final _cut = TextEditingController(text: widget.course.teacherCutPercent?.toString() ?? '');
  late final _monthly = TextEditingController(text: _aed(widget.course.monthlyPriceFils));
  late final _yearly = TextEditingController(text: _aed(widget.course.yearlyPriceFils));
  late final _appleMonthly = TextEditingController(text: widget.course.appleProducts?.monthly ?? '');
  late final _appleYearly = TextEditingController(text: widget.course.appleProducts?.yearly ?? '');
  String? _busy;

  static String _aed(int? fils) => fils == null ? '' : Money.filsToAed(fils).toStringAsFixed(2);

  @override
  void dispose() {
    for (final c in [_cut, _monthly, _yearly, _appleMonthly, _appleYearly]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _run(String what, Future<void> Function() body, String done) async {
    setState(() => _busy = what);
    try {
      await body();
      if (mounted) showToast(context, done);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Future<void> _saveCut() async {
    final l = context.l10n;
    final text = _cut.text.trim();
    final n = text.isEmpty ? null : int.tryParse(text);
    if (text.isNotEmpty && (n == null || n < 0 || n > 100)) return showToast(context, l.adminCutInvalid);
    await _run('cut', () => ref.read(backOfficeRepositoryProvider).setCourseCut(widget.course.id, n), l.adminCourseCutSaved);
  }

  Future<void> _savePrices() async {
    final l = context.l10n;
    final m = double.tryParse(_monthly.text.trim().replaceAll(',', ''));
    final y = double.tryParse(_yearly.text.trim().replaceAll(',', ''));
    if (m == null || y == null || m <= 0 || y <= 0) return showToast(context, l.adminPricesRequired);
    if (Money.aedToFils(y) >= Money.aedToFils(m) * 12) return showToast(context, l.adminPricesInvalid);
    await _run(
      'prices',
      () async {
        await ref.read(backOfficeRepositoryProvider).setRecordedPricing(widget.course.id, monthlyPriceFils: Money.aedToFils(m), yearlyPriceFils: Money.aedToFils(y));
      },
      l.adminPricesSaved,
    );
  }

  Future<void> _saveApple() async {
    String? v(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();
    await _run('apple', () async {
      await ref.read(backOfficeRepositoryProvider).setAppleProducts(widget.course.id, monthly: v(_appleMonthly), yearly: v(_appleYearly));
    }, context.l10n.adminAppleSaved);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final recorded = widget.course.type == CourseType.recorded;
    final defaults = ref.watch(teacherCutsProvider).value;
    final defaultCut = defaults?.forType(widget.course.type);
    final decimal = [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))];

    Widget save(String key, String what, VoidCallback onTap) => Align(
          alignment: AlignmentDirectional.centerStart,
          child: BusyButton(key: Key(key), label: l.save, busy: _busy == what, filled: false, onPressed: _busy == null ? onTap : null),
        );

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      if (recorded) ...[
        SectionCard(
          title: l.adminRecordedPrices,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            TextField(
              key: const Key('admin-monthly-price'),
              controller: _monthly,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: decimal,
              textDirection: TextDirection.ltr,
              decoration: fieldDecoration(label: l.adminMonthlyPrice, icon: Icons.sell_outlined, prefixText: 'AED '),
            ),
            const SizedBox(height: 12),
            TextField(
              key: const Key('admin-yearly-price'),
              controller: _yearly,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: decimal,
              textDirection: TextDirection.ltr,
              decoration: fieldDecoration(label: l.adminYearlyPrice, icon: Icons.sell_outlined, prefixText: 'AED '),
            ),
            const SizedBox(height: 12),
            save('admin-save-prices', 'prices', _savePrices),
          ]),
        ),
        SectionCard(
          title: l.adminAppleIds,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            TextField(
              key: const Key('admin-apple-monthly'),
              controller: _appleMonthly,
              textDirection: TextDirection.ltr,
              decoration: fieldDecoration(label: l.adminAppleMonthly, icon: Icons.apple_rounded, hint: 'com.futuretech.azza.rec.${widget.course.slug}.monthly'),
            ),
            const SizedBox(height: 12),
            TextField(
              key: const Key('admin-apple-yearly'),
              controller: _appleYearly,
              textDirection: TextDirection.ltr,
              decoration: fieldDecoration(label: l.adminAppleYearly, icon: Icons.apple_rounded, hint: 'com.futuretech.azza.rec.${widget.course.slug}.yearly'),
            ),
            const SizedBox(height: 12),
            save('admin-save-apple', 'apple', _saveApple),
            _AppleSyncLine(course: widget.course),
          ]),
        ),
      ],
      SectionCard(
        title: l.adminCourseCut,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          TextField(
            key: const Key('admin-course-cut'),
            controller: _cut,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(3)],
            textDirection: TextDirection.ltr,
            decoration: fieldDecoration(
              label: l.adminCourseCut,
              icon: Icons.percent_rounded,
              helper: defaultCut == null ? null : l.adminCourseCutHelp('$defaultCut'),
            ),
          ),
          const SizedBox(height: 12),
          save('admin-save-cut', 'cut', _saveCut),
        ]),
      ),
    ]);
  }
}

/// The App Store sync result for this course, with the reason when it failed.
class _AppleSyncLine extends ConsumerWidget {
  const _AppleSyncLine({required this.course});
  final Course course;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final f = ref.watch(fmtProvider);
    final status = ref.watch(appStoreStatusProvider).value;
    // Not configured: say how to switch it on instead of a status that can never change.
    if (status != null && !status.configured) {
      return Padding(padding: const EdgeInsets.only(top: 12), child: Text(l.appStoreNotConfigured, key: const Key('admin-apple-not-configured'), style: t.bodySmall));
    }
    final item = status?.course(course.id);
    final state = item?.status ?? course.appleSyncStatus;
    final at = item?.syncedAt ?? course.appleSyncedAt;
    final failed = state == AppleSyncStatus.failed;
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(
          [appleSyncLabel(l, state), if (at != null) f.mediumDate(at)].join(' · '),
          key: const Key('admin-apple-sync-status'),
          style: t.bodyMedium?.copyWith(color: failed ? p.danger : null),
        ),
        if (failed && (item?.detail ?? '').isNotEmpty) Text(item!.detail!, key: const Key('admin-apple-sync-detail'), style: t.bodySmall?.copyWith(color: p.danger)),
      ]),
    );
  }
}

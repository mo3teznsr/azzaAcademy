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
import '../../catalog/domain/catalog_models.dart';
import '../data/back_office_repository.dart';
import 'admin_widgets.dart';

String couponStateLabel(AppLocalizations l, CouponState s) => switch (s) {
      CouponState.active => l.adminCouponActive,
      CouponState.scheduled => l.adminCouponScheduled,
      CouponState.expired => l.adminCouponExpired,
      CouponState.paused => l.adminCouponPaused,
      CouponState.exhausted => l.adminCouponExhausted,
    };

/// `20% off` / `AED 50.00 off`.
String couponDiscount(AppLocalizations l, Fmt f, Coupon c) =>
    c.percentOff != null ? l.adminPercentOff(f.n(c.percentOff!)) : l.adminAmountOff(f.aed(c.amountOffFils ?? 0));

/// Coupons: code, discount, state and redemptions; tap to edit, "Usage" for who used it.
class CouponsScreen extends ConsumerWidget {
  const CouponsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final coupons = ref.watch(couponsProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l.adminCouponsTitle), actions: [
        IconButton(key: const Key('new-coupon'), tooltip: l.adminNewCoupon, icon: const Icon(Icons.add_rounded), onPressed: () => context.push(Routes.adminNewCoupon)),
      ]),
      body: AsyncView<List<Coupon>>(
        value: coupons,
        onRetry: () => ref.invalidate(couponsProvider),
        isEmpty: (list) => list.isEmpty,
        empty: EmptyState(title: l.adminNoCoupons, body: l.adminNoCouponsBody, action: l.adminNewCoupon, onAction: () => context.push(Routes.adminNewCoupon)),
        data: (list) => RefreshList(
          onRefresh: () async => ref.invalidate(couponsProvider),
          children: [
            for (final c in list) ...[
              RaisedCard(
                key: Key('coupon-${c.id}'),
                padding: const EdgeInsets.all(14),
                onTap: () => context.push(Routes.adminCoupon(c.id), extra: c),
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Row(children: [
                    Expanded(child: Text(c.code, style: t.titleMedium?.copyWith(letterSpacing: 1), textDirection: TextDirection.ltr)),
                    StatusChip(
                      label: couponStateLabel(l, c.state),
                      color: c.state == CouponState.active ? p.successBg : p.muted,
                      textColor: c.state == CouponState.active ? p.success : null,
                      look: c.state == CouponState.active ? ChipLook.filled : ChipLook.outline,
                    ),
                  ]),
                  const SizedBox(height: 4),
                  Text(
                    [
                      couponDiscount(l, f, c),
                      c.courseTitle ?? c.batchCode ?? l.adminAllCourses,
                      if (c.expiresOn != null) l.adminUntil(f.shortDate(c.expiresOn!)),
                    ].join(' · '),
                    style: t.bodySmall,
                  ),
                  const SizedBox(height: 6),
                  Row(children: [
                    Kicker(c.maxRedemptions == null ? f.n(l.adminUsedCount(c.redemptions)) : l.adminUsedOf(f.n(c.redemptions), f.n(c.maxRedemptions!))),
                    const Spacer(),
                    TextButton(
                      key: Key('coupon-usage-${c.id}'),
                      style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
                      onPressed: () => context.push(Routes.adminCouponUsage(c.id)),
                      child: Text(l.adminUsage),
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

/// Create or edit a coupon. The code is fixed once created.
class CouponEditorScreen extends ConsumerStatefulWidget {
  const CouponEditorScreen({super.key, this.coupon});
  final Coupon? coupon;

  @override
  ConsumerState<CouponEditorScreen> createState() => _CouponEditorScreenState();
}

class _CouponEditorScreenState extends ConsumerState<CouponEditorScreen> {
  late final Coupon? _c = widget.coupon;
  late final _code = TextEditingController(text: _c?.code ?? '');
  late bool _percent = _c?.amountOffFils == null;
  late final _value = TextEditingController(
    text: _c == null ? '' : (_c.percentOff != null ? '${_c.percentOff}' : Money.filsToAed(_c.amountOffFils ?? 0).toStringAsFixed(2)),
  );
  late final _max = TextEditingController(text: _c?.maxRedemptions?.toString() ?? '');
  late final _perUser = TextEditingController(text: _c?.perUserLimit?.toString() ?? '');
  late final _minOrder = TextEditingController(text: _c?.minOrderFils == null ? '' : Money.filsToAed(_c!.minOrderFils!).toStringAsFixed(2));
  late DateTime? _startsOn = _c?.startsOn;
  late DateTime? _expiresOn = _c?.expiresOn;
  late bool _active = _c?.active ?? true;
  late String? _courseId = _c?.courseId;
  bool _busy = false;
  String? _error;

  bool get _isNew => _c == null;

  @override
  void dispose() {
    for (final c in [_code, _value, _max, _perUser, _minOrder]) {
      c.dispose();
    }
    super.dispose();
  }

  int? _posInt(TextEditingController c) {
    final v = int.tryParse(c.text.trim());
    return v == null || v <= 0 ? null : v;
  }

  Future<void> _save() async {
    final l = context.l10n;
    final code = _code.text.trim().toUpperCase();
    if (_isNew && !CouponDraft.codePattern.hasMatch(code)) return setState(() => _error = l.adminCouponCodeInvalid);
    int? percent;
    num? amount;
    if (_percent) {
      percent = int.tryParse(_value.text.trim());
      if (percent == null || percent < 1 || percent > 100) return setState(() => _error = l.adminPercentInvalid);
    } else {
      amount = parseAed(_value.text);
      if (amount == null) return setState(() => _error = l.adminAmountInvalid);
    }
    if (_startsOn != null && _expiresOn != null && _expiresOn!.isBefore(_startsOn!)) return setState(() => _error = l.adminDatesInvalid);
    final draft = CouponDraft(
      code: code,
      percentOff: percent,
      amountOffAed: amount,
      maxRedemptions: _posInt(_max),
      perUserLimit: _posInt(_perUser),
      minOrderAed: parseAed(_minOrder.text),
      startsOn: _startsOn,
      expiresOn: _expiresOn,
      courseId: _courseId,
      active: _active,
    );
    setState(() {
      _busy = true;
      _error = null;
    });
    final repo = ref.read(backOfficeRepositoryProvider);
    try {
      if (_isNew) {
        await repo.createCoupon(draft);
      } else {
        await repo.updateCoupon(_c!.id, draft.toUpdateJson());
      }
      ref.invalidate(couponsProvider);
      if (!mounted) return;
      showToast(context, _isNew ? l.adminCouponCreated(code) : l.adminCouponSaved);
      await Navigator.of(context).maybePop();
    } catch (e) {
      if (mounted) setState(() => _error = errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pickDate(bool start) async {
    final now = DateUtils.dateOnly(DateTime.now());
    final current = start ? _startsOn : _expiresOn;
    final picked = await showDatePicker(
      context: context,
      initialDate: current ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 5),
    );
    if (picked != null) setState(() => start ? _startsOn = picked : _expiresOn = picked);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final courses = ref.watch(adminCoursesProvider(CourseStatus.published)).value ?? const <Course>[];

    Widget dateField(String label, DateTime? value, bool start) => InkWell(
          key: Key(start ? 'coupon-starts' : 'coupon-expires'),
          onTap: () => _pickDate(start),
          borderRadius: BorderRadius.circular(AzzaSpace.radiusSm),
          child: InputDecorator(
            decoration: fieldDecoration(
              label: label,
              icon: start ? Icons.event_outlined : Icons.event_busy_outlined,
              action: value == null
                  ? const Icon(Icons.expand_more_rounded)
                  : IconButton(
                      tooltip: l.clear,
                      icon: const Icon(Icons.close_rounded, size: 20),
                      onPressed: () => setState(() => start ? _startsOn = null : _expiresOn = null),
                    ),
            ),
            child: Text(value == null ? l.adminNoDate : f.shortDate(value), style: t.bodyLarge),
          ),
        );

    Widget number(Key key, TextEditingController c, String label, IconData icon, {String? hint, String? helper, bool decimal = false, String? prefix}) => TextField(
          key: key,
          controller: c,
          keyboardType: TextInputType.numberWithOptions(decimal: decimal),
          inputFormatters: [FilteringTextInputFormatter.allow(decimal ? RegExp(r'[0-9.,]') : RegExp(r'[0-9]'))],
          textDirection: TextDirection.ltr,
          decoration: fieldDecoration(label: label, icon: icon, hint: hint, helper: helper, prefixText: prefix),
        );

    return Scaffold(
      appBar: AppBar(title: Text(_isNew ? l.adminNewCoupon : _c!.code)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 32),
        children: [
          SectionCard(
            title: l.adminCouponCodeSection,
            margin: EdgeInsets.zero,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              TextField(
                key: const Key('coupon-code'),
                controller: _code,
                readOnly: !_isNew,
                textCapitalization: TextCapitalization.characters,
                textDirection: TextDirection.ltr,
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9-]')),
                  LengthLimitingTextInputFormatter(20),
                  TextInputFormatter.withFunction((_, v) => v.copyWith(text: v.text.toUpperCase())),
                ],
                decoration: fieldDecoration(label: l.adminCouponCode, icon: Icons.confirmation_number_outlined, hint: 'RAMADAN25', helper: _isNew ? l.adminCouponCodeHelper : l.adminCouponCodeFixed),
              ),
              const SizedBox(height: 12),
              SegmentedButton<bool>(
                key: const Key('coupon-kind'),
                segments: [
                  ButtonSegment(value: true, label: Text(l.adminPercent), icon: const Icon(Icons.percent_rounded)),
                  ButtonSegment(value: false, label: Text(l.adminFixedAmount), icon: const Icon(Icons.payments_outlined)),
                ],
                selected: {_percent},
                style: SegmentedButton.styleFrom(minimumSize: const Size(44, 48)),
                onSelectionChanged: (v) => setState(() => _percent = v.first),
              ),
              const SizedBox(height: 12),
              number(const Key('coupon-value'), _value, _percent ? l.adminPercentOffLabel : l.adminAmountOffLabel,
                  _percent ? Icons.percent_rounded : Icons.payments_outlined,
                  hint: _percent ? '20' : '50', decimal: !_percent, prefix: _percent ? null : 'AED '),
            ]),
          ),
          SectionCard(
            title: l.adminCouponLimits,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              number(const Key('coupon-max'), _max, l.adminMaxRedemptions, Icons.people_outline_rounded, hint: l.adminUnlimited),
              const SizedBox(height: 12),
              number(const Key('coupon-per-user'), _perUser, l.adminPerUserLimit, Icons.person_outline_rounded, hint: l.adminUnlimited),
              const SizedBox(height: 12),
              number(const Key('coupon-min-order'), _minOrder, l.adminMinOrder, Icons.shopping_bag_outlined, hint: l.adminNoMinimum, decimal: true, prefix: 'AED '),
            ]),
          ),
          SectionCard(
            title: l.adminCouponWhen,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              dateField(l.adminStartsOn, _startsOn, true),
              const SizedBox(height: 12),
              dateField(l.adminExpiresOn, _expiresOn, false),
              const SizedBox(height: 12),
              DropdownButtonFormField<String?>(
                key: const Key('coupon-scope'),
                initialValue: courses.any((c) => c.id == _courseId) ? _courseId : null,
                isExpanded: true,
                decoration: fieldDecoration(label: l.adminCouponScope, icon: Icons.auto_stories_outlined, helper: l.adminCouponScopeHelper),
                items: [
                  DropdownMenuItem<String?>(value: null, child: Text(l.adminAllCourses)),
                  for (final c in courses) DropdownMenuItem<String?>(value: c.id, child: Text(c.title(locale), overflow: TextOverflow.ellipsis)),
                ],
                onChanged: (v) => setState(() => _courseId = v),
              ),
              const SizedBox(height: 4),
              Material(
                type: MaterialType.transparency,
                child: SwitchListTile(
                  key: const Key('coupon-active'),
                  contentPadding: EdgeInsets.zero,
                  title: Text(l.adminCouponActiveSwitch),
                  subtitle: Text(l.adminCouponActiveHelper),
                  value: _active,
                  onChanged: (v) => setState(() => _active = v),
                ),
              ),
            ]),
          ),
          if (_error != null) ...[const SizedBox(height: 12), Text(_error!, key: const Key('coupon-error'), style: TextStyle(color: p.danger))],
        ],
      ),
      bottomNavigationBar: BottomActionBar(children: [
        FilledButton(
          key: const Key('save-coupon'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          onPressed: _busy ? null : _save,
          child: _busy ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : Text(_isNew ? l.adminCreateCoupon : l.saveChanges),
        ),
      ]),
    );
  }
}

/// Who used a coupon, newest first, with the total discount given.
class CouponUsageScreen extends ConsumerWidget {
  const CouponUsageScreen({super.key, required this.couponId});
  final String couponId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final usage = ref.watch(couponUsageProvider(couponId));
    final t = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(usage.value?.code ?? l.adminUsage)),
      body: AsyncView<CouponUsage>(
        value: usage,
        onRetry: () => ref.invalidate(couponUsageProvider(couponId)),
        data: (u) => RefreshList(
          onRefresh: () async => ref.invalidate(couponUsageProvider(couponId)),
          children: [
            Kicker(u.maxRedemptions == null ? f.n(l.adminUsedCount(u.redemptions)) : l.adminUsedOf(f.n(u.redemptions), f.n(u.maxRedemptions!))),
            DisplayText(f.aed(u.totalDiscountFils), size: 34, weight: FontWeight.w800),
            Text(l.adminTotalDiscount, style: t.bodySmall),
            const SizedBox(height: 12),
            if (u.items.isEmpty) EmptyState(title: l.adminNoRedemptions, icon: Icons.confirmation_number_outlined),
            if (u.items.isNotEmpty)
              CardGroup(children: [
                for (final r in u.items)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Row(children: [
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(r.studentName, style: t.titleSmall),
                          Text([r.reference, ?r.batchCode, if (r.createdAt != null) f.shortDate(r.createdAt!)].join(' · '), style: t.bodySmall),
                        ]),
                      ),
                      Text('− ${f.aed(r.discountFils)}', style: t.titleSmall),
                    ]),
                  ),
              ]),
          ],
        ),
      ),
    );
  }
}

/// Deep link to `/admin/manage/coupons/:id` without the list row: finds the coupon in the list.
class CouponEditorLoader extends ConsumerWidget {
  const CouponEditorLoader({super.key, required this.couponId, this.coupon});
  final String couponId;
  final Coupon? coupon;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (coupon != null) return CouponEditorScreen(coupon: coupon);
    final list = ref.watch(couponsProvider);
    return list.when(
      data: (all) {
        final c = all.where((x) => x.id == couponId).firstOrNull;
        return c == null ? Scaffold(appBar: AppBar(), body: EmptyState(title: context.l10n.emptyGeneric)) : CouponEditorScreen(coupon: c);
      },
      error: (e, _) => Scaffold(appBar: AppBar(), body: ErrorState(error: e, onRetry: () => ref.invalidate(couponsProvider))),
      loading: () => Scaffold(appBar: AppBar(), body: const LoadingState()),
    );
  }
}

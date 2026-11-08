import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../catalog/domain/catalog_models.dart' show AppleSyncStatus;
import '../../teacher/presentation/proposal_widgets.dart' show BusyButton;
import '../data/back_office_repository.dart';

String appleSyncLabel(AppLocalizations l, AppleSyncStatus? s) => switch (s) {
      AppleSyncStatus.synced => l.appleSyncSynced,
      AppleSyncStatus.skipped => l.appleSyncSkipped,
      AppleSyncStatus.failed => l.appleSyncFailed,
      null => l.appleSyncNever,
    };

/// Settings: the App Store products the server creates for seat prices and recorded courses, and a "Sync now" button.
class AdminAppStoreCard extends ConsumerStatefulWidget {
  const AdminAppStoreCard({super.key});

  @override
  ConsumerState<AdminAppStoreCard> createState() => _AdminAppStoreCardState();
}

class _AdminAppStoreCardState extends ConsumerState<AdminAppStoreCard> {
  bool _busy = false;
  Timer? _refresh;

  @override
  void dispose() {
    _refresh?.cancel();
    super.dispose();
  }

  Future<void> _sync() async {
    final l = context.l10n;
    setState(() => _busy = true);
    try {
      await ref.read(backOfficeRepositoryProvider).syncAppStore();
      if (!mounted) return;
      showToast(context, l.appStoreSyncStarted);
      // The server syncs in the background: look again after a few seconds.
      _refresh?.cancel();
      _refresh = Timer(const Duration(seconds: 4), () {
        if (mounted) ref.invalidate(appStoreStatusProvider);
      });
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final status = ref.watch(appStoreStatusProvider);
    final t = Theme.of(context).textTheme;
    return SectionCard(
      key: const Key('app-store-card'),
      title: l.appStoreTitle,
      child: AsyncView<AppStoreStatus>(
        value: status,
        compact: true,
        onRetry: () => ref.invalidate(appStoreStatusProvider),
        data: (s) {
          if (!s.configured) {
            return Text(l.appStoreNotConfigured, key: const Key('app-store-not-configured'), style: t.bodyMedium);
          }
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            if (s.seats.isEmpty && s.courses.isEmpty) Text(l.appStoreNothingYet, style: t.bodySmall),
            if (s.seats.isNotEmpty) ...[
              Kicker(l.appStoreSeats),
              for (final i in s.seats) _Row(key: Key('app-store-seat-${i.key}'), item: i, mono: true),
              const SizedBox(height: 12),
            ],
            if (s.courses.isNotEmpty) ...[
              Kicker(l.appStoreCourses),
              for (final i in s.courses) _Row(key: Key('app-store-course-${i.key}'), item: i),
              const SizedBox(height: 12),
            ],
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: BusyButton(key: const Key('app-store-sync'), label: l.appStoreSyncNow, busy: _busy, filled: false, onPressed: _busy ? null : _sync),
            ),
          ]);
        },
      ),
    );
  }
}

class _Row extends ConsumerWidget {
  const _Row({super.key, required this.item, this.mono = false});
  final AppStoreSyncItem item;
  final bool mono;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final failed = item.status == AppleSyncStatus.failed;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: Text(item.title(locale), style: t.titleSmall, textDirection: mono ? TextDirection.ltr : null)),
          const SizedBox(width: 8),
          Text(appleSyncLabel(l, item.status), style: t.labelLarge?.copyWith(color: failed ? p.danger : p.muted)),
        ]),
        if (item.syncedAt != null) Text(f.mediumDate(item.syncedAt!), style: t.bodySmall),
        if (failed && (item.detail ?? '').isNotEmpty) Text(item.detail!, style: t.bodySmall?.copyWith(color: p.danger)),
      ]),
    );
  }
}

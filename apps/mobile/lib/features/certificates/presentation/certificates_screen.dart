import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../catalog/presentation/catalog_widgets.dart';
import '../data/certificates_repository.dart';
import '../domain/certificate_models.dart';

/// `start → end` for a batch, or whichever end is known.
String batchDates(Fmt f, DateTime? start, DateTime? end) =>
    [if (start != null) f.shortDate(start), if (end != null) f.shortDate(end)].join(' → ');

/// Earned certificates + batches still on their way to one.
class CertificatesScreen extends ConsumerWidget {
  const CertificatesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final overview = ref.watch(myCertificatesProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.certificatesTitle)),
      body: AsyncView<CertificatesOverview>(
        value: overview,
        onRetry: () => ref.invalidate(myCertificatesProvider),
        isEmpty: (o) => o.isEmpty,
        empty: EmptyState(
          title: l.certificatesEmptyTitle,
          body: l.certificatesEmptyBody,
          action: l.exploreCta,
          onAction: () => context.go(Routes.studentExplore),
        ),
        data: (o) {
          final seen = ref.watch(seenCertificatesProvider);
          var i = 0;
          return RefreshList(
            onRefresh: () => ref.refresh(myCertificatesProvider.future),
            children: [
              if (o.items.isNotEmpty) ...[
                SectionHeader(l.certificatesEarned, padding: const EdgeInsets.only(top: 8, bottom: 12)),
                for (final c in o.items) ...[
                  FadeSlideIn(
                    index: i++,
                    child: _EarnedCard(cert: c, isNew: seen.isNew(c.code), onTap: () => context.push(Routes.certificate(c.code))),
                  ),
                  const SizedBox(height: 12),
                ],
              ],
              if (o.inProgress.isNotEmpty) ...[
                SectionHeader(l.certificatesInProgress, padding: EdgeInsets.only(top: o.items.isEmpty ? 8 : 28, bottom: 12)),
                for (final pr in o.inProgress) ...[
                  FadeSlideIn(
                    index: i++,
                    child: _ProgressCard(progress: pr),
                  ),
                  const SizedBox(height: 12),
                ],
              ],
            ],
          );
        },
      ),
    );
  }
}

class _EarnedCard extends ConsumerWidget {
  const _EarnedCard({required this.cert, required this.isNew, required this.onTap});
  final Certificate cert;
  final bool isNew;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    return RaisedCard(
      key: Key('cert-${cert.code}'),
      onTap: onTap,
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 112,
            child: MediaImage(cert.course.coverImageUrl, fallback: ColoredBox(color: coverColor(cert.course.coverStyle))),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Slate(cert.batchCode),
                    const Spacer(),
                    if (isNew) StatusChip(label: l.certificateNew, color: AzzaColors.onAir, textColor: AzzaColors.ink),
                  ],
                ),
                const SizedBox(height: 10),
                Text(cert.courseName(locale), style: t.titleMedium, maxLines: 2, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Text(
                  [
                    if (cert.teacherName.isNotEmpty) l.certificateWithTeacher(cert.teacherName),
                    batchDates(f, cert.startsOn, cert.endsOn),
                  ].where((e) => e.isNotEmpty).join(' · '),
                  style: t.bodySmall,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: MonoLabel(l.certificateAttended(f.n(cert.attended), f.n(cert.total)))),
                    Text(
                      cert.code,
                      textDirection: TextDirection.ltr,
                      style: AzzaFonts.mono(size: 12, color: p.text, tracking: 0.08),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressCard extends ConsumerWidget {
  const _ProgressCard({required this.progress});
  final CertificateProgress progress;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final pr = progress;
    final status = !pr.reachable
        ? l.certificateUnreachable
        : pr.needed <= 0
        ? l.certificateRequirementMet
        : pr.needed == 1
        ? l.certificateOneSessionNeeded
        : l.certificateSessionsNeeded(f.n(pr.needed));
    return RaisedCard(
      onTap: pr.batchId.isEmpty ? null : () => context.push(Routes.batchSchedule(pr.batchId)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Slate(pr.batchCode),
              const SizedBox(width: 10),
              Expanded(
                child: Text(pr.courseName(locale), style: t.titleSmall, maxLines: 1, overflow: TextOverflow.ellipsis),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Semantics(
            label: l.certificateAttendedOfRequired(f.n(pr.attended), f.n(pr.required)),
            child: ExcludeSemantics(
              child: LinearProgressIndicator(
                value: pr.fraction,
                minHeight: 6,
                borderRadius: BorderRadius.circular(3),
                color: pr.reachable ? p.accent : p.muted,
                backgroundColor: p.line,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(status, style: t.bodyMedium?.copyWith(color: pr.reachable ? p.text : p.muted)),
              ),
              const SizedBox(width: 12),
              MonoLabel('${f.n(pr.attended)}/${f.n(pr.required)}'),
            ],
          ),
          if (pr.teacherName.isNotEmpty || pr.endsOn != null) ...[
            const SizedBox(height: 4),
            Text(
              [
                if (pr.teacherName.isNotEmpty) l.certificateWithTeacher(pr.teacherName),
                batchDates(f, pr.startsOn, pr.endsOn),
              ].where((e) => e.isNotEmpty).join(' · '),
              style: t.bodySmall,
            ),
          ],
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/providers.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/certificates_repository.dart';
import '../domain/certificate_models.dart';
import 'certificates_screen.dart' show batchDates;

/// A single certificate, laid out as the paper certificate. The first time a code is opened
/// the header plays the "course complete" moment: the signal mark lights up once.
class CertificateDetailScreen extends ConsumerStatefulWidget {
  const CertificateDetailScreen({super.key, required this.code});
  final String code;

  @override
  ConsumerState<CertificateDetailScreen> createState() => _CertificateDetailScreenState();
}

class _CertificateDetailScreenState extends ConsumerState<CertificateDetailScreen> {
  late final bool _isNew = ref.read(seenCertificatesProvider).isNew(widget.code);

  @override
  void initState() {
    super.initState();
    if (_isNew) ref.read(seenCertificatesProvider).markSeen(widget.code);
  }

  Future<void> _share(Certificate c) async {
    final url = ref.read(appConfigProvider).certificateVerifyUrl(c.code);
    await Clipboard.setData(ClipboardData(text: url));
    if (mounted) showToast(context, context.l10n.certificateLinkCopied);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final cert = ref.watch(certificateProvider(widget.code));
    return Scaffold(
      appBar: AppBar(
        actions: [
          if (cert.hasValue)
            IconButton(
              tooltip: l.certificateShare,
              onPressed: () => _share(cert.requireValue),
              icon: const Icon(Icons.ios_share_rounded),
            ),
        ],
      ),
      body: AsyncView<Certificate>(
        value: cert,
        onRetry: () => ref.invalidate(certificateProvider(widget.code)),
        data: (c) {
          final f = ref.watch(fmtProvider);
          final t = Theme.of(context).textTheme;
          final p = AzzaPalette.of(context);
          return ListView(
            padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 32),
            children: [
              Row(children: [
                SignalLightUp(key: const Key('cert-signal'), size: 52, play: _isNew),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    DisplayText(l.certificateCompleteTitle, size: 28),
                    const SizedBox(height: 4),
                    Text(l.certificateCompleteBody(f.n(c.attended), f.n(c.total)), style: t.bodySmall),
                  ]),
                ),
              ]),
              const SizedBox(height: 24),
              _CertificateCard(cert: c, holder: c.holderName ?? ref.watch(currentUserProvider)?.name ?? ''),
              const SizedBox(height: 16),
              Text(
                l.certificateVerifyHint(ref.watch(appConfigProvider).certificateVerifyUrl(c.code)),
                style: t.bodySmall?.copyWith(color: p.muted),
                textAlign: TextAlign.center,
              ),
            ],
          );
        },
      ),
      bottomNavigationBar: cert.hasValue
          ? BottomActionBar(children: [
              FilledButton.icon(
                key: const Key('cert-share'),
                onPressed: () => _share(cert.requireValue),
                icon: const Icon(Icons.link_rounded),
                label: Text(l.certificateShare),
              ),
            ])
          : null,
    );
  }
}

/// The paper: ivory stock, ink type, mono data — the same in every theme.
class _CertificateCard extends ConsumerWidget {
  const _CertificateCard({required this.cert, required this.holder});
  final Certificate cert;
  final String holder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final arabic = context.isArabic;
    const ink = AzzaColors.ink;
    const muted = AzzaColors.mutedDeep;

    Widget field(String label, String value, {bool mono = false}) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 7),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            SizedBox(width: 96, child: MonoLabel(label, color: muted)),
            Expanded(
              child: Text(
                value,
                textDirection: mono ? TextDirection.ltr : null,
                textAlign: mono && arabic ? TextAlign.end : TextAlign.start,
                style: mono
                    ? AzzaFonts.mono(size: 13, color: ink, tracking: 0.06)
                    : AzzaFonts.body(arabic: arabic, size: 14, weight: FontWeight.w500, color: ink),
              ),
            ),
          ]),
        );

    return Semantics(
      container: true,
      label: '${l.certificateOfCompletion}. ${l.certificateAwardedTo} $holder. ${cert.courseName(locale)}.',
      child: Container(
        key: const Key('cert-card'),
        padding: const EdgeInsets.fromLTRB(22, 22, 22, 20),
        decoration: BoxDecoration(
          color: AzzaColors.ivory,
          borderRadius: BorderRadius.circular(AzzaSpace.radius),
          border: Border.all(color: AzzaColors.creamLine),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const AzzaWordmark(size: 26, color: ink),
            const Spacer(),
            Flexible(child: MonoLabel(l.certificateOfCompletion, color: muted, size: 10)),
          ]),
          const SizedBox(height: 28),
          MonoLabel(l.certificateAwardedTo, color: muted),
          const SizedBox(height: 6),
          Text(holder, style: AzzaFonts.display(arabic: arabic, size: 32, weight: FontWeight.w800, color: ink)),
          const SizedBox(height: 18),
          MonoLabel(l.certificateForCompleting, color: muted),
          const SizedBox(height: 6),
          Text(cert.courseName(locale), style: AzzaFonts.display(arabic: arabic, size: 24, color: ink)),
          const SizedBox(height: 20),
          const Divider(color: AzzaColors.creamLine, height: 1),
          const SizedBox(height: 8),
          field(l.certificateBatch, cert.batchCode, mono: true),
          if (cert.teacherName.isNotEmpty) field(l.certificateTeacher, cert.teacherName),
          if (cert.startsOn != null || cert.endsOn != null) field(l.certificateDates, batchDates(f, cert.startsOn, cert.endsOn)),
          if (cert.issuedAt != null) field(l.certificateIssued, f.longDate(cert.issuedAt!)),
          field(l.certificateAttendance, '${f.n(cert.attended)}/${f.n(cert.total)}'),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(color: AzzaColors.cream, borderRadius: BorderRadius.circular(AzzaSpace.radiusSm)),
            child: Row(children: [
              const SignalMark(size: 22, color: AzzaColors.onAir),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  MonoLabel(l.certificateVerifyCode, color: muted),
                  const SizedBox(height: 4),
                  SelectableText(
                    cert.code,
                    key: const Key('cert-code'),
                    textDirection: TextDirection.ltr,
                    style: AzzaFonts.mono(size: 16, weight: FontWeight.w600, color: ink, tracking: 0.1),
                  ),
                ]),
              ),
            ]),
          ),
        ]),
      ),
    );
  }
}

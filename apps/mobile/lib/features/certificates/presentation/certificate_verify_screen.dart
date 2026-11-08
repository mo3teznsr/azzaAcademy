import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/certificates_repository.dart';
import '../domain/certificate_models.dart';
import 'certificate_detail_screen.dart' show CertificateCard;

/// Public certificate check (`GET /api/v1/certificates/:code`): anyone with the link or the code, signed in or not,
/// sees whether Azza issued it, to whom and for which course.
class CertificateVerifyScreen extends ConsumerWidget {
  const CertificateVerifyScreen({super.key, required this.code});
  final String code;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final cert = ref.watch(verifyCertificateProvider(code));
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final notFound = cert.error is AppException && (cert.error as AppException).code == 'NOT_FOUND';
    final guest = ref.watch(isGuestProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l.guestVerifyTitle),
        // Opened from a link there may be nothing to pop back to.
        leading: GoRouter.maybeOf(context)?.canPop() ?? true ? null : IconButton(tooltip: MaterialLocalizations.of(context).closeButtonTooltip, onPressed: () => context.go(Routes.studentExplore), icon: const Icon(Icons.close_rounded)),
      ),
      body: notFound
          ? ListView(padding: const EdgeInsets.all(AzzaSpace.gutter), children: [
              SectionCard(
                key: const Key('verify-invalid'),
                margin: EdgeInsets.zero,
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Icon(Icons.gpp_maybe_outlined, color: p.danger, size: 32),
                  const SizedBox(height: 12),
                  DisplayText(l.guestVerifyInvalid, size: 24),
                  const SizedBox(height: 8),
                  Text(l.guestVerifyInvalidBody, style: t.bodyMedium?.copyWith(color: p.muted)),
                  const SizedBox(height: 12),
                  SelectableText(code, textDirection: TextDirection.ltr, style: t.titleSmall),
                ]),
              ),
            ])
          : AsyncView<Certificate>(
              value: cert,
              onRetry: () => ref.invalidate(verifyCertificateProvider(code)),
              data: (c) => ListView(
                padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 32),
                children: [
                  Container(
                    key: const Key('verify-valid'),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: p.successBg, borderRadius: BorderRadius.circular(AzzaSpace.radius)),
                    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Icon(Icons.verified_rounded, color: p.success, size: 28),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(l.guestVerifyValid, style: t.titleMedium?.copyWith(color: p.success)),
                          const SizedBox(height: 4),
                          Text(l.guestVerifyValidBody(c.holderName ?? '', c.courseName(locale)), style: t.bodyMedium),
                        ]),
                      ),
                    ]),
                  ),
                  const SizedBox(height: 20),
                  CertificateCard(cert: c, holder: c.holderName ?? ''),
                ],
              ),
            ),
      bottomNavigationBar: guest
          ? BottomActionBar(children: [
              FilledButton(
                key: const Key('verify-explore'),
                onPressed: () => context.go(Routes.studentExplore),
                child: Text(l.guestVerifyLearnCta),
              ),
            ])
          : null,
    );
  }
}

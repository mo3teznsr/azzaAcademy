import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ui.dart';
import 'auth_controller.dart';

/// Brand moment while the stored session token is validated.
class SplashScreen extends ConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final auth = ref.watch(authControllerProvider);
    return Scaffold(
      backgroundColor: AzzaColors.navy,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(28, 24, 28, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              MonoLabel(l.splashTagline),
              const Spacer(),
              const SignalMark(size: 96, live: true),
              const SizedBox(height: 18),
              const AzzaWordmark(size: 96, color: AzzaColors.ivory),
              const SizedBox(height: 14),
              DisplayText(l.splashLine, size: 26, weight: FontWeight.w400, color: AzzaColors.ivory),
              const Spacer(),
              if (auth.hasError)
                ErrorState(error: auth.error!, onRetry: () => ref.read(authControllerProvider.notifier).retry())
              else
                const LinearProgressIndicator(minHeight: 2),
            ],
          ),
        ),
      ),
    );
  }
}

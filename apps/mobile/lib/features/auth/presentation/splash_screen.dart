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
      backgroundColor: AzzaColors.inkDeep,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // The moment a class begins: a learner settles in at 7pm as the small group appears on screen.
          // The photo's lower third is already near-black, and the wash finishes the fade into inkDeep, so
          // the wordmark and line sit on the ground, never on the picture.
          Image.asset('assets/images/splash.jpg', fit: BoxFit.cover, alignment: Alignment.topCenter, excludeFromSemantics: true),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                stops: [0, 0.45, 0.68, 1],
                colors: [Color(0x0007110D), Color(0x0007110D), Color(0xE607110D), AzzaColors.inkDeep],
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(28, 24, 28, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Spacer(),
                  const AzzaWordmark(size: 84, color: AzzaColors.cream),
                  const SizedBox(height: 14),
                  DisplayText(l.splashLine, size: 26, weight: FontWeight.w400, color: AzzaColors.cream),
                  const SizedBox(height: 10),
                  Row(children: [
                    const SignalMark(size: 14, color: AzzaColors.green, live: true),
                    const SizedBox(width: 8),
                    Flexible(child: MonoLabel(l.splashTagline, color: AzzaColors.muted)),
                  ]),
                  const SizedBox(height: 28),
                  if (auth.hasError)
                    ErrorState(error: auth.error!, onRetry: () => ref.read(authControllerProvider.notifier).retry())
                  else
                    const LinearProgressIndicator(minHeight: 2),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

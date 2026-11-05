import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/device_timezone.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';

/// Interests + timezone; personalises Explore and converts batch times locally.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _interests = <String>{};
  final _times = <String>{};

  String get _timezone {
    final offset = DateTime.now().timeZoneOffset;
    final sign = offset.isNegative ? '-' : '+';
    final h = offset.inHours.abs();
    final m = offset.inMinutes.abs() % 60;
    return '${DateTime.now().timeZoneName} · GMT$sign$h${m == 0 ? '' : ':${m.toString().padLeft(2, '0')}'}';
  }

  Future<void> _finish({bool skip = false}) async {
    // The IANA zone is saved to the new profile on sign-up, so session times are right from day one.
    final tz = await deviceTimezone();
    await ref.read(onboardingProvider.notifier).complete(
          interests: skip ? const [] : _interests.toList(),
          bestTimes: skip ? const [] : _times.toList(),
          timezone: tz,
        );
    if (mounted) context.go(Routes.signIn);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final interests = {
      'design': l.interestDesign,
      'languages': l.interestLanguages,
      'code': l.interestCode,
      'business': l.interestBusiness,
      'art': l.interestArt,
      'music': l.interestMusic,
    };
    final times = {'mornings': l.mornings, 'evenings': l.evenings, 'weekends': l.weekends};

    Widget chips(Map<String, String> options, Set<String> selected) => Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final e in options.entries)
          FilterChip(
            label: Text(e.value),
            selected: selected.contains(e.key),
            showCheckmark: false,
            labelStyle: TextStyle(color: selected.contains(e.key) ? p.onAccent : p.text),
            onSelected: (v) => setState(() => v ? selected.add(e.key) : selected.remove(e.key)),
          ),
      ],
    );

    return Scaffold(
      appBar: AppBar(
        actions: [TextButton(onPressed: () => _finish(skip: true), child: Text(l.skip))],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: AzzaSpace.gutter),
        children: [
          // Decorative film-set still (scenes/onboarding); the title below carries the meaning.
          ClipRRect(
            borderRadius: BorderRadius.circular(AzzaSpace.radius),
            child: SizedBox(
              height: 220,
              child: Image.asset(
                'assets/images/onboarding.jpg',
                fit: BoxFit.cover,
                alignment: const Alignment(0, -0.2),
                excludeFromSemantics: true,
              ),
            ),
          ),
          const SizedBox(height: 24),
          DisplayText(l.onboardingTitle, size: 36),
          const SizedBox(height: 24),
          chips(interests, _interests),
          const SizedBox(height: 32),
          Text(l.onboardingTimezone, style: t.bodySmall),
          const SizedBox(height: 8),
          RaisedCard(
            child: Row(
              children: [
                Icon(Icons.public_rounded, color: p.muted),
                const SizedBox(width: 12),
                Expanded(child: Text(_timezone, style: t.titleSmall)),
                MonoLabel(l.detected),
              ],
            ),
          ),
          const SizedBox(height: 32),
          Text(l.bestTime, style: t.bodySmall),
          const SizedBox(height: 8),
          chips(times, _times),
        ],
      ),
      bottomNavigationBar: BottomActionBar(
        children: [FilledButton(onPressed: _finish, child: Text(l.continueLabel))],
      ),
    );
  }
}

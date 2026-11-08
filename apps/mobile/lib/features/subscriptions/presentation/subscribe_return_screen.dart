import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../router/routes.dart';
import '../../learn/data/lessons_repository.dart';
import '../data/subscription_repository.dart';
import '../domain/subscription_models.dart';

/// Where a just-started plan lands: "Setting up your access…" while the payment confirms, then the next lesson.
/// Polls every 1.5 s for up to a minute, and again whenever the app comes back to the front (the browser or the
/// App Store sheet just closed). Slow is not failed: it never shows an error while the plan is still INCOMPLETE.
class SubscribeReturnScreen extends ConsumerStatefulWidget {
  const SubscribeReturnScreen({super.key, required this.reference});
  final String reference;

  static const pollEvery = Duration(milliseconds: 1500);
  static const maxPolls = 40; // 40 × 1.5 s = 60 s

  @override
  ConsumerState<SubscribeReturnScreen> createState() =>
      _SubscribeReturnScreenState();
}

class _SubscribeReturnScreenState extends ConsumerState<SubscribeReturnScreen>
    with WidgetsBindingObserver {
  Timer? _timer;
  int _polls = 0;
  bool _slow = false;
  bool _checking = false;
  bool _opened = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _begin();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !_opened) _begin();
  }

  /// (Re)starts the minute of polling, checking straight away.
  void _begin() {
    _timer?.cancel();
    _polls = 0;
    if (_slow) setState(() => _slow = false);
    _check();
    _timer = Timer.periodic(SubscribeReturnScreen.pollEvery, (_) {
      if (++_polls >= SubscribeReturnScreen.maxPolls) {
        _timer?.cancel();
        if (mounted) setState(() => _slow = true);
        return;
      }
      _check();
    });
  }

  Future<void> _check() async {
    if (_checking || _opened) return;
    _checking = true;
    try {
      final found = await ref
          .read(subscriptionRepositoryProvider)
          .byReference(widget.reference);
      if (found.status.opensLessons && mounted) _open(found);
    } catch (_) {
      // A dropped connection or a not-yet-visible row is not a failure: keep waiting.
    } finally {
      _checking = false;
    }
  }

  void _open(SubscriptionLookup found) {
    _opened = true;
    _timer?.cancel();
    ref.invalidate(mySubscriptionsProvider);
    final slug = found.courseSlug;
    if (slug == null) return context.go(Routes.studentHome);
    ref.invalidate(courseLessonsProvider(slug));
    final next = found.nextLessonId;
    context.pushReplacement(
      next != null ? Routes.lesson(slug, next) : Routes.courseLessons(slug),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    return Scaffold(
      appBar: AppBar(),
      // Scrolls when large text outgrows the screen; centred when there is room.
      body: LayoutBuilder(
        builder: (context, box) => SingleChildScrollView(
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: box.maxHeight),
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(AzzaSpace.gutter),
                child: _slow
                    ? Column(
                        key: const Key('return-slow'),
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Icon(
                            Icons.hourglass_top_rounded,
                            size: 40,
                            color: p.accent,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            l.returnSlowTitle,
                            style: t.titleLarge,
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            l.returnSlowBody,
                            style: t.bodyMedium,
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 24),
                          FilledButton(
                            key: const Key('return-check-again'),
                            onPressed: _begin,
                            child: Text(l.returnCheckAgain),
                          ),
                          const SizedBox(height: 8),
                          TextButton(
                            key: const Key('return-plans'),
                            style: TextButton.styleFrom(
                              minimumSize: const Size.fromHeight(44),
                            ),
                            onPressed: () => context.go(Routes.myPlans),
                            child: Text(l.returnSeePlans),
                          ),
                          TextButton(
                            key: const Key('return-home'),
                            style: TextButton.styleFrom(
                              minimumSize: const Size.fromHeight(44),
                            ),
                            onPressed: () => context.go(Routes.studentHome),
                            child: Text(l.returnHome),
                          ),
                        ],
                      )
                    : Semantics(
                        liveRegion: true,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Center(
                              child: SizedBox.square(
                                dimension: 32,
                                child: CircularProgressIndicator(
                                  strokeWidth: 3,
                                ),
                              ),
                            ),
                            const SizedBox(height: 20),
                            Text(
                              l.returnSettingUp,
                              style: t.titleLarge,
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              l.returnSettingUpBody,
                              style: t.bodyMedium,
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

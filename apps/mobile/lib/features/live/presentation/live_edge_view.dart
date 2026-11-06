import 'package:add_2_calendar/add_2_calendar.dart' as cal;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../catalog/domain/catalog_models.dart';
import '../domain/live_edge.dart';
import '../domain/live_models.dart';

String _slateNo(int n) => 'S${n.toString().padLeft(2, '0')}';

/// Teacher portrait inside the signal arcs; arcs pulse while [live] (static with reduced motion).
class SignalPortrait extends StatelessWidget {
  const SignalPortrait({super.key, required this.person, this.live = true, this.size = 96});
  final PersonRef? person;
  final bool live;
  final double size;

  @override
  Widget build(BuildContext context) {
    final box = size * 2.1;
    return ExcludeSemantics(
      child: SizedBox.square(
        dimension: box,
        child: Stack(alignment: Alignment.center, children: [
          SignalMark(size: box, color: AzzaColors.sun, live: live),
          Container(
            decoration: const BoxDecoration(shape: BoxShape.circle, color: AzzaColors.ink),
            padding: const EdgeInsets.all(4),
            child: InitialsAvatar(person?.name ?? '', size: size, imageUrl: person?.image, color: AzzaColors.sun),
          ),
        ]),
      ),
    );
  }
}

/// "`Teacher` hasn't started yet · usually starts within 5 min".
class WaitingForHost extends StatelessWidget {
  const WaitingForHost({super.key, required this.host});
  final PersonRef? host;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    return Semantics(
      liveRegion: true,
      child: Column(children: [
        SignalPortrait(person: host),
        const SizedBox(height: 8),
        Text(l.edgeWaitingTitle(host?.name ?? ''), textAlign: TextAlign.center, style: t.titleLarge),
        const SizedBox(height: 4),
        Text(l.edgeWaitingSub, textAlign: TextAlign.center, style: t.bodySmall),
      ]),
    );
  }
}

Future<void> openAppSettings(BuildContext context) async {
  // iOS deep-links into the app's own Settings page; Android has no URL for it without a plugin.
  final ok = await launchUrl(Uri.parse('app-settings:')).catchError((_) => false);
  if (!ok && context.mounted) showToast(context, context.l10n.edgePermStepsAndroid);
}

/// Blocked / missing camera or mic: how to re-enable it, plus degraded ways in.
class PermissionHelp extends StatelessWidget {
  const PermissionHelp({super.key, required this.failure, this.onRetry, this.onAudioOnly, this.onListenOnly});
  final MediaFailure failure;
  final VoidCallback? onRetry;
  final VoidCallback? onAudioOnly;
  final VoidCallback? onListenOnly;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    final ios = defaultTargetPlatform == TargetPlatform.iOS;
    final body = switch (failure) {
      MediaFailure.missing => l.edgePermMissing,
      MediaFailure.busy => l.edgePermBusy,
      _ => l.edgePermBody,
    };
    return Semantics(
      liveRegion: true,
      container: true,
      child: RaisedCard(
        color: AzzaPalette.of(context).warningBg,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(Icons.no_photography_outlined, color: AzzaPalette.of(context).warning),
            const SizedBox(width: 10),
            Expanded(child: Text(l.edgePermTitle, style: t.titleMedium)),
          ]),
          const SizedBox(height: 6),
          Text(body, style: t.bodySmall),
          if (failure == MediaFailure.denied) ...[
            const SizedBox(height: 6),
            Text(ios ? l.edgePermStepsIos : l.edgePermStepsAndroid, style: t.bodyMedium),
          ],
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, children: [
            if (failure == MediaFailure.denied && ios)
              FilledButton.icon(onPressed: () => openAppSettings(context), icon: const Icon(Icons.settings_outlined), label: Text(l.edgeOpenSettings)),
            if (onRetry != null) OutlinedButton(onPressed: onRetry, child: Text(l.edgeTryAgain)),
            if (onAudioOnly != null) OutlinedButton.icon(onPressed: onAudioOnly, icon: const Icon(Icons.mic_rounded), label: Text(l.edgeJoinAudioOnly)),
            if (onListenOnly != null) TextButton(onPressed: onListenOnly, child: Text(l.edgeJoinListenOnly)),
          ]),
        ]),
      ),
    );
  }
}

/// Full-screen replacement for the lobby / room: cancelled, moved, room full, ended, not enrolled.
class LiveEdgeView extends ConsumerWidget {
  const LiveEdgeView({super.key, required this.edge, this.detail, this.onRetry, this.retrying = false});
  final LiveEdge edge;
  final SessionDetail? detail;
  final VoidCallback? onRetry;
  final bool retrying;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final s = detail?.session;
    final no = s == null ? '' : _slateNo(s.number);
    final teacher = detail?.batch?.teacher;
    String when(DateTime d) => f.dayTime(d.toLocal());
    final tz = DateTime.now().timeZoneName;

    final (String title, String body) = switch (edge.kind) {
      LiveEdgeKind.cancelled => (l.edgeCancelledTitle(no, teacher?.name ?? ''), l.edgeCancelledBody),
      LiveEdgeKind.moved => (
          l.edgeMovedTitle(no, when(edge.startsAt ?? s!.startsAt)),
          edge.movedFrom == null ? '' : l.edgeMovedBody(when(edge.movedFrom!), tz),
        ),
      LiveEdgeKind.roomFull => (
          edge.inRoom != null && edge.capacity != null ? l.edgeRoomFullTitle(f.number(edge.inRoom!), f.number(edge.capacity!)) : l.edgeRoomFullGeneric,
          l.edgeRoomFullBody,
        ),
      LiveEdgeKind.notEnrolled => (l.edgeNotEnrolledTitle, l.edgeNotEnrolledBody),
      _ => (l.edgeEndedTitle, l.edgeEndedBody),
    };

    Future<void> addToCalendar() async {
      final d = detail;
      if (d == null) return;
      final starts = edge.startsAt ?? d.session.startsAt;
      await cal.Add2Calendar.addEvent2Cal(cal.Event(
        title: '${Fmt.slate(d.session.batchCode, d.session.number)} · ${d.session.title}',
        description: d.session.courseTitle,
        startDate: starts,
        endDate: starts.add(d.session.endsAt.difference(d.session.startsAt)),
      ));
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 24, AzzaSpace.gutter, 24),
      children: [
        if (detail != null) Center(child: MonoLabel(detail!.slate)),
        const SizedBox(height: 16),
        Center(
          child: edge.kind == LiveEdgeKind.roomFull
              ? SignalPortrait(person: teacher, live: false, size: 72)
              : SignalMark(size: 56, color: edge.kind == LiveEdgeKind.moved ? AzzaPalette.of(context).info : AzzaPalette.of(context).muted),
        ),
        const SizedBox(height: 16),
        Semantics(
          liveRegion: true,
          header: true,
          child: Text(title, textAlign: TextAlign.center, style: t.headlineSmall),
        ),
        if (body.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(body, textAlign: TextAlign.center, style: t.bodyMedium),
        ],
        const SizedBox(height: 24),
        if (edge.kind == LiveEdgeKind.roomFull && onRetry != null) ...[
          FilledButton.icon(
            onPressed: retrying ? null : onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: Text(l.edgeTryAgain),
          ),
          const SizedBox(height: 8),
        ],
        if (edge.kind == LiveEdgeKind.moved && detail != null) ...[
          FilledButton.icon(onPressed: addToCalendar, icon: const Icon(Icons.event_rounded), label: Text(l.addToCalendar)),
          const SizedBox(height: 8),
        ],
        OutlinedButton.icon(
          onPressed: () => context.go(Routes.studentSchedule),
          icon: const Icon(Icons.calendar_month_outlined),
          label: Text(l.edgeBackToSchedule),
        ),
      ],
    );
  }
}

/// Slide-down connection banner: "Reconnecting…" or "Connection lost · Rejoin". A live region.
class ConnectionBanner extends StatelessWidget {
  const ConnectionBanner({super.key, required this.state, required this.onRejoin, this.rejoining = false});
  final LinkState state;
  final VoidCallback onRejoin;
  final bool rejoining;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final reduce = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    final Widget child = switch (state) {
      LinkState.ok => const SizedBox(key: ValueKey('ok'), width: double.infinity),
      LinkState.reconnecting => _bar(
          key: const Key('reconnecting-banner'),
          color: AzzaColors.peach,
          leading: const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AzzaColors.ink)),
          text: l.edgeReconnecting,
        ),
      LinkState.lost => _bar(
          key: const Key('lost-banner'),
          color: AzzaColors.dangerDeep,
          fg: AzzaColors.ivory,
          leading: const Icon(Icons.wifi_off_rounded, size: 18, color: AzzaColors.ivory),
          text: l.edgeLostTitle,
          action: TextButton(
            onPressed: rejoining ? null : onRejoin,
            style: TextButton.styleFrom(foregroundColor: AzzaColors.ivory, minimumSize: const Size(48, 40)),
            child: Text(l.edgeRejoin),
          ),
        ),
    };
    return Semantics(
      liveRegion: true,
      child: AnimatedSwitcher(
        duration: reduce ? Duration.zero : AzzaMotion.quick,
        transitionBuilder: (c, a) => SizeTransition(
          sizeFactor: a,
          alignment: Alignment.topCenter,
          child: SlideTransition(position: Tween(begin: const Offset(0, -0.4), end: Offset.zero).animate(a), child: c),
        ),
        child: child,
      ),
    );
  }

  Widget _bar({required Key key, required Color color, Color fg = AzzaColors.ink, required Widget leading, required String text, Widget? action}) => Container(
        key: key,
        width: double.infinity,
        margin: const EdgeInsets.symmetric(horizontal: 16),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(14)),
        child: Row(children: [
          leading,
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: TextStyle(color: fg, fontWeight: FontWeight.w700))),
          ?action,
        ]),
      );
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/session_repository.dart';
import '../data/video_room_service.dart';
import '../domain/live_models.dart';
import 'chat_people_sheet.dart';
import 'live_room_controller.dart';

@immutable
class JoinOptions {
  const JoinOptions({this.micOn = true, this.camOn = true, this.record = true});
  final bool micOn;
  final bool camOn;
  final bool record;
}

/// Live room: speaker view + filmstrip, control bar, chat/people sheet, reconnecting banner.
class LiveRoomScreen extends ConsumerStatefulWidget {
  const LiveRoomScreen({super.key, required this.sessionId, this.options});
  final String sessionId;
  final JoinOptions? options;

  @override
  ConsumerState<LiveRoomScreen> createState() => _LiveRoomScreenState();
}

class _LiveRoomScreenState extends ConsumerState<LiveRoomScreen> {
  late final LiveRoomController _c;
  bool _navigatedAway = false;

  @override
  void initState() {
    super.initState();
    final role = ref.read(currentRoleProvider);
    final observer = role == Role.admin;
    _c = LiveRoomController(
      sessionId: widget.sessionId,
      sessions: ref.read(sessionRepositoryProvider),
      video: ref.read(videoRoomServiceFactoryProvider)(),
      realtime: ref.read(realtimeClientProvider),
      selfId: ref.read(currentUserProvider)?.id ?? '',
    )..addListener(_onChange);
    _c.join(micOn: !observer && (widget.options?.micOn ?? true), camOn: !observer && (widget.options?.camOn ?? true));
  }

  void _onChange() {
    if (_c.phase == RoomPhase.ended && !_navigatedAway && mounted) {
      _navigatedAway = true;
      final role = ref.read(currentRoleProvider);
      context.pushReplacement(switch (role) {
        Role.teacher => Routes.attendance(widget.sessionId),
        Role.admin => Routes.adminLive,
        _ => Routes.afterSession(widget.sessionId),
      });
    }
  }

  @override
  void dispose() {
    _c.removeListener(_onChange);
    _c.dispose();
    super.dispose();
  }

  Future<void> _leave() async {
    await _c.leave();
    if (!mounted) return;
    final role = ref.read(currentRoleProvider);
    _navigatedAway = true;
    if (role == Role.student) {
      context.pushReplacement(Routes.afterSession(widget.sessionId));
    } else {
      context.pop();
    }
  }

  Future<void> _confirmEnd() async {
    final l = context.l10n;
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l.endConfirmTitle),
        content: Text(l.endConfirmBody),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AzzaColors.onAir, foregroundColor: AzzaColors.ink),
            onPressed: () => Navigator.pop(context, true),
            child: Text(l.endForAll),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _c.endForAll();
    } catch (e) {
      if (mounted) showToast(context, AppException.from(e).message);
    }
  }

  void _openSheet({bool people = false}) {
    _c.setChatOpen(true);
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => ChatPeopleSheet(controller: _c, initialPeople: people),
    ).whenComplete(() => _c.setChatOpen(false));
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: AzzaColors.ink,
        body: ListenableBuilder(
          listenable: _c,
          builder: (context, _) {
            if (_c.phase == RoomPhase.joining) return const LoadingState();
            if (_c.phase == RoomPhase.failed) {
              return SafeArea(
                child: Column(children: [
                  Align(alignment: AlignmentDirectional.centerStart, child: CloseButton(onPressed: () => context.pop())),
                  Expanded(child: ErrorState(error: _c.error!, onRetry: () => _c.join())),
                ]),
              );
            }
            return SafeArea(child: _RoomBody(c: _c, l: l, onLeave: _leave, onEnd: _confirmEnd, onSheet: _openSheet));
          },
        ),
      ),
    );
  }
}

class _RoomBody extends StatelessWidget {
  const _RoomBody({required this.c, required this.l, required this.onLeave, required this.onEnd, required this.onSheet});
  final LiveRoomController c;
  final AppLocalizations l;
  final VoidCallback onLeave;
  final VoidCallback onEnd;
  final void Function({bool people}) onSheet;

  @override
  Widget build(BuildContext context) {
    final video = c.video;
    final people = video.participants;
    final speaker = video.activeSpeaker ?? people.where((p) => p.isLocal).firstOrNull;
    final others = people.where((p) => p.id != speaker?.id).toList();
    final observer = c.grant?.role == LiveRole.observer;
    final count = people.isEmpty ? 1 : people.length;

    return Column(children: [
      // ── top bar
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
        child: Row(children: [
          const StatusChip(label: 'Live', color: AzzaColors.onAir, textColor: AzzaColors.ink, live: true),
          const SizedBox(width: 8),
          Ticker(builder: (_, now) => MonoLabel('${l.rec} ${Fmt.timecode(now.difference(c.startedAt ?? now))}', color: AzzaColors.ivory)),
          const Spacer(),
          MonoLabel('${l.inRoom('$count')}${c.hands.isNotEmpty ? ' · ✋ ${c.hands.length}' : ''}', color: AzzaColors.muted),
        ]),
      ),
      AnimatedSize(
        duration: AzzaMotion.quick,
        child: c.reconnecting
            ? Container(
                key: const Key('reconnecting-banner'),
                width: double.infinity,
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: AzzaColors.peach, borderRadius: BorderRadius.circular(14)),
                child: Row(children: [
                  const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AzzaColors.ink)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text('${l.reconnecting} ${l.reconnectingBody}', style: const TextStyle(color: AzzaColors.ink)),
                  ),
                ]),
              )
            : const SizedBox(width: double.infinity),
      ),
      // ── speaker view
      Expanded(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: ColoredBox(
              color: AzzaColors.ink2,
              child: speaker == null || c.grant?.videoAvailable != true
                  ? Center(child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 32),
                          child: Text(
                            c.grant?.devMode == true ? l.videoDevMode : (c.grant?.videoAvailable == false ? l.liveUnavailable : l.onlyYou),
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: AzzaColors.muted),
                          ),
                        ))
                  : _Tile(p: speaker, video: video, large: true, hostLabel: l.hostLabel, youLabel: l.you),
            ),
          ),
        ),
      ),
      // ── filmstrip
      if (others.isNotEmpty)
        SizedBox(
          height: 96,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            scrollDirection: Axis.horizontal,
            itemCount: others.length,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final raised = c.hands.any((h) => h.userId == others[i].id);
              return SizedBox(
                width: 80,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: ColoredBox(
                    color: AzzaColors.ink2,
                    child: Stack(fit: StackFit.expand, children: [
                      _Tile(p: others[i], video: video, hostLabel: l.hostLabel, youLabel: l.you),
                      if (raised) const PositionedDirectional(top: 4, end: 6, child: Text('✋')),
                    ]),
                  ),
                ),
              );
            },
          ),
        ),
      // ── control bar
      Padding(
        padding: const EdgeInsets.fromLTRB(8, 12, 8, 8),
        child: Wrap(alignment: WrapAlignment.center, spacing: 6, runSpacing: 8, children: [
          if (!observer) ...[
            _Ctl(icon: video.micOn ? Icons.mic_rounded : Icons.mic_off_rounded, label: l.microphone, active: video.micOn, onTap: c.toggleMic),
            _Ctl(icon: video.camOn ? Icons.videocam_rounded : Icons.videocam_off_rounded, label: l.camera, active: video.camOn, onTap: c.toggleCam),
          ],
          if (!c.isHost && !observer)
            _Ctl(icon: Icons.back_hand_rounded, label: l.raiseHand, active: c.handRaised, highlight: c.handRaised, onTap: c.toggleHand),
          _Ctl(
            icon: Icons.chat_bubble_outline_rounded,
            label: l.chat,
            active: true,
            badge: c.unreadChat,
            onTap: () => onSheet(),
          ),
          _Ctl(icon: Icons.people_alt_outlined, label: l.peopleN('$count'), active: true, badge: c.isHost ? c.hands.length : 0, onTap: () => onSheet(people: true)),
          if (c.isHost) _Ctl(icon: Icons.mic_external_off_rounded, label: l.muteAll, active: true, onTap: c.muteAll),
          if (c.isHost)
            _Ctl(icon: Icons.stop_circle_outlined, label: l.endForAll, active: true, danger: true, onTap: onEnd)
          else
            _Ctl(icon: Icons.call_end_rounded, label: l.leave, active: true, danger: true, onTap: onLeave),
        ]),
      ),
    ]);
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.p, required this.video, this.large = false, required this.hostLabel, required this.youLabel});
  final LiveParticipant p;
  final VideoRoomService video;
  final bool large;
  final String hostLabel;
  final String youLabel;

  @override
  Widget build(BuildContext context) {
    return Stack(fit: StackFit.expand, children: [
      if (p.camOn && p.video != null)
        video.renderVideo(p)
      else
        Center(child: InitialsAvatar(p.name, size: large ? 112 : 44, speaking: p.isSpeaking, color: AzzaColors.sun)),
      if (p.isSpeaking)
        DecoratedBox(
          decoration: BoxDecoration(
            border: Border.all(color: AzzaColors.sun, width: 3),
            borderRadius: BorderRadius.circular(large ? 24 : 16),
          ),
        ),
      PositionedDirectional(
        start: 8,
        bottom: 6,
        end: 8,
        child: Row(children: [
          if (!p.micOn) const Icon(Icons.mic_off_rounded, size: 14, color: AzzaColors.peach),
          Flexible(
            child: Text(
              p.isLocal ? youLabel : p.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: AzzaColors.ivory, fontSize: large ? 14 : 11, fontWeight: FontWeight.w600),
            ),
          ),
          if (p.weakNetwork) const Icon(Icons.signal_cellular_connected_no_internet_0_bar_rounded, size: 14, color: AzzaColors.peach),
        ]),
      ),
    ]);
  }
}

class _Ctl extends StatelessWidget {
  const _Ctl({required this.icon, required this.label, required this.active, required this.onTap, this.badge = 0, this.danger = false, this.highlight = false});
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;
  final int badge;
  final bool danger;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final bg = danger
        ? AzzaColors.onAir
        : highlight
            ? AzzaColors.sun
            : active
                ? AzzaColors.ink2
                : AzzaColors.peach;
    final fg = danger || highlight || !active ? AzzaColors.ink : AzzaColors.ivory;
    return Tooltip(
      message: label,
      child: Semantics(
        button: true,
        label: label,
        child: Material(
          color: bg,
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onTap,
            child: SizedBox.square(
              dimension: 52,
              child: Badge(
                isLabelVisible: badge > 0,
                label: Text('$badge'),
                child: Center(child: Icon(icon, color: fg)),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

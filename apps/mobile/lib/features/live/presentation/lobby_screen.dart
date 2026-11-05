import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/error_text.dart';
import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/providers.dart';
import '../../../core/realtime/socket_events.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/session_repository.dart';
import '../data/video_room_service.dart';
import '../domain/live_edge.dart';
import '../domain/live_models.dart';
import 'live_edge_view.dart';
import 'live_room_screen.dart';

/// Pre-join lobby (student) / host lobby (teacher): camera preview, device toggles, join or go live.
class LobbyScreen extends ConsumerStatefulWidget {
  const LobbyScreen({super.key, required this.sessionId});
  final String sessionId;

  @override
  ConsumerState<LobbyScreen> createState() => _LobbyScreenState();
}

class _LobbyScreenState extends ConsumerState<LobbyScreen> {
  VideoRoomService? _previewService;
  CameraPreviewHandle? _preview;
  bool _mic = true;
  bool _cam = true;
  bool _record = true;
  bool _busy = false;
  MediaFailure? _camFailure;
  MediaFailure? _micFailure;
  bool _helpDismissed = false;

  /// Waiting for the host: socket push + polling fallback, then auto-continue once live.
  Timer? _poll;
  void Function()? _statusUnsub;
  bool _waited = false;
  bool _autoEntered = false;

  @override
  void initState() {
    super.initState();
    unawaited(_startPreview());
    if (ref.read(currentUserProvider)?.role != Role.teacher) _watchStatus();
  }

  void _refresh() => ref.invalidate(sessionDetailProvider(widget.sessionId));

  void _watchStatus() {
    final rt = ref.read(realtimeClientProvider);
    unawaited(rt.connect().then((_) => rt.emit(SocketEvents.joinSession, {'sessionId': widget.sessionId})).catchError((_) {}));
    _statusUnsub = rt.on(SocketEvents.sessionStatus, (p) {
      if (p['sessionId'] == widget.sessionId && mounted) _refresh();
    });
    _poll = Timer.periodic(const Duration(seconds: 15), (_) {
      if (mounted && _waited && !_autoEntered) _refresh();
    });
  }

  Future<void> _startPreview() async {
    _previewService = ref.read(videoRoomServiceFactoryProvider)();
    final service = _previewService!;
    final preview = _cam ? await service.startPreview() : null;
    final camFailure = _cam && preview == null ? service.previewFailure : null;
    final micFailure = _mic ? await service.probeMicrophone() : null;
    if (!mounted) {
      await preview?.dispose();
      return;
    }
    setState(() {
      _preview = preview;
      _camFailure = camFailure;
      _micFailure = micFailure;
      _helpDismissed = false;
    });
  }

  Future<void> _retryPreview() async {
    await _stopPreview();
    setState(() {
      _mic = true;
      _cam = true;
    });
    await _startPreview();
  }

  Future<void> _stopPreview() async {
    final p = _preview;
    _preview = null;
    await p?.dispose();
    _previewService?.dispose();
    _previewService = null;
  }

  @override
  void dispose() {
    _poll?.cancel();
    _statusUnsub?.call();
    unawaited(_stopPreview());
    super.dispose();
  }

  Future<void> _enter(SessionDetail d, {required bool host}) async {
    setState(() => _busy = true);
    try {
      if (host && d.session.status != SessionStatus.live) {
        await ref.read(sessionRepositoryProvider).start(widget.sessionId);
      }
      await _stopPreview();
      if (!mounted) return;
      context.pushReplacement(Routes.liveRoom(widget.sessionId), extra: JoinOptions(micOn: _mic, camOn: _cam, record: _record));
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final user = ref.watch(currentUserProvider);
    final host = user?.role == Role.teacher;
    final detail = ref.watch(sessionDetailProvider(widget.sessionId));
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(),
      body: AsyncView<SessionDetail>(
        value: detail,
        onRetry: () => ref.invalidate(sessionDetailProvider(widget.sessionId)),
        data: (d) {
          final s = d.session;
          return Ticker(
            interval: const Duration(seconds: 15),
            builder: (context, now) {
              final open = s.lobbyOpen(now);
              final edge = edgeForSession(s, now, isHost: host);
              if (edge != null && edge.terminal) return LiveEdgeView(edge: edge, detail: d);
              final waiting = edge?.kind == LiveEdgeKind.waiting;
              if (waiting) _waited = true;
              if (!host && s.status == SessionStatus.live && _waited && !_autoEntered) {
                _autoEntered = true;
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (mounted) unawaited(_enter(d, host: false));
                });
              }
              final failure = _camFailure ?? _micFailure;
              return ListView(
                padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 24),
                children: [
                  MonoLabel(open ? l.lobbyOpenStarts(f.time(s.startsAt)) : l.lobbyStarts(f.time(s.startsAt)), color: open ? AzzaColors.sun : null),
                  const SizedBox(height: 6),
                  MonoLabel(d.slate),
                  DisplayText(s.title, size: 32),
                  Text(s.course(locale), style: t.bodySmall),
                  const SizedBox(height: 16),
                  if (!host && waiting) ...[
                    WaitingForHost(host: d.batch?.teacher),
                    const SizedBox(height: 16),
                  ],
                  if (!host && s.status == SessionStatus.live) ...[
                    Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                      const PulsingDot(size: 7),
                      const SizedBox(width: 6),
                      MonoLabel(l.edgeLiveNow, color: AzzaColors.onAir),
                    ]),
                    const SizedBox(height: 12),
                  ],
                  AspectRatio(
                    aspectRatio: 3 / 4,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(AzzaSpace.radius),
                      child: ColoredBox(
                        color: p.raised,
                        child: Stack(fit: StackFit.expand, children: [
                          if (_cam && _preview != null) _preview!.view else Center(child: InitialsAvatar(user?.name ?? '', size: 96)),
                          PositionedDirectional(start: 12, bottom: 12, child: MonoLabel(l.cameraPreview, color: AzzaColors.ivory)),
                        ]),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(children: [
                    Expanded(
                      child: _Toggle(icon: _mic ? Icons.mic_rounded : Icons.mic_off_rounded, label: l.microphone, on: _mic, onTap: () => setState(() => _mic = !_mic)),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _Toggle(icon: _cam ? Icons.videocam_rounded : Icons.videocam_off_rounded, label: l.camera, on: _cam, onTap: () => setState(() => _cam = !_cam)),
                    ),
                  ]),
                  if (failure != null && !_helpDismissed) ...[
                    const SizedBox(height: 12),
                    PermissionHelp(
                      failure: failure,
                      onRetry: () => unawaited(_retryPreview()),
                      onAudioOnly: _camFailure != null && _micFailure == null
                          ? () => setState(() {
                                _cam = false;
                                _helpDismissed = true;
                              })
                          : null,
                      onListenOnly: () => setState(() {
                        _cam = false;
                        _mic = false;
                        _helpDismissed = true;
                      }),
                    ),
                  ],
                  const SizedBox(height: 12),
                  Row(children: [
                    Icon(Icons.network_check_rounded, size: 18, color: p.muted),
                    const SizedBox(width: 8),
                    Expanded(child: Text(l.networkCheck, style: t.bodySmall)),
                  ]),
                  if (d.waitingCount != null) ...[
                    const SizedBox(height: 8),
                    MonoLabel(l.waitingN(f.n(d.waitingCount!))),
                  ],
                  if (host) ...[
                    const SizedBox(height: 12),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(l.recordSession),
                      subtitle: Text(l.recordSessionSub),
                      value: _record,
                      onChanged: (v) => setState(() => _record = v),
                    ),
                  ],
                  if (!open && !host) ...[
                    const SizedBox(height: 12),
                    RaisedCard(child: Text(l.lobbyClosed, style: t.bodyMedium)),
                  ],
                ],
              );
            },
          );
        },
      ),
      bottomNavigationBar: detail.hasValue && !(edgeForSession(detail.requireValue.session, DateTime.now(), isHost: host)?.terminal ?? false)
          ? BottomActionBar(children: [
              if (host)
                FilledButton.icon(
                  onPressed: _busy ? null : () => _enter(detail.requireValue, host: true),
                  style: FilledButton.styleFrom(backgroundColor: AzzaColors.onAir, foregroundColor: AzzaColors.ink),
                  icon: const SignalMark(size: 20, color: AzzaColors.ink),
                  label: Text(l.goLive),
                )
              else
                FilledButton.icon(
                  onPressed: _busy || detail.requireValue.session.status != SessionStatus.live ? null : () => _enter(detail.requireValue, host: false),
                  icon: const Icon(Icons.sensors_rounded),
                  label: Text(
                    detail.requireValue.session.status != SessionStatus.live && detail.requireValue.session.lobbyOpen(DateTime.now())
                        ? l.edgeWaitingButton
                        : l.joinAs(user?.firstName ?? ''),
                  ),
                ),
              if (host) ...[
                const SizedBox(height: 8),
                TextButton(onPressed: () => context.push(Routes.sessionPrep(widget.sessionId)), child: Text(l.prepTitle)),
              ],
            ])
          : null,
    );
  }
}

class _Toggle extends StatelessWidget {
  const _Toggle({required this.icon, required this.label, required this.on, required this.onTap});
  final IconData icon;
  final String label;
  final bool on;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    return Semantics(
      toggled: on,
      button: true,
      label: label,
      child: Material(
        color: on ? p.raised : AzzaColors.peach.withValues(alpha: 0.16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: p.line)),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(children: [Icon(icon), const SizedBox(width: 10), Expanded(child: Text(label))]),
          ),
        ),
      ),
    );
  }
}

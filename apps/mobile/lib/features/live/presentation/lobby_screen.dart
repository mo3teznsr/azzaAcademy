import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/session_repository.dart';
import '../data/video_room_service.dart';
import '../domain/live_models.dart';
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

  @override
  void initState() {
    super.initState();
    unawaited(_startPreview());
  }

  Future<void> _startPreview() async {
    _previewService = ref.read(videoRoomServiceFactoryProvider)();
    final preview = await _previewService!.startPreview();
    if (!mounted) {
      await preview?.dispose();
      return;
    }
    setState(() => _preview = preview);
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
      if (mounted) showToast(context, AppException.from(e).message);
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
              return ListView(
                padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 24),
                children: [
                  MonoLabel(open ? l.lobbyOpenStarts(f.time(s.startsAt)) : l.lobbyStarts(f.time(s.startsAt)), color: open ? AzzaColors.sun : null),
                  const SizedBox(height: 6),
                  MonoLabel(d.slate),
                  DisplayText(s.title, size: 32),
                  Text(s.course(locale), style: t.bodySmall),
                  const SizedBox(height: 16),
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
      bottomNavigationBar: detail.hasValue
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
                  onPressed: _busy || !detail.requireValue.session.lobbyOpen(DateTime.now()) ? null : () => _enter(detail.requireValue, host: false),
                  icon: const Icon(Icons.sensors_rounded),
                  label: Text(l.joinAs(user?.firstName ?? '')),
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

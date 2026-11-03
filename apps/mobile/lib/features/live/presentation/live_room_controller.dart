import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../../core/domain/enums.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/realtime/realtime_client.dart';
import '../../../core/realtime/socket_events.dart';
import '../../../core/utils/json.dart';
import '../data/session_repository.dart';
import '../data/video_room_service.dart';
import '../domain/live_edge.dart';
import '../domain/live_models.dart';

enum RoomPhase { joining, live, ended, failed }

/// Orchestrates one live session: LiveKit media + Socket.IO chat/hands/status.
class LiveRoomController extends ChangeNotifier {
  LiveRoomController({
    required this.sessionId,
    required this.sessions,
    required this.video,
    required this.realtime,
    required this.selfId,
  });

  final String sessionId;
  final SessionRepository sessions;
  final VideoRoomService video;
  final RealtimeClient realtime;
  final String selfId;

  RoomPhase phase = RoomPhase.joining;
  JoinGrant? grant;
  AppException? error;
  final List<ChatMessage> messages = [];
  List<RaisedHand> hands = const [];
  DateTime? startedAt;
  bool handRaised = false;
  bool socketDown = false;
  int unreadChat = 0;
  bool chatOpen = false;

  final List<void Function()> _unsubs = [];
  StreamSubscription<bool>? _connSub;
  bool _disposed = false;

  bool rejoining = false;
  bool _micPref = true;
  bool _camPref = true;

  bool get isHost => grant?.isHost ?? false;
  bool get reconnecting => video.reconnecting || socketDown;

  /// LiveKit dropped us for good; the room screen offers Rejoin.
  bool get connectionLost => video.connectionLost && phase == RoomPhase.live;
  LinkState get link => linkState(reconnecting: reconnecting && !rejoining, lost: connectionLost && !rejoining);
  MediaFailure? get mediaFailure => video.mediaFailure;

  Future<void> join({bool micOn = true, bool camOn = true}) async {
    _micPref = micOn;
    _camPref = camOn;
    phase = RoomPhase.joining;
    error = null;
    _notify();
    try {
      final g = await sessions.join(sessionId);
      grant = g;
      unawaited(_wireRealtime());
      unawaited(_loadHistory());
      if (g.videoAvailable) {
        await video.connect(g, micOn: micOn, camOn: camOn);
      }
      video.addListener(_notify);
      startedAt ??= DateTime.now();
      phase = RoomPhase.live;
    } catch (e) {
      error = AppException.from(e);
      phase = RoomPhase.failed;
    }
    _notify();
  }

  Future<void> _loadHistory() async {
    try {
      final history = await sessions.messages(sessionId);
      messages
        ..clear()
        ..addAll(history);
      _notify();
    } catch (_) {}
  }

  Future<void> _wireRealtime() async {
    try {
      await realtime.connect();
    } catch (_) {
      socketDown = true;
    }
    _connSub = realtime.connection.listen((up) {
      socketDown = !up;
      if (up) realtime.emit(SocketEvents.joinSession, {'sessionId': sessionId});
      _notify();
    });
    realtime.emit(SocketEvents.joinSession, {'sessionId': sessionId});
    _unsubs
      ..add(realtime.on(SocketEvents.chatMessage, (p) {
        if ((p['sessionId'] ?? sessionId) != sessionId) return;
        final m = ChatMessage.fromJson(p);
        if (messages.any((e) => e.id == m.id && m.id.isNotEmpty)) return;
        messages.add(m);
        if (!chatOpen) unreadChat++;
        _notify();
      }))
      ..add(realtime.on(SocketEvents.handQueue, (p) {
        if ((p['sessionId'] ?? sessionId) != sessionId) return;
        hands = list(p, 'queue').map(RaisedHand.fromJson).toList();
        handRaised = hands.any((h) => h.userId == selfId);
        _notify();
      }))
      ..add(realtime.on(SocketEvents.sessionStatus, (p) {
        if (p['sessionId'] != sessionId) return;
        final status = SessionStatus.parse(p['status']);
        if (status == SessionStatus.live) startedAt = date(p, 'startedAt') ?? startedAt;
        if (status == SessionStatus.ended || status == SessionStatus.cancelled) {
          phase = RoomPhase.ended;
          unawaited(video.disconnect());
        }
        _notify();
      }));
  }

  /// New token + new LiveKit connection; chat/socket wiring stays as is.
  Future<void> rejoin() async {
    if (rejoining) return;
    rejoining = true;
    _notify();
    try {
      await video.disconnect();
      final g = await sessions.join(sessionId);
      grant = g;
      if (g.videoAvailable) await video.connect(g, micOn: _micPref, camOn: _camPref);
    } catch (e) {
      error = AppException.from(e);
      phase = RoomPhase.failed;
    }
    rejoining = false;
    _notify();
  }

  /// "Join with audio only" / "listen only" after a blocked device.
  Future<void> continueWithout({bool camera = true, bool microphone = false}) async {
    video.clearMediaFailure();
    if (camera) {
      _camPref = false;
      await video.setCam(false);
    }
    if (microphone) {
      _micPref = false;
      await video.setMic(false);
    }
  }

  void sendChat(String body) {
    final text = body.trim();
    if (text.isEmpty) return;
    realtime.emit(SocketEvents.sendChat, {'sessionId': sessionId, 'body': text});
  }

  void toggleHand() {
    handRaised = !handRaised;
    realtime.emit(handRaised ? SocketEvents.raiseHand : SocketEvents.lowerHand, {'sessionId': sessionId});
    _notify();
  }

  void lowerHandFor(String userId) =>
      realtime.emit(SocketEvents.lowerHand, {'sessionId': sessionId, 'userId': userId});

  void setChatOpen(bool open) {
    chatOpen = open;
    if (open) unreadChat = 0;
    _notify();
  }

  Future<void> toggleMic() {
    _micPref = !video.micOn;
    return video.setMic(_micPref);
  }

  Future<void> toggleCam() {
    _camPref = !video.camOn;
    return video.setCam(_camPref);
  }

  Future<void> allowSpeak(String userId) async {
    await sessions.allowSpeak(sessionId, userId);
    lowerHandFor(userId);
  }

  Future<void> mute(String userId) => sessions.mute(sessionId, userId);
  Future<void> remove(String userId) => sessions.remove(sessionId, userId);

  Future<void> muteAll() async {
    final others = video.participants.where((p) => !p.isLocal && p.micOn);
    await Future.wait(others.map((p) => sessions.mute(sessionId, p.id)));
  }

  Future<void> endForAll() async {
    await sessions.end(sessionId);
    phase = RoomPhase.ended;
    await video.disconnect();
    _notify();
  }

  Future<void> leave() async {
    realtime.emit(SocketEvents.leaveSession, {'sessionId': sessionId});
    await video.disconnect();
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    for (final u in _unsubs) {
      u();
    }
    _connSub?.cancel();
    video.removeListener(_notify);
    realtime.emit(SocketEvents.leaveSession, {'sessionId': sessionId});
    unawaited(video.disconnect());
    video.dispose();
    super.dispose();
  }
}

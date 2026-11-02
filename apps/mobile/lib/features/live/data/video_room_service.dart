import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:livekit_client/livekit_client.dart' as lk;

import '../domain/live_models.dart';

/// View-model of one person in the room, independent of the SDK.
@immutable
class LiveParticipant {
  const LiveParticipant({
    required this.id,
    required this.name,
    this.isLocal = false,
    this.isSpeaking = false,
    this.micOn = false,
    this.camOn = false,
    this.weakNetwork = false,
    this.video,
  });

  final String id;
  final String name;
  final bool isLocal;
  final bool isSpeaking;
  final bool micOn;
  final bool camOn;
  final bool weakNetwork;

  /// Opaque SDK video handle, rendered by [VideoRoomService.renderVideo].
  final Object? video;
}

/// A local camera preview for the lobby.
abstract class CameraPreviewHandle {
  Widget get view;
  Future<void> dispose();
}

/// Port over the video SDK (LiveKit). Screens depend on this, never on LiveKit.
abstract class VideoRoomService extends ChangeNotifier {
  Future<void> connect(JoinGrant grant, {bool micOn = true, bool camOn = true});
  Future<void> disconnect();
  bool get connected;
  bool get reconnecting;
  bool get micOn;
  bool get camOn;
  List<LiveParticipant> get participants;
  LiveParticipant? get activeSpeaker;
  Future<void> setMic(bool on);
  Future<void> setCam(bool on);
  Widget renderVideo(LiveParticipant p, {bool cover = true});
  Future<CameraPreviewHandle?> startPreview();
}

class LiveKitVideoRoomService extends VideoRoomService {
  lk.Room? _room;
  lk.EventsListener<lk.RoomEvent>? _listener;
  bool _reconnecting = false;

  @override
  bool get connected => _room?.connectionState == lk.ConnectionState.connected;

  @override
  bool get reconnecting => _reconnecting;

  @override
  bool get micOn => _room?.localParticipant?.isMicrophoneEnabled() ?? false;

  @override
  bool get camOn => _room?.localParticipant?.isCameraEnabled() ?? false;

  @override
  Future<void> connect(JoinGrant grant, {bool micOn = true, bool camOn = true}) async {
    final room = lk.Room(roomOptions: const lk.RoomOptions(adaptiveStream: true, dynacast: true));
    _room = room;
    _listener = room.createListener()
      ..on<lk.RoomReconnectingEvent>((_) {
        _reconnecting = true;
        notifyListeners();
      })
      ..on<lk.RoomAttemptReconnectEvent>((_) {
        _reconnecting = true;
        notifyListeners();
      })
      ..on<lk.RoomReconnectedEvent>((_) {
        _reconnecting = false;
        notifyListeners();
      })
      ..on<lk.RoomEvent>((_) => notifyListeners());
    room.addListener(notifyListeners);
    await room.connect(grant.serverUrl, grant.token);
    final local = room.localParticipant;
    if (local != null && grant.role != LiveRole.observer) {
      await local.setMicrophoneEnabled(micOn);
      await local.setCameraEnabled(camOn);
    }
    notifyListeners();
  }

  @override
  Future<void> disconnect() async {
    final room = _room;
    _room = null;
    await _listener?.dispose();
    _listener = null;
    if (room != null) {
      room.removeListener(notifyListeners);
      await room.disconnect();
      await room.dispose();
    }
  }

  @override
  Future<void> setMic(bool on) async {
    await _room?.localParticipant?.setMicrophoneEnabled(on);
    notifyListeners();
  }

  @override
  Future<void> setCam(bool on) async {
    await _room?.localParticipant?.setCameraEnabled(on);
    notifyListeners();
  }

  LiveParticipant _map(lk.Participant p, {required bool local}) {
    lk.VideoTrack? video;
    for (final pub in p.videoTrackPublications) {
      final t = pub.track;
      if (t is lk.VideoTrack && !pub.muted) {
        video = t;
        break;
      }
    }
    return LiveParticipant(
      id: p.identity,
      name: p.name.isEmpty ? p.identity : p.name,
      isLocal: local,
      isSpeaking: p.isSpeaking,
      micOn: p.isMicrophoneEnabled(),
      camOn: video != null,
      weakNetwork: p.connectionQuality == lk.ConnectionQuality.poor,
      video: video,
    );
  }

  @override
  List<LiveParticipant> get participants {
    final room = _room;
    if (room == null) return const [];
    return [
      if (room.localParticipant != null) _map(room.localParticipant!, local: true),
      for (final p in room.remoteParticipants.values) _map(p, local: false),
    ];
  }

  @override
  LiveParticipant? get activeSpeaker {
    final room = _room;
    if (room == null) return null;
    final speaker = room.activeSpeakers.where((p) => p is! lk.LocalParticipant).firstOrNull;
    if (speaker != null) return _map(speaker, local: false);
    final remote = room.remoteParticipants.values.firstOrNull;
    return remote == null ? null : _map(remote, local: false);
  }

  @override
  Widget renderVideo(LiveParticipant p, {bool cover = true}) {
    final v = p.video;
    if (v is! lk.VideoTrack) return const SizedBox.shrink();
    return lk.VideoTrackRenderer(
      v,
      key: ValueKey(v.sid ?? p.id),
      fit: cover ? lk.VideoViewFit.cover : lk.VideoViewFit.contain,
    );
  }

  @override
  Future<CameraPreviewHandle?> startPreview() async {
    try {
      final track = await lk.LocalVideoTrack.createCameraTrack();
      return _LiveKitPreview(track);
    } catch (_) {
      return null;
    }
  }

  @override
  void dispose() {
    unawaited(disconnect());
    super.dispose();
  }
}

class _LiveKitPreview implements CameraPreviewHandle {
  _LiveKitPreview(this._track);
  final lk.LocalVideoTrack _track;

  @override
  Widget get view => lk.VideoTrackRenderer(_track, fit: lk.VideoViewFit.cover);

  @override
  Future<void> dispose() async {
    await _track.stop();
    await _track.dispose();
  }
}

/// New instance per live room; the screen owns and disposes it.
final videoRoomServiceFactoryProvider = Provider<VideoRoomService Function()>((ref) => LiveKitVideoRoomService.new);

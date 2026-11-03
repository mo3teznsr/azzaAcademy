import 'package:flutter/foundation.dart';

import '../../../core/domain/enums.dart';
import '../../../core/network/app_exception.dart';
import '../../catalog/domain/catalog_models.dart';

/// Minutes before `startsAt` the lobby opens (mirrors the API's join policy).
const lobbyOpensMinutes = 15;

enum LiveEdgeKind { waiting, lobbyNotOpen, ended, cancelled, moved, roomFull, notEnrolled, network, unknown }

/// A pre-join or refused-join situation the live screens render on their own.
@immutable
class LiveEdge {
  const LiveEdge(this.kind, {this.opensAt, this.startsAt, this.movedFrom, this.inRoom, this.capacity, this.message});

  final LiveEdgeKind kind;
  final DateTime? opensAt;

  /// [LiveEdgeKind.moved]: the new start and the original one.
  final DateTime? startsAt;
  final DateTime? movedFrom;

  /// [LiveEdgeKind.roomFull]: `inRoom / capacity` when known.
  final int? inRoom;
  final int? capacity;
  final String? message;

  /// Edges that replace the whole lobby / room with their own screen.
  bool get terminal => switch (kind) {
        LiveEdgeKind.ended || LiveEdgeKind.cancelled || LiveEdgeKind.moved || LiveEdgeKind.roomFull || LiveEdgeKind.notEnrolled => true,
        _ => false,
      };

  @override
  String toString() => 'LiveEdge($kind)';
}

DateTime lobbyOpensAt(DateTime startsAt) => startsAt.subtract(const Duration(minutes: lobbyOpensMinutes));

/// What the session itself says before asking for a token. `null` = go ahead (live, or the host).
LiveEdge? edgeForSession(SessionSummary s, DateTime now, {bool isHost = false}) {
  if (s.status == SessionStatus.cancelled) return const LiveEdge(LiveEdgeKind.cancelled);
  if (s.status == SessionStatus.ended) return const LiveEdge(LiveEdgeKind.ended);
  if (s.status == SessionStatus.live || isHost) return null;
  final opens = lobbyOpensAt(s.startsAt);
  if (now.isBefore(opens)) {
    if (s.movedFrom != null) return LiveEdge(LiveEdgeKind.moved, startsAt: s.startsAt, movedFrom: s.movedFrom);
    return LiveEdge(LiveEdgeKind.lobbyNotOpen, opensAt: opens);
  }
  return const LiveEdge(LiveEdgeKind.waiting);
}

/// LiveKit refuses a join past `max_participants` with one of these messages.
final _roomFull = RegExp(r'room (is )?full|max(imum)? participants|exceeded its max', caseSensitive: false);

int? _int(Object? v) => v is int ? v : (v is num ? v.toInt() : int.tryParse('$v'));

/// Maps a refused `POST /sessions/:id/join` (or a LiveKit connect failure) to a screen.
LiveEdge edgeForJoinError(AppException e, {SessionSummary? session, int? capacity}) {
  final details = e.details is Map ? (e.details as Map) : const {};
  switch (e.code) {
    case 'SESSION_CANCELLED':
      return const LiveEdge(LiveEdgeKind.cancelled);
    case 'SESSION_ENDED':
      return const LiveEdge(LiveEdgeKind.ended);
    case 'LOBBY_NOT_OPEN':
      if (session?.movedFrom != null) {
        return LiveEdge(LiveEdgeKind.moved, startsAt: session!.startsAt, movedFrom: session.movedFrom);
      }
      final raw = details['opensAt'];
      return LiveEdge(LiveEdgeKind.lobbyNotOpen, opensAt: raw is String ? DateTime.tryParse(raw) : null);
    case 'ROOM_FULL':
      return LiveEdge(
        LiveEdgeKind.roomFull,
        inRoom: _int(details['participants'] ?? details['inRoom']),
        capacity: _int(details['capacity'] ?? details['max']) ?? (capacity != null && capacity > 0 ? capacity : null),
      );
  }
  if (_roomFull.hasMatch(e.message)) {
    final cap = capacity != null && capacity > 0 ? capacity : null;
    return LiveEdge(LiveEdgeKind.roomFull, inRoom: cap, capacity: cap);
  }
  if (e.statusCode == 403) return const LiveEdge(LiveEdgeKind.notEnrolled);
  if (e.isNetwork) return const LiveEdge(LiveEdgeKind.network);
  return LiveEdge(LiveEdgeKind.unknown, message: e.message);
}

/// Why the camera/mic could not be opened.
enum MediaFailure { denied, missing, busy, other }

/// flutter_webrtc / LiveKit surface permission problems as strings (PlatformException, TrackCreateException…).
MediaFailure classifyMediaError(Object error) {
  final s = error.toString().toLowerCase();
  if (s.contains('notallowed') || s.contains('permission') || s.contains('denied') || s.contains('not authorized') || s.contains('unauthorized')) {
    return MediaFailure.denied;
  }
  if (s.contains('notfound') || s.contains('not found') || s.contains('no camera') || s.contains('no device')) return MediaFailure.missing;
  if (s.contains('notreadable') || s.contains('in use') || s.contains('busy')) return MediaFailure.busy;
  return MediaFailure.other;
}

/// Connection banner shown over the room.
enum LinkState { ok, reconnecting, lost }

LinkState linkState({required bool reconnecting, required bool lost}) =>
    lost ? LinkState.lost : (reconnecting ? LinkState.reconnecting : LinkState.ok);

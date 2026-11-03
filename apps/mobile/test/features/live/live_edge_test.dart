import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/network/app_exception.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/live/data/video_room_service.dart';
import 'package:azza/features/live/domain/live_edge.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:livekit_client/livekit_client.dart' as lk;

void main() {
  final starts = DateTime.utc(2026, 11, 3, 15);
  SessionSummary session({SessionStatus status = SessionStatus.scheduled, DateTime? movedFrom}) => SessionSummary(
        id: 's9',
        number: 9,
        title: 'Critique',
        startsAt: starts,
        endsAt: starts.add(const Duration(minutes: 90)),
        status: status,
        movedFrom: movedFrom,
      );

  group('edgeForSession', () {
    test('cancelled and ended are terminal for everyone', () {
      expect(edgeForSession(session(status: SessionStatus.cancelled), starts)!.kind, LiveEdgeKind.cancelled);
      expect(edgeForSession(session(status: SessionStatus.ended), starts, isHost: true)!.kind, LiveEdgeKind.ended);
      expect(edgeForSession(session(status: SessionStatus.cancelled), starts)!.terminal, isTrue);
    });

    test('live or host → nothing to show', () {
      expect(edgeForSession(session(status: SessionStatus.live), starts), isNull);
      expect(edgeForSession(session(), starts.subtract(const Duration(hours: 2)), isHost: true), isNull);
    });

    test('lobby open but not live → waiting for host', () {
      final e = edgeForSession(session(), starts.subtract(const Duration(minutes: 10)))!;
      expect(e.kind, LiveEdgeKind.waiting);
      expect(e.terminal, isFalse);
    });

    test('before the lobby opens → lobbyNotOpen with opensAt', () {
      final e = edgeForSession(session(), starts.subtract(const Duration(hours: 1)))!;
      expect(e.kind, LiveEdgeKind.lobbyNotOpen);
      expect(e.opensAt, starts.subtract(const Duration(minutes: 15)));
    });

    test('a moved session before its new lobby → moved with both times', () {
      final was = starts.subtract(const Duration(days: 1));
      final e = edgeForSession(session(movedFrom: was), starts.subtract(const Duration(hours: 3)))!;
      expect(e.kind, LiveEdgeKind.moved);
      expect(e.startsAt, starts);
      expect(e.movedFrom, was);
      expect(e.terminal, isTrue);
    });
  });

  group('edgeForJoinError', () {
    test('maps the join policy refusal codes', () {
      expect(edgeForJoinError(const AppException('SESSION_CANCELLED', 'x', statusCode: 422)).kind, LiveEdgeKind.cancelled);
      expect(edgeForJoinError(const AppException('SESSION_ENDED', 'x', statusCode: 422)).kind, LiveEdgeKind.ended);
      expect(edgeForJoinError(const AppException('FORBIDDEN', 'x', statusCode: 403)).kind, LiveEdgeKind.notEnrolled);
      expect(edgeForJoinError(const AppException('NETWORK', 'x')).kind, LiveEdgeKind.network);
      expect(edgeForJoinError(const AppException('BOOM', 'x', statusCode: 500)).kind, LiveEdgeKind.unknown);
    });

    test('LOBBY_NOT_OPEN reads opensAt, or becomes moved for a moved session', () {
      const err = AppException('LOBBY_NOT_OPEN', 'x', statusCode: 422, details: {'opensAt': '2026-11-03T14:45:00.000Z'});
      final e = edgeForJoinError(err);
      expect(e.kind, LiveEdgeKind.lobbyNotOpen);
      expect(e.opensAt, DateTime.utc(2026, 11, 3, 14, 45));
      expect(edgeForJoinError(err, session: session(movedFrom: starts.subtract(const Duration(days: 2)))).kind, LiveEdgeKind.moved);
    });

    test('room full from the API code or a LiveKit message', () {
      final api = edgeForJoinError(const AppException('ROOM_FULL', 'x', statusCode: 409, details: {'participants': 24, 'capacity': 24}));
      expect((api.kind, api.inRoom, api.capacity), (LiveEdgeKind.roomFull, 24, 24));
      final lkErr = edgeForJoinError(const AppException('UNKNOWN', 'ConnectException: room has exceeded its max participants'), capacity: 24);
      expect((lkErr.kind, lkErr.inRoom, lkErr.capacity), (LiveEdgeKind.roomFull, 24, 24));
      expect(edgeForJoinError(const AppException('UNKNOWN', 'Room is full')).capacity, isNull);
    });
  });

  test('classifyMediaError', () {
    expect(classifyMediaError(Exception('NotAllowedError: Permission denied')), MediaFailure.denied);
    expect(classifyMediaError(Exception('PlatformException(Unable to getUserMedia, not authorized)')), MediaFailure.denied);
    expect(classifyMediaError(Exception('NotFoundError: Requested device not found')), MediaFailure.missing);
    expect(classifyMediaError(Exception('NotReadableError: device in use')), MediaFailure.busy);
    expect(classifyMediaError(Exception('weird')), MediaFailure.other);
  });

  test('linkState and disconnect reasons', () {
    expect(linkState(reconnecting: false, lost: false), LinkState.ok);
    expect(linkState(reconnecting: true, lost: false), LinkState.reconnecting);
    expect(linkState(reconnecting: true, lost: true), LinkState.lost);
    expect(disconnectIsLoss(lk.DisconnectReason.clientInitiated), isFalse);
    expect(disconnectIsLoss(lk.DisconnectReason.roomDeleted), isFalse);
    expect(disconnectIsLoss(lk.DisconnectReason.participantRemoved), isFalse);
    expect(disconnectIsLoss(lk.DisconnectReason.joinFailure), isTrue);
    expect(disconnectIsLoss(lk.DisconnectReason.signalingConnectionFailure), isTrue);
    expect(disconnectIsLoss(null), isTrue);
  });
}

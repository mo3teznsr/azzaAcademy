// Dart mirror of packages/shared/src/realtime.ts.
abstract final class SocketEvents {
  // client → server
  static const joinSession = 'session:join';
  static const leaveSession = 'session:leave';
  static const sendChat = 'chat:send';
  static const raiseHand = 'hand:raise';
  static const lowerHand = 'hand:lower';
  // server → client
  static const chatMessage = 'chat:message';
  static const handQueue = 'hand:queue';
  static const sessionStatus = 'session:status';
  static const notification = 'notification:new';
  static const orderUpdated = 'order:updated';
  static const roomStats = 'admin:room-stats';
}

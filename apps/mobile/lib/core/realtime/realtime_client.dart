import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as io;

/// Port for the Socket.IO channel (chat, hands, statuses, notifications).
abstract class RealtimeClient {
  Future<void> connect();
  void emit(String event, [Object? data]);

  /// Subscribes to [event]; call the returned function to unsubscribe.
  void Function() on(String event, void Function(Map<String, dynamic> payload) handler);

  /// `true` while connected; emits on every change.
  Stream<bool> get connection;
  bool get isConnected;
  void dispose();
}

class SocketIoRealtimeClient implements RealtimeClient {
  SocketIoRealtimeClient({required this.baseUrl, required this.tokenProvider});

  final String baseUrl;
  final Future<String?> Function() tokenProvider;
  io.Socket? _socket;
  final _connection = StreamController<bool>.broadcast();

  @override
  Stream<bool> get connection => _connection.stream;

  @override
  bool get isConnected => _socket?.connected ?? false;

  @override
  Future<void> connect() async {
    if (_socket != null) return;
    final token = await tokenProvider();
    final socket = io.io(
      baseUrl,
      io.OptionBuilder()
          .setPath('/socket.io')
          .setTransports(['websocket'])
          .setAuth({'token': token ?? ''})
          .enableReconnection()
          .disableAutoConnect()
          .build(),
    );
    socket
      ..onConnect((_) => _connection.add(true))
      ..onDisconnect((_) => _connection.add(false))
      ..onConnectError((_) => _connection.add(false));
    _socket = socket..connect();
  }

  @override
  void emit(String event, [Object? data]) => _socket?.emit(event, data);

  @override
  void Function() on(String event, void Function(Map<String, dynamic> payload) handler) {
    void listener(dynamic data) {
      if (data is Map) handler(data.cast<String, dynamic>());
      if (data is List && data.isNotEmpty && data.first is Map) {
        handler((data.first as Map).cast<String, dynamic>());
      }
    }

    _socket?.on(event, listener);
    return () => _socket?.off(event, listener);
  }

  @override
  void dispose() {
    _socket?.dispose();
    _socket = null;
    _connection.close();
  }
}

import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart' as rtc;
import 'package:livekit_client/livekit_client.dart';

/// Status yang dikirim kembali ke halaman JUMPA (lihat
/// components/jumpa/native-screen-share.ts).
typedef ScreenShareStatus = void Function(String state, [String? reason]);

/// Berbagi layar native Android untuk JUMPA.
///
/// Urutan sesuai Android 14+ dan dokumentasi LiveKit:
/// 1. minta persetujuan MediaProjection (setiap sesi),
/// 2. mulai foreground service bertipe mediaProjection,
/// 3. sambungkan identitas layar & terbitkan track layar.
/// Semua jalur gagal/berhenti melepas tangkapan, koneksi, dan service.
class NativeScreenShare {
  NativeScreenShare(this._status);

  static const _service = MethodChannel('com.bahasacerdas.app/screen');

  final ScreenShareStatus _status;
  Room? _room;
  EventsListener<RoomEvent>? _listener;
  bool _busy = false;
  bool _stopping = false;

  bool get isActive => _room != null;

  Future<void> start(String serverUrl, String token) async {
    if (_busy || _room != null) {
      _status('error', 'busy');
      return;
    }
    _busy = true;
    _status('starting');
    try {
      final granted = await rtc.Helper.requestCapturePermission();
      if (!granted) {
        _status('error', 'denied');
        return;
      }
      await _service.invokeMethod<void>('startService');
      final room = Room(
        roomOptions: const RoomOptions(adaptiveStream: false, dynacast: false),
      );
      _room = room;
      _listener = room.createListener()
        ..on<RoomDisconnectedEvent>((event) {
          final reason = event.reason == DisconnectReason.clientInitiated
              ? null
              : 'revoked';
          unawaited(_release(notify: true, reason: reason));
        })
        ..on<LocalTrackUnpublishedEvent>((event) {
          // Dihentikan dari sistem (chip/notifikasi proyeksi layar Android).
          if (event.publication.source == TrackSource.screenShareVideo) {
            unawaited(_release(notify: true, reason: 'ended'));
          }
        });
      await room.connect(
        serverUrl,
        token,
        connectOptions: const ConnectOptions(autoSubscribe: false),
      );
      final pub = await room.localParticipant
          ?.setScreenShareEnabled(true, captureScreenAudio: false);
      if (pub == null) throw StateError('screen share not published');
      _status('active');
    } catch (_) {
      await _release(notify: false);
      _status('error', 'failed');
    } finally {
      _busy = false;
    }
  }

  /// Hentikan berbagi layar (idempoten).
  Future<void> stop() => _release(notify: true);

  Future<void> _release({required bool notify, String? reason}) async {
    if (_stopping) return;
    final room = _room;
    if (room == null) {
      await _stopService();
      return;
    }
    _stopping = true;
    _room = null;
    try {
      await _listener?.dispose();
      _listener = null;
      try {
        await room.localParticipant?.setScreenShareEnabled(false);
      } catch (_) {}
      try {
        await room.disconnect();
      } catch (_) {}
      try {
        await room.dispose();
      } catch (_) {}
    } finally {
      await _stopService();
      _stopping = false;
      if (notify) _status('stopped', reason);
    }
  }

  Future<void> _stopService() async {
    try {
      await _service.invokeMethod<void>('stopService');
    } catch (_) {}
  }
}

"use client";
// ─── Realtime + Polling State Hook (Tahap 7 §21) ─────────────
// Pola: Broadcast sinyal → debounce → role GET authoritative →
// replace view. Sinyal TIDAK dipercaya sebagai state (payload
// diabaikan). Safety poll 15s berjalan di dalam helper.
// Cleanup otomatis saat unmount; satu channel per mount.

import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeSessionUpdates } from './subscribe-session-updates';

export type ConnectionState = 'connecting' | 'live' | 'offline';

/**
 * Subscribe update sesi untuk satu surface. `fetchView` wajib
 * memanggil GET role-specific (authoritative). Bila fetchView gagal
 * karena jaringan, state koneksi = 'offline' (banner reconnect);
 * error domain (mis. SESSION_ENDED) dilempar ke caller via onError.
 */
export function useSessionView<T>(
  sessionId: string | null,
  fetchView: () => Promise<T>,
  options: {
    onError?: (error: unknown) => void;
    pollIntervalMs?: number;
    debounceMs?: number;
  } = {},
): { view: T | null; connection: ConnectionState; refresh: () => Promise<void> } {
  const [view, setView] = useState<T | null>(null);
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const fetchRef = useRef(fetchView);
  fetchRef.current = fetchView;
  const errorRef = useRef(options.onError);
  errorRef.current = options.onError;
  // Guard Strict-Mode double-effect: refresh dijamin idempotent —
  // cukup flag untuk menghindari subscribe ganda pada mount lama.
  const sessionRef = useRef(sessionId);

  const refresh = useCallback(async () => {
    if (sessionRef.current === null) return;
    try {
      const next = await fetchRef.current();
      setView(next);
      setConnection('live');
    } catch (error: unknown) {
      // Jaringan bermasalah → offline banner; error domain → onError.
      if (
        error instanceof TypeError ||
        (error instanceof Error && error.message === 'Failed to fetch')
      ) {
        setConnection('offline');
      } else {
        errorRef.current?.(error);
      }
    }
  }, []);

  useEffect(() => {
    sessionRef.current = sessionId;
    if (!sessionId) return;

    refresh(); // initial sync — GET authoritative langsung.
    const sub = subscribeSessionUpdates({
      sessionId,
      refetch: refresh,
      ...(options.pollIntervalMs !== undefined
        ? { pollIntervalMs: options.pollIntervalMs }
        : {}),
      ...(options.debounceMs !== undefined
        ? { debounceMs: options.debounceMs }
        : {}),
    });

    return () => {
      sub.stop(); // cleanup unmount/navigation (§21) — tidak ada channel duplikat.
    };
  }, [sessionId, refresh]);

  return { view, connection, refresh };
}

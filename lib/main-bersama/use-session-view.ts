"use client";
// ─── Realtime + Polling State Hook (Tahap 7 §21) ─────────────
// Pola: Broadcast sinyal → debounce → role GET authoritative →
// replace view. Sinyal TIDAK dipercaya sebagai state (payload
// diabaikan). Safety poll fallback berjalan di dalam helper dan bisa dituning per surface.
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
  const pollIntervalMs = options.pollIntervalMs;
  const debounceMs = options.debounceMs;
  // Satu surface hanya boleh punya SATU GET state in-flight. Poll + Broadcast
  // dapat tiba bersamaan; tanpa gate, response lama bisa menang belakangan dan
  // membuat UI tampak "mundur"/lag. Sinyal yang datang saat fetch berjalan
  // cukup menandai satu follow-up fetch.
  const sessionRef = useRef(sessionId);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const refreshQueuedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (sessionRef.current === null) return;
    if (inFlightRef.current) {
      refreshQueuedRef.current = true;
      await inFlightRef.current;
      return;
    }

    const task = (async () => {
      do {
        refreshQueuedRef.current = false;
        const targetSession = sessionRef.current;
        if (targetSession === null) return;
        try {
          const next = await fetchRef.current();
          // Navigasi/unmount ketika request masih berjalan: jangan pasang
          // response milik sesi lama ke surface baru.
          if (sessionRef.current !== targetSession) continue;
          setView(next);
          setConnection('live');
        } catch (error: unknown) {
          if (sessionRef.current !== targetSession) continue;
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
      } while (refreshQueuedRef.current && sessionRef.current !== null);
    })();

    inFlightRef.current = task;
    try {
      await task;
    } finally {
      if (inFlightRef.current === task) inFlightRef.current = null;
    }
  }, []);

  useEffect(() => {
    sessionRef.current = sessionId;
    if (!sessionId) return;

    refresh(); // initial sync — GET authoritative langsung.
    const sub = subscribeSessionUpdates({
      sessionId,
      refetch: refresh,
      ...(pollIntervalMs !== undefined ? { pollIntervalMs } : {}),
      ...(debounceMs !== undefined ? { debounceMs } : {}),
    });

    // Guru sering pindah tab saat menyiapkan kelas. Jangan menunggu safety
    // poll ketika tab kembali aktif / koneksi pulih.
    const syncVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const syncFocus = () => { void refresh(); };
    document.addEventListener('visibilitychange', syncVisible);
    window.addEventListener('focus', syncFocus);
    window.addEventListener('online', syncFocus);

    return () => {
      sub.stop(); // cleanup unmount/navigation (§21) — tidak ada channel duplikat.
      document.removeEventListener('visibilitychange', syncVisible);
      window.removeEventListener('focus', syncFocus);
      window.removeEventListener('online', syncFocus);
      if (sessionRef.current === sessionId) sessionRef.current = null;
      refreshQueuedRef.current = false;
    };
  }, [sessionId, refresh, pollIntervalMs, debounceMs]);

  return { view, connection, refresh };
}

"use client";
// ─── Client Realtime Watcher (Hardening §4/§5) ───────────────
// Subscribe Supabase Broadcast channel sesi (public — guest tanpa
// auth Supabase dapat subscribe). Notification = SINYAL dirty:
// TIDAK dipercaya sebagai state. Flow wajib (§5):
//
//   notification → debounce/coalesce → refetch GET authoritative
//   → replace local view
//
// - Coalescing gate: banyak sinyal berturut-turut → SATU refetch.
// - Safety poll: fallback refetch periodik bila Broadcast tidak
//   tersedia/gagal (mis. env dev tanpa Supabase, jaringan flaky) —
//   correctness TIDAK bergantung realtime.
// - Duplicate/out-of-order aman: GET selalu authoritative.

import { sessionTopic } from '@/src/main-bersama/contracts/events/signal';

/** Interval safety poll (ms) — fallback bila realtime mati. */
export const SAFETY_POLL_INTERVAL_MS = 15_000;
/** Debounce refetch (ms) — cegah request storm saat sinyal hujan. */
export const REFETCH_DEBOUNCE_MS = 400;

export interface SubscribeSessionUpdatesOptions {
  /** Id sesi (bukan PIN) — diterima dari join/teacher state. */
  sessionId: string;
  /** Refetch authoritative — WAJIB memanggil GET role-specific. */
  refetch: () => Promise<void>;
  /** Interval poll custom (test). */
  pollIntervalMs?: number;
  /** Debounce custom (test). */
  debounceMs?: number;
}

export interface SubscribeSessionUpdatesResult {
  /** Berhenti subscribe + bersihkan timer. Idempotent. */
  stop: () => void;
}

/**
 * Subscribe update sesi. Bila @supabase/supabase-js dapat diimpor
 * dan env tersedia, pakai Broadcast channel; selain itu safety
 * poll tetap berjalan sehingga UI tetap fresh tanpa realtime.
 */
export function subscribeSessionUpdates(
  options: SubscribeSessionUpdatesOptions,
): SubscribeSessionUpdatesResult {
  const pollMs = options.pollIntervalMs ?? SAFETY_POLL_INTERVAL_MS;
  const debounceMs = options.debounceMs ?? REFETCH_DEBOUNCE_MS;

  // ── Coalescing gate ────────────────────────────────────────
  let refetchQueued = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const requestRefetch = () => {
    if (refetchQueued) return; // sudah ada refetch terjadwal — coalesce
    refetchQueued = true;
    debounceTimer = setTimeout(async () => {
      refetchQueued = false;
      try {
        await options.refetch();
      } catch {
        // Refetch gagal (offline dsb.) — safety poll berikutnya
        // akan mencoba lagi; JANGAN crash UI dari sinyal.
      }
    }, debounceMs);
  };

  // ── Safety poll (fallback, selalu jalan) ───────────────────
  const pollTimer = setInterval(requestRefetch, pollMs);

  // ── Supabase Broadcast subscription (best-effort) ──────────
  let channel: { unsubscribe: () => void } | null = null;
  (async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const { SESSION_UPDATE_EVENT } = await import(
        '@/src/main-bersama/contracts/events/signal'
      );
      const supabase = createClient();
      const ch = supabase.channel(sessionTopic(options.sessionId), {
        config: { broadcast: { self: false } },
      });
      ch.on('broadcast', { event: SESSION_UPDATE_EVENT }, () => requestRefetch());
      ch.subscribe();
      channel = { unsubscribe: () => { void supabase.removeChannel(ch); } };
    } catch {
      // Env Supabase tidak tersedia (dev masked) — safety poll saja.
    }
  })();

  return {
    stop() {
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(pollTimer);
      channel?.unsubscribe();
    },
  };
}

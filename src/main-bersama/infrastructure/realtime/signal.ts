// ─── Supabase Realtime Broadcast Signal (Hardening §3/§6) ────
// PENGIRIM sinyal dari server: Supabase Realtime REST Broadcast
// API (fetch, tanpa dependency baru). Penerima: client browser via
// supabase-js channel publik (lihat lib/main-bersama/subscribe-session-updates.ts).
//
// Keputusan transport (audit hardening):
//  - Vercel production TIDAK menjamin sesi request/connection pada
//    instance yang sama → in-memory hub TIDAK valid sebagai fanout
//    produksi. Broadcast melalui Supabase realtime server bersifat
//    lintas-instance.
//  - Public channel (bukan private): guest student tidak punya
//    auth Supabase — private channel memerlukan RLS/auth baru yang
//    dilarang (§6). Trade-off terdokumentasi:
//      • topic = sessionId (bukan PIN) — hanya peserta join yang
//        menerima sessionId dari respons join;
//      • payload MINIMAL {type, revision?} — tanpa data sesi;
//      • broadcast palsu/spoofed MAKSIMAL menyebabkan refetch
//        authoritative GET (notification tidak dipercaya, §5) —
//        tidak ada aksi domain dari sinyal;
//      • debounce client mencegah request storm.
//
// Sinyal BUKAN source of truth: revision informatif, bukan final.

import type {
  SessionUpdateSignalPayload,
} from '../../contracts/events/signal';
import {
  SESSION_UPDATE_EVENT,
  sessionTopic,
} from '../../contracts/events/signal';

export interface SupabaseRealtimeConfig {
  url: string;
  /** Publishable/anon key — kunci publik, aman di server/client. */
  apiKey: string;
}

/**
 * Konfigurasi Supabase Realtime dari environment server.
 * Null bila env tidak lengkap — caller memutuskan perilaku
 * (produksi wajib set supaya notifikasi live bekerja).
 */
export function getSupabaseRealtimeConfig(): SupabaseRealtimeConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !apiKey) return null;
  return { url: url.replace(/\/$/, ''), apiKey };
}

export type SendSignalResult =
  | { ok: true; skipped: boolean }
  | { ok: false; code: 'SIGNAL_CONFIG_MISSING' | 'SIGNAL_SEND_FAILED'; reason?: string };

/**
 * Kirim sinyal invalidation ke SEMUA subscriber channel sesi
 * (teacher/student/projector lintas instance). Payload MINIMAL.
 *
 * Best-effort: kegagalan pengiriman TIDAK pernah mengubah hasil
 * command domain — correctness tetap dari HTTP command + GET
 * authoritative (sinyal hanya optimasi freshness UI).
 */
export async function sendSessionUpdateSignal(
  config: SupabaseRealtimeConfig | null,
  sessionId: string,
  payload: SessionUpdateSignalPayload,
): Promise<SendSignalResult> {
  if (!config) return { ok: false, code: 'SIGNAL_CONFIG_MISSING' };
  try {
    const res = await fetch(
      `${config.url}/realtime/v1/api/broadcast`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: config.apiKey,
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          messages: [
            {
              topic: sessionTopic(sessionId),
              event: SESSION_UPDATE_EVENT,
              payload,
            },
          ],
        }),
        // Broadcast hanya freshness hint. Jangan pernah membuat submit/join/
        // command guru terasa macet bila transport realtime sedang lambat.
        // Safety poll client tetap menjamin state akhirnya tersinkron.
        signal: AbortSignal.timeout(800),
      },
    );
    if (!res.ok) {
      return {
        ok: false,
        code: 'SIGNAL_SEND_FAILED',
        ...(res.status ? { reason: `status ${res.status}` } : {}),
      };
    }
    return { ok: true, skipped: false };
  } catch (error) {
    return {
      ok: false,
      code: 'SIGNAL_SEND_FAILED',
      ...(error instanceof Error ? { reason: error.message } : {}),
    };
  }
}

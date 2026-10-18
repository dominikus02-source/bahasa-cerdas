/**
 * Konfigurasi LiveKit untuk JUMPA. SERVER-ONLY untuk kunci.
 *
 * Sengaja tidak terikat ke VPS web: LiveKit bisa dipindah ke VPS terpisah
 * cukup dengan mengganti env —
 *   LIVEKIT_URL                 URL API server (server SDK). Default internal
 *                               docker: http://livekit:7880. Contoh VPS lain:
 *                               https://jumpa.bahasacerdas.com
 *   NEXT_PUBLIC_LIVEKIT_WS_URL  URL WebSocket untuk browser.
 *   LIVEKIT_API_KEY / LIVEKIT_API_SECRET
 */
export const DEFAULT_LIVEKIT_WS_URL = "wss://jumpa.bahasacerdas.com";
export const DEFAULT_LIVEKIT_URL = "http://livekit:7880";

export interface LivekitServerConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
}

export function getLivekitServerConfig(): LivekitServerConfig | null {
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!apiKey || !apiSecret) return null;
  const url = (process.env.LIVEKIT_URL?.trim() || DEFAULT_LIVEKIT_URL).replace(/\/$/, "");
  return { url, apiKey, apiSecret };
}

export function getLivekitPublicWsUrl(): string {
  return (process.env.NEXT_PUBLIC_LIVEKIT_WS_URL?.trim() || DEFAULT_LIVEKIT_WS_URL).replace(/\/$/, "");
}

/**
 * Origin yang perlu diizinkan CSP connect-src (wss + https untuk endpoint
 * validasi/region LiveKit). Mengembalikan [] bila URL tidak valid.
 */
export function livekitCspOrigins(wsUrl: string = getLivekitPublicWsUrl()): string[] {
  try {
    const u = new URL(wsUrl);
    if (u.protocol !== "wss:" && u.protocol !== "ws:") return [];
    const httpProto = u.protocol === "wss:" ? "https:" : "http:";
    return [`${u.protocol}//${u.host}`, `${httpProto}//${u.host}`];
  } catch {
    return [];
  }
}

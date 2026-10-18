/**
 * JUMPA Fase 3 — kebijakan media (murni, tanpa import LiveKit supaya bisa
 * dites dan dipakai lobby tanpa menarik bundle LiveKit).
 *
 * Ringkasan keputusan (lihat docs/JUMPA_PHASE3_PERFORMA_TIER.md):
 *  - Simulcast 2–3 lapis, Dynacast + adaptiveStream (server hanya meneruskan
 *    lapisan yang ditonton; tile tak terlihat dijeda).
 *  - HP: tangkap lebih kecil & fps lebih rendah; HP lemah 360p/20 fps.
 *  - Codec: H.264 di iPhone/iPad (encoder hardware Safari), VP8 di Android &
 *    desktop (paling kompatibel; Chrome Android tidak selalu punya encoder
 *    H.264 hardware — sama dengan urutan default Jitsi untuk mobile).
 *  - Hemat Data: 360p/15 fps, terima lapisan terendah, audio "speech".
 *  - Paket ruang membatasi HD (Gratis 720p, Premium 1080p).
 */
import type { JumpaQuality } from "./media-prefs";
import type { JumpaVideoCap } from "@/lib/jumpa/tiers";

export interface DeviceClass {
  mobile: boolean;
  ios: boolean;
  android: boolean;
  /** ≤ 4 inti CPU atau ≤ 3 GB RAM (navigator.deviceMemory). */
  lowEnd: boolean;
}

export interface Layer {
  width: number;
  height: number;
  fps: number;
  /** bit/detik */
  maxBitrate: number;
}

export interface PublishPolicy {
  capture: Layer;
  /** Lapisan simulcast tambahan (rendah → tinggi), selain lapisan capture. */
  layers: Layer[];
  codec: "vp8" | "h264";
  audio: "speech" | "music";
  screen: Layer;
}

export interface ReceivePolicy {
  /** Tile per halaman grid. */
  pageSize: number;
  /** Maks tile di strip (mode pembicara / layar). */
  stripMax: number;
  /** Batas kualitas langganan video peserta lain. null = biarkan adaptif. */
  remoteQuality: "low" | "medium" | null;
  /** pixelDensity untuk adaptiveStream. */
  pixelDensity: number | "screen";
}

const L = (width: number, height: number, fps: number, kbps: number): Layer => ({ width, height, fps, maxBitrate: kbps * 1000 });

export const LAYERS = {
  h180: L(320, 180, 15, 140),
  h360: L(640, 360, 20, 450),
  h360lite: L(640, 360, 15, 300),
  h180lite: L(320, 180, 12, 100),
  h540m: L(960, 540, 24, 700),
  h720: L(1280, 720, 24, 1200),
  h720hd: L(1280, 720, 30, 1700),
  h1080: L(1920, 1080, 30, 2600),
} as const;

export function classifyDevice(env: { userAgent: string; maxTouchPoints?: number; hardwareConcurrency?: number; deviceMemory?: number; narrow?: boolean }): DeviceClass {
  const ua = env.userAgent || "";
  const ipadOs = /Macintosh/.test(ua) && (env.maxTouchPoints ?? 0) > 1;
  const ios = /iPhone|iPad|iPod/.test(ua) || ipadOs;
  const android = /Android/.test(ua);
  const mobile = ios || android || /Mobi/.test(ua) || Boolean(env.narrow);
  const cores = env.hardwareConcurrency ?? 8;
  const mem = env.deviceMemory ?? 8;
  return { mobile, ios, android, lowEnd: cores <= 4 || mem <= 3 };
}

export function detectDevice(): DeviceClass {
  if (typeof navigator === "undefined") return { mobile: false, ios: false, android: false, lowEnd: false };
  const nav = navigator as Navigator & { deviceMemory?: number };
  return classifyDevice({
    userAgent: nav.userAgent,
    maxTouchPoints: nav.maxTouchPoints,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
    narrow: typeof window !== "undefined" && window.matchMedia?.("(max-width: 767px)").matches,
  });
}

function capLayer(layer: Layer, capHeight: JumpaVideoCap): Layer {
  if (layer.height <= capHeight) return layer;
  return capHeight >= 720 ? LAYERS.h720hd : capHeight >= 540 ? LAYERS.h540m : LAYERS.h360;
}

export function publishPolicy(quality: JumpaQuality, device: DeviceClass, capHeight: JumpaVideoCap, screenCap: JumpaVideoCap = 720): PublishPolicy {
  const codec = device.ios ? "h264" : "vp8";
  const screen = screenCap >= 1080 ? L(1920, 1080, 5, 2000) : L(1280, 720, 5, 1200);
  if (quality === "hemat") {
    return { capture: LAYERS.h360lite, layers: [LAYERS.h180lite], codec, audio: "speech", screen: L(1280, 720, 3, 600) };
  }
  if (quality === "hd") {
    const top = capLayer(capHeight >= 1080 && !device.mobile ? LAYERS.h1080 : LAYERS.h720hd, capHeight);
    const layers = top.height >= 1080 ? [LAYERS.h360, LAYERS.h720] : [LAYERS.h180, LAYERS.h360];
    return { capture: top, layers, codec, audio: "music", screen };
  }
  // Otomatis
  if (device.mobile) {
    return device.lowEnd
      ? { capture: LAYERS.h360, layers: [LAYERS.h180], codec, audio: "speech", screen }
      : { capture: capLayer(LAYERS.h540m, capHeight), layers: [LAYERS.h180], codec, audio: "music", screen };
  }
  return { capture: capLayer(LAYERS.h720, capHeight), layers: [LAYERS.h180, LAYERS.h360], codec, audio: "music", screen };
}

/**
 * `degraded` = koneksi sendiri buruk beberapa detik (mode Otomatis):
 * turunkan kualitas terima & jumlah video, seperti "lastN" adaptif Jitsi.
 */
export function receivePolicy(quality: JumpaQuality, device: DeviceClass, degraded = false): ReceivePolicy {
  const hemat = quality === "hemat" || degraded;
  if (device.mobile) {
    return {
      pageSize: 4,
      stripMax: hemat ? 3 : device.lowEnd ? 4 : 6,
      remoteQuality: hemat ? "low" : device.lowEnd ? "medium" : null,
      pixelDensity: hemat ? 1 : 1.5,
    };
  }
  return {
    pageSize: hemat ? 9 : device.lowEnd ? 12 : 16,
    stripMax: hemat ? 6 : 12,
    remoteQuality: hemat ? "low" : null,
    pixelDensity: hemat ? 1 : "screen",
  };
}

/** Ukuran perkiraan unduh per menit (MB) untuk teks bantuan di pengaturan. */
export function estimateMbPerMin(policy: PublishPolicy): number {
  const kbps = policy.capture.maxBitrate / 1000 + (policy.audio === "speech" ? 24 : 48);
  return Math.round(((kbps * 60) / 8 / 1024) * 10) / 10;
}

export const QUALITY_LABEL: Record<JumpaQuality, { title: string; hint: string }> = {
  auto: { title: "Otomatis", hint: "Ikuti jaringan & perangkat" },
  hemat: { title: "Hemat Data", hint: "360p, hemat kuota" },
  hd: { title: "Jernih", hint: "Paling tajam (HD), butuh internet kencang" },
};

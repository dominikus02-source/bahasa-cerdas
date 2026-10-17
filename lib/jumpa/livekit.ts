/**
 * Adapter tipis ke LiveKit server API. Semua panggilan best-effort dengan
 * timeout pendek supaya halaman tidak menggantung bila server media mati.
 */
import { RoomServiceClient } from "livekit-server-sdk";
import { getLivekitServerConfig, type LivekitServerConfig } from "./config";
import { LIVEKIT_DEPARTURE_TIMEOUT_SEC, LIVEKIT_EMPTY_TIMEOUT_SEC } from "./caps";

const CALL_TIMEOUT_MS = 4000;

function withTimeout<T>(p: Promise<T>, ms = CALL_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("LIVEKIT_TIMEOUT")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function client(config: LivekitServerConfig): RoomServiceClient {
  return new RoomServiceClient(config.url, config.apiKey, config.apiSecret);
}

/** Buat (atau pakai ulang) ruang LiveKit. createRoom idempotent per nama. */
export async function ensureLivekitRoom(params: {
  name: string;
  maxParticipants: number;
  config?: LivekitServerConfig | null;
}): Promise<void> {
  const config = params.config ?? getLivekitServerConfig();
  if (!config) throw new Error("LIVEKIT_NOT_CONFIGURED");
  await withTimeout(
    client(config).createRoom({
      name: params.name,
      maxParticipants: params.maxParticipants,
      emptyTimeout: LIVEKIT_EMPTY_TIMEOUT_SEC,
      departureTimeout: LIVEKIT_DEPARTURE_TIMEOUT_SEC,
    }),
  );
}

/**
 * Jumlah peserta yang sedang tersambung selain `excludeIdentity`.
 * Mengembalikan 0 bila ruang belum ada / LiveKit tidak menjawab —
 * LiveKit tetap menegakkan maxParticipants di sisi server.
 */
export async function countActiveOthers(
  roomName: string,
  excludeIdentity: string,
  config: LivekitServerConfig | null = getLivekitServerConfig(),
): Promise<number> {
  if (!config) return 0;
  try {
    const list = await withTimeout(client(config).listParticipants(roomName));
    return list.filter((p) => p.identity !== excludeIdentity).length;
  } catch {
    return 0;
  }
}

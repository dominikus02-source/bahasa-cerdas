/**
 * Adapter tipis ke LiveKit server API. Semua panggilan best-effort dengan
 * timeout pendek supaya halaman tidak menggantung bila server media mati.
 */
import { DataPacket_Kind, RoomServiceClient, TrackSource, type ParticipantPermission } from "livekit-server-sdk";
import { encodeSignal, type ServerSignal } from "./signals";
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

/** Probe ringan ke LiveKit API untuk kesiapan operator (maks. 4 detik). */
export async function probeLivekit(config: LivekitServerConfig | null = getLivekitServerConfig()): Promise<boolean> {
  if (!config) return false;
  try {
    await withTimeout(client(config).listRooms());
    return true;
  } catch {
    return false;
  }
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
 * Ruang yang belum dibuat dihitung nol. Gangguan/timeout LiveKit harus
 * menggagalkan pemeriksaan kapasitas (fail-closed), bukan dianggap kosong.
 */
export async function countActiveOthers(
  roomName: string,
  excludeIdentity: string,
  config: LivekitServerConfig | null = getLivekitServerConfig(),
): Promise<number> {
  if (!config) throw new Error("LIVEKIT_NOT_CONFIGURED");
  try {
    const list = await withTimeout(client(config).listParticipants(roomName));
    return list.filter((p) => p.identity !== excludeIdentity).length;
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error).toLowerCase();
    // LiveKit mengembalikan not-found untuk ruang yang belum pernah dibuat.
    // Hanya kondisi ini yang aman diperlakukan sebagai kapasitas nol.
    if (message.includes("room") && (message.includes("not found") || message.includes("does not exist"))) return 0;
    throw new Error("LIVEKIT_UNAVAILABLE", { cause: error });
  }
}

// ═══════════════ Fase 2: kontrol host via server API ═══════════════
// Semua aksi moderasi dijalankan SERVER dengan kunci API; klien tidak
// pernah memegang izin roomAdmin.

function requireConfig(config?: LivekitServerConfig | null): LivekitServerConfig {
  const c = config ?? getLivekitServerConfig();
  if (!c) throw new Error("LIVEKIT_NOT_CONFIGURED");
  return c;
}

/** Kirim pesan server (tanpa pengirim peserta) — klien hanya mempercayai ini. */
export async function sendServerSignal(
  roomName: string,
  topic: string,
  signal: ServerSignal,
  destinationIdentities?: string[],
  config?: LivekitServerConfig | null,
): Promise<boolean> {
  try {
    await withTimeout(
      client(requireConfig(config)).sendData(roomName, encodeSignal(signal), DataPacket_Kind.RELIABLE, {
        topic,
        destinationIdentities,
      }),
    );
    return true;
  } catch {
    return false; // ruang belum/tidak aktif di LiveKit — tidak fatal
  }
}

const SOURCE_FOR: Record<"microphone" | "camera" | "screen_share", TrackSource[]> = {
  microphone: [TrackSource.MICROPHONE],
  camera: [TrackSource.CAMERA],
  screen_share: [TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO],
};

/** Matikan track milik peserta (mik/kamera/layar). Mengembalikan jumlah track. */
export async function muteParticipantSource(
  roomName: string,
  identity: string,
  source: "microphone" | "camera" | "screen_share",
  config?: LivekitServerConfig | null,
): Promise<number> {
  const c = requireConfig(config);
  const p = await withTimeout(client(c).getParticipant(roomName, identity));
  const wanted = SOURCE_FOR[source];
  const tracks = p.tracks.filter((t) => wanted.includes(t.source) && !t.muted);
  for (const t of tracks) {
    await withTimeout(client(c).mutePublishedTrack(roomName, identity, t.sid, true));
  }
  return tracks.length;
}

/** Keluarkan peserta + cabut token lama (tidak bisa masuk lagi dengan token cache). */
export async function removeLivekitParticipant(roomName: string, identity: string, config?: LivekitServerConfig | null): Promise<void> {
  try {
    await withTimeout(
      client(requireConfig(config)).removeParticipant(roomName, identity, {
        revokeTokenTs: BigInt(Math.floor(Date.now() / 1000)),
      }),
    );
  } catch (error) {
    // Peserta sudah tidak tersambung = hasil yang sama.
    if (!String(error instanceof Error ? error.message : error).toLowerCase().includes("not found")) throw error;
  }
}

/** Tutup ruang di LiveKit — semua peserta terputus. Idempoten. */
export async function deleteLivekitRoom(roomName: string, config?: LivekitServerConfig | null): Promise<void> {
  try {
    await withTimeout(client(requireConfig(config)).deleteRoom(roomName));
  } catch (error) {
    if (!String(error instanceof Error ? error.message : error).toLowerCase().includes("not found")) throw error;
  }
}

/** Perbarui izin/metadata peserta yang sedang tersambung (best-effort). */
export async function updateLivekitParticipant(
  roomName: string,
  identity: string,
  update: { permission?: Partial<ParticipantPermission>; metadata?: string },
  config?: LivekitServerConfig | null,
): Promise<boolean> {
  try {
    await withTimeout(client(requireConfig(config)).updateParticipant(roomName, identity, update));
    return true;
  } catch {
    return false; // tidak tersambung — izin baru berlaku saat token berikut
  }
}

/** Identitas peserta yang sedang tersambung ([] bila ruang belum ada). */
export async function listLivekitIdentities(roomName: string, config?: LivekitServerConfig | null): Promise<Array<{ identity: string; metadata: string }>> {
  try {
    const list = await withTimeout(client(requireConfig(config)).listParticipants(roomName));
    return list.map((p) => ({ identity: p.identity, metadata: p.metadata }));
  } catch {
    return [];
  }
}

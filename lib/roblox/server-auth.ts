import { createHash, timingSafeEqual } from "crypto";
import cache from "@/lib/redis";
import { timestampSkewMs } from "@/lib/roblox/config";
import { verifyRobloxSignature } from "@/lib/roblox/hmac";

export type NonceClaim = "new" | "replay" | "unavailable";

export type NonceStore = {
  claim(id: string, ttlSeconds: number): Promise<NonceClaim>;
};

const REQUEST_ID = /^[A-Za-z0-9-]{8,80}$/;

export function bearerToken(header: string | null): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length);
  if (!token || /\s/.test(token)) return null;
  return token;
}

/** Bandingkan hash agar panjang secret tidak bocor lewat waktu jawaban. */
export function secretsMatch(presented: string, expected: string): boolean {
  if (!presented || !expected) return false;
  const left = createHash("sha256").update(presented).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export function timestampFresh(timestamp: string | null, now = Date.now(), skewMs = timestampSkewMs()): boolean {
  if (!timestamp || !/^\d{13}$/.test(timestamp)) return false;
  const ts = Number(timestamp);
  return Number.isFinite(ts) && Math.abs(now - ts) <= skewMs;
}

export function isRequestId(value: string | null): value is string {
  return typeof value === "string" && REQUEST_ID.test(value);
}

export const redisNonceStore: NonceStore = {
  async claim(id, ttlSeconds) {
    const created = await cache.setNx(`roblox:nonce:${id}`, "1", ttlSeconds);
    if (created === null) return "unavailable";
    return created ? "new" : "replay";
  },
};

export type ServerAuthInput = {
  method: string;
  contentType: string | null;
  authorization: string | null;
  timestamp: string | null;
  requestId: string | null;
  signature: string | null;
  rawBody: string;
};

export type ServerAuthFailure = { ok: false; status: number; error: string; message: string };
export type ServerAuthSuccess = { ok: true; scheme: "bearer" | "hmac" };
export type ServerAuthResult = ServerAuthSuccess | ServerAuthFailure;

function fail(status: number, error: string, message: string): ServerAuthFailure {
  return { ok: false, status, error, message };
}

/**
 * Bearer adalah jalur utama: Roblox Secrets Store hanya bisa ditaruh di header,
 * tidak bisa dibaca untuk HMAC. HMAC tetap diterima bila header Authorization
 * tidak ada dan x-roblox-signature ada.
 */
export async function authenticateRobloxServer(
  input: ServerAuthInput,
  options?: { now?: number; secret?: string; skewMs?: number; nonces?: NonceStore },
): Promise<ServerAuthResult> {
  const method = input.method.toUpperCase();
  if (method !== "POST" && method !== "GET") {
    return fail(405, "METHOD_NOT_ALLOWED", "Hanya POST atau GET.");
  }
  if (input.rawBody.length > 20_000) {
    return fail(413, "PAYLOAD_TOO_LARGE", "Muatan terlalu besar.");
  }
  if (method === "POST") {
    const type = input.contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
    if (type !== "application/json") {
      return fail(415, "UNSUPPORTED_MEDIA", "Content-Type harus application/json.");
    }
  }

  const now = options?.now ?? Date.now();
  const skewMs = options?.skewMs ?? timestampSkewMs();
  if (!timestampFresh(input.timestamp, now, skewMs)) {
    return fail(401, "STALE_TIMESTAMP", "x-roblox-timestamp di luar batas waktu.");
  }
  if (!isRequestId(input.requestId)) {
    return fail(400, "MISSING_REQUEST_ID", "x-request-id wajib, 8–80 karakter.");
  }

  const secret = options?.secret ?? process.env.ROBLOX_SERVER_SECRET ?? "";
  const token = bearerToken(input.authorization);
  let scheme: "bearer" | "hmac";
  if (input.authorization) {
    if (!token || !secretsMatch(token, secret)) {
      return fail(401, "UNAUTHORIZED", "Token tidak sah.");
    }
    scheme = "bearer";
  } else if (input.signature) {
    if (!verifyRobloxSignature(input.rawBody, input.timestamp, input.signature, now, secret, skewMs)) {
      return fail(401, "UNAUTHORIZED", "Tanda tangan tidak sah.");
    }
    scheme = "hmac";
  } else {
    return fail(401, "UNAUTHORIZED", "Authorization Bearer wajib.");
  }

  const ttlSeconds = Math.max(1, Math.ceil(skewMs / 1000));
  const claim = await (options?.nonces ?? redisNonceStore).claim(input.requestId, ttlSeconds);
  if (claim === "unavailable") {
    return fail(503, "REPLAY_STORE_UNAVAILABLE", "Penyimpanan anti-ulang tidak siap.");
  }
  if (claim === "replay") {
    return fail(409, "REPLAYED_REQUEST", "x-request-id sudah dipakai.");
  }
  return { ok: true, scheme };
}

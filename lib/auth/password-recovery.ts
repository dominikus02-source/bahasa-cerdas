import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

export const RECOVERY_SUCCESS = "Jika email terdaftar, tautan reset kata sandi telah dikirim. Periksa kotak masuk dan folder spam Anda.";
export const RECOVERY_FAILURE = "Gagal mengirim email pemulihan. Silakan coba lagi beberapa saat lagi atau hubungi dukungan.";

export function recoveryRedirect(env = process.env): string {
  const base = env.APP_URL || env.NEXT_PUBLIC_SITE_URL || env.SUPABASE_SITE_URL || (env.NODE_ENV === "production" ? "https://bahasacerdas.com" : "http://localhost:3000");
  if (!base) throw new Error("APP_URL belum diatur");
  const url = new URL(base);
  if (url.protocol !== "https:" && !(env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new Error("APP_URL harus HTTPS");
  }
  return `${url.origin}/reset-password`;
}

const localBuckets = new Map<string, { count: number; expires: number }>();
const script = `local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return {n, redis.call('TTL', KEYS[1])}`;

// Dedicated anonymous-IP and email buckets. Never trust an auth cookie as an IP identity.
// Redis errors fail closed; the development fallback is deliberately process-local.
export async function consumeRecoveryLimit(email: string, ip: string): Promise<number> {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  const redis = url && token ? new Redis({ url, token }) : null;
  // Keep password recovery available when optional Redis credentials are absent.\n  // The fallback is per-instance only; production should configure Upstash for shared limits.
  let retry = 0;
  for (const subject of [`ip:${ip}`, `email:${email}`]) {
    const key = `recovery:${createHash("sha256").update(subject).digest("hex")}`;
    let count: number;
    let ttl: number;
    if (redis) {
      [count, ttl] = await redis.eval<[number], [number, number]>(script, [key], [900]);
    } else {
      const now = Date.now();
      for (const [k, v] of localBuckets) if (v.expires <= now) localBuckets.delete(k);
      const bucket = localBuckets.get(key) || { count: 0, expires: now + 900_000 };
      bucket.count++;
      localBuckets.set(key, bucket);
      count = bucket.count;
      ttl = Math.ceil((bucket.expires - now) / 1000);
    }
    if (count > 3) retry = Math.max(retry, ttl, 1);
  }
  return retry;
}

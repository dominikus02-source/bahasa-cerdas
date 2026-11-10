/**
 * Minimal Redis client for REDIS_URL (redis:// / rediss://) on the VPS.
 * Used when Upstash REST is not configured. Never logs the URL or password.
 */
import net from "node:net";
import tls from "node:tls";

export function redisStandaloneUrl(): string | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (url.startsWith("redis://") || url.startsWith("rediss://")) return url;
  return null;
}

export function hasUpstashConfig(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return !!url && url.startsWith("https://") && !!token;
}

export function isRedisConfigured(): boolean {
  return hasUpstashConfig() || !!redisStandaloneUrl();
}

type RedisValue = string | number | null | RedisValue[];

function encodeCommand(args: string[]): Buffer {
  const parts = [`*${args.length}\r\n`];
  for (const arg of args) {
    const buf = Buffer.from(arg, "utf8");
    parts.push(`$${buf.length}\r\n`, arg, "\r\n");
  }
  return Buffer.from(parts.join(""), "utf8");
}

function parseReply(buf: Buffer, offset = 0): { value: RedisValue; next: number } {
  const typ = String.fromCharCode(buf[offset]);
  const endLine = buf.indexOf("\r\n", offset);
  if (endLine < 0) throw new Error("incomplete");
  if (typ === "+" || typ === ":" || typ === "-") {
    const text = buf.slice(offset + 1, endLine).toString("utf8");
    if (typ === "-") throw new Error(text);
    return { value: typ === ":" ? Number(text) : text, next: endLine + 2 };
  }
  if (typ === "$") {
    const len = Number(buf.slice(offset + 1, endLine).toString("utf8"));
    if (len < 0) return { value: null, next: endLine + 2 };
    const start = endLine + 2;
    const end = start + len;
    if (buf.length < end + 2) throw new Error("incomplete");
    return { value: buf.slice(start, end).toString("utf8"), next: end + 2 };
  }
  if (typ === "*") {
    const count = Number(buf.slice(offset + 1, endLine).toString("utf8"));
    if (count < 0) return { value: null, next: endLine + 2 };
    let next = endLine + 2;
    const items: RedisValue[] = [];
    for (let i = 0; i < count; i++) {
      const part = parseReply(buf, next);
      items.push(part.value);
      next = part.next;
    }
    return { value: items, next };
  }
  throw new Error("unknown RESP");
}

interface StandaloneTarget {
  host: string;
  port: number;
  password: string;
  tls: boolean;
  db: number;
}

export function parseRedisStandaloneUrl(raw: string): StandaloneTarget {
  const parsed = new URL(raw);
  const dbPath = parsed.pathname.replace(/^\//, "");
  const db = dbPath ? Number(dbPath) : 0;
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : (parsed.protocol === "rediss:" ? 6380 : 6379),
    password: decodeURIComponent(parsed.password || ""),
    tls: parsed.protocol === "rediss:",
    db: Number.isFinite(db) ? db : 0,
  };
}

class StandaloneRedis {
  private socket: net.Socket | null = null;
  private buf = Buffer.alloc(0);
  private queue: Array<{ resolve: (v: RedisValue) => void; reject: (e: Error) => void }> = [];
  private opening: Promise<void> | null = null;

  constructor(private readonly target: StandaloneTarget) {}

  private attach(socket: net.Socket) {
    this.socket = socket;
    socket.on("data", (chunk) => {
      this.buf = Buffer.concat([this.buf, chunk]);
      this.drain();
    });
    socket.on("error", (err) => this.fail(err));
    socket.on("close", () => this.fail(new Error("closed")));
  }

  private drain() {
    while (this.queue.length) {
      try {
        const parsed = parseReply(this.buf, 0);
        this.buf = this.buf.slice(parsed.next);
        this.queue.shift()!.resolve(parsed.value);
      } catch (err) {
        if (err instanceof Error && err.message === "incomplete") return;
        this.queue.shift()!.reject(err instanceof Error ? err : new Error("parse"));
      }
    }
  }

  private fail(err: Error) {
    const pending = this.queue.splice(0);
    this.socket = null;
    this.buf = Buffer.alloc(0);
    this.opening = null;
    for (const item of pending) item.reject(err);
  }

  private async open(): Promise<void> {
    if (this.socket && !this.socket.destroyed) return;
    if (this.opening) return this.opening;
    this.opening = new Promise<void>((resolve, reject) => {
      const onConnect = () => { cleanup(); resolve(); };
      const onError = (err: Error) => { cleanup(); reject(err); };
      const cleanup = () => {
        socket.off("connect", onConnect);
        socket.off("secureConnect", onConnect);
        socket.off("error", onError);
      };
      const socket = this.target.tls
        ? tls.connect({ host: this.target.host, port: this.target.port, servername: this.target.host })
        : net.connect({ host: this.target.host, port: this.target.port });
      socket.setNoDelay(true);
      socket.on("connect", this.target.tls ? () => {} : onConnect);
      if (this.target.tls) socket.on("secureConnect", onConnect);
      socket.on("error", onError);
      this.attach(socket);
    }).finally(() => { this.opening = null; });
    await this.opening;
    if (this.target.password) await this.command("AUTH", this.target.password);
    if (this.target.db) await this.command("SELECT", String(this.target.db));
  }

  close() {
    const socket = this.socket;
    this.socket = null;
    this.opening = null;
    this.buf = Buffer.alloc(0);
    const pending = this.queue.splice(0);
    if (socket) {
      socket.removeAllListeners();
      socket.destroy();
    }
    for (const item of pending) item.reject(new Error("closed"));
  }

  async command(...args: string[]): Promise<RedisValue> {
    await this.open();
    const socket = this.socket;
    if (!socket) throw new Error("offline");
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (value: RedisValue | null, err: Error | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (err) reject(err);
        else resolve(value as RedisValue);
      };
      const item = {
        resolve: (value: RedisValue) => finish(value, null),
        reject: (err: Error) => finish(null, err),
      };
      const timer = setTimeout(() => {
        const idx = this.queue.indexOf(item);
        if (idx >= 0) this.queue.splice(idx, 1);
        finish(null, new Error("timeout"));
      }, 4000);
      this.queue.push(item);
      socket.write(encodeCommand(args));
    });
  }
}

let client: StandaloneRedis | null = null;

function getClient(): StandaloneRedis | null {
  const url = redisStandaloneUrl();
  if (!url) return null;
  if (!client) client = new StandaloneRedis(parseRedisStandaloneUrl(url));
  return client;
}

function asStringArray(value: RedisValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export const standaloneKv = {
  available(): boolean {
    return !!redisStandaloneUrl();
  },
  async get(key: string): Promise<string | null> {
    const redis = getClient();
    if (!redis) return null;
    const value = await redis.command("GET", key);
    return typeof value === "string" ? value : null;
  },
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const redis = getClient();
    if (!redis) return;
    await redis.command("SET", key, value, "EX", String(ttlSeconds));
  },
  async del(key: string): Promise<void> {
    const redis = getClient();
    if (!redis) return;
    await redis.command("DEL", key);
  },
  async keys(pattern: string): Promise<string[]> {
    const redis = getClient();
    if (!redis) return [];
    return asStringArray(await redis.command("KEYS", pattern));
  },
  async mget(keys: string[]): Promise<(string | null)[]> {
    const redis = getClient();
    if (!redis || keys.length === 0) return keys.map(() => null);
    const value = await redis.command("MGET", ...keys);
    if (!Array.isArray(value)) return keys.map(() => null);
    return value.map((item) => (typeof item === "string" ? item : null));
  },
};

/** Test-only: reset the singleton after env changes. */
export function resetStandaloneRedisClient(): void {
  client?.close();
  client = null;
}

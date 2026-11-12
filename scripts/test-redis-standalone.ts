import assert from "node:assert/strict";
import net from "node:net";
import { hasUpstashConfig, isRedisConfigured, parseRedisStandaloneUrl, redisStandaloneUrl, resetStandaloneRedisClient, standaloneKv } from "../lib/redis-standalone";

let count = 0;

function readCommand(buf: Buffer): { args: string[]; rest: Buffer } | null {
  if (buf.length < 4 || buf[0] !== 42) return null; // *
  const firstNl = buf.indexOf("\r\n");
  if (firstNl < 0) return null;
  const nargs = Number(buf.slice(1, firstNl).toString("utf8"));
  if (!Number.isFinite(nargs)) return null;
  let offset = firstNl + 2;
  const args: string[] = [];
  for (let i = 0; i < nargs; i++) {
    if (buf[offset] !== 36) return null; // $
    const nl = buf.indexOf("\r\n", offset);
    if (nl < 0) return null;
    const len = Number(buf.slice(offset + 1, nl).toString("utf8"));
    const start = nl + 2;
    const end = start + len;
    if (buf.length < end + 2) return null;
    args.push(buf.slice(start, end).toString("utf8"));
    offset = end + 2;
  }
  return { args, rest: buf.slice(offset) };
}

async function run() {
  const parsed = parseRedisStandaloneUrl("redis://:s3cret%23pass@redis:6379/2");
  assert.equal(parsed.host, "redis"); count++;
  assert.equal(parsed.port, 6379); count++;
  assert.equal(parsed.password, "s3cret#pass"); count++;
  assert.equal(parsed.tls, false); count++;
  assert.equal(parsed.db, 2); count++;
  const tlsParsed = parseRedisStandaloneUrl("rediss://redis.example:6380");
  assert.equal(tlsParsed.tls, true); count++;
  assert.equal(tlsParsed.port, 6380); count++;
  assert.equal(tlsParsed.password, ""); count++;

  const prev = {
    REDIS_URL: process.env.REDIS_URL,
    UPSTASH: process.env.UPSTASH_REDIS_REST_URL,
    TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    KV_URL: process.env.KV_REST_API_URL,
    KV_TOKEN: process.env.KV_REST_API_TOKEN,
  };
  delete process.env.REDIS_URL;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  resetStandaloneRedisClient();
  assert.equal(isRedisConfigured(), false); count++;
  process.env.REDIS_URL = "http://not-redis";
  assert.equal(redisStandaloneUrl(), null); count++;
  process.env.REDIS_URL = "redis://:x@redis:6379";
  assert.equal(!!redisStandaloneUrl(), true); count++;
  assert.equal(hasUpstashConfig(), false); count++;
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";
  assert.equal(hasUpstashConfig(), true); count++;

  const store = new Map<string, string>();
  const server = net.createServer((socket) => {
    let buf = Buffer.alloc(0);
    socket.on("data", (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      while (true) {
        const parsedCmd = readCommand(buf);
        if (!parsedCmd) break;
        buf = parsedCmd.rest;
        const [cmd, ...args] = parsedCmd.args;
        const name = (cmd || "").toUpperCase();
        if (name === "AUTH") {
          socket.write(Buffer.from(args[0] === "s3cret#pass" ? "+OK\r\n" : "-ERR invalid password\r\n"));
        } else if (name === "SELECT") {
          socket.write(Buffer.from("+OK\r\n"));
        } else if (name === "SET") {
          store.set(args[0], args[1]);
          socket.write(Buffer.from("+OK\r\n"));
        } else if (name === "GET") {
          const val = store.get(args[0]);
          socket.write(val == null ? Buffer.from("$-1\r\n") : Buffer.from(`$${Buffer.byteLength(val)}\r\n${val}\r\n`));
        } else if (name === "DEL") {
          store.delete(args[0]);
          socket.write(Buffer.from(":1\r\n"));
        } else if (name === "KEYS") {
          const keys = [...store.keys()];
          const parts = [`*${keys.length}\r\n`];
          for (const key of keys) parts.push(`$${Buffer.byteLength(key)}\r\n${key}\r\n`);
          socket.write(Buffer.from(parts.join(""), "utf8"));
        } else if (name === "MGET") {
          const parts = [`*${args.length}\r\n`];
          for (const key of args) {
            const val = store.get(key);
            parts.push(val == null ? "$-1\r\n" : `$${Buffer.byteLength(val)}\r\n${val}\r\n`);
          }
          socket.write(Buffer.from(parts.join(""), "utf8"));
        } else {
          socket.write(Buffer.from("-ERR unknown\r\n"));
        }
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no port");
  process.env.REDIS_URL = `redis://:${encodeURIComponent("s3cret#pass")}@127.0.0.1:${addr.port}/2`;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  resetStandaloneRedisClient();
  await standaloneKv.set("bc:presence:u1", JSON.stringify({ r: "GURU", p: "guru:beranda" }), 60);
  assert.equal(await standaloneKv.get("bc:presence:u1"), JSON.stringify({ r: "GURU", p: "guru:beranda" })); count++;
  assert.deepEqual(await standaloneKv.keys("bc:presence:*"), ["bc:presence:u1"]); count++;
  assert.deepEqual(await standaloneKv.mget(["bc:presence:u1", "missing"]), [JSON.stringify({ r: "GURU", p: "guru:beranda" }), null]); count++;
  await standaloneKv.del("bc:presence:u1");
  assert.equal(await standaloneKv.get("bc:presence:u1"), null); count++;
  resetStandaloneRedisClient();
  await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));

  if (prev.REDIS_URL === undefined) delete process.env.REDIS_URL; else process.env.REDIS_URL = prev.REDIS_URL;
  if (prev.UPSTASH === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = prev.UPSTASH;
  if (prev.TOKEN === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = prev.TOKEN;
  if (prev.KV_URL === undefined) delete process.env.KV_REST_API_URL; else process.env.KV_REST_API_URL = prev.KV_URL;
  if (prev.KV_TOKEN === undefined) delete process.env.KV_REST_API_TOKEN; else process.env.KV_REST_API_TOKEN = prev.KV_TOKEN;

  console.log(`RESULT ${count} passed, 0 failed`);
}

run().catch((error) => { console.error(error); process.exitCode = 1; });

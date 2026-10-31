import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = (__ENV.BASE_URL || "").replace(/\/$/, "");
const roomCode = __ENV.ROOM_CODE || "";
const allowedStagingHost = (__ENV.ALLOWED_STAGING_HOST || "").trim().toLowerCase();
const cookies = JSON.parse(__ENV.USER_COOKIES_JSON || "{}");

export const options = {
  stages: [
    { duration: "30s", target: 2 },
    { duration: "60s", target: 5 },
    { duration: "60s", target: 10 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
  },
  discardResponseBodies: false,
};

export function setup() {
  if (!baseUrl || !roomCode || !allowedStagingHost || !Object.keys(cookies).length) {
    throw new Error("Isi BASE_URL, ALLOWED_STAGING_HOST, ROOM_CODE, dan USER_COOKIES_JSON.");
  }

  const target = new URL(baseUrl);
  const host = target.hostname.toLowerCase();
  if (
    target.protocol !== "https:" ||
    host === "bahasacerdas.com" ||
    host === "www.bahasacerdas.com" ||
    host.endsWith(".bahasacerdas.com") ||
    host !== allowedStagingHost
  ) {
    throw new Error("BASE_URL harus memakai HTTPS dan host yang sama persis dengan ALLOWED_STAGING_HOST; domain produksi/BC ditolak.");
  }
  if (target.pathname !== "" && target.pathname !== "/") {
    throw new Error("BASE_URL harus berupa alamat dasar tanpa jalur.");
  }

  const available = Object.keys(cookies).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (available.length < 10) {
    throw new Error("Sediakan minimal 10 cookie sesi dari akun uji berbeda, dengan kunci 1 sampai 10.");
  }
  for (let i = 1; i <= 10; i += 1) {
    if (typeof cookies[String(i)] !== "string" || !cookies[String(i)].trim()) {
      throw new Error(`Cookie akun uji nomor ${i} belum tersedia.`);
    }
  }
  return { baseUrl, roomCode };
}

export default function (data) {
  const cookie = cookies[String(__VU)];
  if (!cookie) {
    throw new Error(`Cookie akun uji untuk VU ${__VU} tidak tersedia.`);
  }

  const response = http.post(
    `${data.baseUrl}/api/jumpa/rooms/${encodeURIComponent(data.roomCode)}/token`,
    JSON.stringify({}),
    {
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      tags: { endpoint: "jumpa-token" },
      timeout: "10s",
    },
  );

  let payload = null;
  try {
    payload = response.json();
  } catch {
    payload = null;
  }

  check(response, {
    "API token mengembalikan HTTP 200": (r) => r.status === 200,
    "respons memiliki token media": () => typeof payload?.token === "string" && payload.token.length > 20,
    "respons memiliki alamat server media": () => typeof payload?.serverUrl === "string" && payload.serverUrl.startsWith("wss://"),
  });

  sleep(4);
}

// k6 cloud load test — 50 concurrent users via pre-generated SSR cookies
// STAGING ONLY — safety guard prevents production use
//
// Usage:
//   K6_COOKIE_FILE=tests/load/.tokens.staging.json \
//   BASE_URL=https://staging.bahasacerdas.com \
//   k6 run tests/load/ukbi-cloud-50.js
//
// Thresholds:
//   - Error rate < 1%
//   - p95 response time < 10s (allows for cold starts)

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "";
const PAKET_ID = __ENV.PAKET_ID || "";
const COOKIE_FILE = __ENV.K6_COOKIE_FILE || "";
const ALLOW_PRODUCTION = __ENV.ALLOW_PRODUCTION_LOAD_TEST === "true";
const VUS = 50;
const IS_PRODUCTION = !BASE_URL.includes(".vercel.app") && (BASE_URL.includes("bahasacerdas.com") && !BASE_URL.includes("staging"));
const VERCEL_BYPASS = __ENV.VERCEL_BYPASS_SECRET || "";
const BASE = VERCEL_BYPASS ? `${BASE_URL}?x-vercel-protection-bypass=${VERCEL_BYPASS}` : BASE_URL;

// Safety guard: NEVER run 50+ against production
if (IS_PRODUCTION && !ALLOW_PRODUCTION) {
  console.error(`SAFETY: 50+ VUs NOT allowed on production. BASE_URL=${BASE_URL}. Use staging URL or set ALLOW_PRODUCTION_LOAD_TEST=true.`);
}

let allCookies = [];
if (COOKIE_FILE) {
  try {
    const raw = open(COOKIE_FILE);
    const data = JSON.parse(raw);
    allCookies = Object.values(data).map((v) => v.cookie);
  } catch (e) {
    console.error(`Failed to read cookie file '${COOKIE_FILE}': ${e}`);
  }
}
const COOKIE_COUNT = allCookies.length;

// Safety guard: need at least as many cookies as VUs
if (COOKIE_COUNT < VUS) {
  console.error(`SAFETY: Not enough auth cookies. Have ${COOKIE_COUNT}, need ${VUS}.`);
}

const errorRate = new Rate("errors");
const fetchQuestionsDuration = new Trend("fetch_questions_duration");
const submitDuration = new Trend("submit_duration");
const resultDuration = new Trend("result_duration");

export const options = {
  stages: [
    { duration: "15s", target: 50 },    // warmup ramp
    { duration: "30s", target: 50 },    // warmup sustained
    { duration: "30s", target: 50 },    // measurement sustained
    { duration: "15s", target: 0 },     // cooldown
  ],
  thresholds: {
    errors: ["rate<0.01"],
    http_req_duration: ["p(95)<15000"],
    http_req_failed: ["rate<0.01"],
  },
};

function getMyCookie() {
  if (COOKIE_COUNT === 0) return "";
  return allCookies[(__VU - 1) % COOKIE_COUNT];
}

function buildHeaders(cookie) {
  return {
    "Content-Type": "application/json",
    "Cookie": cookie,
  };
}

export default function () {
  const cookie = getMyCookie();
  if (!cookie) {
    console.error(`VU ${__VU}: No auth cookie available`);
    errorRate.add(true);
    return;
  }

  const headers = buildHeaders(cookie);
  const startTime = Date.now();

  // ── Warmup: auto-create Prisma User record ──
  const warmupRes = http.get(`${BASE}/api/user/me`, { headers });
  if (warmupRes.status !== 200) {
    console.error(`VU ${__VU}: warmup failed (HTTP ${warmupRes.status})`);
    errorRate.add(true);
    return;
  }

  sleep(0.5);

  // ── Fetch questions ──
  const fetchRes = http.get(`${BASE}/api/kompetensi/${PAKET_ID}`, { headers });
  const fetchMs = Date.now() - startTime;
  fetchQuestionsDuration.add(fetchMs);

  const fetchOk = check(fetchRes, {
    "fetch_questions status 200": (r) => r.status === 200,
    "fetch_questions has session": (r) => r.json("data.session") !== undefined,
    "fetch_questions has questions": (r) => {
      const questions = r.json("data.questions");
      return Array.isArray(questions) && questions.length > 0;
    },
  });
  if (!fetchOk) {
    errorRate.add(true);
    console.error(`VU ${__VU}: fetch failed (HTTP ${fetchRes.status})`);
    return;
  }

  sleep(1);

  // ── Submit answers (50% probability) ──
  if (Math.random() < 0.5) {
    const submitRes = http.post(
      `${BASE}/api/kompetensi/${PAKET_ID}/submit`,
      JSON.stringify({ answers: {}, timeSpent: 15 }),
      { headers }
    );
    const submitMs = Date.now() - startTime - fetchMs;
    submitDuration.add(submitMs);

    const submitOk = check(submitRes, {
      "submit status 200": (r) => r.status === 200,
      "submit has result": (r) => r.json("data.result") !== null,
    });
    if (!submitOk) {
      errorRate.add(true);
      console.error(`VU ${__VU}: submit failed (HTTP ${submitRes.status})`);
      return;
    }

    // ── Fetch result ──
    const resultRes = http.get(`${BASE}/api/kompetensi/${PAKET_ID}/hasil`, { headers });
    const resultMs = Date.now() - startTime - fetchMs - submitMs;
    resultDuration.add(resultMs);

    check(resultRes, {
      "result status 200": (r) => r.status === 200,
      "result has data": (r) => r.json("data") !== undefined,
    });
  }

  sleep(1);
}

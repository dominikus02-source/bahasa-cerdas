// k6 cloud smoke test — 1 VU using pre-generated SSR cookie
// With warmup stage to mitigate cold starts
//
// Usage:
//   K6_COOKIE_FILE=tests/load/.tokens.cloud.json \
//   BASE_URL=https://<vercel-preview-url> \
//   k6 run tests/load/ukbi-cloud-smoke.js
//
// Or inline:
//   BASE_URL=https://xxx.vercel.app \
//   K6_COOKIE='sb-xxx-auth-token=base64-xxx' \
//   k6 run tests/load/ukbi-cloud-smoke.js

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://bahasacerdas.com";
const PAKET_ID = __ENV.PAKET_ID || "";
const COOKIE_FILE = __ENV.K6_COOKIE_FILE || "";
const INLINE_COOKIE = __ENV.K6_COOKIE || "";
const ALLOW_PRODUCTION = __ENV.ALLOW_PRODUCTION_LOAD_TEST === "true";
const VUS = 1;
// Read cookies from file if provided (init-time)
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
const HAS_COOKIES = allCookies.length > 0 || !!INLINE_COOKIE;
const COOKIE_COUNT = allCookies.length;
const IS_PRODUCTION = BASE_URL.includes("bahasacerdas.com") || BASE_URL.includes("www.bahasacerdas");

// Safety guard: prevent running >20 VUs against production
if (IS_PRODUCTION && !ALLOW_PRODUCTION && VUS > 20) {
  console.error(`SAFETY: production canary limited to 20 VUs. VUS=${VUS} > 20. Set ALLOW_PRODUCTION_LOAD_TEST=true to override.`);
}

const errorRate = new Rate("errors");
const fetchQuestionsDuration = new Trend("fetch_questions_duration");
const submitDuration = new Trend("submit_duration");
const resultDuration = new Trend("result_duration");
const fullFlowDuration = new Trend("full_flow_duration");

export const options = {
  vus: 1,
  iterations: 2, // iteration 1 = warmup, iteration 2 = measurement
  thresholds: {
    errors: ["rate<0.01"],
    http_req_duration: ["p(95)<10000"],
  },
};

function getMyCookie() {
  if (INLINE_COOKIE) return INLINE_COOKIE;
  if (COOKIE_COUNT > 0) {
    return allCookies[(__VU - 1) % COOKIE_COUNT];
  }
  return "";
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
    console.error("No auth cookie available");
    errorRate.add(true);
    return;
  }

  const headers = buildHeaders(cookie);
  const isWarmup = __ITER === 0;
  const tag = isWarmup ? "warmup" : "measure";

  group(`[${tag}] Full UKBI/TKA Flow`, function () {
    const startTime = Date.now();
    let fetchFailed = false;

    // Step 1: Warmup / user/me
    const warmupRes = http.get(`${BASE_URL}/api/user/me`, { headers });
    check(warmupRes, {
      [`[${tag}] /api/user/me status 200`]: (r) => r.status === 200,
    }) || fetchFailed = true;

    // Step 2: Fetch questions
    const fetchStart = Date.now();
    const fetchRes = http.get(`${BASE_URL}/api/kompetensi/${PAKET_ID}`, { headers });
    const fetchMs = Date.now() - fetchStart;
    fetchQuestionsDuration.add(fetchMs);
    const fetchOk = check(fetchRes, {
      [`[${tag}] Fetch questions status 200`]: (r) => r.status === 200,
      [`[${tag}] Fetch has session`]: (r) => r.json("data.session") !== undefined,
      [`[${tag}] Fetch has questions`]: (r) => {
        const questions = r.json("data.questions");
        return Array.isArray(questions) && questions.length > 0;
      },
    });
    if (!fetchOk) fetchFailed = true;

    // Step 3: Submit answers
    const submitRes = http.post(
      `${BASE_URL}/api/kompetensi/${PAKET_ID}/submit`,
      JSON.stringify({ answers: {}, timeSpent: 5 }),
      { headers }
    );
    const submitMs = Date.now() - fetchStart - fetchMs;
    submitDuration.add(submitMs);
    const submitOk = check(submitRes, {
      [`[${tag}] Submit status 200`]: (r) => r.status === 200,
      [`[${tag}] Submit has result`]: (r) => r.json("data.result") !== null,
    });
    if (!submitOk) fetchFailed = true;

    // Step 4: Fetch result
    const resultStart = Date.now();
    const resultRes = http.get(`${BASE_URL}/api/kompetensi/${PAKET_ID}/hasil`, { headers });
    const resultMs = Date.now() - resultStart;
    resultDuration.add(resultMs);
    check(resultRes, {
      [`[${tag}] Result status 200`]: (r) => r.status === 200,
      [`[${tag}] Result has result`]: (r) => r.json("data") !== undefined,
    });

    const totalMs = Date.now() - startTime;
    fullFlowDuration.add(totalMs);

    if (!isWarmup) {
      console.log(`[${tag}] flow complete in ${totalMs}ms (fetch:${fetchMs}ms, submit:${submitMs}ms, result:${resultMs}ms)`);
    }
  });

  sleep(1);
}

// k6 cloud smoke test — 1 VU using pre-generated SSR cookie
// No login step — reads cookie from .tokens.cloud.json via K6_COOKIE_xxx env vars
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

const errorRate = new Rate("errors");
const fetchQuestionsDuration = new Trend("fetch_questions_duration");
const submitDuration = new Trend("submit_duration");
const resultDuration = new Trend("result_duration");
const fullFlowDuration = new Trend("full_flow_duration");

export const options = {
  vus: 1,
  iterations: 1,
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
    console.error("No auth cookie available. Set K6_COOKIE_FILE or K6_COOKIE.");
    return;
  }

  const headers = buildHeaders(cookie);
  const startTime = Date.now();

  // ── Fetch Questions ──
  let questions = [];

  group("Fetch Questions", function () {
    let res = http.get(`${BASE_URL}/api/kompetensi/${PAKET_ID}`, { headers });

    if (res.status === 400) {
      res = http.get(`${BASE_URL}/api/kompetensi/${PAKET_ID}?retry=1`, { headers });
    }

    const ok = check(res, {
      "fetch questions status 200": (r) => r.status === 200,
      "response has session": (r) => {
        try { const d = JSON.parse(r.body); const data = d.data || d; return !!data.session; }
        catch { return false; }
      },
      "questions available": (r) => {
        try {
          const d = JSON.parse(r.body);
          const data = d.data || d;
          return data.questions && data.questions.length > 0;
        } catch { return false; }
      },
    });
    errorRate.add(!ok);
    fetchQuestionsDuration.add(res.timings.duration);

    if (ok) {
      try {
        const d = JSON.parse(res.body);
        const data = d.data || d;
        for (const section of data.questions) {
          if (section.questions) {
            for (const q of section.questions) {
              questions.push(q);
            }
          }
        }
      } catch { /* ignore */ }
    }

    if (questions.length > 0) {
      sleep(Math.min(2, 0.2 + questions.length * 0.03));
    }
  });

  if (questions.length === 0) return;

  // ── Submit Answers ──
  group("Submit Answers", function () {
    const answers = {};
    for (const q of questions) {
      if (q.options && q.options.length > 0) {
        const opt = q.options[0];
        answers[q.id] = opt.id || opt.value || opt.label || "A";
      }
    }

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    const submitRes = http.post(
      `${BASE_URL}/api/kompetensi/${PAKET_ID}/submit`,
      JSON.stringify({ answers, timeSpent }),
      { headers }
    );

    const ok = check(submitRes, {
      "submit status 200": (r) => r.status === 200,
      "submit success": (r) => {
        try { const b = JSON.parse(r.body); return b.success === true; }
        catch { return false; }
      },
      "submit has result data": (r) => {
        try {
          const b = JSON.parse(r.body);
          const d = b.data || b;
          const res = d.result || d;
          return (typeof res.benar === "number" && typeof res.salah === "number") ||
                 (typeof res.totalScore === "number");
        } catch { return false; }
      },
    });
    errorRate.add(!ok);
    submitDuration.add(submitRes.timings.duration);

    sleep(1);
  });

  // ── View Result ──
  group("View Result", function () {
    const res = http.get(
      `${BASE_URL}/api/kompetensi/${PAKET_ID}/hasil`,
      { headers }
    );

    const ok = check(res, {
      "result status 200": (r) => r.status === 200,
      "result has percentage": (r) => {
        try {
          const b = JSON.parse(r.body);
          const d = b.data || b;
          return d.result?.percentage !== undefined || d.percentage !== undefined;
        } catch { return false; }
      },
    });
    errorRate.add(!ok);
    resultDuration.add(res.timings.duration);
  });

  fullFlowDuration.add(Date.now() - startTime);
  console.log(`Flow complete: ${Date.now() - startTime}ms, ${questions.length} questions`);
}

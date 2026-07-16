// k6 cloud load test — 20 concurrent users via pre-generated SSR cookies
// Each VU picks a unique cookie — no login step
//
// Usage:
//   K6_COOKIE_FILE=tests/load/.tokens.cloud.json \
//   BASE_URL=https://<vercel-preview-url> \
//   k6 run tests/load/ukbi-cloud-20.js
//
// Thresholds:
//   - Error rate < 1%
//   - p95 response time < 10s (allows for cold starts)
//   - http_req_failed < 1%

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://bahasacerdas.com";
const PAKET_ID = __ENV.PAKET_ID || "";
const COOKIE_FILE = __ENV.K6_COOKIE_FILE || "";
const USER_COUNT = 20;

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

const errorRate = new Rate("errors");
const fetchQuestionsDuration = new Trend("fetch_questions_duration");
const submitDuration = new Trend("submit_duration");
const resultDuration = new Trend("result_duration");

export const options = {
  stages: [
    { duration: "15s", target: 20 },
    { duration: "45s", target: 20 },
    { duration: "15s", target: 0 },
  ],
  thresholds: {
    errors: ["rate<0.01"],
    http_req_duration: ["p(95)<10000"],
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
  const warmupRes = http.get(`${BASE_URL}/api/user/me`, { headers });
  if (warmupRes.status !== 200) {
    console.error(`VU ${__VU}: warmup failed (HTTP ${warmupRes.status})`);
    errorRate.add(true);
    return;
  }
  sleep(1);

  // ── Fetch Questions ──
  let questions = [];

  group("Fetch Questions", function () {
    let res = http.get(`${BASE_URL}/api/kompetensi/${PAKET_ID}`, { headers });

    if (res.status === 400) {
      res = http.get(`${BASE_URL}/api/kompetensi/${PAKET_ID}?retry=1`, { headers });
    }

    if (res.status === 401 || res.status === 403) {
      console.error(`VU ${__VU}: auth failed (HTTP ${res.status}) — cookie may be expired`);
      errorRate.add(true);
      return;
    }

    const ok = check(res, {
      "fetch status 200": (r) => r.status === 200,
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
        const d = JSON.parse(r.body);
        const data = d.data || d;
        for (const section of data.questions || []) {
          if (section.questions) {
            for (const q of section.questions) {
              questions.push(q);
            }
          }
        }
      } catch { /* ignore */ }
    }

    if (questions.length > 0) {
      sleep(Math.min(3, 0.3 + questions.length * 0.05));
    }
  });

  if (questions.length === 0) return;

  // ── Submit Answers (60% chance) ──
  const doFullSim = Math.random() < 0.6;

  if (doFullSim) {
    group("Submit Answers", function () {
      const answers = {};
      for (const q of questions) {
        if (q.options?.length > 0) {
          answers[q.id] = q.options[0].id || "A";
        }
      }

      const timeSpent = Math.floor((Date.now() - startTime) / 1000);

      const submitRes = http.post(
        `${BASE_URL}/api/kompetensi/${PAKET_ID}/submit`,
        JSON.stringify({ answers, timeSpent }),
        { headers }
      );

      if (submitRes.status === 401 || submitRes.status === 403) {
        console.error(`VU ${__VU}: auth failed on submit (HTTP ${submitRes.status})`);
        errorRate.add(true);
        return;
      }

      const ok = check(submitRes, {
        "submit status 200": (r) => r.status === 200,
      });
      errorRate.add(!ok);
      submitDuration.add(submitRes.timings.duration);

      sleep(1);
    });

    group("View Result", function () {
      const res = http.get(
        `${BASE_URL}/api/kompetensi/${PAKET_ID}/hasil`,
        { headers }
      );

      if (res.status === 401 || res.status === 403) {
        errorRate.add(true);
        return;
      }

      const ok = check(res, {
        "result status 200": (r) => r.status === 200,
      });
      errorRate.add(!ok);
      resultDuration.add(res.timings.duration);
    });
  }

  sleep(2 + Math.random() * 3);
}

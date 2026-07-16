// k6 load test — UKBI Fresh Submit (multi-user, pre-generated tokens)
// Each VU gets a unique token (one user per VU) → each gets a fresh session
//
// Usage:
//   TOKENS=$(cat /tmp/token_01.txt /tmp/token_02.txt ... | paste -sd,)
//   k6 run -e TOKENS="$TOKENS" -e BASE_URL=http://localhost:3001 tests/load/ukbi-fresh-submit.js
//
// Thresholds:
//   - Error rate < 1%
//   - p95 response time < 5s

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3001";
const PAKET_ID = __ENV.PAKET_ID || "";
const TOKENS_RAW = __ENV.TOKENS || "";
const TOKENS = TOKENS_RAW ? TOKENS_RAW.split(",").map(t => t.trim()).filter(t => t) : [];

const errorRate = new Rate("errors");
const fetchQuestionsDuration = new Trend("fetch_questions_duration");
const submitDuration = new Trend("submit_duration");
const resultDuration = new Trend("result_duration");

export const options = {
  vus: Math.min(TOKENS.length || 1, 10),
  iterations: Math.min(TOKENS.length || 1, 10),
  thresholds: {
    errors: ["rate<0.01"],
    http_req_duration: ["p(95)<5000"],
    http_req_failed: ["rate<0.01"],
  },
};

function getMyToken() {
  const idx = (__VU - 1) % TOKENS.length;
  return TOKENS[idx];
}

export default function () {
  const token = getMyToken();
  if (!token) {
    console.error(`VU ${__VU}: no token available`);
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };

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
      "questions available": (r) => {
        try {
          const body = JSON.parse(r.body);
          const d = body.data || body;
          return d.questions && d.questions.length > 0;
        } catch { return false; }
      },
    });
    errorRate.add(!ok);
    fetchQuestionsDuration.add(res.timings.duration);

    if (ok) {
      try {
        const body = JSON.parse(r.body);
        const d = body.data || body;
        for (const section of d.questions) {
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
      "fresh submit (not alreadyScored)": (r) => {
        try {
          const b = JSON.parse(r.body);
          const d = b.data || b;
          const res = d.result || d;
          // Should have benar/salah (fresh) not alreadyScored flag
          return typeof res.benar === "number" && typeof res.salah === "number"
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
}

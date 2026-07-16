// k6 load test — UKBI Simulation (100 concurrent users, 5 min)
// Ramp-up: 0 → 100 over 1 min, stay 3 min, ramp-down: 100 → 0 over 1 min
//
// Usage:
//   k6 run tests/load/ukbi-100.js \
//     --env EMAIL=murid@demo.com \
//     --env PASSWORD=murid123
//
// Thresholds:
//   - Error rate < 1%
//   - p95 response time < 5s

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://bahasacerdas.com";
const EMAIL = __ENV.EMAIL || "";
const PASSWORD = __ENV.PASSWORD || "";
const PAKET_ID = __ENV.PAKET_ID || "";
const BEARER_TOKEN = __ENV.TOKEN || "";

const errorRate = new Rate("errors");
const loginDuration = new Trend("login_duration");
const fetchPaketDuration = new Trend("fetch_paket_duration");
const fetchQuestionsDuration = new Trend("fetch_questions_duration");
const submitDuration = new Trend("submit_duration");
const resultDuration = new Trend("result_duration");

export const options = {
  stages: [
    { duration: "1m", target: 100 },   // Ramp up 0 → 100
    { duration: "3m", target: 100 },   // Stay at 100
    { duration: "1m", target: 0 },     // Ramp down
  ],
  thresholds: {
    errors: ["rate<0.01"],
    http_req_duration: ["p(95)<5000"],
    http_req_failed: ["rate<0.01"],
  },
};

// Cache auth cookie, token, and paket ID across iterations per VU
let vuAuthCookie = "";
let vuAuthToken = "";
let vuPaketId = "";

function doLogin() {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { "Content-Type": "application/json" } }
  );

  const ok = check(loginRes, {
    "login status 200": (r) => r.status === 200,
    "login has session": (r) => {
      try {
        const body = JSON.parse(r.body);
        const d = body.data || body;
        return !!(d.session && d.session.access_token);
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!ok);
  loginDuration.add(loginRes.timings.duration);

  if (!ok) {
    let errMsg = `VU ${__VU} login failed (HTTP ${loginRes.status})`;
    try {
      const body = JSON.parse(loginRes.body);
      if (body.error) errMsg += `: ${body.error}`;
    } catch { /* ignore */ }
    console.error(errMsg);
    return { cookie: "", token: "" };
  }

  let cookie = "";
  let token = "";

  const cookieHeader = loginRes.headers["Set-Cookie"] || loginRes.headers["set-cookie"] || "";
  if (cookieHeader) {
    const match = cookieHeader.match(
      /(sb-[a-z0-9]+-auth-token[^;]*)/i
    );
    if (match) cookie = match[1];
  }

  if (!cookie) {
    try {
      const body = JSON.parse(loginRes.body);
      const d = body.data || body;
      if (d.session && d.session.access_token) {
        token = d.session.access_token;
      }
    } catch { /* ignore */ }
  }

  if (!cookie && !token) {
    console.error(`VU ${__VU} login succeeded but no auth token found`);
  }

  return { cookie, token };
}

function buildAuthHeaders() {
  const h = { "Content-Type": "application/json" };
  if (vuAuthCookie) h["Cookie"] = vuAuthCookie;
  else if (vuAuthToken) h["Authorization"] = `Bearer ${vuAuthToken}`;
  return h;
}

export default function () {
  // ── Login (once per VU) ──
  if (!vuAuthCookie && !vuAuthToken) {
    if (BEARER_TOKEN) {
      vuAuthToken = BEARER_TOKEN;
    } else {
      group("Login", function () {
        const result = doLogin();
        vuAuthCookie = result.cookie;
        vuAuthToken = result.token;
      });

      if (!vuAuthCookie && !vuAuthToken) return;
      sleep(2);
    }
  }

  const authHeaders = buildAuthHeaders();

  // ── Fetch paket ID (once per VU) ──
  if (!vuPaketId) {
    group("Fetch Paket", function () {
      if (PAKET_ID) {
        vuPaketId = PAKET_ID;
        return;
      }

      const res = http.get(`${BASE_URL}/api/kompetensi?limit=10`, {
        headers: authHeaders,
      });

      const ok = check(res, {
        "paket list status 200": (r) => r.status === 200,
      });
      errorRate.add(!ok);
      fetchPaketDuration.add(res.timings.duration);

      if (ok) {
        try {
          const data = JSON.parse(res.body);
          for (const p of data.data || []) {
            if (p.type && (p.type.includes("UKBI") || p.type.includes("TKA"))) {
              vuPaketId = p.id;
              break;
            }
          }
          if (!vuPaketId && data.data && data.data.length > 0) {
            vuPaketId = data.data[0].id;
          }
        } catch {
          // ignore
        }
      }
    });

    sleep(1);
  }

  if (!vuPaketId) return;

  // ── Simulation flow ──
  // 70% chance: full simulation (fetch + submit)
  // 30% chance: just browse questions
  const doFullSim = Math.random() < 0.7;

  if (doFullSim) {
    fullSimulation(authHeaders);
  } else {
    browseOnly(authHeaders);
  }
}

function browseOnly(headers) {
  group("Browse Only", function () {
    const res = http.get(`${BASE_URL}/api/kompetensi/${vuPaketId}`, {
      headers,
    });
    const ok = check(res, {
      "browse questions status 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
    fetchQuestionsDuration.add(res.timings.duration);
  });

  sleep(3 + Math.random() * 5);
}

function fullSimulation(headers) {
  const startTime = Date.now();

  // ── Fetch Questions ──
  let questions = [];

  group("Fetch Questions", function () {
    let res = http.get(`${BASE_URL}/api/kompetensi/${vuPaketId}`, { headers });

    if (res.status === 400) {
      res = http.get(`${BASE_URL}/api/kompetensi/${vuPaketId}?retry=1`, { headers });
    }

    const ok = check(res, {
      "fetch questions status 200": (r) => r.status === 200,
      "questions available": (r) => {
        try {
          const body = JSON.parse(r.body);
          const d = body.data || body;
          return d.questions && d.questions.length > 0;
        } catch {
          return false;
        }
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
      } catch {
        // ignore
      }
    }

    // Simulate "reading" time proportional to question count
    if (questions.length > 0) {
      sleep(Math.min(5, 0.5 + questions.length * 0.1));
    }
  });

  if (questions.length === 0) return;

  // ── Submit Answers ──
  group("Submit Answers", function () {
    const answers = {};
    // Answer all questions with first option
    for (const q of questions) {
      if (q.options && q.options.length > 0) {
        const opt = q.options[0];
        answers[q.id] = opt.id || opt.value || opt.label || "A";
      }
    }

    const timeSpent = Math.floor(
      (Date.now() - startTime) / 1000
    );

    const submitRes = http.post(
      `${BASE_URL}/api/kompetensi/${vuPaketId}/submit`,
      JSON.stringify({ answers, timeSpent }),
      { headers }
    );

    const ok = check(submitRes, {
      "submit status 200": (r) => r.status === 200,
      "submit success": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true;
        } catch {
          return false;
        }
      },
      "submit accepted": (r) => {
        try {
          const body = JSON.parse(r.body);
          const d = body.data || body;
          const res = d.result || d;
          // Fresh: has benar/salah. AlreadyScored: has totalScore or d.alreadyScored=true
          return (
            (typeof res.benar === "number" && typeof res.salah === "number") ||
            typeof res.totalScore === "number" ||
            d.alreadyScored === true ||
            res.alreadyScored === true
          );
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
    submitDuration.add(submitRes.timings.duration);

    sleep(1);
  });

  // ── View Result ──
  group("View Result", function () {
    const res = http.get(
      `${BASE_URL}/api/kompetensi/${vuPaketId}/hasil`,
      { headers }
    );

    const ok = check(res, {
      "result status 200": (r) => r.status === 200,
      "result has percentage": (r) => {
        try {
          const body = JSON.parse(r.body);
          const d = body.data || body;
          const result = d.result || d;
          return result.percentage !== undefined;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
    resultDuration.add(res.timings.duration);
  });

  sleep(2 + Math.random() * 3);
}

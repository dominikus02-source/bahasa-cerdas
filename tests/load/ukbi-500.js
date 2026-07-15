// k6 load test — UKBI Simulation (500 concurrent users, 10 min)
// Ramp-up: 0 → 500 over 3 min, stay 5 min, ramp-down: 500 → 0 over 2 min
//
// Usage:
//   k6 run tests/load/ukbi-500.js \
//     --env EMAIL=murid@demo.com \
//     --env PASSWORD=murid123
//
// THRESHOLD WARNING: At 500 concurrent users, expect higher latency.
// Target: error rate < 1%, p95 < 5s.
// Acceptable: error rate < 2%, p95 < 8s.

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://bahasacerdas.com";
const EMAIL = __ENV.EMAIL || "";
const PASSWORD = __ENV.PASSWORD || "";
const PAKET_ID = __ENV.PAKET_ID || "";

const errorRate = new Rate("errors");
const loginDuration = new Trend("login_duration");
const fetchPaketDuration = new Trend("fetch_paket_duration");
const fetchQuestionsDuration = new Trend("fetch_questions_duration");
const submitDuration = new Trend("submit_duration");
const resultDuration = new Trend("result_duration");

export const options = {
  stages: [
    { duration: "3m", target: 500 },   // Ramp up 0 → 500
    { duration: "5m", target: 500 },   // Stay at 500
    { duration: "2m", target: 0 },     // Ramp down
  ],
  thresholds: {
    errors: ["rate<0.02"],
    http_req_duration: ["p(95)<8000"],
    http_req_failed: ["rate<0.02"],
  },
};

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
        return !!(body.session && body.session.access_token);
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

  if (loginRes.headers["Set-Cookie"]) {
    const match = loginRes.headers["Set-Cookie"].match(
      /(sb-[a-z0-9]+-auth-token[^;]*)/i
    );
    if (match) cookie = match[1];
  }

  if (!cookie) {
    try {
      const body = JSON.parse(loginRes.body);
      if (body.session && body.session.access_token) {
        token = body.session.access_token;
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
  if (!vuAuthCookie && !vuAuthToken) {
    group("Login", function () {
      const result = doLogin();
      vuAuthCookie = result.cookie;
      vuAuthToken = result.token;
    });

    if (!vuAuthCookie && !vuAuthToken) return;
    sleep(2);
  }

  const authHeaders = buildAuthHeaders();

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
  let questions = [];

  group("Fetch Questions", function () {
    const res = http.get(`${BASE_URL}/api/kompetensi/${vuPaketId}`, {
      headers,
    });

    const ok = check(res, {
      "fetch questions status 200": (r) => r.status === 200,
      "questions available": (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.questions && data.questions.length > 0;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
    fetchQuestionsDuration.add(res.timings.duration);

    if (ok) {
      try {
        const data = JSON.parse(r.body);
        for (const section of data.questions) {
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

    if (questions.length > 0) {
      sleep(Math.min(5, 0.5 + questions.length * 0.1));
    }
  });

  if (questions.length === 0) return;

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
    });
    errorRate.add(!ok);
    submitDuration.add(submitRes.timings.duration);

    sleep(1);
  });

  group("View Result", function () {
    const res = http.get(
      `${BASE_URL}/api/kompetensi/${vuPaketId}/hasil`,
      { headers }
    );

    const ok = check(res, {
      "result status 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
    resultDuration.add(res.timings.duration);
  });

  sleep(2 + Math.random() * 3);
}

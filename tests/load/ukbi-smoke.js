// k6 load test — UKBI Simulation Smoke (1 VU, 1 iteration)
// Validates the full simulation flow: login → fetch questions → answer → submit → result
//
// Usage:
//   EMAIL=murid@demo.com PASSWORD=murid123 k6 run tests/load/ukbi-smoke.js
//
// Dry run (syntax check):
//   k6 run --dry-run tests/load/ukbi-smoke.js

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
const fullFlowDuration = new Trend("full_flow_duration");

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    errors: ["rate<0.01"],
    http_req_duration: ["p(95)<5000"],
  },
};

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
    let errMsg = `Login failed (HTTP ${loginRes.status})`;
    try {
      const body = JSON.parse(loginRes.body);
      if (body.error) errMsg += `: ${body.error}`;
    } catch { /* ignore */ }
    console.error(errMsg);
    return { authCookie: "", authToken: "" };
  }

  let authCookie = "";
  let authToken = "";

  const cookieHeader = loginRes.headers["Set-Cookie"] || loginRes.headers["set-cookie"] || "";
  if (cookieHeader) {
    const match = cookieHeader.match(
      /(sb-[a-z0-9]+-auth-token[^;]*)/i
    );
    if (match) authCookie = match[1];
  }

  if (!authCookie) {
    try {
      const body = JSON.parse(loginRes.body);
      const d = body.data || body;
      if (d.session && d.session.access_token) {
        authToken = d.session.access_token;
      }
    } catch { /* ignore */ }
  }

  if (!authCookie && !authToken) {
    console.error("Login succeeded but no auth token found in response");
  }

  return { authCookie, authToken };
}

function buildHeaders(authCookie, authToken) {
  const h = { "Content-Type": "application/json" };
  if (authCookie) h["Cookie"] = authCookie;
  else if (authToken) h["Authorization"] = `Bearer ${authToken}`;
  return h;
}

export default function () {
  const startTime = Date.now();

  // ── PHASE 1: Login ──
  let authCookie = "";
  let authToken = "";

  group("Login", function () {
    const result = doLogin();
    authCookie = result.authCookie;
    authToken = result.authToken;
    sleep(1);
  });

  if (!authCookie && !authToken) return;

  const headers = buildHeaders(authCookie, authToken);

  // ── PHASE 2: Fetch Paket List ──
  let paketId = PAKET_ID;

  group("Fetch Paket List", function () {
    if (paketId) return; // Already have a paket ID

    const res = http.get(`${BASE_URL}/api/kompetensi?limit=5`, { headers });
    const ok = check(res, {
      "paket list status 200": (r) => r.status === 200,
      "paket list has data": (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.data && data.data.length > 0 && data.data[0].id;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
    fetchPaketDuration.add(res.timings.duration);

    if (ok) {
      try {
        const data = JSON.parse(res.body);
        // Pick first UKBI paket
        for (const p of data.data) {
          if (p.type && p.type.includes("UKBI")) {
            paketId = p.id;
            break;
          }
        }
        if (!paketId) paketId = data.data[0].id;
      } catch {
        // ignore
      }
    }

    if (!paketId) {
      console.error("FAILED to get paket ID");
    }

    sleep(1);
  });

  if (!paketId) return;

  // ── PHASE 3: Start Session & Fetch Questions ──
  let sessionData = null;
  let questions = [];

  group("Fetch Questions", function () {
    // Use retry=1 if session was already completed (e.g., re-testing same paket)
    let res = http.get(`${BASE_URL}/api/kompetensi/${paketId}`, { headers });

    if (res.status === 400) {
      res = http.get(`${BASE_URL}/api/kompetensi/${paketId}?retry=1`, { headers });
    }

    const ok = check(res, {
      "fetch questions status 200": (r) => r.status === 200,
      "response has session": (r) => {
        try {
          const body = JSON.parse(r.body);
          const d = body.data || body;
          return d.session && d.session.id;
        } catch {
          return false;
        }
      },
      "response has questions": (r) => {
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
        const body = JSON.parse(res.body);
        const d = body.data || body;
        sessionData = d.session;
        // Collect all questions across sections
        for (const section of (d.questions || [])) {
          if (section.questions && section.questions.length > 0) {
            for (const q of section.questions) {
              questions.push(q);
            }
          }
        }
      } catch {
        // ignore
      }
    }

    sleep(2);
  });

  if (questions.length === 0) return;

  // ── PHASE 4: Answer 5 Questions (client-side only, no save per click) ──
  group("Prepare Answers", function () {
    // In a real user flow, answers are accumulated client-side
    // and submitted in batch. We just verify the question structure.
    const ansCount = Math.min(5, questions.length);
    for (let i = 0; i < ansCount; i++) {
      const q = questions[i];
      if (q.options && q.options.length > 0) {
        const firstOption = q.options[0];
        check(q, {
          [`question ${i + 1} has valid option`]: () =>
            firstOption && (firstOption.id || firstOption.label),
        });
      }
    }
    sleep(1);
  });

  // ── PHASE 5: Submit All Answers ──
  group("Submit Answers", function () {
    const answers = {};
    const ansCount = Math.min(5, questions.length);

    for (let i = 0; i < ansCount; i++) {
      const q = questions[i];
      if (q.options && q.options.length > 0) {
        const opt = q.options[0];
        answers[q.id] = opt.id || opt.value || opt.label || "A";
      }
    }

    const submitRes = http.post(
      `${BASE_URL}/api/kompetensi/${paketId}/submit`,
      JSON.stringify({
        answers,
        timeSpent: Math.floor(Date.now() - startTime),
      }),
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
      "submit has result": (r) => {
        try {
          const body = JSON.parse(r.body);
          const d = body.data || body;
          const res = d.result || d;
          // Normal result has benar/salah/total; alreadyScored has totalScore/percentage
          return (
            (typeof res.benar === "number" && typeof res.salah === "number" && typeof res.total === "number") ||
            (typeof res.totalScore === "number" && typeof res.percentage === "number")
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

  // ── PHASE 6: View Result ──
  group("View Result", function () {
    const res = http.get(
      `${BASE_URL}/api/kompetensi/${paketId}/hasil`,
      { headers }
    );

    const ok = check(res, {
      "result status 200": (r) => r.status === 200,
      "result has data": (r) => {
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

  fullFlowDuration.add(Date.now() - startTime);
}

// k6 load test — UKBI Simulation Smoke (1 VU, 1 iteration)
// Validates the full simulation flow: login → fetch questions → answer → submit → result
//
// Usage:
//   k6 run tests/load/ukbi-smoke.js \
//     --env EMAIL=murid@demo.com \
//     --env PASSWORD=murid123
//
// Dry run (syntax check):
//   k6 run --dry-run tests/load/ukbi-smoke.js

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://bahasacerdas.com";
const EMAIL = __ENV.EMAIL || "murid@demo.com";
const PASSWORD = __ENV.PASSWORD || "murid123";
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

export default function () {
  const startTime = Date.now();
  let authCookie = __ENV.KOOKIE || "";

  // ── PHASE 1: Login ──
  group("Login", function () {
    if (authCookie) {
      return; // Use pre-provided token
    }

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
          return body.session && body.session.access_token;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
    loginDuration.add(loginRes.timings.duration);

    // Extract auth cookie from Set-Cookie header
    if (ok && loginRes.headers["Set-Cookie"]) {
      const setCookie = loginRes.headers["Set-Cookie"];
      // Find the auth-token cookie — supports multiple cookie formats
      const match = setCookie.match(
        /(sb-[a-z0-9]+-auth-token[^;]*)/i
      );
      if (match) {
        authCookie = match[1];
      }
    }

    if (!authCookie) {
      // Fallback: parse the JSON session and construct minimal cookie
      try {
        const body = JSON.parse(loginRes.body);
        if (body.session && body.session.access_token) {
          authCookie = `sb-auth-token=${body.session.access_token}`;
        }
      } catch {
        // give up
      }
    }

    if (!authCookie) {
      console.error("FAILED to obtain auth cookie");
      return;
    }

    sleep(1);
  });

  if (!authCookie) return;

  const headers = {
    Cookie: authCookie,
    "Content-Type": "application/json",
  };

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
    const res = http.get(`${BASE_URL}/api/kompetensi/${paketId}`, {
      headers,
    });

    const ok = check(res, {
      "fetch questions status 200": (r) => r.status === 200,
      "response has session": (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.session && data.session.id;
        } catch {
          return false;
        }
      },
      "response has questions": (r) => {
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
        const data = JSON.parse(res.body);
        sessionData = data.session;
        // Collect all questions across sections
        for (const section of data.questions) {
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
          return (
            body.result &&
            typeof body.result.benar === "number" &&
            typeof body.result.salah === "number" &&
            typeof body.result.total === "number"
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
          return body.result && body.result.percentage !== undefined;
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

// k6 load test — UKBI 20 concurrent users via cookie-based auth
// Login once per VU via POST /api/auth/login, cache cookie for subsequent requests
//
// Usage:
//   k6 run tests/load/ukbi-20-user.js \
//     -e BASE_URL=http://localhost:3000 \
//     -e PASSWORD=Test123! \
//     -e PAKET_ID=local-ukbi-practice

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const PASSWORD = __ENV.PASSWORD || "Test123!";
const PAKET_ID = __ENV.PAKET_ID || "local-ukbi-practice";
const USER_COUNT = 20;

const errorRate = new Rate("errors");
const fetchQuestionsDuration = new Trend("fetch_questions_duration");
const submitDuration = new Trend("submit_duration");
const resultDuration = new Trend("result_duration");

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "1m", target: 20 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<5000"],
  },
};

// Per-VU cached auth
let loginDone = false;
let authCookie = "";

function getVuEmail() {
  const idx = ((__VU - 1) % USER_COUNT) + 1;
  return `loadtest_${String(idx).padStart(3, "0")}@example.com`;
}

function doLogin() {
  const email = getVuEmail();
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password: PASSWORD }),
    { headers: { "Content-Type": "application/json" } }
  );

  if (res.status !== 200) {
    errorRate.add(true);
    return false;
  }

  // Extract access_token from JSON body
  try {
    const body = JSON.parse(res.body);
    const session = body.session || body.data?.session;
    if (session?.access_token) {
      // Format cookie for Supabase SSR: sb-<project>-auth-token=base64-<jwt>
      const projectRef = "127";
      const cookieValue = `sb-${projectRef}-auth-token=base64-${btoa(session.access_token)}`;
      authCookie = cookieValue;
      loginDone = true;
      errorRate.add(false);
      return true;
    }
  } catch { /* ignore */ }

  errorRate.add(true);
  return false;
}

function buildHeaders() {
  return {
    "Content-Type": "application/json",
    "Cookie": authCookie,
  };
}

export default function () {
  // Login once per VU
  if (!loginDone) {
    if (!doLogin()) {
      sleep(2);
      return;
    }
    sleep(1);
  }

  const headers = buildHeaders();
  const startTime = Date.now();

  // Fetch questions
  let questions = [];
  group("Fetch Questions", function () {
    let res = http.get(`${BASE_URL}/api/kompetensi/${PAKET_ID}`, { headers });

    if (res.status === 400) {
      res = http.get(`${BASE_URL}/api/kompetensi/${PAKET_ID}?retry=1`, { headers });
    }

    if (res.status === 401 || res.status === 403) {
      loginDone = false;
      return;
    }

    check(res, {
      "fetch status 200": (r) => r.status === 200,
    });
    fetchQuestionsDuration.add(res.timings.duration);

    if (res.status === 200) {
      try {
        const d = JSON.parse(res.body);
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

  if (questions.length === 0) {
    sleep(1 + Math.random() * 2);
    return;
  }

  // Submit answers (60% chance)
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
        loginDone = false;
        return;
      }

      check(submitRes, {
        "submit status 200": (r) => r.status === 200,
      });
      submitDuration.add(submitRes.timings.duration);

      sleep(1);
    });

    group("View Result", function () {
      const res = http.get(
        `${BASE_URL}/api/kompetensi/${PAKET_ID}/hasil`,
        { headers }
      );

      if (res.status === 401 || res.status === 403) {
        loginDone = false;
        return;
      }

      check(res, {
        "result status 200": (r) => r.status === 200,
      });
      resultDuration.add(res.timings.duration);
    });
  }

  sleep(1 + Math.random() * 2);
}

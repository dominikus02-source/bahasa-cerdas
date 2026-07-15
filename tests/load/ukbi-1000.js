// k6 load test — UKBI Simulation (1000 concurrent users, 12 min)
// Ramp-up: 0 → 1000 over 4 min, stay 5 min, ramp-down: 1000 → 0 over 3 min
//
// Usage:
//   k6 run tests/load/ukbi-1000.js \
//     --env EMAIL=murid@demo.com \
//     --env PASSWORD=murid123
//
// THRESHOLD WARNING: 1000 concurrent users is a STRESS TEST.
// Target: error rate < 2%, p95 < 10s.
// This test helps identify breaking points and capacity limits.

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

export const options = {
  stages: [
    { duration: "4m", target: 1000 },  // Ramp up 0 → 1000
    { duration: "5m", target: 1000 },  // Stay at 1000
    { duration: "3m", target: 0 },     // Ramp down
  ],
  thresholds: {
    errors: ["rate<0.02"],
    http_req_duration: ["p(95)<10000"],
    http_req_failed: ["rate<0.02"],
  },
};

let vuAuthCookie = "";
let vuPaketId = "";

export default function () {
  const headers = { "Content-Type": "application/json" };

  if (!vuAuthCookie) {
    group("Login", function () {
      const loginRes = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({ email: EMAIL, password: PASSWORD }),
        { headers }
      );

      const ok = check(loginRes, {
        "login status 200": (r) => r.status === 200,
      });
      errorRate.add(!ok);

      let cookie = "";
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
            cookie = `sb-auth-token=${body.session.access_token}`;
          }
        } catch {
          // ignore
        }
      }

      vuAuthCookie = cookie;
      loginDuration.add(loginRes.timings.duration);

      if (!vuAuthCookie) {
        console.error(`VU ${__VU} FAILED login`);
        return;
      }
    });

    // Stagger logins to avoid thundering herd on auth provider
    sleep(1 + Math.random() * 3);
  }

  if (!vuAuthCookie) return;

  const authHeaders = {
    Cookie: vuAuthCookie,
    "Content-Type": "application/json",
  };

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

  // Reduce full-simulation ratio at high concurrency to spread load
  const doFullSim = Math.random() < 0.5;

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
    // Answer subset of questions at high concurrency to reduce DB write load
    const subsetSize = Math.min(questions.length, 10);
    for (let i = 0; i < subsetSize; i++) {
      const q = questions[i];
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

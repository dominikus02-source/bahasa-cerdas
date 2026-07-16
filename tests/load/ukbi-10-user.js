// k6 load test — UKBI 10 concurrent users, each with own fresh session
// Usage:
//   k6 run tests/load/ukbi-10-user.js \
//     -e BASE_URL=http://localhost:3000 \
//     -e PASSWORD=Test123! \
//     -e PAKET_ID=local-ukbi-practice

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const PASSWORD = __ENV.PASSWORD || "Test123!";
const PAKET_ID = __ENV.PAKET_ID || "local-ukbi-practice";
const USER_COUNT = 10;

const errorRate = new Rate("errors");
const loginDuration = new Trend("login_duration");
const fetchQuestionsDuration = new Trend("fetch_questions_duration");
const submitDuration = new Trend("submit_duration");
const resultDuration = new Trend("result_duration");

export const options = {
  vus: USER_COUNT,
  iterations: USER_COUNT,
  thresholds: {
    errors: ["rate<0.01"],
    http_req_duration: ["p(95)<5000"],
    http_req_failed: ["rate<0.01"],
  },
};

function getMyEmail() {
  const idx = String(__VU).padStart(3, "0");
  return `loadtest_${idx}@example.com`;
}

function doLogin(email) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password: PASSWORD }),
    { headers: { "Content-Type": "application/json" } }
  );

  const ok = check(res, {
    "login status 200": (r) => r.status === 200,
    "login has session": (r) => {
      try {
        const body = JSON.parse(r.body);
        const d = body.data || body;
        return !!(d.session && d.session.access_token);
      } catch { return false; }
    },
  });
  errorRate.add(!ok);
  loginDuration.add(res.timings.duration);

  if (!ok) {
    console.error(`VU ${__VU} (${email}) login failed: HTTP ${res.status}`);
    return "";
  }

  // Extract cookie
  const cookieHeader = res.headers["Set-Cookie"] || res.headers["set-cookie"] || "";
  const match = cookieHeader.match(/(sb-[a-z0-9]+-auth-token[^;]*)/i);
  if (match) return match[1];

  // Fallback: extract token from body
  try {
    const body = JSON.parse(res.body);
    const d = body.data || body;
    return d.session?.access_token || "";
  } catch { return ""; }
}

function buildHeaders(cookie) {
  const h = { "Content-Type": "application/json" };
  if (cookie.startsWith("ey")) h["Authorization"] = `Bearer ${cookie}`;
  else h["Cookie"] = cookie;
  return h;
}

export default function () {
  const email = getMyEmail();

  // ── Login ──
  const authCookie = doLogin(email);
  if (!authCookie) return;
  const headers = buildHeaders(authCookie);
  sleep(1);

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
          return typeof res.benar === "number" && typeof res.salah === "number";
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

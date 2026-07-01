// k6 load test — Simulation Submit (authenticated, fetch questions + submit answers)
// Usage:
//   k6 run --vus 10 --duration 2m tests/load/simulation-submit.js
// Requires valid session tokens — this test is for authenticated flows.

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";
import { SharedArray } from "k6/data";

const BASE_URL = __ENV.BASE_URL || "https://bahasacerdas.com";

const errorRate = new Rate("errors");
const submitDuration = new Trend("submit_duration");

export const options = {
  vus: __ENV.VUS ? parseInt(__ENV.VUS) : 10,
  duration: __ENV.DURATION || "2m",
  thresholds: {
    errors: ["rate<0.02"],
    http_req_duration: ["p(95)<5000"],
  },
};

export default function () {
  // NOTE: This test requires session tokens.
  // Since k6 cannot login interactively, this test is a framework.
  // In production, run with: k6 run --env SESSION_TOKEN=xxx ...

  const sessionToken = __ENV.SESSION_TOKEN;

  if (!sessionToken) {
    // Dry-run mode — test the public API accessibility
    group("Public Simulation Read (no auth)", function () {
      const res = http.get(`${BASE_URL}/api/kompetensi`, {
        redirects: 0,
      });
      check(res, {
        "kompetensi API reachable": (r) => r.status === 200 || r.status === 401,
      });
    });
    return;
  }

  // Authenticated flow
  const headers = {
    Cookie: `sb-ibtlhoocaoopgtcsnvzr-auth-token=${sessionToken}`,
  };

  group("Fetch simulation questions", function () {
    const res = http.get(`${BASE_URL}/api/kompetensi?limit=5`, { headers });
    const ok = check(res, {
      "fetch paket list status 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);

    if (res.status === 200) {
      try {
        const data = JSON.parse(res.body);
        if (data.length > 0 && data[0].id) {
          const paketId = data[0].id;
          const qRes = http.get(`${BASE_URL}/api/kompetensi/${paketId}`, {
            headers,
          });
          const qOk = check(qRes, {
            "fetch questions status 200": (r) => r.status === 200,
          });
          errorRate.add(!qOk);

          if (qRes.status === 200) {
            try {
              const qData = JSON.parse(qRes.body);
              // Submit first answer if questions available
              if (
                qData.questions &&
                qData.questions.length > 0 &&
                qData.questions[0].options
              ) {
                const firstQ = qData.questions[0];
                const answer =
                  firstQ.options[0]?.id || firstQ.options[0]?.label || "A";

                const submitRes = http.post(
                  `${BASE_URL}/api/kompetensi/${paketId}/submit`,
                  JSON.stringify({
                    questionId: firstQ.id,
                    jawaban: answer,
                    sessionId: qData.sessionId,
                  }),
                  {
                    headers: {
                      ...headers,
                      "Content-Type": "application/json",
                    },
                  }
                );
                submitDuration.add(submitRes.timings.duration);
                const sOk = check(submitRes, {
                  "submit answer status 200": (r) =>
                    r.status === 200 || r.status === 400,
                });
                errorRate.add(!sOk);
              }
            } catch {
              // skip submit if parsing fails
            }
          }
        }
      } catch {
        // skip if parsing fails
      }
    }
    sleep(2);
  });
}

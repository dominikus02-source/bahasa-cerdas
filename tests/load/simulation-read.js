// k6 load test — Simulation Read (access simulation pages + fetch questions)
// Usage: k6 run --vus 30 --duration 3m tests/load/simulation-read.js

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://bahasacerdas.com";

const errorRate = new Rate("errors");
const simPageDuration = new Trend("sim_page_duration");
const simApiDuration = new Trend("sim_api_duration");

export const options = {
  vus: __ENV.VUS ? parseInt(__ENV.VUS) : 30,
  duration: __ENV.DURATION || "3m",
  thresholds: {
    errors: ["rate<0.02"],
    http_req_duration: ["p(95)<5000"],
  },
};

// Scenarios: mix of UKBI and TKA browsing
export default function () {
  const scenarios = [
    "/murid/simulasi/ukbi",
    "/murid/simulasi/tka",
    "/guru/simulasi/ukbi",
    "/guru/simulasi/tka",
  ];

  // Step 1: Visit a simulation landing page (no auth required for SSR page)
  group("Simulation Landing Pages", function () {
    for (const path of scenarios) {
      const res = http.get(`${BASE_URL}${path}`, {
        // These pages redirect to login if not authenticated — we just check redirect
        redirects: 0,
      });
      // Expect redirect (302/307) to login since we're not authenticated
      const ok = check(res, {
        [`${path} redirects or loads`]: (r) =>
          r.status === 200 || r.status === 307 || r.status === 302,
      });
      errorRate.add(!ok);
      simPageDuration.add(res.timings.duration);
      sleep(1);
    }
  });
}

// k6 load test — Authenticated Dashboard (murid + guru flows)
// Usage:
//   k6 run --vus 20 --duration 3m tests/load/dashboard-authenticated.js
// Requires session token: k6 run --env SESSION_TOKEN=xxx ...

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://bahasacerdas.com";

const errorRate = new Rate("errors");
const dashboardDuration = new Trend("dashboard_duration");

export const options = {
  vus: __ENV.VUS ? parseInt(__ENV.VUS) : 20,
  duration: __ENV.DURATION || "3m",
  thresholds: {
    errors: ["rate<0.02"],
    http_req_duration: ["p(95)<5000"],
  },
};

export default function () {
  const sessionToken = __ENV.SESSION_TOKEN;

  if (!sessionToken) {
    group("Dashboard Redirect Check (no auth)", function () {
      const endpoints = [
        "/murid/beranda",
        "/murid/simulasi/ukbi",
        "/guru/beranda",
        "/guru/simulasi/ukbi",
        "/arena/jalur-cerdas",
        "/murid/profil",
      ];
      for (const path of endpoints) {
        const res = http.get(`${BASE_URL}${path}`, { redirects: 0 });
        check(res, {
          [`${path} redirects to login`]: (r) =>
            r.status === 307 || r.status === 302,
        });
        sleep(0.5);
      }
    });
    return;
  }

  const headers = {
    Cookie: `sb-ibtlhoocaoopgtcsnvzr-auth-token=${sessionToken}`,
  };

  // Simulate murid dashboard flow
  group("Murid Dashboard", function () {
    const paths = [
      "/murid/beranda",
      "/murid/simulasi/ukbi",
      "/arena/jalur-cerdas",
      "/murid/dokumen-latihan",
      "/murid/bigt",
    ];

    for (const path of paths) {
      const res = http.get(`${BASE_URL}${path}`, { headers });
      const ok = check(res, {
        [`${path} status 200`]: (r) => r.status === 200,
      });
      errorRate.add(!ok);
      dashboardDuration.add(res.timings.duration);
      sleep(1);
    }
  });

  // Simulate API calls from dashboard
  group("Murid API", function () {
    const apis = [
      "/api/user/me",
      "/api/murid/penugasan",
      "/api/murid/tugas",
      "/api/murid/simulasi/history",
    ];

    for (const apiPath of apis) {
      const res = http.get(`${BASE_URL}${apiPath}`, { headers });
      check(res, {
        [`${apiPath} responds`]: (r) =>
          r.status === 200 || r.status === 404 || r.status === 401,
      });
      dashboardDuration.add(res.timings.duration);
      sleep(0.5);
    }
  });

  // Jalur Cerdas progression
  group("Jalur Cerdas", function () {
    const res = http.get(`${BASE_URL}/arena/jalur-cerdas`, { headers });
    if (res.status === 200) {
      // Fetch a level detail
      const levelRes = http.get(`${BASE_URL}/api/jalur-cerdas/levels`, {
        headers,
      });
      check(levelRes, {
        "jalur-cerdas levels API responds": (r) =>
          r.status === 200 || r.status === 404,
      });
    }
    sleep(2);
  });
}

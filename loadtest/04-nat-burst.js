// Reproduces the 20-July-2026 classroom incident WITHOUT needing a classroom.
//
// The failure was never about user count — it was about SOURCE IP count. A whole
// class shares one public IP through the school NAT, so every IP-keyed limit was
// divided among them. One machine running N virtual users is the same shape:
// N concurrent clients, one IP.
//
// READ-ONLY BY DESIGN. Only GETs on public pages, so it can safely point at a
// preview that talks to the production database: no writes, no AI credits, no
// auth attempts against Supabase.
//
// Run:
//   k6 run -e BASE_URL=https://<preview>.vercel.app \
//          -e VERCEL_BYPASS_TOKEN=$TOKEN -e VUS=20 loadtest/04-nat-burst.js
import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { CONFIG, bypassHeaders } from './lib.js';

const blocked = new Counter('rate_limited_429');
const serverErr = new Counter('server_errors_5xx');
const blockRate = new Rate('blocked_rate');

const VUS = parseInt(__ENV.VUS || '20', 10);

export const options = {
  scenarios: {
    // Everyone arrives at once, the way a class does when the teacher says "open it now".
    classroom: {
      executor: 'constant-vus',
      vus: VUS,
      duration: __ENV.DURATION || '60s',
    },
  },
  thresholds: {
    // The whole point: a class-sized burst from one IP must not be rate limited.
    blocked_rate: ['rate==0'],
    http_req_failed: ['rate<0.01'],
  },
};

// Public pages only — these still traverse middleware, which is where the
// rate limiter lives, so they exercise the exact code path that broke.
const PATHS = ['/', '/login', '/marketplace', '/artikel'];

export default function () {
  const path = PATHS[Math.floor(Math.random() * PATHS.length)];
  const res = http.get(`${CONFIG.baseUrl}${path}`, {
    headers: bypassHeaders(),
    redirects: 0,
    tags: { path },
  });

  if (res.status === 429) blocked.add(1);
  if (res.status >= 500) serverErr.add(1);
  blockRate.add(res.status === 429);

  check(res, {
    'tidak kena rate limit (429)': (r) => r.status !== 429,
    'tidak 5xx': (r) => r.status < 500,
  });
}

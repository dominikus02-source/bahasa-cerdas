// Load test: LOGIN (POST /api/auth/login)
// Finds the auth throughput ceiling. Login is protected by a rate limiter
// (10 req / 600s per IP) — run from multiple IPs or raise the limit on a
// staging target, otherwise you are measuring the rate limiter, not the DB.
//
//   k6 run -e BASE_URL=https://staging.bahasacerdas.site \
//          -e USERS='[{"email":"a@x.id","password":"p"}, ...]' 01-login.js
import { sleep } from 'k6';
import { CONFIG, login, pickUser } from './lib.js';

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500'], // 95% of logins under 1.5s
    checks: ['rate>0.95'], // <5% failures acceptable
  },
};

export default function () {
  login(pickUser());
  sleep(1);
}

export function setup() {
  console.log(`Target: ${CONFIG.baseUrl} | users in pool: ${CONFIG.users.length}`);
}

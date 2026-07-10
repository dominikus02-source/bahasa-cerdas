// Shared helpers for k6 load tests.
// Usage: import { CONFIG, login } from './lib.js'
import http from 'k6/http';
import { check } from 'k6';

// BASE_URL: target being tested. Default is local; point at a STAGING deploy for
// realistic numbers. NEVER run write-heavy scenarios (RPP/simulasi submit)
// against production with real user accounts.
export const CONFIG = {
  baseUrl: __ENV.BASE_URL || 'http://localhost:3000',
  // A pool of seeded test accounts. Provide as JSON via env or fall back to one.
  //   -e USERS='[{"email":"a@x.id","password":"..."},{"email":"b@x.id","password":"..."}]'
  users: JSON.parse(
    __ENV.USERS ||
      JSON.stringify([
        { email: __ENV.TEST_EMAIL || 'loadtest@bahasacerdas.test', password: __ENV.TEST_PASSWORD || 'changeme' },
      ])
  ),
};

// Logs in via POST /api/auth/login and returns { accessToken, cookies }.
// The login route returns { session } and also sets Supabase SSR cookies,
// so we keep the k6 cookie jar (per-VU) for subsequent authenticated calls.
export function login(user) {
  const res = http.post(
    `${CONFIG.baseUrl}/api/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } }
  );

  check(res, {
    'login 200': (r) => r.status === 200,
    'login has session': (r) => {
      try {
        return !!r.json('session.access_token');
      } catch (_e) {
        return false;
      }
    },
  });

  let accessToken = null;
  try {
    accessToken = res.json('session.access_token');
  } catch (_e) {
    /* ignore */
  }
  return { accessToken, status: res.status };
}

// Picks a user for this virtual user, spreading load across the seeded pool.
export function pickUser() {
  return CONFIG.users[(__VU - 1) % CONFIG.users.length];
}

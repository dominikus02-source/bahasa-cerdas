// Shared helpers for k6 load tests.
// Usage: import { CONFIG, login } from './lib.js'
import http from 'k6/http';
import { check } from 'k6';

// BASE_URL: target being tested. Default is local for quick local smoke runs;
// REALISTIC load tests point at a STAGING deploy. NEVER run write-heavy
// scenarios (RPP/simulasi submit) against production with real accounts.
// Script 04-ukbi-200-users.js OVERRIDES this default via its own hard gate
// (BASE_URL wajib diisi dari env; tidak ada default production).
function resolveBaseUrl() {
  return __ENV.BASE_URL || 'http://localhost:3000';
}

// Users: HARUS dari environment. Tidak ada akun/password tersimpan di source.
function resolveUsers() {
  const raw = __ENV.USERS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (_e) {
      /* fallthrough */
    }
  }
  if (__ENV.TEST_EMAIL && __ENV.TEST_PASSWORD) {
    return [{ email: __ENV.TEST_EMAIL, password: __ENV.TEST_PASSWORD }];
  }
  throw new Error(
    'USERS (JSON array) atau TEST_EMAIL+TEST_PASSWORD wajib diisi dari environment. Tidak ada default.'
  );
}

export const CONFIG = {
  baseUrl: resolveBaseUrl(),
  // users HARUS dari environment; kalkulasi LAZY (getter) agar module scope
  // tidak melempar error sebelum safety gate script 04 berjalan.
  get users() {
    return resolveUsers();
  },
  // Token "Protection Bypass for Automation" dari Vercel — dibutuhkan agar k6
  // bisa menembus SSO di Preview deployment. Isi lewat env, JANGAN di-hardcode:
  //   -e VERCEL_BYPASS_TOKEN=xxxxxxxx
  // Kosong = tidak dikirim (aman untuk target produksi/staging non-protected).
  bypassToken: __ENV.VERCEL_BYPASS_TOKEN || '',
};

// Header bypass proteksi Vercel. `x-vercel-set-bypass-cookie` membuat response
// pertama menaruh cookie bypass di cookie jar per-VU, jadi request berikutnya
// otomatis ikut lolos. Header lebih aman daripada query param (rahasia tak
// bocor ke URL/log).
export function bypassHeaders() {
  if (!CONFIG.bypassToken) return {};
  return {
    'x-vercel-protection-bypass': CONFIG.bypassToken,
    'x-vercel-set-bypass-cookie': 'samesitenone',
  };
}

// Logs in via POST /api/auth/login and returns { accessToken, cookies }.
// The login route returns { session } and also sets Supabase SSR cookies,
// so we keep the k6 cookie jar (per-VU) for subsequent authenticated calls.
export function login(user) {
  const res = http.post(
    `${CONFIG.baseUrl}/api/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: { 'Content-Type': 'application/json', ...bypassHeaders() }, tags: { name: 'login' } }
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

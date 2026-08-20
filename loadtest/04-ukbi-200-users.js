// UKBI 200-User Cohort — full simulation journey load test.
//
// Models the real-world event: 200 students (200 VUs) start a UKBI simulation
// from ONE school NAT IP within ~60s and submit within the same window.
//
// Journey per VU:
//   login → GET /api/kompetensi/{paketId} (load soal + snapshot) →
//   PATCH autosave → POST submit → GET hasil
//
// The point of this script is the COHORT semantics, not throughput:
//   - 200 distinct sessions behind one public IP must NOT trip each other's
//     rate limits (submit is session-scoped: 30/60s per student).
//   - The GET + snapshot build + batched write must not exhaust the pgbouncer
//     pool (batched $transaction, pooler connection_limit 5/instance).
//   - No answer-key leakage in any client-bound payload.
//
// Requirements (see loadtest/README.md):
//   - STAGING deployment + staging DB with 200 seeded disposable accounts
//     (scripts/seed-staging-loadtest.ts creates a cohort + "UKBI Load Test
//     Staging" paket; run it on the staging DB first).
//   - Wajib (dicek SAAT INIT — tanpa ini script MENOLAK jalan):
//       -e BASE_URL=<staging>                      (wajib; production → FAIL)
//       -e PAKET_ID=<lt-ukbi-200-...>              (prefix paket staging)
//       -e UKBI_LOADTEST_ENV=staging               (safety interlock)
//       -e UKBI_LOADTEST_APPROVED=true             (safety interlock)
//       -e USERS='[...200 users...]'
//   - NEVER point at production with real accounts.
//
// Run:
//   k6 run -e BASE_URL=$BASE_URL -e USERS="$USERS" -e PAKET_ID=$PAKET_ID \
//          -e UKBI_LOADTEST_ENV=staging -e UKBI_LOADTEST_APPROVED=true \
//          04-ukbi-200-users.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { enforceLoadtestGate } from './ukbi-200-gate.mjs';

// ── SAFETY GATE (init-time): throw sebelum satupun request dikirim.
//    Dipanggil SEBELUM lib.js — error gate lebih dulu daripada kredensial. ──
const gate = enforceLoadtestGate(__ENV);

import { CONFIG, login, pickUser, bypassHeaders } from './lib.js';

// Override baseUrl: CONFIG default localhost TIDAK boleh dipakai oleh 04.
CONFIG.baseUrl = gate.baseUrl;
const PAKET_ID = gate.paketId;

const submitMs = new Trend('ukbi_submit_ms', true);
const loadMs = new Trend('ukbi_load_ms', true);
const rateLimited = new Counter('ukbi_rate_limited');
const leakage = new Counter('ukbi_answer_leakage');
const submitOk = new Rate('ukbi_submit_ok');
const idempotentOk = new Rate('ukbi_idempotent_ok');

export const options = {
  // 200 VU, satu iterasi penuh tiap VU (200 sesi simulasi, meniru kohort).
  scenarios: {
    cohort: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },  // setengah kohort masuk
        { duration: '30s', target: 200 },  // sisanya — puncak kohort
        { duration: '60s', target: 200 },  // steady state (autosave + submit)
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    checks: ['rate>0.90'],
    ukbi_submit_ok: ['rate>0.95'],
    ukbi_submit_ms: ['p(95)<5000'],
  },
};

function detectLeakage(body) {
  // correctAnswer / answerKey / jawaban / rubric / sampleExpectedResponse
  // TIDAK boleh ada di payload yang diterima klien.
  const s = typeof body === 'string' ? body : JSON.stringify(body);
  return /correctAnswer|answerKey|"jawaban"|sampleExpectedResponse|"rubric"/.test(s);
}

// Deterministic answer per VU: pilih option id berdasarkan indeks stabil.
function buildAnswers(questions) {
  const answers = {};
  for (const section of questions || []) {
    const qs = section.questions || [];
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      // Soal konstruktif (menulis/berbicara) → options berupa objek, lewati
      // (diserahkan ke penilaian manual; submit tetap sah).
      if (!Array.isArray(q.options) || q.options.length === 0) continue;
      const pick = (__VU + i) % q.options.length;
      answers[q.id] = q.options[pick].id;
    }
  }
  return answers;
}

export default function () {
  const user = pickUser();

  // ── 1. Login (pakai akun seed per VU) ──
  const lg = login(user);
  if (lg.status !== 200) {
    console.warn(`VU ${__VU} login gagal (${lg.status}) — lanjut? TIDAK.`);
    return;
  }

  // ── 2. Muat soal (build snapshot; berat hanya pada attempt pertama) ──
  const t0 = Date.now();
  const loadRes = http.get(
    `${CONFIG.baseUrl}/api/kompetensi/${PAKET_ID}`,
    { headers: bypassHeaders(), tags: { name: 'kompetensi-get' } }
  );
  loadMs.add(Date.now() - t0);

  check(loadRes, {
    'GET paket 200': (r) => r.status === 200,
    'GET tidak bocor kunci': (r) => !detectLeakage(r.body),
  });
  if (loadRes.status !== 200) {
    console.warn(`VU ${__VU} GET paket ${loadRes.status} — berhenti lebih awal`);
    return;
  }
  if (detectLeakage(loadRes.body)) leakage.add(1);

  let questions = [];
  let sessionId = null;
  try {
    const body = loadRes.json();
    questions = body.questions || [];
    sessionId = body.session?.id || null;
  } catch (_e) {
    /* checks di atas sudah menangkapnya */
  }
  const answers = buildAnswers(questions);

  // ── 3. Autosave (PATCH) — 1× selama tes + 1× menjelang submit ──
  sleep(1);
  const autosaveRes = http.patch(
    `${CONFIG.baseUrl}/api/kompetensi/${PAKET_ID}`,
    JSON.stringify({ answers }),
    { headers: { 'Content-Type': 'application/json', ...bypassHeaders() }, tags: { name: 'kompetensi-patch' } }
  );
  check(autosaveRes, { 'PATCH autosave 200': (r) => r.status === 200 });

  // ── 4. Submit (puncak write: deleteMany + createMany + progres dalam satu
  //       $transaction batched; rate limit 30/60s per SESI) ──
  sleep(0.5);
  const t1 = Date.now();
  const submitRes = http.post(
    `${CONFIG.baseUrl}/api/kompetensi/${PAKET_ID}/submit`,
    JSON.stringify({ answers, timeSpent: 120 }),
    { headers: { 'Content-Type': 'application/json', ...bypassHeaders() }, tags: { name: 'kompetensi-submit' } }
  );
  submitMs.add(Date.now() - t1);

  if (submitRes.status === 429) {
    rateLimited.add(1);
    console.warn(`VU ${__VU} SUBMIT 429 — sesi kohort saling menabrak limit!`);
  }
  const submitBody = (() => {
    try {
      return submitRes.json();
    } catch (_e) {
      return {};
    }
  })();
  const scored = submitBody.result?.totalScore !== undefined;
  submitOk.add(scored);
  check(submitRes, {
    'submit 200': (r) => r.status === 200,
    'submit tidak 429 (session-scoped)': (r) => r.status !== 429,
    'submit punya skor': () => scored,
    'submit tidak bocor kunci': () => !detectLeakage(submitBody),
  });

  // ── 5. Idempotensi: double-POST (retry/dobel-klik) harus mengembalikan
  //       hasil yang sama (alreadyScored), bukan attempt baru / 500 ──
  const retryRes = http.post(
    `${CONFIG.baseUrl}/api/kompetensi/${PAKET_ID}/submit`,
    JSON.stringify({ answers, timeSpent: 120 }),
    { headers: { 'Content-Type': 'application/json', ...bypassHeaders() }, tags: { name: 'kompetensi-submit-retry' } }
  );
  let retryBody = {};
  try {
    retryBody = retryRes.json();
  } catch (_e) {
    /* ignore */
  }
  const alreadyScored = retryBody.alreadyScored === true || retryBody.attemptNumber === submitBody.attemptNumber;
  idempotentOk.add(alreadyScored);
  check(retryRes, {
    'retry submit 200 (bukan 500)': (r) => r.status === 200,
    'retry idempoten (alreadyScored / attempt sama)': () => alreadyScored,
  });

  // ── 6. Hasil (read-only, sekali) ──
  const hasilRes = http.get(
    `${CONFIG.baseUrl}/api/kompetensi/${PAKET_ID}/hasil`,
    { headers: bypassHeaders(), tags: { name: 'kompetensi-hasil' } }
  );
  check(hasilRes, {
    'GET hasil 200': (r) => r.status === 200,
    'hasil tidak bocor kunci': (r) => !detectLeakage(r.body),
  });

  sleep(0.5);
}

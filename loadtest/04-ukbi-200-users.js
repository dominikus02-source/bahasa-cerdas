// UKBI 200-User Cohort — pre-warmed token load test (Phase 2B execution).
//
// Mission: 200 students take a UKBI simulation concurrently from ONE school
// NAT IP. Sessions are PRE-WARMED (scripts/warmup-ukbi-tokens.ts) — k6 NEVER
// logs in. Each VU runs the journey EXACTLY ONCE (one attempt per student):
//   GET /api/kompetensi (list) → GET /api/kompetensi/{paketId} (load soal +
//   snapshot) → per-soal jawab + PATCH autosave setiap 3 soal → PATCH akhir →
//   POST submit → double-POST (idempotensi) → GET hasil.
//
// Ramp dijalankan PERSIS sesuai mandat founder:
//   0–2min 0→50 | 2–4 50→100 | 4–6 100→150 | 6–8 150→200 | 8–18 hold 200 |
//   18–20 200→0 (total 20 menit). VU yang sudah selesai (__ITER>0) IDLE (tetap
//   mounted, tidak hit ulang) sehingga hold tetap 200 VU "terpasang".
//
// Required env (dicek SAAT INIT — tanpa ini script MENOLAK jalan):
//   -e BASE_URL=<staging>                      (production → FAIL)
//   -e PAKET_ID=<lt-ukbi-200-...>              (prefix paket staging)
//   -e UKBI_LOADTEST_ENV=staging               (safety interlock)
//   -e UKBI_LOADTEST_APPROVED=true             (safety interlock)
//   -e UKBI_TOKENS_FILE=<abs path token file>  (dari warm-up)
//   -e USERS='[...200 users...]'               (opsional; dipakai bila token
//                                               file tidak diset → WARNAI)
//
// Run:
//   k6 run -e BASE_URL=$BASE_URL -e PAKET_ID=$PAKET_ID \
//          -e UKBI_LOADTEST_ENV=staging -e UKBI_LOADTEST_APPROVED=true \
//          -e UKBI_TOKENS_FILE=$TOKENS 04-ukbi-200-users.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { enforceLoadtestGate } from './ukbi-200-gate.mjs';

const gate = enforceLoadtestGate(__ENV);
const TOKENS_FILE = __ENV.UKBI_TOKENS_FILE || '';

let tokens = [];
if (TOKENS_FILE) {
  tokens = JSON.parse(open(TOKENS_FILE));
  if (!Array.isArray(tokens) || tokens.length < 200) {
    throw new Error(`UKBI_TOKENS_FILE: token file harus berisi ≥200 sesi (ada ${Array.isArray(tokens) ? tokens.length : 0})`);
  }
}

const PAKET_ID = gate.paketId;
const baseUrl = gate.baseUrl;

const submitMs = new Trend('ukbi_submit_ms', true);
const loadMs = new Trend('ukbi_load_ms', true);
const autosaveMs = new Trend('ukbi_autosave_ms', true);
const hasilMs = new Trend('ukbi_hasil_ms', true);

const rateLimited = new Counter('ukbi_rate_limited');
const http5xx = new Counter('ukbi_http_5xx');
const failedRequests = new Counter('ukbi_failed_requests');
const leakage = new Counter('ukbi_answer_leakage');
const submitFail = new Counter('ukbi_submit_failure');
const resultFail = new Counter('ukbi_result_failure');
const autosaveFail = new Counter('ukbi_autosave_failure');
const startFail = new Counter('ukbi_start_failure');

const submitOk = new Rate('ukbi_submit_ok');
const idempotentOk = new Rate('ukbi_idempotent_ok');
const journeyOk = new Rate('ukbi_journey_ok');

export const options = {
  scenarios: {
    cohort: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // 0–2: ramp 0→50
        { duration: '2m', target: 100 },  // 2–4: 50→100
        { duration: '2m', target: 150 },  // 4–6: 100→150
        { duration: '2m', target: 200 },  // 6–8: 150→200
        { duration: '10m', target: 200 }, // 8–18: hold 200
        { duration: '2m', target: 0 },    // 18–20: 200→0
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    checks: ['rate>0.90'],
    ukbi_submit_ok: ['rate>0.95'],
    ukbi_submit_ms: ['p(95)<5000'],
    ukbi_load_ms: ['p(95)<5000'],
    ukbi_autosave_ms: ['p(95)<5000'],
    ukbi_hasil_ms: ['p(95)<5000'],
  },
};

function detectLeakage(body) {
  const s = typeof body === 'string' ? body : JSON.stringify(body);
  return /correctAnswer|answerKey|"jawaban"|sampleExpectedResponse|"rubric"/.test(s);
}

// Deterministic answer per VU+soal: pilih option id berdasar indeks stabil.
function buildAnswers(questions) {
  const answers = {};
  for (const section of questions || []) {
    const qs = section.questions || [];
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      if (!Array.isArray(q.options) || q.options.length === 0) continue;
      const pick = (__VU + i) % q.options.length;
      answers[q.id] = q.options[pick].id;
    }
  }
  return answers;
}

function me() {
  // VU1 → token[0], VU2 → token[1], dst. (1:1 user map)
  const i = Math.max(0, Math.min(tokens.length - 1, __VU - 1));
  return tokens[i] || null;
}

function authHeaders(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra };
  const t = me();
  if (t && t.cookie) h['Cookie'] = t.cookie;
  return h;
}

export default function () {
  const token = me();
  if (!token) {
    console.warn(`VU ${__VU}: tidak ada token — SKIP (kohort < VU)`);
    startFail.add(1);
    sleep(60);
    return;
  }

  // ── 0. Kecuali iterasi pertama: IDLE (tetap mounted, tidak hit ulang) ──
  if (__ITER > 0) {
    sleep(30);
    return;
  }

  // ── 1. GET /api/kompetensi (list; ringan, "GET UKBI") ──
  const listRes = http.get(`${baseUrl}/api/kompetensi`, { headers: authHeaders(), tags: { name: 'kompetensi-list' } });
  if (listRes.status === 429) rateLimited.add(1);
  if (listRes.status >= 500) http5xx.add(1);
  if (!check(listRes, { 'GET list 200': (r) => r.status === 200 })) failedRequests.add(1);

  // ── 2. Muat soal (build snapshot; berat hanya pada attempt pertama) ──
  const t0 = Date.now();
  const loadRes = http.get(`${baseUrl}/api/kompetensi/${PAKET_ID}`, { headers: authHeaders(), tags: { name: 'kompetensi-get' } });
  loadMs.add(Date.now() - t0);

  if (loadRes.status === 429) rateLimited.add(1);
  if (loadRes.status >= 500) http5xx.add(1);

  check(loadRes, {
    'GET paket 200': (r) => r.status === 200,
    'GET tidak bocor kunci': (r) => !detectLeakage(r.body),
  });
  if (loadRes.status !== 200) {
    console.warn(`VU ${__VU} GET paket ${loadRes.status} — berhenti lebih awal`);
    startFail.add(1);
    failedRequests.add(1);
    sleep(30);
    return;
  }
  if (detectLeakage(loadRes.body)) leakage.add(1);

  let questions = [];
  let sessionId = null;
  try {
    const body = loadRes.json();
    // API membungkus payload: { success, data: { session, paket, questions } }
    questions = body?.data?.questions || body?.questions || [];
    sessionId = body?.data?.session?.id || body?.session?.id || null;
  } catch (_e) { /* checks di atas sudah menangkapnya */ }

  const answers = buildAnswers(questions);
  const qCount = questions.reduce((n, s) => n + (s.questions?.length || 0), 0);
  if (qCount === 0 || Object.keys(answers).length === 0) {
    console.warn(`VU ${__VU}: 0 soal/0 jawaban — berhenti (q=${qCount})`);
    startFail.add(1);
    sleep(30);
    return;
  }

  // ── 3. Kerjakan soal + autosave PATCH setiap 3 soal + PATCH akhir ──
  let answered = 0;
  const allQs = [];
  for (const section of questions || []) allQs.push(...(section.questions || []));
  for (let i = 0; i < allQs.length; i++) {
    sleep(0.5 + ((__VU + i) % 3) * 0.5); // think time 0.5–1.5s (deterministik)
    answered++;
    if (answered % 3 === 0 || i === allQs.length - 1) {
      const tA = Date.now();
      const patchRes = http.patch(
        `${baseUrl}/api/kompetensi/${PAKET_ID}`,
        JSON.stringify({ answers, flagged: [] }),
        { headers: authHeaders(), tags: { name: 'kompetensi-patch' } }
      );
      autosaveMs.add(Date.now() - tA);
      if (patchRes.status === 429) rateLimited.add(1);
      if (patchRes.status >= 500) http5xx.add(1);
      if (patchRes.status !== 200) {
        autosaveFail.add(1);
        failedRequests.add(1);
        console.warn(`VU ${__VU} PATCH autosave ${patchRes.status}`);
      }
      check(patchRes, { 'PATCH autosave 200': (r) => r.status === 200 });
    }
  }

  // ── 4. Submit (puncak write: $transaction; rate limit 30/60s per SESI) ──
  sleep(0.5);
  const t1 = Date.now();
  const submitRes = http.post(
    `${baseUrl}/api/kompetensi/${PAKET_ID}/submit`,
    JSON.stringify({ answers, timeSpent: 120 }),
    { headers: authHeaders(), tags: { name: 'kompetensi-submit' } }
  );
  submitMs.add(Date.now() - t1);

  if (submitRes.status === 429) {
    rateLimited.add(1);
    console.warn(`VU ${__VU} SUBMIT 429 — sesi kohort saling menabrak limit!`);
  }
  if (submitRes.status >= 500) http5xx.add(1);

  const submitBody = (() => { try { return submitRes.json(); } catch (_e) { return {}; } })();
  const scored = submitBody?.data?.result?.totalScore !== undefined || submitBody?.result?.totalScore !== undefined;
  submitOk.add(scored);
  check(submitRes, {
    'submit 200': (r) => r.status === 200,
    'submit tidak 429 (session-scoped)': (r) => r.status !== 429,
    'submit punya skor': () => scored,
    'submit tidak bocor kunci': () => !detectLeakage(submitBody),
  });
  if (submitRes.status !== 200) {
    submitFail.add(1);
    failedRequests.add(1);
  }
  if (!scored) submitFail.add(1);
  if (detectLeakage(submitBody)) leakage.add(1);

  // ── 5. Idempotensi: double-POST (retry/dobel-klik) → alreadyScored, bukan
  //       attempt baru / 500 ──
  const retryRes = http.post(
    `${baseUrl}/api/kompetensi/${PAKET_ID}/submit`,
    JSON.stringify({ answers, timeSpent: 120 }),
    { headers: authHeaders(), tags: { name: 'kompetensi-submit-retry' } }
  );
  if (retryRes.status === 429) rateLimited.add(1);
  if (retryRes.status >= 500) http5xx.add(1);
  let retryBody = {};
  try { retryBody = retryRes.json(); } catch (_e) { /* ignore */ }
  const firstAttempt = submitBody?.data?.attemptNumber ?? submitBody?.attemptNumber;
  const retryAttempt = retryBody?.data?.attemptNumber ?? retryBody?.attemptNumber;
  const alreadyScored = retryBody?.data?.alreadyScored === true || retryBody?.alreadyScored === true ||
    (retryAttempt !== undefined && retryAttempt === firstAttempt);
  idempotentOk.add(alreadyScored);
  check(retryRes, {
    'retry submit 200 (bukan 500)': (r) => r.status === 200,
    'retry idempoten (alreadyScored / attempt sama)': () => alreadyScored,
  });

  // ── 6. Hasil (read-only, sekali) ──
  const t2 = Date.now();
  const hasilRes = http.get(
    `${baseUrl}/api/kompetensi/${PAKET_ID}/hasil`,
    { headers: authHeaders(), tags: { name: 'kompetensi-hasil' } }
  );
  hasilMs.add(Date.now() - t2);
  if (hasilRes.status === 429) rateLimited.add(1);
  if (hasilRes.status >= 500) http5xx.add(1);
  check(hasilRes, {
    'GET hasil 200': (r) => r.status === 200,
    'hasil tidak bocor kunci': (r) => !detectLeakage(r.body),
  });
  if (hasilRes.status !== 200) {
    resultFail.add(1);
    failedRequests.add(1);
  }
  if (detectLeakage(hasilRes.body)) leakage.add(1);

  const done = submitRes.status === 200 && scored && hasilRes.status === 200;
  journeyOk.add(done);

  // Selesai → tetap mounted (idle) selama sisa hold; VU lain sedang kerja.
  sleep(25);
}

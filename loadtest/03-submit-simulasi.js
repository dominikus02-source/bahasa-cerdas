// Load test: SUBMIT SIMULASI (POST /api/kompetensi/:paketId/submit)
// A DB-write-heavy path: grades answers, upserts TestSession, writes
// ProgresKompetensi + TestAnswer rows. Good for stressing the connection pool.
//
// !!! THIS ENDPOINT WRITES DATA (creates attempt/session rows). Run ONLY against
// a STAGING database with disposable test accounts. Do NOT run against
// production — it will pollute real user progress. (Rate limit: 30 req/60s/IP.)
//
//   k6 run -e BASE_URL=https://staging.bahasacerdas.site \
//          -e PAKET_ID=<paketKompetensiId> \
//          -e ANSWERS='{"<questionId>":"A","<questionId2>":"B"}' \
//          -e USERS='[...]' 03-submit-simulasi.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { CONFIG, login, pickUser } from './lib.js';

const submitDuration = new Trend('simulasi_submit_ms', true);

const PAKET_ID = __ENV.PAKET_ID || '';
// answers is a map of questionId -> selected answer. Provide a realistic set via
// -e ANSWERS. Empty map still exercises the grading/write path (scores 0).
const ANSWERS = JSON.parse(__ENV.ANSWERS || '{}');

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 25 },
        { duration: '1m', target: 40 }, // push past the 30/min rate-limit to see 429 behavior
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    simulasi_submit_ms: ['p(95)<2500'],
    checks: ['rate>0.90'],
  },
};

export function setup() {
  if (!PAKET_ID) {
    throw new Error('Set -e PAKET_ID=<paketKompetensiId> to a STAGING paket.');
  }
  console.log(`Target: ${CONFIG.baseUrl} | paket: ${PAKET_ID}`);
}

export default function () {
  const user = pickUser();
  const { accessToken } = login(user);
  if (!accessToken) {
    sleep(1);
    return;
  }

  const res = http.post(
    `${CONFIG.baseUrl}/api/kompetensi/${PAKET_ID}/submit`,
    JSON.stringify({ answers: ANSWERS, timeSpent: Math.floor(Math.random() * 1800) + 300 }),
    {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      tags: { name: 'submit-simulasi' },
    }
  );

  submitDuration.add(res.timings.duration);
  check(res, {
    'submit 2xx or 429': (r) => (r.status >= 200 && r.status < 300) || r.status === 429,
    'submit not 5xx': (r) => r.status < 500,
  });

  sleep(1);
}

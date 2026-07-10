// Load test: GENERATE RPP (POST /api/ai/agents/run, agentId=rpp)
// This is the heaviest endpoint: it calls an upstream LLM synchronously
// (maxDuration=300s). The goal is to find how many CONCURRENT generations the
// system sustains before queueing/timeouts/upstream-429s dominate.
//
// WARNING: each iteration consumes real AI credits/quota and hits the LLM
// provider. Run against staging with dedicated test accounts and low VU counts.
//
//   k6 run -e BASE_URL=https://staging.bahasacerdas.site \
//          -e USERS='[...]' 02-generate-rpp.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { CONFIG, login, pickUser } from './lib.js';

const genDuration = new Trend('rpp_generation_ms', true);
const quotaExceeded = new Rate('rpp_quota_exceeded');
const upstreamFail = new Rate('rpp_upstream_fail');

export const options = {
  scenarios: {
    concurrent_generations: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 3 },
        { duration: '1m', target: 8 },
        { duration: '1m', target: 15 }, // find the ceiling here
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    // LLM calls are slow; 45s p95 is a generous ceiling for "still working".
    rpp_generation_ms: ['p(95)<45000'],
    rpp_upstream_fail: ['rate<0.10'],
  },
};

const PAYLOAD = {
  agentId: 'rpp',
  input: {
    curriculum: 'MERDEKA',
    kelas: '10',
    semester: '1 (Ganjil)',
    topik: 'Teks Negosiasi',
    kd: '3.1 Menganalisis struktur dan kebahasaan teks negosiasi',
    alokasi: '2x40 menit',
    metode: 'Diskusi, ceramah, penugasan',
  },
  saveToHistory: false,
};

export default function () {
  const user = pickUser();
  const { accessToken } = login(user);
  if (!accessToken) {
    sleep(1);
    return;
  }

  const res = http.post(`${CONFIG.baseUrl}/api/ai/agents/run`, JSON.stringify(PAYLOAD), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`, // cookie jar also carries the SSR session
    },
    tags: { name: 'generate-rpp' },
    timeout: '120s',
  });

  genDuration.add(res.timings.duration);
  quotaExceeded.add(res.status === 429);
  upstreamFail.add(res.status >= 500);

  check(res, {
    'rpp 2xx or 429(quota)': (r) => (r.status >= 200 && r.status < 300) || r.status === 429,
    'rpp not 5xx': (r) => r.status < 500,
  });

  sleep(2);
}

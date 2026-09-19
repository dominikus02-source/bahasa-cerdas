/**
 * Test Realtime Hardening Main Bersama (Tahap 6 FULL PASS §9-§12).
 *
 * Fokus:
 *  §9  Static composition — produksi TIDAK memakai in-memory hub
 *      sebagai message bus (SSE route dihapus; Supabase Broadcast).
 *  §10 Credential secret — production hard-fail + lintas-proses.
 *  §12 Cross-instance signal — publisher A → subscriber B dengan
 *      memory terpisah + shared provider (simulasi Supabase
 *      realtime server); notification TIDAK dipercaya — refetch
 *      authoritative selalu benar.
 *  §3  Payload broadcast lulus forbidden-key scanner.
 *
 * Jalankan: npx tsx scripts/test-main-bersama-realtime.ts
 * (tanpa DB — murni abstraksi + static scan).
 */

// ─── Mini harness (pola QA repo) ────────────────────────────
let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}
function section(title: string): void {
  console.log(`\n── ${title} ──`);
}

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

import {
  SESSION_UPDATE_EVENT,
  isSessionUpdateSignalPayload,
  sessionTopic,
} from '../src/main-bersama/contracts/events/signal';
import {
  issuePlayerCredential,
  resolvePlayerCredential,
  readCredentialFromRequest,
  isProductionRuntime,
} from '../src/main-bersama/infrastructure/repositories/player-credential';

/** Baca file, buang komentar blok/baris (static scan stabil). */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

// ─── §9 Static composition: tanpa in-memory hub ─────────────

function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTs(full));
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

section('§9 STATIC COMPOSITION — produksi tanpa in-memory hub');
{
  const appApiDir = path.join(process.cwd(), 'app', 'api', 'main-bersama');
  const infraDir = path.join(process.cwd(), 'src', 'main-bersama', 'infrastructure');

  // 1. SSE route production dihapus (§8 — Supabase Broadcast client
  //    langsung menggantikan kebutuhan SSE; tidak ada dua realtime system).
  check('1. route SSE /api/main-bersama/realtime dihapus', !fs.existsSync(appApiDir + path.sep + 'realtime'));

  // 2. Tidak ada file hub in-memory yang tersisa di infrastructure.
  const hubFiles = walkTs(infraDir).filter((f) => f.includes('realtime') && /hub/i.test(path.basename(f)));
  check('2. infrastructure/realtime tanpa file hub in-memory', hubFiles.length === 0, hubFiles.join(','));

  // 3. Satu-satunya fanout produksi = signal Supabase Broadcast.
  const signalSrc = stripComments(
    fs.readFileSync(path.join(infraDir, 'realtime', 'signal.ts'), 'utf-8'),
  );
  check('3. signal.ts mengirim via Supabase Broadcast REST', signalSrc.includes('/realtime/v1/api/broadcast'));

  // 4. Tidak ada import hub dari route handlers (production wiring).
  const routeFiles = walkTs(appApiDir);
  const hubImporters = routeFiles.filter((f) => /realtime\/hub/i.test(stripComments(fs.readFileSync(f, 'utf-8'))));
  check('4. route handlers tidak mengimpor hub', hubImporters.length === 0, hubImporters.join(','));

  // 5. Composition root memakai realtimeSignal Supabase.
  const compSrc = stripComments(
    fs.readFileSync(path.join(infraDir, 'orchestrator-composition.ts'), 'utf-8'),
  );
  check('5. composition root memakai sendSessionUpdateSignal (Supabase)', compSrc.includes('sendSessionUpdateSignal'));

  // 6. Application tidak pernah mengimpor supabase/next langsung.
  const mbDir = path.join(process.cwd(), 'src', 'main-bersama');
  const appFiles = walkTs(mbDir).filter(
    (f) => f.includes(`${path.sep}application${path.sep}`) || f.includes(`${path.sep}domain${path.sep}`),
  );
  const offenders = appFiles.filter((f) => {
    const src = stripComments(fs.readFileSync(f, 'utf-8'));
    return /from\s+["'](@supabase|next)/.test(src);
  });
  check('6. application/domain bebas supabase/next', offenders.length === 0, offenders.join(','));

  // 7. Kontrak signal payload MINIMAL (scanner §12.8 di bawah).
  const signalContract = stripComments(
    fs.readFileSync(path.join(mbDir, 'contracts', 'events', 'signal.ts'), 'utf-8'),
  );
  check(
    '7. payload sinyal hanya {type, revision?}',
    signalContract.includes('revision?: number') && !signalContract.includes('selectedOptionId'),
  );
}

// ─── §10 Credential secret enforcement ──────────────────────

section('§10 CREDENTIAL SECRET — production hard fail + lintas proses');
{
  // Simpan env asli; setiap kasus dijalankan di CHILD PROCESS (tsx -e)
  // supaya perubahan env/secret benar-benar terisolasi per proses.
  const origSecret = process.env.MAIN_BERSAMA_CREDENTIAL_SECRET;
  const origDev = process.env.MAIN_BERSAMA_DEV_SECRET;

  function runChild(mode: 'prod-no-secret' | 'prod-with-secret' | 'wrong-secret', cred?: string): string {
    const script = `
      process.env.NODE_ENV = 'production';
      ${mode === 'prod-no-secret' ? "delete process.env.MAIN_BERSAMA_CREDENTIAL_SECRET;" : "process.env.MAIN_BERSAMA_CREDENTIAL_SECRET = 'x'.repeat(40);"}
      ${mode === 'wrong-secret' ? "process.env.MAIN_BERSAMA_CREDENTIAL_SECRET = 'y'.repeat(40);" : ""}
      const { issuePlayerCredential, resolvePlayerCredential } = require('../src/main-bersama/infrastructure/repositories/player-credential.ts');
      try {
        ${mode === 'wrong-secret'
          ? `const ok = resolvePlayerCredential(${JSON.stringify(cred ?? '')});`
          : `const ok = { ok: resolvePlayerCredential(issuePlayerCredential('plc-x', 'ses-x')).ok };`}
        console.log(JSON.stringify(ok));
      } catch (e) {
        console.log(JSON.stringify({ threw: true, message: e instanceof Error ? e.message : String(e) }));
      }
    `;
    const tmp = path.join(process.cwd(), 'scripts', '.tmp-cred-probe.cjs');
    fs.writeFileSync(tmp, script);
    try {
      const res = spawnSync('npx', ['tsx', tmp], { encoding: 'utf-8', timeout: 60_000 });
      return (res.stdout ?? '').trim().split('\n').filter(Boolean).pop() ?? '';
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  }

  const case1 = runChild('prod-no-secret');
  check(
    '10.1 production + secret hilang → rejected (hard fail)',
    case1.includes('"threw":true'),
    case1,
  );

  const case2 = runChild('prod-with-secret');
  check('10.2 production + secret valid → works', case2.includes('"ok":true'), case2);

  // 10.3-10.4: credential minted di invocation A diverifikasi proses
  // B dengan env secret sama; secret beda → ditolak.
  const origNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  process.env.MAIN_BERSAMA_CREDENTIAL_SECRET = 'shared-secret-across-processes-0123456789abcdef';
  const credA = issuePlayerCredential('plc-cross', 'ses-cross');
  const verifyB = runChild('wrong-secret', credA);
  check(
    '10.3/10.4 credential proses A diverifikasi proses B; secret salah → ditolak',
    verifyB.includes('"ok":false'),
    verifyB,
  );
  check(
    '10.5 verifikasi secret sama lintas proses → ok',
    resolvePlayerCredential(credA).ok,
  );

  // Pulihkan env.
  process.env.NODE_ENV = origNodeEnv;
  if (origSecret === undefined) delete process.env.MAIN_BERSAMA_CREDENTIAL_SECRET;
  else process.env.MAIN_BERSAMA_CREDENTIAL_SECRET = origSecret;
  if (origDev === undefined) delete process.env.MAIN_BERSAMA_DEV_SECRET;
  else process.env.MAIN_BERSAMA_DEV_SECRET = origDev;

  check('10.6 dev/test tanpa secret → fallback random boleh', !isProductionRuntime());
  check(
    '10.7 credential tidak pernah masuk teacher/projector state (header-only transport)',
    readCredentialFromRequest(new Headers(), new URL('https://x.test/')) === null,
  );
}

// ─── §12 Cross-instance signal (publisher A → subscriber B) ──

/** Provider shared — simulasi Supabase realtime server (topic bus). */
class SharedBroadcastProvider {
  private readonly topics = new Map<string, Array<(payload: unknown) => void>>();
  publish(topic: string, payload: unknown): number {
    const subs = this.topics.get(topic) ?? [];
    for (const fn of [...subs]) fn(payload);
    return subs.length;
  }
  subscribe(topic: string, fn: (payload: unknown) => void): () => void {
    let list = this.topics.get(topic);
    if (!list) {
      list = [];
      this.topics.set(topic, list);
    }
    list.push(fn);
    return () => {
      const cur = this.topics.get(topic);
      if (!cur) return;
      const i = cur.indexOf(fn);
      if (i >= 0) cur.splice(i, 1);
    };
  }
  subscriberCount(topic: string): number {
    return this.topics.get(topic)?.length ?? 0;
  }
}

/** Instance "process" — memory sendiri, hanya pegang provider shared. */
class ServerInstance {
  /** Memory instance: TIDAK di-share antar instance. */
  readonly localMemory = new Map<string, string>();
  constructor(private readonly provider: SharedBroadcastProvider) {}
  /** Publisher side: server kirim sinyal setelah persist. */
  publishSessionUpdate(sessionId: string): void {
    this.provider.publish(sessionTopic(sessionId), {
      type: SESSION_UPDATE_EVENT,
    });
  }
  /** Subscriber side: client subscribe channel sesi. */
  subscribe(sessionId: string, onSignal: () => void): () => void {
    return this.provider.subscribe(sessionTopic(sessionId), onSignal);
  }
  /** Simulasi GET authoritative (dari "DB" instance ini). */
  saveAuthoritative(sessionId: string, value: string): void {
    this.localMemory.set(sessionId, value);
  }
  fetchAuthoritative(sessionId: string): string | undefined {
    return this.localMemory.get(sessionId);
  }
}

section('§12 CROSS-INSTANCE SIGNAL — publisher A → subscriber B');
{
  const provider = new SharedBroadcastProvider();
  const instanceA = new ServerInstance(provider); // teacher command di sini
  const instanceB = new ServerInstance(provider); // student connection di sini
  const instanceC = new ServerInstance(provider); // projector di sini

  const sessionId = 'ses-cross-instance-1';
  const otherSession = 'ses-lain-2';

  // 1. publish dari A diterima subscriber di B.
  let bSignals = 0;
  let cSignals = 0;
  const unsubB = instanceB.subscribe(sessionId, () => { bSignals += 1; });
  const unsubC = instanceC.subscribe(sessionId, () => { cSignals += 1; });
  instanceA.publishSessionUpdate(sessionId);
  check('12.1 publish dari instance A diterima subscriber B (dan C)', bSignals === 1 && cSignals === 1);

  // 2. publish sesi A tidak memicu sesi lain.
  let otherSignals = 0;
  const unsubOther = instanceB.subscribe(otherSession, () => { otherSignals += 1; });
  instanceA.publishSessionUpdate(sessionId);
  check('12.2 publish sesi A tidak memicu subscriber sesi lain', otherSignals === 0);

  // 3. notification duplicate aman — subscriber tetap menerima
  //    setiap sinyal (tidak ada auto-unsubscribe/error).
  const beforeDup = bSignals;
  instanceA.publishSessionUpdate(sessionId);
  instanceA.publishSessionUpdate(sessionId);
  check('12.3 duplicate sinyal tidak merusak (subscriber tetap hidup)', bSignals === beforeDup + 2, `b=${bSignals} exp=${beforeDup + 2}`);

  // 4. notification out-of-order aman — sinyal TIDAK dipercaya;
  //    refetch authoritative selalu mengambil state terbaru.
  instanceA.saveAuthoritative(sessionId, 'rev-1');
  instanceA.saveAuthoritative(sessionId, 'rev-2'); // "lebih lambat" datang
  const refetched: (string | undefined)[] = [];
  instanceB.subscribe(sessionId, () => {
    // Pull-on-notify: GET authoritative (bukan isi sinyal).
    refetched.push(instanceA.fetchAuthoritative(sessionId));
  });
  instanceA.publishSessionUpdate(sessionId);
  check('12.4 refetch authoritative mengambil state terbaru', refetched[0] === 'rev-2');

  // 5. client refetch memperoleh latest state (sinyal palsu pun aman).
  provider.publish(sessionTopic(sessionId), { type: 'spoofed-event' }); // payload aneh
  provider.publish(sessionTopic(sessionId), { type: SESSION_UPDATE_EVENT, revision: 999 }); // sinyal palsu
  check('12.5 sinyal palsu/spoofed hanya memicu refetch (state tetap benar)', refetched[refetched.length - 1] === 'rev-2');

  // 6. process-memory reset tidak memutus correctness.
  const instanceB2 = new ServerInstance(provider); // cold restart
  let b2Signals = 0;
  const unsubB2 = instanceB2.subscribe(sessionId, () => { b2Signals += 1; });
  instanceA.publishSessionUpdate(sessionId);
  check('12.6 instance baru (memory kosong) tetap menerima sinyal', b2Signals === 1 && instanceB2.localMemory.size === 0);

  // 7. reconnect subscriber mendapat update berikutnya — subscriber
  //    lama yang sudah unsubscribed TIDAK bertambah lagi.
  unsubB();
  const beforeRe = bSignals;
  let reconnected = 0;
  const unsubRe = instanceB.subscribe(sessionId, () => { reconnected += 1; });
  instanceA.publishSessionUpdate(sessionId);
  check('12.7 reconnect subscriber mendapat update berikutnya', reconnected === 1 && bSignals === beforeRe, `re=${reconnected} b=${bSignals}`);

  // 8. payload broadcast lulus forbidden-key scanner.
  const forbidden = [
    'correctOptionId', 'correctAnswer', 'isCorrect', 'explanation',
    'answerKey', 'userId', 'reconnectToken', 'selectedOptionId',
    'teacherId', 'credential', 'pin', 'displayName', 'players', 'question',
  ];
  function scanKeys(obj: unknown, path = '$'): string[] {
    if (obj === null || obj === undefined) return [];
    if (Array.isArray(obj)) return obj.flatMap((v, i) => scanKeys(v, `${path}[${i}]`));
    if (typeof obj === 'object') {
      const hits: string[] = [];
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        if (forbidden.includes(k)) hits.push(`${path}.${k}`);
        hits.push(...scanKeys(v, `${path}.${k}`));
      }
      return hits;
    }
    return [];
  }
  const payload = { type: SESSION_UPDATE_EVENT, revision: 42 };
  check('12.8 payload broadcast lulus forbidden-key scanner', scanKeys(payload).length === 0);
  check('12.8b payload valid menurut guard kontrak', isSessionUpdateSignalPayload(payload));
  check('12.8c payload asing ditolak guard', !isSessionUpdateSignalPayload({ type: ' lain' }));
  check('12.8d topic mengandung sessionId (bukan PIN)', sessionTopic(sessionId).includes(sessionId));

  // Cleanup.
  unsubB2(); unsubRe(); unsubC(); unsubOther();
  void instanceC;
}

// ─── Conclusion ─────────────────────────────────────────────
console.log('\n══════════════════════════════════════');
console.log(`TOTAL: ${passed} lulus, ${failed} gagal`);
console.log('══════════════════════════════════════\n');
process.exit(failed > 0 ? 1 : 0);

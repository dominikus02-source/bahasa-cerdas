/**
 * Test Mutation Safety Main Bersama — Tahap 8A.4 final hardening (§10).
 *
 * Pola QA repo: tsx standalone, TANPA DB, TANPA server. Guard-nya murni,
 * jadi seluruh matriks keputusan dapat dibuktikan deterministik.
 * Jalankan: npx tsx scripts/test-main-bersama-mutation-guard.ts
 *
 * Yang diuji:
 *   A. dev lokal + flag absen                → mutasi DIBLOKIR
 *   B. dev lokal + flag true                 → mutasi boleh
 *   C. Vercel Preview + flag absen           → DIBLOKIR
 *   D. Vercel Preview + flag true            → boleh
 *   E. Vercel Production                     → boleh (tanpa flag)
 *   F. read-only (GET state/health/proyektor, kompatibilitas) TIDAK dijaga
 *   G. wiring: ketiga route mutasi memakai helper tunggal
 *   H. respons 503 + pesan Indonesia, tanpa bocoran env/DB
 */

import fs from 'fs';
import path from 'path';
import {
  MUTATIONS_ALLOW_FLAG,
  MUTATIONS_DISABLED_CODE,
  MUTATIONS_DISABLED_MESSAGE,
  evaluateMainBersamaMutationPolicy,
} from '../src/main-bersama/presentation/mutation-guard';
import { mapHttpError } from '../src/main-bersama/presentation/http-errors';

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

const read = (p: string): string =>
  fs.readFileSync(path.join(process.cwd(), p), 'utf8');

const TEACHER_COMMANDS = 'app/api/main-bersama/teacher/commands/route.ts';
const STUDENT_JOIN = 'app/api/main-bersama/student/join/route.ts';
const STUDENT_ANSWERS = 'app/api/main-bersama/student/answers/route.ts';
const READ_ONLY = [
  'app/api/main-bersama/teacher/state/route.ts',
  'app/api/main-bersama/student/state/route.ts',
  'app/api/main-bersama/projector/state/route.ts',
  'app/api/main-bersama/health/route.ts',
  'app/api/main-bersama/teacher/package-compatibility/route.ts',
];
const GUARD_HELPER = 'lib/main-bersama/mutation-guard.ts';
const POLICY = 'src/main-bersama/presentation/mutation-guard.ts';

/** Helper: nilai env → keputusan `allowed`. */
function allowed(env: {
  nodeEnv?: string;
  vercelEnv?: string;
  allowMutations?: string;
}): boolean {
  return evaluateMainBersamaMutationPolicy(env).allowed;
}

function main(): void {
  console.log('\n=== MAIN BERSAMA — MUTATION SAFETY (final hardening) ===\n');

  // ── A: dev lokal, tanpa flag ────────────────────────────────
  check(
    'A. NODE_ENV=development, VERCEL_ENV unset, flag unset → DIBLOKIR',
    !allowed({ nodeEnv: 'development' }),
  );
  check(
    'A2. NODE_ENV unset sama sekali (mis. npm run dev polos) → DIBLOKIR',
    !allowed({}),
    'default harus menolak, bukan mengizinkan',
  );

  // ── B: dev lokal + flag ─────────────────────────────────────
  const devFlag = evaluateMainBersamaMutationPolicy({
    nodeEnv: 'development',
    allowMutations: 'true',
  });
  check(
    'B. NODE_ENV=development, flag=true → boleh (sumber: explicit-flag)',
    devFlag.allowed && devFlag.source === 'explicit-flag',
  );

  // ── C: Vercel Preview + flag absen ──────────────────────────
  check(
    'C. VERCEL_ENV=preview, flag unset → DIBLOKIR (DATABASE_URL saja tidak cukup)',
    !allowed({ nodeEnv: 'production', vercelEnv: 'preview' }),
  );
  check(
    'C2. VERCEL_ENV=development → DIBLOKIR tanpa flag',
    !allowed({ vercelEnv: 'development' }),
  );

  // ── D: Vercel Preview + flag ────────────────────────────────
  const previewFlag = evaluateMainBersamaMutationPolicy({
    vercelEnv: 'preview',
    allowMutations: 'true',
  });
  check(
    'D. VERCEL_ENV=preview, flag=true → boleh (sumber: explicit-flag)',
    previewFlag.allowed && previewFlag.source === 'explicit-flag',
  );

  // ── E: Vercel Production ────────────────────────────────────
  const prod = evaluateMainBersamaMutationPolicy({
    vercelEnv: 'production',
    nodeEnv: 'production',
  });
  check(
    'E. VERCEL_ENV=production, TANPA flag → boleh (sumber: vercel-production)',
    prod.allowed && prod.source === 'vercel-production',
    'workstation flag tidak boleh diperlukan untuk production Vercel',
  );
  check(
    'E2. VERCEL_ENV=production + flag=false → tetap boleh',
    allowed({ vercelEnv: 'production', allowMutations: 'false' }),
  );
  check(
    'E3. local production build (NODE_ENV=production, VERCEL_ENV unset) → DIBLOKIR',
    !allowed({ nodeEnv: 'production' }),
    'NODE_ENV=production bukan bukti production Vercel',
  );

  // ── Test environment existing ───────────────────────────────
  const test = evaluateMainBersamaMutationPolicy({ nodeEnv: 'test' });
  check(
    "B2. NODE_ENV=test → boleh (sumber: test-environment)",
    test.allowed && test.source === 'test-environment',
  );

  // ── Bentuk nilai flag (tidak boleh truthy-string asal) ──────
  check(
    "flag 'TRUE' / '1' / 'yes' + spasi → dianggap ON",
    allowed({ nodeEnv: 'development', allowMutations: ' TRUE ' }) &&
      allowed({ nodeEnv: 'development', allowMutations: '1' }) &&
      allowed({ nodeEnv: 'development', allowMutations: 'yes' }),
  );
  check(
    "flag 'false' / '0' / '' / 'nope' → tetap DIBLOKIR",
    !allowed({ nodeEnv: 'development', allowMutations: 'false' }) &&
      !allowed({ nodeEnv: 'development', allowMutations: '0' }) &&
      !allowed({ nodeEnv: 'development', allowMutations: '' }) &&
      !allowed({ nodeEnv: 'development', allowMutations: 'nope' }),
  );
  check(
    "VERCEL_ENV 'production ' (spasi) tidak dianggap production → DIBLOKIR",
    !allowed({ vercelEnv: 'production ' }),
    'perbandingan ketat, bukan includes/trim',
  );

  // ── H: respons 503 + copy ───────────────────────────────────
  const mapped = mapHttpError(MUTATIONS_DISABLED_CODE);
  check(
    `H. ${MUTATIONS_DISABLED_CODE} → HTTP 503 (bukan 500)`,
    mapped.status === 503,
    `dapat ${mapped.status}`,
  );
  check(
    'H2. pesan user-facing Bahasa Indonesia tepat',
    mapped.body.message === MUTATIONS_DISABLED_MESSAGE,
    mapped.body.message,
  );
  check(
    'H3. pesan tidak membocorkan env/DB/flag',
    !/DATABASE_URL|MAIN_BERSAMA_ALLOW|VERCEL_ENV|postgres|prisma|P2021/i.test(
      mapped.body.message,
    ),
  );

  // ── F: read-only tidak dijaga ───────────────────────────────
  const guardedSnippets = READ_ONLY.map((p) => ({ p, src: read(p) }));
  check(
    'F. route read-only (state guru/siswa, proyektor, health) TIDAK memanggil guard',
    guardedSnippets.every(({ src }) => !src.includes('mainBersamaMutationBlocked')),
  );
  const compat = read('app/api/main-bersama/teacher/package-compatibility/route.ts');
  check(
    'F2. evaluasi kompatibilitas paket tetap boleh (read-only, POST bukan mutasi)',
    !compat.includes('mainBersamaMutationBlocked'),
  );

  // ── G: wiring tiga route mutasi ─────────────────────────────
  const commands = read(TEACHER_COMMANDS);
  const join = read(STUDENT_JOIN);
  const answers = read(STUDENT_ANSWERS);
  check(
    'G. teacher/commands memanggil guard (semua aksi = mutasi)',
    commands.includes("mainBersamaMutationBlocked('teacher/commands')"),
  );
  check(
    'G2. student/join memanggil guard',
    join.includes("mainBersamaMutationBlocked('student/join')"),
  );
  check(
    'G3. student/answers memanggil guard',
    answers.includes("mainBersamaMutationBlocked('student/answers')"),
  );
  check(
    'G4. guard dijalankan SEBELUM body/DB disentuh (student/join)',
    join.indexOf('mainBersamaMutationBlocked(') < join.indexOf('await req.json()'),
  );
  check(
    'G5. guard dijalankan PALING AWAL di teacher/commands (sebelum auth/body/DB)',
    commands.indexOf('mainBersamaMutationBlocked(') <
      commands.indexOf('await resolveVerifiedTeacherActor()') &&
      commands.indexOf('mainBersamaMutationBlocked(') <
        commands.indexOf('await req.json()'),
    'lingkungan yang diblokir tidak boleh menyentuh Supabase/Prisma sama sekali',
  );

  // ── Helper tunggal, bukan copy-paste ────────────────────────
  const helper = read(GUARD_HELPER);
  check(
    'I. helper tunggal membungkus keputusan framework-agnostic',
    helper.includes('currentMutationPolicy()') &&
      helper.includes('mapHttpError(MUTATIONS_DISABLED_CODE)') &&
      helper.includes('NextResponse.json'),
  );
  check(
    'I2. keputusan env TIDAK diulang di route (hanya lewat helper)',
    [commands, join, answers].every(
      (src) => !/process\.env\.(VERCEL_ENV|NODE_ENV|MAIN_BERSAMA_ALLOW_MUTATIONS)/.test(src),
    ),
  );
  const policySrc = read(POLICY);
  check(
    'I3. policy MURNI — tanpa import next/react/Prisma (boundary §24)',
    !/from '(next|react)|@prisma\/client/.test(policySrc),
  );
  check(
    'I4. nama flag env konsisten antara policy dan helper',
    policySrc.includes("MUTATIONS_ALLOW_FLAG = 'MAIN_BERSAMA_ALLOW_MUTATIONS'") &&
    (MUTATIONS_ALLOW_FLAG as string) === 'MAIN_BERSAMA_ALLOW_MUTATIONS',
  );

  // ── Kesimpulan ──────────────────────────────────────────────
  console.log('\n══════════════════════════════════════');
  console.log(`TOTAL: ${passed} lulus, ${failed} gagal`);
  console.log('══════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

main();

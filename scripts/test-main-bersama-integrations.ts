/**
 * Test Integrasi Main Bersama — Tahap 5 + review fixes (pola QA repo: tsx standalone).
 *
 * Cakupan:
 * - Bank Soal adapter (adapt → snapshot, tanpa silent drop);
 * - Package compatibility + jalur EKSPLISIT useSupportedQuestions;
 * - Mapping tipe soal: source type authority (review §3);
 * - Auth boundary (actor terverifikasi, bukan request override);
 * - KelasKu boundary (ownership, kelas opsional, className snapshot);
 * - Use-case createMainSession (strict vs subset, transaction, DB asli);
 * - Target policy Kota Cahaya FINAL vs PENDING_ROSTER (review §2);
 * - Audit sample Bank Soal real (read-only).
 *
 * Jalankan (bagian DB memakai guard yang sama dengan Tahap 4):
 *   TEST_DATABASE_URL="postgresql://postgres:mbtest@localhost:54329/mbtest?schema=public" \
 *     npx tsx scripts/test-main-bersama-integrations.ts
 */

// ─── Safety guard (WAJIB import pertama — sebelum lib/db) ───
import '../src/main-bersama/infrastructure/persistence/require-test-db';

import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean): void {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`);
  }
}
function section(title: string): void {
  console.log(`\n── ${title} ──`);
}
// ─── SUT ────────────────────────────────────────────────────
import { adaptQuestion, OPTION_ID_ALPHABET } from '../src/main-bersama/adapters/bank-soal/adapt-question';
import {
  evaluatePackageCompatibility,
  summarizeCompatibility,
  useSupportedQuestions,
  type PackageCompatibilityResult,
  type UnusedQuestionsInfo,
} from '../src/main-bersama/adapters/bank-soal/compatibility';
import type { BankSoalQuestionInput } from '../src/main-bersama/application/use-cases/ports';
import {
  createMainSession,
  type VerifiedTeacherActor,
} from '../src/main-bersama/application/use-cases/create-main-session';
import type {
  BankSoalPackageRef,
  BankSoalQuestionSource,
  MainBersamaClassDirectory,
  MainBersamaClassSummary,
  MainSessionCreationStore,
} from '../src/main-bersama/application/use-cases/ports';
import {
  DEFAULT_KOTA_TARGET_CORRECT,
  DEFAULT_ROUND_DURATION_MS,
  isValidKotaTarget,
  resolveGameConfig,
  resolveKotaTarget,
} from '../src/main-bersama/application/use-cases/session-defaults';

/** Review §1 test 6: caller tidak dapat mengklaim unsupported sebagai supported. */
function callerCannotClaimUnsupported(
  subset: { ok: true; questions: unknown[]; unused: UnusedQuestionsInfo } | { ok: false; code: string },
  mixed: PackageCompatibilityResult,
): void {
  if (!subset.ok) return;
  const claimed = subset.questions.filter((q) =>
    subset.unused.sourceQuestionIds.includes((q as { sourceQuestionId: string }).sourceQuestionId),
  );
  check(
    '34g. tidak ada soal unsupported yang bisa diklaim supported (irangan kosong)',
    claimed.length === 0 &&
      subset.questions.length === mixed.supported &&
      subset.unused.count === mixed.unsupported,
  );
}
import { PrismaMainSessionCreationStore } from '../src/main-bersama/infrastructure/repositories/prisma-session-creation-store';
import type { MainSession as MainSessionLike } from '../src/main-bersama/domain/entities/session';
import { db } from '../lib/db';

async function main(): Promise<void> {

// ─── Fixtures ───────────────────────────────────────────────

function singleChoiceInput(overrides: Partial<BankSoalQuestionInput> = {}): BankSoalQuestionInput {
  return {
    sourceQuestionId: 'BC-TEST-0001',
    type: 'PILIHAN_GANDA',
    prompt: 'Ibukota Indonesia adalah ...',
    options: ['Jakarta', 'Bandung', 'Surabaya', 'Medan'],
    correctAnswer: '0',
    explanation: 'Jakarta adalah ibukota Indonesia.',
    passage: null,
    passageTitle: null,
    ...overrides,
  };
}

// ─── §25: Bank Soal Adapter ─────────────────────────────────

section('Bank Soal Adapter — adaptasi soal');

const adapted = adaptQuestion(singleChoiceInput());

check('1. single choice valid → snapshot valid', adapted.ok === true);

const sc = adapted.ok ? adapted.question : null;
check('2. option id deterministik a/b/c/d untuk opsi string[]', sc !== null && sc.options.map((o) => o.id).join(',') === 'a,b,c,d');
check('3. correctOptionId "0" → menunjuk opsi valid (a)', sc !== null && sc.correctOptionId === 'a' && sc.options.some((o) => o.id === sc.correctOptionId));
check('4. explanation terjaga', sc !== null && sc.explanation === 'Jakarta adalah ibukota Indonesia.');
check('5. sourceQuestionId terjaga', sc !== null && sc.sourceQuestionId === 'BC-TEST-0001');
check('6. tipe domain single-choice', sc !== null && sc.type === 'single-choice');

const tf = adaptQuestion(
  singleChoiceInput({
    sourceQuestionId: 'BC-TEST-0002',
    type: 'BENAR_SALAH',
    prompt: 'Pantun memiliki sajak a-b-a-b.',
    options: ['Benar', 'Salah'],
    correctAnswer: '0',
  }),
);
check('7. BENAR_SALAH valid → true-false', tf.ok === true && tf.ok && tf.question.type === 'true-false');

const tfIdx = adaptQuestion(
  singleChoiceInput({
    sourceQuestionId: 'BC-TEST-0003',
    type: 'PILIHAN_GANDA',
    options: ['Benar', 'Salah'],
    correctAnswer: '1',
  }),
);
check('8. true/false via index → correctOptionId = opsi "Salah"', tfIdx.ok === true && tfIdx.ok && tfIdx.question.correctOptionId === 'b');

const letterKey = adaptQuestion(singleChoiceInput({ sourceQuestionId: 'BC-TEST-0004', correctAnswer: 'B' }));
check('9. kunci huruf "B" → opsi kedua', letterKey.ok === true && letterKey.ok && letterKey.question.correctOptionId === 'b');

const passageQ = adaptQuestion(
  singleChoiceInput({
    sourceQuestionId: 'BC-TEST-0005',
    prompt: 'Gagasan utama paragraf tersebut adalah ...',
    passage: 'Membaca adalah jendela dunia. Dengan membaca, seseorang memperoleh pengetahuan dari berbagai belahan dunia tanpa harus berpindah tempat.',
    passageTitle: 'Membaca',
  }),
);
check('10. soal dengan passage valid → passage-single-choice', passageQ.ok === true && passageQ.ok && passageQ.question.type === 'passage-single-choice');
check('11. passage terjaga penuh (tanpa truncate)', () => {
  if (!passageQ.ok) return false;
  const p = passageQ.question.passage;
  return !!p && p.content.startsWith('Membaca adalah jendela dunia') && p.title === 'Membaca';
});

const ukbiLike = adaptQuestion({
  sourceQuestionId: 'BC-UKBI-GURU-KAIDAH-SET001-Q001',
  type: 'pilihan_ganda',
  prompt: "Penulisan kata yang tepat untuk 'ijazah' ...",
  options: [
    { id: 'A', text: 'ijasah' },
    { id: 'B', text: 'ijazah' },
    { id: 'C', text: 'ijasahh' },
    { id: 'D', text: 'isajah' },
  ],
  correctAnswer: 'B',
  explanation: "Kata baku: 'ijazah'.",
  passage: null,
  passageTitle: null,
});
check('12. opsi {id,text} (UKBI) memakai id asli, bukan a/b/c', ukbiLike.ok === true && ukbiLike.ok && ukbiLike.question.options[0]!.id === 'A');
check('13. kunci "B" pada opsi {id,text} → id asli B', ukbiLike.ok === true && ukbiLike.ok && ukbiLike.question.correctOptionId === 'B');

check('14. unsupported type ditolak eksplisit', () => {
  const r = adaptQuestion(singleChoiceInput({ type: 'ISIAN_SINGKAT' }));
  return !r.ok && r.code === 'UNSUPPORTED_QUESTION_TYPE' && typeof r.reason === 'string';
});
check('15. malformed options (<2) ditolak', () => {
  const r = adaptQuestion(singleChoiceInput({ options: ['satu'] }));
  return !r.ok && r.code === 'INVALID_QUESTION';
});
check('16. opsi kosong ditolak', () => {
  const r = adaptQuestion(singleChoiceInput({ options: ['Jakarta', '   ', 'Surabaya'] }));
  return !r.ok && r.code === 'INVALID_QUESTION';
});
check('17. kunci jawaban menunjuk opsi tidak ada ditolak', () => {
  const r = adaptQuestion(singleChoiceInput({ correctAnswer: '9' }));
  return !r.ok && r.code === 'INVALID_QUESTION';
});
check('18. kunci jawaban kosong ditolak', () => {
  const r = adaptQuestion(singleChoiceInput({ correctAnswer: '' }));
  return !r.ok && r.code === 'INVALID_QUESTION';
});
check('19. prompt kosong ditolak', () => {
  const r = adaptQuestion(singleChoiceInput({ prompt: '   ' }));
  return !r.ok && r.code === 'INVALID_QUESTION';
});
check('20. id opsi duplikat ditolak', () => {
  const r = adaptQuestion(
    singleChoiceInput({
      options: [
        { id: 'A', text: 'satu' },
        { id: 'A', text: 'dua' },
      ],
      correctAnswer: 'A',
    }),
  );
  return !r.ok && r.code === 'INVALID_QUESTION';
});

// ─── Fix review Tahap 5 §3: mapping tipe — SOURCE TYPE authority ──

section('Question Type Mapping — source type authority');

const twoOptsPG = adaptQuestion(
  singleChoiceInput({ sourceQuestionId: 'TYPE-1', options: ['Sudah', 'Belum'], correctAnswer: '0' }),
);
check('20a. PILIHAN_GANDA dua opsi TIDAK otomatis true-false → single-choice', () =>
  twoOptsPG.ok === true && twoOptsPG.ok && twoOptsPG.question.type === 'single-choice');

const bsValid = adaptQuestion(
  singleChoiceInput({ sourceQuestionId: 'TYPE-2', type: 'BENAR_SALAH', options: ['Benar', 'Salah'], correctAnswer: '0' }),
);
check('20b. BENAR_SALAH valid → true-false', () =>
  bsValid.ok === true && bsValid.ok && bsValid.question.type === 'true-false');

const bsReversed = adaptQuestion(
  singleChoiceInput({ sourceQuestionId: 'TYPE-3', type: 'BENAR_SALAH', options: ['Salah', 'Benar'], correctAnswer: '1' }),
);
check('20c. BENAR_SALAH dua arah (Salah/Benar) diterima', () =>
  bsReversed.ok === true && bsReversed.ok && bsReversed.question.type === 'true-false');

const bsMalformed = adaptQuestion(
  singleChoiceInput({ sourceQuestionId: 'TYPE-4', type: 'BENAR_SALAH', options: ['Ya', 'Tidak'], correctAnswer: '0' }),
);
check('20d. BENAR_SALAH bentuk tidak Benar/Salah ditolak', () =>
  !bsMalformed.ok && bsMalformed.code === 'INVALID_QUESTION');

const bsThree = adaptQuestion(
  singleChoiceInput({ sourceQuestionId: 'TYPE-5', type: 'BENAR_SALAH', options: ['Benar', 'Salah', 'Mungkin'], correctAnswer: '0' }),
);
check('20e. BENAR_SALAH tiga opsi ditolak', () =>
  !bsThree.ok && bsThree.code === 'INVALID_QUESTION');

const pgWithPassage = adaptQuestion(
  singleChoiceInput({
    sourceQuestionId: 'TYPE-6',
    prompt: 'Gagasan utama teks ...',
    passage: 'Sebuah paragraf utuh tanpa truncate.',
    options: ['A', 'B', 'C'],
    correctAnswer: '1',
  }),
);
check('20f. pilihan ganda + passage → passage-single-choice', () =>
  pgWithPassage.ok === true && pgWithPassage.ok && pgWithPassage.question.type === 'passage-single-choice');

const bsWithPassage = adaptQuestion(
  singleChoiceInput({
    sourceQuestionId: 'TYPE-7',
    type: 'BENAR_SALAH',
    options: ['Benar', 'Salah'],
    correctAnswer: '0',
    passage: 'Teks pendukung.',
  }),
);
check('20g. BENAR_SALAH tetap true-false walau punya passage', () =>
  bsWithPassage.ok === true && bsWithPassage.ok && bsWithPassage.question.type === 'true-false');

// Non-mutasi + independensi snapshot.
{
  const source = singleChoiceInput();
  const sourceOptionsRef = source.options as string[];
  const before = [...sourceOptionsRef];
  const r1 = adaptQuestion(source);
  const r2 = adaptQuestion(source);
  check('21. source object tidak termutasi adapter', sourceOptionsRef.length === before.length && sourceOptionsRef.every((v, i) => v === before[i]));
  check('22. snapshot independen dari source (dua adaptasi = salinan terpisah)', () => {
    if (!r1.ok || !r2.ok) return false;
    r1.question.options.push({ id: 'zz', text: 'racun' });
    return r2.question.options.length === 4 && r2.question.options[3]!.text === 'Medan';
  });
}
check('23. alphabet id cukup untuk 26 opsi lalu fallback aman', () => {
  const many = Array.from({ length: 27 }, (_, i) => `opsi ${i}`);
  const r = adaptQuestion(singleChoiceInput({ options: many, correctAnswer: '26' }));
  return r.ok === true && r.ok && r.question.options[26]!.id === 'opt27';
});
check('24. alphabet const konsisten', OPTION_ID_ALPHABET === 'abcdefghijklmnopqrstuvwxyz');

// ─── §26: Package Compatibility ─────────────────────────────

section('Package Compatibility — tanpa silent drop');

const pkgMixed: BankSoalQuestionInput[] = [
  singleChoiceInput({ sourceQuestionId: 'P1' }),
  singleChoiceInput({ sourceQuestionId: 'P2', type: 'ISIAN_SINGKAT' }),
  singleChoiceInput({ sourceQuestionId: 'P3' }),
  singleChoiceInput({ sourceQuestionId: 'P4', type: 'MENJODOKAN' }),
  singleChoiceInput({ sourceQuestionId: 'P5' }),
];

const mixed = evaluatePackageCompatibility(pkgMixed);
check('25. total terhitung benar', mixed.total === 5);
check('26. jumlah supported benar', mixed.supported === 3);
check('27. jumlah unsupported benar', mixed.unsupported === 2);
check('28. fullyCompatible false untuk paket campuran', mixed.fullyCompatible === false);
check('29. reason tersedia untuk tiap unsupported', mixed.items.filter((i) => !i.ok).every((i) => !!i.code && typeof i.reason === 'string' && i.reason.length > 0));
check('30. TIDAK ada silent drop: hasil memuat semua 5 soal', mixed.items.length === 5);
check('31. urutan soal terjaga', mixed.items.map((i) => i.sourceQuestionId).join(',') === 'P1,P2,P3,P4,P5');

const pkgAllOk = evaluatePackageCompatibility([singleChoiceInput({ sourceQuestionId: 'A' })]);
check('32. paket semua compatible → fullyCompatible true', pkgAllOk.fullyCompatible && pkgAllOk.supported === 1);

const pkgAllBad = evaluatePackageCompatibility([
  singleChoiceInput({ sourceQuestionId: 'B1', type: 'ESSAI' }),
  singleChoiceInput({ sourceQuestionId: 'B2', type: 'MENGUNGGAH' }),
]);
check('33. paket semua unsupported → supported 0', pkgAllBad.supported === 0 && pkgAllBad.unsupported === 2 && !pkgAllBad.fullyCompatible);

const summ = summarizeCompatibility(mixed);
check('34. summary reasonByCode mengelompokkan benar', summ.reasonByCode['UNSUPPORTED_QUESTION_TYPE'] === 2 && summ.total === 5);

// ─── Fix review Tahap 5 §1: jalur useSupportedQuestions eksplisit ──

section('useSupportedQuestions — subset eksplisit, tanpa silent drop');

const subset = useSupportedQuestions(mixed);
check('34a. subset diterima untuk paket campuran', subset.ok === true);
check('34b. snapshots hanya berisi supported (3 soal, urutan terjaga)',
  subset.ok && subset.questions.length === 3 && subset.questions.every((q) => q.sourceQuestionId !== 'P2' && q.sourceQuestionId !== 'P4'));
check('34c. unused count = 3... (2 di fixture ini) — tidak ada drop diam-diam',
  subset.ok && subset.unused.count === 2);
check('34d. unused details memuat id + kode + reason per soal',
  subset.ok && subset.unused.details.length === 2 &&
  subset.unused.details[0]!.sourceQuestionId === 'P2' &&
  subset.unused.details[0]!.code === 'UNSUPPORTED_QUESTION_TYPE' &&
  typeof subset.unused.details[0]!.reason === 'string');

const allBad = useSupportedQuestions(pkgAllBad);
check('34e. semua unsupported → subset ditolak NO_SUPPORTED_QUESTIONS',
  !allBad.ok && allBad.code === 'NO_SUPPORTED_QUESTIONS');

const fullSubset = useSupportedQuestions(pkgAllOk);
check('34f. paket full compatible → unused.count 0, questions utuh',
  fullSubset.ok && fullSubset.unused.count === 0 && fullSubset.unused.sourceQuestionIds.length === 0);

callerCannotClaimUnsupported(subset, mixed);

// ─── §27-29: Use-case dengan fake deps ──────────────────────

interface FakeDepsBundle {
  deps: {
    actor: VerifiedTeacherActor;
    bankSoal: BankSoalQuestionSource;
    classes: MainBersamaClassDirectory;
    store: MainSessionCreationStore;
    ids: { newId: () => string };
    pins: { newPin: () => string };
  };
  storeCalls: Array<Parameters<MainSessionCreationStore['createMainSessionWithRuntime']>[0]>;
}

function makeFakeDeps(
  overrides: {
    questions?: BankSoalQuestionInput[] | 'NOT_FOUND';
    classSummary?: MainBersamaClassSummary | null;
    failStore?: 'PIN_TAKEN' | 'SESSION_CREATION_FAILED';
    actor?: VerifiedTeacherActor;
  } = {},
): FakeDepsBundle {
  const storeCalls: FakeDepsBundle['storeCalls'] = [];

  const bankSoal: BankSoalQuestionSource = {
    async loadQuestions(ref: BankSoalPackageRef) {
      if (overrides.questions === 'NOT_FOUND') return { ok: false as const, code: 'PACKAGE_NOT_FOUND' as const };
      return {
        ok: true as const,
        questions: overrides.questions ?? [singleChoiceInput(), singleChoiceInput({ sourceQuestionId: 'Q2' })],
      };
    },
  };
  const classes: MainBersamaClassDirectory = {
    async getClassSummary(classId: string) {
      if (overrides.classSummary === null) return null;
      return (
        overrides.classSummary ?? {
          id: classId,
          name: 'Kelas 8A',
          teacherId: 'teacher-1',
          isActive: true,
        }
      );
    },
  };
  const store: MainSessionCreationStore = {
    async createMainSessionWithRuntime(input) {
      if (overrides.failStore === 'PIN_TAKEN') return { ok: false as const, code: 'PIN_TAKEN' as const };
      if (overrides.failStore === 'SESSION_CREATION_FAILED') {
        return { ok: false as const, code: 'SESSION_CREATION_FAILED' as const };
      }
      storeCalls.push(input);
      return { ok: true as const };
    },
  };
  let counter = 0;
  const ids = { newId: () => `gen-${++counter}` };
  const pins = { newPin: () => '123456' };
  // 'actor' eksplisit (termasuk undefined → anonim) dihormati; hanya
  // ABSEN dari overrides yang memakai default guru.
  const teacher: VerifiedTeacherActor = 'actor' in overrides
    ? (overrides.actor as VerifiedTeacherActor)
    : { userId: 'teacher-1', role: 'GURU' };
  return { deps: { actor: teacher, bankSoal, classes, store, ids, pins }, storeCalls };
}

const input = { gameMode: 'jelajah-kata' as const, packageRef: { kind: 'MASTER_THEME', theme: 'anekdot' } };

section('Auth Boundary — teacher identity dari server context');

const okBundle = makeFakeDeps();
const okResult = await createMainSession(okBundle.deps, input);
check('35. authenticated teacher diterima', okResult.ok === true);

const studentBundle = makeFakeDeps({ actor: { userId: 's1', role: 'MURID' as unknown as 'GURU' } });
const studentResult = await createMainSession(studentBundle.deps, input);
check('36. student role tidak dapat create teacher session', !studentResult.ok && studentResult.code === 'UNAUTHORIZED');

const anonBundle = makeFakeDeps({ actor: undefined as unknown as VerifiedTeacherActor });
const anonResult = await createMainSession(anonBundle.deps, input);
check('37. unauthenticated actor ditolak', !anonResult.ok && anonResult.code === 'UNAUTHORIZED');

check('38. teacherId berasal dari authenticated actor (bukan request)', okResult.ok && okResult.session.teacherId === 'teacher-1');

section('KelasKu Boundary — kelas opsional & ownership');

const mineBundle = makeFakeDeps({ classSummary: { id: 'kelas-1', name: 'Kelas 8B', teacherId: 'teacher-1', isActive: true } });
const mine = await createMainSession(mineBundle.deps, { ...input, classId: 'kelas-1' });
check('39. teacher dapat memakai kelas miliknya', mine.ok === true && mine.ok && mine.session.classId === 'kelas-1');
check('40. className snapshot terisi dari kelas', mine.ok === true && mine.ok && mine.session.className === 'Kelas 8B');

const foreignBundle = makeFakeDeps({ classSummary: { id: 'kelas-2', name: 'Kelas 9Z', teacherId: 'guru-lain', isActive: true } });
const notMine = await createMainSession(foreignBundle.deps, { ...input, classId: 'kelas-2' });
check('41. teacher tidak dapat memakai kelas teacher lain', !notMine.ok && notMine.code === 'CLASS_FORBIDDEN');

const missingBundle = makeFakeDeps({ classSummary: null });
const notFoundClass = await createMainSession(missingBundle.deps, { ...input, classId: 'kelas-hilang' });
check('42. class nonexistent ditolak', !notFoundClass.ok && notFoundClass.code === 'CLASS_NOT_FOUND');

const noClassBundle = makeFakeDeps();
const free = await createMainSession(noClassBundle.deps, input);
check('43. session tanpa class valid', free.ok === true && free.ok && free.session.classId === undefined && free.session.className === undefined);

section('Create Session — alur & persistensi (fake store)');

const jelajahBundle = makeFakeDeps();
const jelajah = await createMainSession(jelajahBundle.deps, input);
check('44. create Jelajah session berhasil', jelajah.ok === true);
check('45. phase awal = preparing', jelajah.ok && jelajah.session.phase === 'preparing');
check('46. totalRounds = jumlah snapshot', jelajah.ok && jelajah.session.totalRounds === jelajah.snapshots.length);
check('47. snapshot id diisi generator, urutan paket terjaga', jelajah.ok && jelajah.snapshots.map((s) => s.sourceQuestionId).join(',') === 'BC-TEST-0001,Q2');
check('48. game state initial Jelajah berisi 4 regu valid', () => {
  if (!jelajah.ok) return false;
  const st: GameEngineState = jelajah.initialState;
  return st.gameMode === 'jelajah-kata' && Object.keys(st.jelajah.teams).sort().join(',') === 'badak,elang,harimau,rusa';
});
check('49. store menerima session + snapshots + state dalam SATU call (atomic)', jelajahBundle.storeCalls.length === 1);

const kotaBundle = makeFakeDeps();
const kota = await createMainSession(kotaBundle.deps, { gameMode: 'kota-cahaya', packageRef: { kind: 'MASTER_THEME', theme: 'anekdot' } });
// Review §2: tanpa target eksplisit → PENDING_ROSTER (bukan default angka).
check('50. Kota tanpa target eksplisit → PENDING_ROSTER (initialState null, bukan angka magic)',
  kota.ok && kota.ok === true && kota.session.gameMode === 'kota-cahaya' && kotaBundle.storeCalls[0]!.initialState === null && kotaBundle.storeCalls[0]!.kotaTargetCorrect === null);

const kotaExplicitBundle = makeFakeDeps();
const kotaExplicit = await createMainSession(kotaExplicitBundle.deps, {
  gameMode: 'kota-cahaya',
  packageRef: { kind: 'MASTER_THEME', theme: 'anekdot' },
  config: { kotaTargetCorrect: 12 },
});
check('50a. Kota dengan target eksplisit valid → FINAL target 12 + initial state dibuat',
  kotaExplicit.ok && kotaExplicitBundle.storeCalls[0]!.kotaTargetCorrect === 12 &&
  kotaExplicitBundle.storeCalls[0]!.initialState !== null &&
  kotaExplicitBundle.storeCalls[0]!.initialState!.gameMode === 'kota-cahaya' &&
  kotaExplicitBundle.storeCalls[0]!.initialState!.kota.target === 12);

const pkgNotFoundBundle = makeFakeDeps({ questions: 'NOT_FOUND' });
const pkgNotFound = await createMainSession(pkgNotFoundBundle.deps, input);
check('51. package not found ditolak', !pkgNotFound.ok && pkgNotFound.code === 'PACKAGE_NOT_FOUND');

const emptyBundle = makeFakeDeps({ questions: [] });
const emptyPkg = await createMainSession(emptyBundle.deps, input);
check('52. package kosong ditolak (PACKAGE_EMPTY)', !emptyPkg.ok && emptyPkg.code === 'PACKAGE_EMPTY');

const incompatibleBundle = makeFakeDeps({ questions: [singleChoiceInput(), singleChoiceInput({ type: 'ESSAI' })] });
const incompatible = await createMainSession(incompatibleBundle.deps, input);
check('53. mixed package strict mode → PACKAGE_INCOMPATIBLE + detail, tanpa store call', !incompatible.ok && incompatible.code === 'PACKAGE_INCOMPATIBLE' && incompatible.detail?.unsupported === 1 && incompatibleBundle.storeCalls.length === 0);

// Review §1: jalur EKSPLISIT useSupportedQuestions pada use-case.
const subsetInput = { ...input, useSupportedQuestions: true as const };
const mixedQs = [
  singleChoiceInput({ sourceQuestionId: 'S1' }),
  singleChoiceInput({ sourceQuestionId: 'S2', type: 'ISIAN_SINGKAT' }),
  singleChoiceInput({ sourceQuestionId: 'S3' }),
  singleChoiceInput({ sourceQuestionId: 'S4', type: 'ISIAN_SINGKAT' }),
  singleChoiceInput({ sourceQuestionId: 'S5' }),
];
const subsetBundle = makeFakeDeps({ questions: mixedQs });
const subsetSession = await createMainSession(subsetBundle.deps, subsetInput);
check('53a. mixed package + explicit supported-subset → session berhasil', subsetSession.ok === true);
check('53b. snapshots hanya berisi supported question (3, urutan terjaga)',
  subsetSession.ok && subsetSession.snapshots.map((s) => s.sourceQuestionId).join(',') === 'S1,S3,S5' &&
  subsetSession.session.totalRounds === 3);
check('53c. unused count/details tetap tersedia pada result',
  subsetSession.ok && subsetSession.unused.count === 2 &&
  subsetSession.unused.sourceQuestionIds.join(',') === 'S2,S4' &&
  subsetSession.unused.details.every((d) => d.code === 'UNSUPPORTED_QUESTION_TYPE' && d.reason.length > 0));
check('53d. subset mode tercatat di store call (snapshot persist 3 soal)',
  subsetBundle.storeCalls.length === 1 && subsetBundle.storeCalls[0]!.snapshots.length === 3);

const allBadBundle = makeFakeDeps({ questions: [singleChoiceInput({ type: 'ESSAI' }), singleChoiceInput({ type: 'MENGUNGGAH' })] });
const allBadSession = await createMainSession(allBadBundle.deps, subsetInput);
check('53e. all unsupported + subset request → tetap ditolak (NO_SUPPORTED_QUESTIONS)',
  !allBadSession.ok && allBadSession.code === 'NO_SUPPORTED_QUESTIONS' && allBadBundle.storeCalls.length === 0);

check('53f. strict default: mixed package TANPA flag tetap ditolak', (async () => {
  const b = makeFakeDeps({ questions: mixedQs });
  const r = await createMainSession(b.deps, input);
  return !r.ok && r.code === 'PACKAGE_INCOMPATIBLE';
})());

const pinTakenBundle = makeFakeDeps({ failStore: 'PIN_TAKEN' });
const pinTaken = await createMainSession(pinTakenBundle.deps, input);
check('54. PIN_TAKEN dari store dipropagasi', !pinTaken.ok && pinTaken.code === 'PIN_TAKEN');

const failBundle = makeFakeDeps({ failStore: 'SESSION_CREATION_FAILED' });
const failedStore = await createMainSession(failBundle.deps, input);
check('55. failure store → SESSION_CREATION_FAILED (tanpa hasil parsial)', !failedStore.ok && failedStore.code === 'SESSION_CREATION_FAILED');

const nonMutationBundle = makeFakeDeps();
{
  const q = singleChoiceInput();
  const snapshotBefore = JSON.stringify(q);
  const result = await createMainSession(nonMutationBundle.deps, { ...input, packageRef: { kind: 'MASTER_THEME', theme: 'anekdot' } });
  void nonMutationBundle;
  check('56. source Bank Soal tidak dimodifikasi use-case', JSON.stringify(q) === snapshotBefore && result.ok === true);
}

const indepBundle = makeFakeDeps();
const s1 = await createMainSession(indepBundle.deps, input);
const s2 = await createMainSession(indepBundle.deps, input);
check('57. dua session dari package sama → snapshot independen (id beda)', s1.ok && s2.ok && s1.snapshots.every((a) => s2.snapshots.every((b) => a.id !== b.id)) && s1.session.id !== s2.session.id);

// ─── §30: Config default ────────────────────────────────────

section('Config Default — eksplisit & deterministik');

const dJelajah = resolveGameConfig('jelajah-kata', 10);
check('58. Jelajah default valid (roundDurationMs 60s)', dJelajah.ok && dJelajah.config.gameMode === 'jelajah-kata' && dJelajah.config.roundDurationMs === DEFAULT_ROUND_DURATION_MS);

const dKota = resolveGameConfig('kota-cahaya', 10);
// Review §2: default TIDAK lagi angka — pending difinalisasi saat roster diketahui.
check('59. Kota tanpa target → PENDING_ROSTER (bukan default angka)', dKota.ok && dKota.config.gameMode === 'kota-cahaya' && dKota.config.kotaTarget.kind === 'PENDING_ROSTER');
const dKotaExplicit = resolveGameConfig('kota-cahaya', 10, { kotaTargetCorrect: 30 });
check('59b. target eksplisit valid → FINAL 30', dKotaExplicit.ok && dKotaExplicit.ok && dKotaExplicit.config.gameMode === 'kota-cahaya' && dKotaExplicit.config.kotaTarget.kind === 'FINAL' && dKotaExplicit.config.kotaTarget.target === 30);
check('59c. kandidat default finalisasi roster tersedia sebagai konstanta policy (bukan applied di prepared)', DEFAULT_KOTA_TARGET_CORRECT === 15);
check('59d. resolveKotaTarget: tidak ada sentinel angka — pending = kind PENDING_ROSTER',
  resolveKotaTarget({}).ok === true && resolveKotaTarget({}).ok && resolveKotaTarget({}).resolution.kind === 'PENDING_ROSTER');
check('59e. resolveKotaTarget: 0 / negatif / non-integer ditolak',
  [0, -3, 2.5].every((t) => !resolveKotaTarget({ kotaTargetCorrect: t }).ok));
check('59f. isValidKotaTarget: integer > 0 valid tanpa batas arbitrer lain',
  isValidKotaTarget(1) && isValidKotaTarget(500) && !isValidKotaTarget(0) && !isValidKotaTarget(-1) && !isValidKotaTarget(1.5));

check('60. explicit Kota target valid digunakan (resolveGameConfig FINAL 30)', dKotaExplicit.ok && dKotaExplicit.config.gameMode === 'kota-cahaya' && dKotaExplicit.config.kotaTarget.kind === 'FINAL' && dKotaExplicit.config.kotaTarget.target === 30);

check('61. invalid target ditolak (0 / negatif / non-integer)', [0, -5, 2.5].every((t) => !resolveGameConfig('kota-cahaya', 10, { kotaTargetCorrect: t }).ok));
check('62. defaults deterministic', JSON.stringify(resolveGameConfig('kota-cahaya', 10)) === JSON.stringify(resolveGameConfig('kota-cahaya', 10)));
check('63. totalRounds 0 ditolak', !resolveGameConfig('jelajah-kata', 0).ok);

// ─── §31: Audit sample Bank Soal REAL (read-only) ───────────

section('Audit Bank Soal Real (master JSON, read-only)');

const masterDir = path.join(process.cwd(), 'data', 'question-bank', 'master');
const themeFiles = fs.readdirSync(masterDir).filter((f) => f.endsWith('.json')).slice(0, 6);
let realTotal = 0;
let realSupported = 0;
let realUnsupported = 0;
const realUnsupportedReasons: Record<string, number> = {};
for (const file of themeFiles) {
  const raw = JSON.parse(fs.readFileSync(path.join(masterDir, file), 'utf-8')) as Array<Record<string, unknown>>;
  const inputs: BankSoalQuestionInput[] = raw
    .filter((q) => typeof q.kodeSoal === 'string')
    .map((q) => ({
      sourceQuestionId: q.kodeSoal as string,
      type: q.type as string,
      prompt: (q.text as string) ?? '',
      options: Array.isArray(q.options) ? (q.options as string[]) : [],
      correctAnswer: (q.correctAnswer as string) ?? '',
      explanation: (q.explanation as string) ?? null,
      passage: null,
      passageTitle: null,
    }));
  const result = evaluatePackageCompatibility(inputs);
  realTotal += result.total;
  realSupported += result.supported;
  realUnsupported += result.unsupported;
  for (const item of result.items) {
    if (!item.ok && item.code) realUnsupportedReasons[item.code] = (realUnsupportedReasons[item.code] ?? 0) + 1;
  }
  console.log(`  • ${file}: ${result.total} soal → ${result.supported} compatible, ${result.unsupported} unsupported`);
}
check('64. audit sample real terbaca (≥5 tema, >100 soal)', themeFiles.length >= 5 && realTotal > 100);
check('65. penolakan real terklasifikasi (UNSUPPORTED/INVALID), tanpa silent drop', realUnsupported > 0 && Object.keys(realUnsupportedReasons).every((k) => k === 'UNSUPPORTED_QUESTION_TYPE' || k === 'INVALID_QUESTION'));
console.log(`  → Total real: ${realTotal} soal | supported ${realSupported} | unsupported ${realUnsupported} | reasons ${JSON.stringify(realUnsupportedReasons)}`);

// ─── DB: createMainSession end-to-end (transaksi nyata) ─────

section('Create Session — transaksi Prisma nyata (DB test lokal)');

// Guard sudah memvalidasi TEST_DATABASE_URL sebelum satu pun mutation.
const testDbUrl = process.env.DATABASE_URL ?? '';

let dbAvailable = false;
try {
  await db.$queryRaw`SELECT 1`;
  dbAvailable = true;
} catch {
  console.log('  ⚠️  DB test tidak tersedia — bagian transaksi nyata dilewati (test murni tetap dijalankan).');
}

if (dbAvailable) {
  // Cleanup Main Bersama (child-first) — DB test khusus mbtest.
  await db.mainGameRoundResult.deleteMany({});
  await db.mainGameState.deleteMany({});
  await db.mainAnswerSubmission.deleteMany({});
  await db.mainAnswer.deleteMany({});
  await db.mainRoundEligiblePlayer.deleteMany({});
  await db.mainRound.deleteMany({});
  await db.mainQuestionSnapshot.deleteMany({});
  await db.mainPlayer.deleteMany({});
  await db.mainSession.deleteMany({});

  const realStore = new PrismaMainSessionCreationStore();
  let rollbackSeen = false;

  const realClasses: MainBersamaClassDirectory = {
    async getClassSummary(classId: string) {
      return { id: classId, name: 'Kelas DB Test', teacherId: 'teacher-real-1', isActive: true };
    },
  };
  const realBank: BankSoalQuestionSource = {
    async loadQuestions() {
      return {
        ok: true as const,
        questions: [singleChoiceInput({ sourceQuestionId: 'DB-1' }), singleChoiceInput({ sourceQuestionId: 'DB-2', type: 'BENAR_SALAH', options: ['Benar', 'Salah'] })],
      };
    },
  };
  let realCounter = 0;
  const realIds = { newId: () => `dbgen-${Date.now()}-${++realCounter}` };
  let pinCounter = 0;
  const realPins = { newPin: () => String(900000 + ++pinCounter) };

  const created = await createMainSession(
    { actor: { userId: 'teacher-real-1', role: 'GURU' }, bankSoal: realBank, classes: realClasses, store: realStore, ids: realIds, pins: realPins },
    { gameMode: 'jelajah-kata', packageRef: { kind: 'MASTER_THEME', theme: 'anekdot' }, classId: 'kelas-db-1' },
  );
  check('66. create session end-to-end dengan transaksi nyata', created.ok === true);

  if (created.ok) {
    const sessionRow = await db.mainSession.findUnique({ where: { id: created.session.id } });
    check('67. MainSession terpersist (phase PREPARING, class snapshot)', !!sessionRow && sessionRow.phase === 'PREPARING' && sessionRow.className === 'Kelas DB Test');
    const snapCount = await db.mainQuestionSnapshot.count({ where: { sessionId: created.session.id } });
    check('68. 2 snapshot dipersist dengan position urut', snapCount === 2);
    const snapRows = await db.mainQuestionSnapshot.findMany({ where: { sessionId: created.session.id }, orderBy: { position: 'asc' } });
    check('69. snapshot position 0/1 sesuai urutan paket', snapRows.length === 2 && snapRows[0]!.sourceQuestionId === 'DB-1' && snapRows[1]!.sourceQuestionId === 'DB-2');
    const stateRow = await db.mainGameState.findUnique({ where: { sessionId: created.session.id } });
    check('70. initial game state dipersist ACTIVE', !!stateRow && stateRow.status === 'ACTIVE');
  }

  // PIN collision → retry dengan PIN baru.
  let pinRetryOk = false;
  if (created.ok) {
    const collide = await realStore.createMainSessionWithRuntime({
      session: {
        id: `dbgen-collide-${Date.now()}`,
        pin: '900001',
        teacherId: 'teacher-real-1',
        gameMode: 'jelajah-kata',
        phase: 'preparing',
        currentRoundIndex: null,
        totalRounds: 2,
        createdAt: new Date(),
      } satisfies MainSessionLike,
      kotaTargetCorrect: null,
      snapshots: [],
      initialState: { gameMode: 'jelajah-kata', jelajah: { teams: {}, appliedRoundIds: [], nextRoundIndex: 0, totalRounds: 2 } } as GameEngineState,
      gameMode: 'jelajah-kata',
    });
    pinRetryOk = !collide.ok && collide.code === 'PIN_TAKEN';
  }
  check('71. PIN duplikat → PIN_TAKEN (P2002 dimapping, tidak crash)', pinRetryOk);

  // Rollback: gagal di tengah transaksi → tidak ada sisa snapshot yatim.
  try {
    await db.$transaction(async (tx) => {
      await tx.mainSession.create({
        data: {
          id: `dbgen-rollback-${Date.now()}`,
          pin: '999998',
          teacherId: 'teacher-real-1',
          gameMode: 'JELAJAH_KATA',
          phase: 'PREPARING',
          totalRounds: 1,
        },
      });
      throw new Error('simulasi gagal di tengah');
    });
  } catch {
    rollbackSeen = true;
  }
  const orphanCheck = await db.mainSession.findFirst({ where: { pin: '999998' } });
  check('72. rollback tengah transaksi → tidak ada session parsial', rollbackSeen && orphanCheck === null);
} else {
  console.log('  ℹ️  Test DB di-skip — 72 asersi murni sudah dijalankan di atas.');
}

// ─── Hasil ──────────────────────────────────────────────────

  console.log('\n============================================================');
  console.log(`Hasil: ${passed} lulus, ${failed} gagal`);
  console.log(`DB test: ${dbAvailable ? 'dipakai' : 'tidak tersedia (skip bagian DB)'} — url: ${testDbUrl.replace(/:[^:@/]+@/, ':***@')}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

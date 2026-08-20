# UKBI 200-USER READINESS REPORT

## Phase 23 — Audit Kohort SATU IP Sekolah (Aug 20, 2026)

Audit penuh jalur 200 murid simulasi UKBI serentak dari 1 jaringan sekolah (1 IP publik NAT): login → muat soal → autosave → submit → hasil.

| Phase | Hasil |
|-------|-------|
| 1–2 Arsitektur & rate limit | ✅ Session-scoped (`sess|<hash auth-token>`), BUKAN per-IP — komentar di `lib/rate-limit.ts`: "Per session, not per IP — a whole class submits from one school NAT address." submit 30/60s per sesi; login 10/600s; GET/PATCH paket tanpa rate limit |
| 4 Submit & kuota | ✅ Kuota `SIMULATION_MONTHLY_LIMIT` (Free 3/Pro 10/Founder ∞) dikonsumsi atomic DI DALAM transaksi (`consumeUsageTx` updateMany WHERE used<limit + P2002); `EMPTY_ANSWERS` guard 400; double-click aman |
| 5 DB concurrency | ✅ submit = batched `$transaction([...])` satu round trip; GET fetch seksi `Promise.all` + `withQueryTimeout`; submit tanpa timeout (observasi, fail-open) |
| 6–8 Pool/leakage/randomisasi | ✅ Pool Redis TTL 300, versi `v4`, answer-free; `correctAnswer` hanya di `*_SNAPSHOT_SELECT`; anti-repeat 3 tingkat + snapshot immutable |
| 9 Double-submit race | 🐛 DIPERBAIKI: recovery P2002 pakai `getLatestProgres(userId, "")` (paketId kosong — var di luar scope catch) → recovery selalu gagal → 500. Fix: hoist `const { paketId } = await params;` di atas `try` |
| 10 Load test asset | ✅ `loadtest/04-ukbi-200-users.js` (kohort 200 VU ramp + journey penuh + counter 429 target 0 + cek leakage) |
| 11 AI grading | ✅ `acquireAiSlot` pool `grade-constructed` (fail-open, self-heal) + `Promise.allSettled` + pending ≠ 0; kohort UKBI SD/SMP/SMA tanpa konstruktif |
| 12 Cache & burst | ✅ Pool TTL 300 (`SIM_POOL_TTL` tanpa deploy); setelah warm-up GET kohort hanya 1 query kecil + 1 tulis |
| 13–18 Observability | ⚠️ Log `[SUBMIT_PERF]` ada; metrik nyata = tugas k6 staging |
| 19 Keamanan | ✅ role-gated semua endpoint; `sb-forwarded-for`; listing `/api/kompetensi` hanya ID (tanpa jawaban) |
| 20–21 Regression | ✅ statis; re-run di bawah |
| 22 Readiness test | ✅ 59/59 |
| 23 Audit kohort | ✅ 1 IP NAT: semua rate limit session-scoped — satu kelas submit dari NAT yang sama tidak saling blokir (komentar `lib/rate-limit.ts`) |

## Phase 2B — Harden Staging Gate (Aug 20, 2026)

### Goal
Tooling load test 200-user dibuat MUSTAHIL menyentuh production: 12-check isolation gate sebelum seed/load test + safety interlock di dalam script k6 + dokumentasi infrastruktur staging yang wajib ada. Belum ada load test, belum ada provisioning — hanya tooling + verifikasi lokal.

### 1 — Shared Staging Gate (`scripts/lib/staging-gate.ts`)
`verifyStagingGate(env)` → 12 checks (`assertStagingGate` throw version). HANYA membaca var `STAGING_*` (env production dibaca sekali untuk perbandingan host Redis ambient). Check:
| # | Check |
|---|-------|
| 1 | `DATABASE_URL` staging (ref ≠ production `ibtlhoocaoopgtcsnvzr`) |
| 2 | `DIRECT_URL` staging (ref konsisten dengan DB) |
| 3 | `NEXT_PUBLIC_SUPABASE_URL` staging |
| 4 | `SERVICE_ROLE_KEY` milik staging — format JWT + LIVE `GET {url}/auth/v1/admin/users?page=1&per_page=1` (apikey + Bearer) — hanya ditembak bila URL lolos guard ref |
| 5 | Redis staging — URL+token, host ≠ production ambient, LIVE `GET {rest}/info` dengan Bearer (kredensial di-strip dari URL, rediss→https; fetch menolak URL ber-kredensial) |
| 6 | Auth project staging — ref konsisten antar DB/Redis/Supabase |
| 7 | `BASE_URL` staging — localhost hanya dengan `UKBI_LOADTEST_ALLOW_LOCAL=true` |
| 8 | Loadtest target terkunci — self-check membaca `loadtest/04-ukbi-200-users.js` + `loadtest/ukbi-200-gate.mjs` (BASE_URL wajib, ENV/APPROVED interlock, prefix `lt-ukbi-200-`, tanpa `www.bahasacerdas.com`) |
| 9 | Production DB ref TIDAK terdeteksi (FAIL HARD) |
| 10 | Production Supabase ref TIDAK terdeteksi (derivasi) |
| 11 | Production Redis endpoint TIDAK terdeteksi |
| 12 | 7 required `STAGING_*` ada |

Kegagalan ≥1 → STOP (exit 1), sebelum koneksi Supabase/Prisma/k6 dibuat. Live checks hanya setelah guard string lolos — tidak pernah menembak endpoint hanya karena teks cocok.

### 2 — K6 Interlock (`loadtest/ukbi-200-gate.mjs` + `04-ukbi-200-users.js`)
- `enforceLoadtestGate(env)` (ESM murni, tanpa dependensi k6) throw di init-time script 04 — SEBELUM satupun request: `BASE_URL` wajib (tanpa default), host production/commercial → DILARANG, localhost → wajib `UKBI_LOADTEST_ALLOW_LOCAL=true`, `PAKET_ID` wajib berawalan `lt-ukbi-200-`, `UKBI_LOADTEST_ENV === 'staging'`, `UKBI_LOADTEST_APPROVED === 'true'`.
- k6 runtime TIDAK punya global `URL` (goja) — parse hostname manual via regex (bug ditemukan & diperbaiki saat pengujian nyata k6).
- Import gate didahulukan dari `lib.js`; `CONFIG.users` kini lazy getter (module scope tidak melempar error sebelum gate script 04), sehingga error gate selalu muncul duluan di k6: `Error: ... at enforceLoadtestGate (ukbi-200-gate.mjs)` — diverifikasi nyata dengan k6 v2.1.0, 5 skenario gagal + 1 lolos.

### 3 — Seed Safety (`scripts/seed-staging-loadtest.ts`)
- Gate 12/12 dijalankan SEBELUM klien Supabase & Prisma dibuat (dry-run pun lewat gate).
- `STAGING_TEST_PASSWORD` wajib — password hardcoded (`Loadtest-Pass-2026!#`) dihapus.
- Pasca-`--execute`: summary menghitung Auth users `ukbi-loadtest-*@loaded-test.id` + Prisma User, cek 1:1 (`authIds.size === prismaMapped`), mismatch → exit 1.
- Output tanpa secret (hanya host).

### 4 — Guarded Launcher (`scripts/run-ukbi200-loadtest.ts`, `npm run loadtest:ukbi-200`)
1) verify gate 12/12 dari `STAGING_*` → 2) interlock k6 (import node) → 3) spawn `k6 run -e BASE_URL -e PAKET_ID -e UKBI_LOADTEST_ENV=staging -e UKBI_LOADTEST_APPROVED=true` (+ opsional USERS/ALLOW_LOCAL/VERCEL_BYPASS_TOKEN), exit status k6. Gagal 1 atau 2 → exit 1 sebelum k6 di-spawn.

### 5 — Regression & Verifikasi Lokal (semua lulus)
| Check | Hasil |
|-------|-------|
| `npm run test:ukbi200-loadtest-gate` | ✅ 18/18 |
| `npm run test:ukbi-200-user-rate-limit` | ✅ 18/18 |
| `npm run test:ukbi-200-user-readiness` | ✅ 59/59 |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (5 file) | ✅ 0 violations |
| `git diff --check` | ✅ bersih |
| k6 nyata (v2.1.0) — 5 mode gagal | ✅ semua throw init SEBELUM request (missing BASE_URL, prod host, localhost no-allow, interlock, prefix) |
| k6 nyata — happy path | ✅ gate lolos, run lanjut (request gagal karena staging belum ada — diharapkan) |
| `verify-staging-environment` tanpa env | ✅ exit 1 (7 check FAIL) |
| `verify-staging-environment` env bentuk-production (ref production di `STAGING_*`, BASE_URL=www.bahasacerdas.com) | ✅ exit 1 — 9/12 FAIL termasuk hard fail #9/#10 (target produksi terdeteksi) |
| `seed-staging-loadtest` dry-run env bentuk-production | ✅ exit 1 — ABORT sebelum tulis (0 write) |
| `loadtest:ukbi-200` tanpa env & env bentuk-production | ✅ exit 1 — k6 TIDAK di-spawn |
| Production writes | 0 |
| Load test | TIDAK DILAKUKAN |
| Commit/push | ⛔ BELUM — menunggu Founder Review |

### Prod Writes: 0 · Load Test: NOT RUN · Verdict: TOOLING READY — INFRASTRUCTURE NOT READY — LOAD TEST BLOCKED

---

## STAGING INFRASTRUCTURE REQUIRED (wajib ada SEBELUM seed/load test)

Tidak ada satu pun berikut yang tersedia sekarang (semua production-only). Founder harus provisioning, lalu verifikasi 12/12 via `npm run verify:staging-environment`.

| # | Infra | Kebutuhan | Diverifikasi check # |
|---|-------|-----------|----------------------|
| A | Supabase project STAGING (terpisah dari production `ibtlhoocaoopgtcsnvzr`) | `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_SERVICE_ROLE_KEY`, `STAGING_DATABASE_URL` (pooler 6543), `STAGING_DIRECT_URL` (5432) | 1–4, 6, 9–10 |
| B | Redis/Upstash STAGING (terpisah dari production) | `STAGING_REDIS_URL`, `STAGING_REDIS_TOKEN` — harus `https://` (REST) | 5, 11 |
| C | Deploy Vercel STAGING (preview/production-aliased ke domain staging) | `STAGING_BASE_URL` (mis. `staging.bahasacerdas.com` atau `*.vercel.app` preview) | 7–8 |
| D | AI provider untuk grading konstruktif (opsional fase pertama — kohort SD/SMP/SMA tidak punya soal konstruktif) | key di project staging | — |
| E | Domain staging (opsional; `.vercel.app` cukup) | DNS `staging.bahasacerdas.com` → Vercel bila pakai domain | 7 |
| F | Test accounts | `STAGING_TEST_PASSWORD` (wajib, tanpa default) + seed `npm run seed:staging-loadtest -- --execute` → 200 akun `ukbi-loadtest-001..200@loaded-test.id` (Auth confirmed) + paket "UKBI Load Test Staging" (`lt-ukbi-200-...`, 10 soal, 2 seksi MERESPONS_KAIDAH+MEMBACA) | 12 + pasca-seed cek 1:1 |

### Urutan operasional (setelah provisioning)
```bash
# 1. Verifikasi isolasi
STAGING_SUPABASE_URL=... STAGING_SUPABASE_SERVICE_ROLE_KEY=... \
STAGING_DATABASE_URL=... STAGING_DIRECT_URL=... \
STAGING_REDIS_URL=... STAGING_REDIS_TOKEN=... STAGING_BASE_URL=... \
npm run verify:staging-environment        # harus 12/12 PASS

# 2. Seed 200 akun + paket (idempoten; dry-run dulu)
... npx tsx scripts/seed-staging-loadtest.ts            # dry-run, 0 write
... npm run seed:staging-loadtest                       # --execute

# 3. Auth warm-up DULU (login rate 10/600s per IP anonymous) lalu load test
... USERS='[...]' npm run loadtest:ukbi-200
```
JANGAN pernah mengarahkan seed/verify/k6 ke production; jangan salin secret production ke staging (secret staging harus zero-knowledge terhadap production: ref/host/base URL berbeda total).
---

## ADDENDUM — EKSEKUSI STAGING (Aug 20, 2026, seed langsung di staging production BEFORE load test)

### Status (sejauh ini — FOUNDER REVIEW, NO COMMIT/NO PUSH, k6 BELUM dijalankan)
| Tahap | Status | Catatan |
|-------|--------|---------|
| Gate 12/12 verify | ✅ PASS | semua cek lulus termasuk Redis live + production ref absent |
| **Phase G — E2E one-user** (`scripts/staging-e2e.ts`) | ✅ **18/18 PASS** | login CSR → me MURID → list paket → start sukses (tanpa 429) → no-leakage → autosave PATCH → submit POST → hasil GET → DB write (TestSession COMPLETED, ProgresKompetensi, 10 TestAnswer, no duplikat) |
| **Phase H — seed 200 akun** (`seed:staging-loadtest --execute`) | ✅ | 200 Auth (email_confirm) + 200 Prisma User 1:1 + paket `lt-ukbi-200-5f1dee78` (10 soal MCQ) |
| **Phase I — idempotensi seed** (ulang `--execute`) | ✅ | 0 user baru, paket tidak diduplikasi, 1:1 Auth↔Prisma OK |
| **Phase J — spot-check login 5 akun** (001/050/100/150/200) | ✅ | 5/5 login sukses; pool aktif 10/10 |

### Fix yang dibuat selama eksekusi (di repo, menunggu review)
1. **`scripts/staging-e2e.ts`** — parsing payload app: `data.questions[]` = **bundle per seksi** `{seksi, questions[], sectionIndex}` (bukan flat array) → flatMap `b.questions`; `me.data.user.role`; hasil submit di `data.result`; `flagged` dikirim sebagai `[]` (kolom `TestSession.flagged` bertipe `Int[]`, bukan Json — mengirim `{}` membuat PATCH 500).
2. **Paket build (E2E & `seed-staging-loadtest.ts`)** — filter soal **MCQ-only** (`type IN (PILIHAN_GANDA,BENAR_SALAH,ISIAN_SINGKAT)` + `options` array ≥2). Sebelumnya mengambil soal pertama by id → ambil soal CONSTRUCTED (MEMBACA bisa berisi soal konstruktif) yang tidak auto-score. Staging seed bank diisi dulu (`seed-ukbi-lean-bank.ts --execute` terhadap direct staging) karena DB staging awalnya hanya punya 15 soal konstruktif.
3. **`seed-staging-loadtest.ts`** — koneksi DB pindah ke **direct** (`postgres@db.<ref>.supabase.co:5432`) karena pooler 6543 menolak prepared statements (`42P05`). Ditulis ulang `bootstrap()` untuk menghindari top-level await.

### SKENARIO LOAD TEST (04-ukbi-200-users, k6)
Masih **BLOCKED**: butuh founder provisioning staging + `UKBI_LOADTEST_APPROVED=true` + `USERS='[...]'`. Tidak dijalankan. Load test random shuffle & kohort single-IP tetap diverifikasi lewat unit test (`test:ukbi-200-user-readiness`, 59/59) dan E2E.


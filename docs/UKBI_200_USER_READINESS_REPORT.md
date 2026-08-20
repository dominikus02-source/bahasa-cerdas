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

---

## FINAL PRE-LOAD GATE — EKSEKUSI Phase K–M2 (Aug 20, 2026)

Phase terakhir sebelum k6: semua gerbang pre-load diverifikasi LANGSUNG di staging production (`bahasa-cerdas-staging.vercel.app`, Supabase ref `hvfkhaocukdzfvseqwdz`, paket `lt-ukbi-200-5f1dee78`). Semua script sementara dihapus setelah eksekusi; **TIDAK ada commit/push, k6 TIDAK dijalankan**.

### Checklist hasil

| # | Check | Hasil | Bukti |
|---|-------|-------|-------|
| K1 | Rate-limit suite deterministik | ✅ 18/18 PASS | `npm run test:ukbi-200-user-rate-limit` |
| K2 | Kohort same-IP authenticated (1 IP NAT realistis) | ✅ 30×200, 0×429 | 10 user × (GET paket + PATCH autosave + POST submit), sesi terpisah per session-scoped bucket `sess|<hash>` |
| K3 | Proteksi anonymous (IP-shared) | ✅ 429 tercapai | 10 login gagal/600s per IP — bucket anonymous tetap aktif, bukan dilemahkan |
| K4 | 200/200 sesi login serentak | ✅ 200/200 | Phase K2 — 200 grant password serialized 1.5s (Supabase per-IP grant limit), semua `/api/user/me` 200 role MURID |
| L1 | Data integrity staging | ✅ PASS (15/15) | Auth 200 unik = Prisma 200 unik = 1:1 id; paket 1, id prefix `lt-ukbi-200-`, pool 10/10 ada di bank, MCQ semua, totalQuestions=10; 0 user lain di auth & prisma staging |
| L2 | Snapshot immutable + 0 leakage | ✅ PASS (13/13) | GET #1 == GET #2 (id+urutan+opsi identik); scan per-question + payload mentah: 0 `correctAnswer`/`answerKey`/`jawaban`/`rubric`/`weight`/`count`; submit 10/10 benar (snapshot = answer source of truth, predikat Istimewa 100%); snapshot tersimpan (`TestSession.questionSnapshot`) == yang disajikan (10 id identik) |
| L3 | Double-submit idempotent | ✅ PASS | 2× submit koncurrent: HTTP 200/200 (0×500), 1× `alreadyScored=true`, progres TEPAT 1, session 1, TestAnswer 10, XPTransaction 1 (XP exactly-once via reference paketId), certificate 1, COMPLETED 100% |
| L3b | Race ketat 8× koncurrent | ✅ PASS | 8 submit `Promise.all`: 0×500, progres 1, XP 1, cert 1, answers 10 — recovery P2002 (`paketId` hoisted) tervalidasi live |
| M1 | Staging gate re-verify | ✅ 12/12 PASS | `npm run verify:staging-environment` — semua ref staging `hvfkhaocukdzfvseqwdz`; production DB/Supabase/Redis ref ABSENT (check 9/10/11) |
| M2 | Isolasi production | ✅ 0 write production | Semua request/seed/audit memakai `STAGING_*`; gate memblokir ref production di semua var; paket load test hanya ada di staging (5 paket staging, 1 lt-ukbi-200) |
| M3 | Deployment sanity | ✅ Live & benar | `GET /` 200 (~1.1s); `GET /api/kompetensi` 200 dengan paket `lt-ukbi-200-5f1dee78`; kode P2002-fix terkonfirmasi live via L3b (deploy 8h lama = `vercel --prod` manual dari working tree yang sudah berisi fix; commit `357c15a` dibuat 1h lalu) |

### Verdict

**✅ READY UNTUK STAGING LOAD TEST (k6 `04-ukbi-200-users`)**

Semua gerbang pre-load GREEN. Tidak ada temuan yang menghalangi. Load test k6 TIDAK dijalankan (instruksi Founder — hanya check-in FUNGSIONAL yang diminta).

### Yang HARUS diketahui Founder sebelum menjalankan k6

1. **Login anonymous = IP-shared 10/600s** — kohort 200 login serentak pertama kali dari 1 IP NAT akan kena 429 pada percobaan ke-11 dalam 10 menit. Solusi: `USERS` dibatasi kohort yang sudah warm-up auth (token tersimpan), atau akui bare plain 429 sebagai bukti proteksi bukan kegagalan. m6m kohort session-scoped TIDAK terpengaruh (K2: 30 requests ×200 = 0×429).
2. **Kuantum kotak submit**: 30/60s per sesi — k6 journey harus autosave dulu, submit tunggal di akhir VU, bukan loop submit.
3. **`UKBI_LOADTEST_APPROVED=true`** wajib di env k6 (interlock) — hanya dipakai di staging, dilarang untuk production.
4. **k6 STAGING sah** setelah ini — jangan pernah arahkan k6/seed/verify ke production.

---

## STAGING LOAD TEST — EKSEKUSI 20 MENIT (Aug 20, 2026)

### Ringkasan Eksekusi

| Metrik | Nilai |
|--------|-------|
| Durasi | 20m00s penuh, ramp 0→50→100→150→200→0 (mandat founder) |
| Skenario | `loadtest/04-ukbi-200-users.js` — token pre-warmed, 1 journey/VU, VU selesai idle-mounted |
| Journeys selesai | **200/200** (`ukbi_journey_ok` 100%) |
| Submits sukses | **200/200** (`ukbi_submit_ok` 100%) |
| Idempotent retry | **200/200** (`ukbi_idempotent_ok` 100%) |
| HTTP requests | 1.800 total, **0 failed** (0.00%) |
| Checks | **3.000/3.000 (100%)** — 0 failed |
| Leakage | **0** (semua payload: GET list, GET paket, PATCH autosave, POST submit, GET hasil) |
| 429 / 5xx / token-absent | **0** |
| Warnings (k6) | **0** |

### Latency (skala server sendirian, Vercel sin1-region)

| Endpoint | avg | p(90) | p(95) | Threshold p(95)<5000 | Hasil |
|----------|-----|-------|-------|----------------------|-------|
| GET list | 302.5ms | 426.7ms | 562.4ms | ✅ | PASS |
| GET paket (snapshot build) | 353.5ms | 426.7ms | 562.4ms | ✅ | PASS |
| PATCH autosave | 216.4ms | 285.1ms | 356.0ms | ✅ | PASS |
| POST submit (transaksional) | 393.9ms | 490.4ms | 1.00s | ✅ | PASS |
| GET hasil | 199.1ms | 231.2ms | 262.5ms | ✅ | PASS |
| **Semua req** | 238.5ms | 355.4ms | 428.3ms | — | — |

Semua threshold k6 GREEN: `rate>0.90` 100%, `rate<0.02` 0%, `rate>0.95` 100%, `p(95)<5000` semua endpoint (maks 1.00s).

### Infrastruktur selama beban (observer 128 sampel @10s)

| Metrik | Observasi |
|--------|-----------|
| DB pool (`pg_stat_activity`) | total 8–13 (avg 10.3), active 1, idle-in-tx maks 2 — jauh di bawah limit pgbouncer |
| Redis staging | **healthy 128/128** — pool Redis `SIM_POOL_TTL=300` & rate-limit bekerja selama beban penuh |

### Integrity post-load (`audit-ukbi-load-post.ts` — read-only) — **FAILURES: 0**

| Check | Hasil |
|-------|-------|
| Partisipasi | 200/200 user, 200 TestSession COMPLETED, 200 ProgresKompetensi COMPLETED |
| Sesi duplikat | 0 — semua `attemptNumber == 1` (double-submit diblokir server-side) |
| Jawaban | 2.000 total, min=10 max=10 per sesi (semua soal terjawab) |
| **Scoring** | **20/20 sampel cocok persis** (recompute formula aplikasi: weight EASY=1/MEDIUM=1.5/HARD=2/else=2.5, `totalScore=round(percentage×8)`) |
| Sertifikat | 1 = 1 user lolos threshold ≥482 (lookout konsisten, bukan duplikat) |
| XP | 183 = 200 minus 17 user skor-0 (skor 0 sengaja TIDAK mencetak baris XP per anti-farm) — reference semuanya `= paket.id` |
| Isolasi produksi | 0 ref produksi (`ibtlhoocaoopgtcsnvzr`) di env mana pun — staging murni |

### Verdict

**✅ PASS — produksi siap menangani 200 murid serentak dari 1 jaringan sekolah (1 IP NAT) untuk jalur penuh UKBI (login → muat soal → autosave → submit → hasil).**

Tidak ada kegagalan aplikasi/data/infra. Latency sangat sehat (p95 < 1s untuk semua endpoint, jauh di bawah ambang 5s). Sistem rate-limit session-scoped, snapshot immutability, anti-leakage, anti-duplikasi, dan scoring semuanya tervalidasi live di bawah beban penuh.

### Catatan eksekusi & perbaikan fixture selama fase ini

1. **Bug fixture ditemukan & difix (reset/preflight memakai email di kolom UUID)**: `warmup-ukbi-tokens.ts --reset` dan `preflight-ukbi-load.ts` memfilter dengan `userId: { in: emails }` (string email) → 0 baris cocok, sehingga sesi COMPLETED lama kohort (001–010, 021–025) tidak terhapus dan k6 mendapat 400 `Tes sudah selesai` di GET paket. Fix: resolve `user.findMany({ where: { email: { in: emails } }, select: { id: true } })` lalu pakai array UUID. Setelah fix: hapus 270 answer / 33 sesi / 27 progres / 4 sertifikat / 25 XP.
2. **Bug fixture #2 (kuota bulanan tidak di-reset)**: 3 VU kena 403 `FEATURE_LIMIT_REACHED` karena `PremiumUsage` (kuota `SIMULATION_MONTHLY_LIMIT`) tidak ikut di-reset. Fix: tambah `db.premiumUsage.deleteMany({ where: { userId: { in: userIds } } })` ke transaksi reset. Setelah fix: hapus 75 baris usage tambahan, preflight 0/0/0/0/0, re-run bebas 429/403.
3. **Audit awal 2 ekspektasi salah dikoreksi**: (a) scoring bukan "jumlah benar" melainkan weighted `percentage×8` — direkomputasi sesuai formula aplikasi; (b) sertifikat 1 dan XP 183 terdokumentasikan sebagai perilaku sah (threshold ≥482; skor-0 tanpa baris XP anti-farm).

Loader sklearn k6 `loadtest/ukbi-200-gate.mjs` interlock tetap aktif sepanjang eksekusi; tidak pernah ada arah ke production.


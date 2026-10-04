# Laporan verifikasi — 3 Oktober 2026
Status: perubahan lokal; belum commit, push, deploy atau migrasi produksi. TDPSE belum terdaftar.

## Hasil pemeriksaan
- Integrasi privasi pada route nyata + PostgreSQL lokal: PASS. Batas umur Jakarta, DOB tidak dapat diubah mandiri, default anak privat, CSRF, email wali terverifikasi, token tidak dapat dipakai ulang/oleh wali lain, persetujuan ditinjau independen, pencabutan/versi, bukti kelas, akses file/IDOR, laporan anonim, otorisasi admin, ledger tidak dapat diubah, tombstone, retry vendor dan nilai AI menunggu manusia.
- Keamanan penghapusan akun: PASS untuk reautentikasi password/OTP/OAuth/MFA, owner mismatch, CSRF, batas transaksi dan urutan pencabutan/cleanup.
- Migrasi PostgreSQL lokal dan uji RLS: PASS. Role browser uji tidak melihat User/ConsentEvent; ledger menolak update. Schema storage Supabase dimodelkan lokal; pengujian Supabase staging sesungguhnya masih wajib.
- Bank Soal delivery guard: 20/20 PASS. Main Bersama session engine: 58/58 PASS. Scope token CSS: 5/5 PASS. Kredensial reconnect terikat peserta dan sesi.
- Browser mobile: laporan anonim berhasil diterima dan memiliki nomor; halaman pemberitahuan anak terbaca; pengaturan privasi tanpa sesi menolak penyimpanan. Screenshot disertakan. Uji consent/admin beridentitas menggunakan fixture lokal, bukan akun produksi.
- TypeScript aplikasi dan game server: PASS pada pemeriksaan tersendiri. Build produksi snapshot terakhir (`npm run build -- --webpack`), dengan database lokal dan endpoint vendor produksi dinonaktifkan: PASS, exit 0; kompilasi 70 detik, TypeScript 2,1 menit, 468 halaman terbangun. Artefak route terkompilasi memuat pemeriksaan email wali terbaru.
- Lint script proyek dan pemeriksaan terarah perubahan: PASS. ESLint seluruh repo eksplisit: 49 error di file lama yang tidak diubah, termasuk conditional hooks pada game, tautan panel hasil, parser script audit lama dan penamaan useSupportedQuestions.
- Main Bersama routing: 14 PASS, 2 FAIL; contracts: 46 PASS, 1 FAIL. Kegagalan ekspektasi sumber pada file lama yang tidak diubah.
- Main Bersama scoring database lokal terisolasi: 38 PASS, 2 FAIL; race submit/close: 51 PASS, 1 FAIL. Fixture avatar diperbarui ke katalog yang valid. Assertion progres/facts/cache lama masih gagal pada service yang tidak diubah; perlu peninjauan terpisah, tidak disembunyikan dengan melonggarkan assertion.
- Audit tema: dua temuan blocking lama pada ArticleCoverLightbox; konsistensi tema guru 170/173 PASS. Dua masalah warna lama dan batas protected-zone yang dipicu perubahan API/schema yang diminta. Desain tidak dirombak untuk membuat uji sumber lolos.
- git diff --check: PASS.

## Batas penerapan
Belum diuji end-to-end dengan Supabase Auth/Storage/Realtime staging asli. Migrasi file publik lama, bukti umur proporsional (deklarasi DOB dewasa masih dapat disalahgunakan), kontrak/region/transfer vendor, pemulihan backup, bukti DPIA/PLF nyata, retensi vendor dan kesiapan petugas merupakan syarat rilis. AI dan layanan anak memakai gerbang bukti kesiapan, bukan status risiko yang diklaim tanpa evaluasi.

## Insiden isolasi pengujian lokal
Rangkaian perintah uji Main Bersama sempat tidak berhenti setelah menemukan database lokal lama bernama mbtest. Uji berikutnya membersihkan tabel Main Bersama uji pada database lokal tersebut lalu gagal karena schema usang. Produksi tidak tersentuh. Isi fixture lama sebelum pembersihan tidak diketahui dan belum dipulihkan. Pengujian berikutnya memakai PostgreSQL baru milik tugas di port 55439, hanya dengan data sintetis. Guard kini menyamakan DATABASE_URL, DATABASE_URL_POOLED dan DIRECT_URL dengan URL uji yang tervalidasi. Tidak ada klaim bahwa database lokal lama tetap utuh.


## Verifikasi lanjutan — 4 Oktober 2026

- GitHub Actions commit `539399aa48a1bc4d063d7192959f532c83801940`: PASS untuk production dependency security gate, Prisma generate, TypeScript, privacy migration gate, privacy compliance integration gate, diagnostic baseline V2, TTS eligibility, lint, dan production build.
- Dependency gate kini gagal untuk setiap temuan HIGH/CRITICAL yang tidak termasuk exception sempit di `SECURITY_EXCEPTION_REGISTER.md`; exception yang tersisa memiliki review date dan removal trigger.
- Supabase staging `bahasa-cerdas-staging`: migration privacy/compliance terpasang hingga security-function hardening. `student-private` terverifikasi private.
- Attack check staging: role `anon` dan `authenticated` ditolak membaca `User` dan `ConsentEvent`; `Notifikasi` hanya tetap memiliki SELECT untuk role authenticated dengan owner policy, dan tanpa JWT owner hasilnya nol baris.
- Preview Vercel untuk commit yang sama berstatus READY. Halaman legal publik utama merespons HTTP 200: Kebijakan Privasi, Privasi Anak, Persetujuan Wali, Laporkan, Retensi Data, dan Syarat & Ketentuan.
- Audit read-only produksi menemukan 542 referensi media murid yang masih memakai URL bucket publik proyek produksi: 203 avatar, 134 cover karya, dan 205 foto karya. Bucket sumber yang terlibat pada referensi tersebut adalah `avatars` (203) dan `documents` (339). Tidak ada perubahan data produksi yang dilakukan.
- Produksi belum memiliki tabel privacy/compliance baru; deployment/migration produksi tetap diblok sampai backup, dry-run legacy-media, staging E2E identitas, dan approval release selesai.

Status: branch belum boleh merge/deploy ke production. CI inti sudah hijau; blocker berikutnya adalah staging E2E beridentitas dan migrasi legacy media terkontrol.


### Pre-main gate evidence — 4 Oktober 2026 (lanjutan)

- Staging transactional rehearsal PASS (all rolled back): child privacy account with private defaults, verified guardian record, versioned consent bundle, append-only ConsentEvent enforcement, 72-hour PrivacyRequest deadline, child-safety report creation, and privacy incident notification deadline. No persistent staging rows were left by this rehearsal.
- Staging legacy-media inventory: no staging URLs currently point to the staging project's public storage path and `student-private` remains the only configured staging bucket; therefore the 542 production legacy references cannot be meaningfully rehearsed by reusing staging data. Production inventory remains read-only until a controlled copy/rehearsal dataset is available.
- Latest production application backup objects found in `bahasacerdas-backups` are dated 29 June 2026. This is too old to qualify as the pre-release rollback snapshot for an October production migration. A fresh backup is a hard release blocker.
- Vercel preview deployment for the compliance head is READY and showed no warning/error runtime logs in the inspected 24-hour window.
- Production runtime observation still shows legacy refresh-token errors and one historical Prisma connection-pool timeout; these are production-baseline issues, not introduced by the compliance preview. They must be watched during production smoke testing.
- A dedicated `.github/workflows/compliance-staging-e2e.yml` gate was added. It requires isolated `STAGING_*` secrets and executes staging isolation checks, real Supabase Auth one-user smoke, deployed staging app E2E, account-deletion security, Main Bersama session regression, and payment-integrity regression.


### Dedicated staging gate — latest run

GitHub Actions run `37196834112` against commit `89762b79a496ae773c4da99278d5909b6291bb17` produced:
- Account deletion security regression: PASS.
- Main Bersama session regression: PASS.
- Payment integrity regression: PASS after replacing a stale source-text assertion with behavioral verification of the hardened `verifiedMidtransSignature` helper.
- The run then stopped at the isolated-staging credential gate because the repository has no configured `STAGING_*` Actions secrets. The live Auth/app stages therefore did **not** run and must not be represented as passed.

Missing GitHub Actions secrets confirmed by the gate:
`STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY`, `STAGING_SUPABASE_SERVICE_ROLE_KEY`, `STAGING_DATABASE_URL`, `STAGING_DIRECT_URL`, `STAGING_REDIS_URL`, `STAGING_REDIS_TOKEN`, `STAGING_BASE_URL`, and `STAGING_TEST_PASSWORD`.

Pre-main status remains BLOCKED pending (a) those isolated staging credentials plus a reachable staging application URL, (b) successful live authenticated staging E2E, and (c) a fresh production backup immediately before any production migration.


### Live staging E2E — PASS

Commit `97106dca40536c578f1c6e56a0cccdf9619cefea` has both core CI and live staging evidence:

- Push CI run `37213519892`: PASS through dependency gate, Prisma generate, TypeScript, privacy migration/integration gates, diagnostics, TTS eligibility, lint, and production build.
- PR CI run `37213522493`: PASS through the same release gates.
- Compliance Staging E2E run `37213519853`: PASS.
  - staging isolation gate: 12/12 PASS; derived Supabase ref `hvfkhaocukdzfvseqwdz`; production ref not detected.
  - live Supabase Auth admin-key validation: PASS.
  - disposable staging user password synchronization + password-grant login: PASS.
  - Prisma mapping to staging DB: PASS.
  - deployed staging app `user/me`: MURID PASS.
  - UKBI package discovery: PASS.
  - start session: HTTP 200.
  - answer-key leakage checks on start, submit, and result: PASS.
  - autosave: HTTP 200.
  - submit: HTTP 200 with scored result.
  - result fetch: HTTP 200.
  - DB verification: TestSession COMPLETED, ProgresKompetensi present, 10 TestAnswer rows, one progress row per user+package.
- The staging E2E was hardened for Supabase transaction-pooler port 6543 by using a Prisma PgBouncer-safe connection string, and disposable prior-attempt state is reset before each run so old COMPLETED sessions/usage do not create false failures.

### Production legacy student-media rehearsal inventory

Read-only production checks before any migration:

- total legacy public references: 542.
- unique owner/object pairs: 537.
- unique source URLs: 537.
- source URLs shared across different owners: 0.
- multiply-referenced source URLs: 3.
- all 537 unique source objects exist in `storage.objects`; unmatched source objects: 0.
- unique objects by bucket: `avatars` 203 (58.45 MiB), `documents` 334 (160.20 MiB).
- total source size: approximately 218.65 MiB.
- largest individual object: 4.06 MiB; no object exceeds the 50 MiB private-bucket limit.

This removes the ownership/source-existence ambiguity for the planned copy-first migration. Production data and storage remain unchanged.

### Remaining hard blocker before main

The latest verifiable application-level backup in the private `bahasacerdas-backups` bucket is still dated 29 June 2026. It is not acceptable as the rollback point for the October compliance migration. A fresh verified production backup/snapshot immediately before production migration remains mandatory. Do not merge/deploy the compliance migration until this rollback prerequisite exists.


### Current-commit authenticated staging gate — PASS

Commit `ad2d9bb51547f3ae36695f415b644053f372dd1c` closes the final current-commit runtime gap:

- Compliance Staging E2E run `37215060057`: PASS end-to-end.
- Push CI run `37215060042`: PASS.
- PR CI run `37215062527`: PASS.
- The tested application was the exact branch commit started locally against isolated Supabase staging, not an older Vercel deployment.
- Account deletion security, Main Bersama session regression, payment integrity, six-secret staging gate, 12/12 staging isolation, live Supabase Auth smoke, PgBouncer-safe DB connection, current-commit app start, and the complete authenticated application E2E all passed.
- The canonical-host bug that redirected the loopback staging app to production was fixed; loopback and Vercel execution hosts remain on their own origin while unknown public aliases still redirect to the production canonical host.
- Same-origin/CSRF test execution now uses one consistent localhost origin. The real privacy account/current notice flow passes, followed by user/me, package discovery, session start, answer load, autosave, submit, result fetch, and DB write verification.
- Read-only production rehearsal inventory remains: 542 references / 537 unique owner objects, zero missing source objects, zero objects shared across owners. No production object or DB reference has been modified.

### Backup prerequisite clarification

The Supabase organization is on the Pro plan. Supabase documents automatic daily database backups for Pro projects with seven days of daily-backup retention. This platform backup is separate from the older application-level files in `bahasacerdas-backups` and does not include Storage object bytes. Before the production migration, the release operator must verify that a current scheduled database backup is visible in Supabase Dashboard and preserve the existing storage source objects during the copy/rewrite phase. The migration script already defaults to dry-run and, on execute, copies first and retains source objects unless `--delete-source` is explicitly supplied.

Pre-main code/runtime status: READY. Production migration/deploy status: BLOCKED until the current platform backup restore point is verified immediately before release.

# Main Bersama — Struktur Modul

Fondasi fitur game multiplayer kelas (Guru memproyeksikan ke layar, siswa bergabung dari perangkat masing-masing). Struktur ini dibuat mengikuti konvensi repo (`src/<module>/<layer>`, komponen UI di `components/<area>/`).

| Folder | Fungsi |
|---|---|
| `domain/` | Logic inti dan aturan Main Bersama. Murni TypeScript — tidak bergantung framework, database, HTTP, atau realtime. |
| `domain/entities/` | Entitas inti (mis. sesi, pemain, ruang). |
| `domain/types/` | Tipe dan konsep bersama milik domain. |
| `domain/rules/` | Aturan permainan dan validasi murni. |
| `domain/errors/` | Error khusus domain. |
| `application/` | Use case dan orchestration Main Bersama (alur antar domain, games, dan adapter). |
| `application/services/` | Service orkestrasi (mis. siklus hidup sesi). |
| `application/use-cases/` | Satu use case per aksi pengguna. |
| `application/dto/` | Objek data input/output antar layer aplikasi. |
| `games/` | Implementasi rule masing-masing game, memakai konsep domain. |
| `games/jelajah-kata/` | Game Jelajah Kata. |
| `games/kota-cahaya/` | Game Kota Cahaya. |
| `contracts/` | Kontrak internal: realtime events, view per role, interface repository, DTO bersama. |
| `contracts/events/` | Skema/definisi event realtime per role. |
| `contracts/views/` | Bentuk tampilan state untuk teacher / student / projector. |
| `contracts/repositories/` | Interface persistence (diimplementasi di `infrastructure/`). |
| `adapters/` | Integrasi dengan sistem BahasaCerdas yang sudah ada — tanpa menduplikasinya. |
| `adapters/bank-soal/` | Bridge ke Bank Soal existing (`lib/question-bank`, `data/question-bank`). |
| `adapters/auth/` | Bridge ke autentikasi Supabase existing (`lib/supabase`). |
| `adapters/kelas/` | Bridge ke modul KelasKu existing (`lib/classroom`). |
| `infrastructure/` | Implementasi teknis (diisi pada fase coding berikutnya). |
| `infrastructure/persistence/` | Implementasi PostgreSQL/database. |
| `infrastructure/repositories/` | Implementasi repository dari `contracts/repositories/`. |
| `infrastructure/realtime/` | Transport realtime — sinyal invalidation via Supabase Realtime Broadcast (server REST, client supabase-js). |
| `presentation/` | Server-side presentation logic, dipisah per role. |
| `presentation/teacher/` | Logika presentasi untuk Guru (`/main-bersama`). |
| `presentation/student/` | Logika presentasi untuk Siswa (`ayo.` subdomain — deployment tahap berikutnya). |
| `presentation/projector/` | Logika presentasi untuk Proyektor (`layar.` subdomain — deployment tahap berikutnya). |

UI (komponen React) ditempatkan terpisah di `components/main-bersama/`: `teacher/`, `student/`, `projector/`, `shared/`.

Prototype lama (`main-bersama-server.js` dan relatifnya) tetap menjadi reference implementation dan tidak dipindahkan pada fase ini.

> Catatan deployment: pemetaan subdomain (bahasacerdas.com / ayo. / layar.) adalah concern deployment/routing — dikerjakan pada fase berikutnya, bukan bagian dari struktur ini.

## Status Kontrak (Fase 2)

Layer domain (`domain/`) dan contracts (`contracts/`) sudah berisi kontrak TypeScript — framework-agnostic, tanpa import Next.js/React/Prisma/Supabase/Socket.IO, timestamp transport berupa string ISO-8601. Isi:

- **domain/types** — `SessionId`, `PlayerId`, `TeamId`, `RoundId`, `QuestionId`, `SubmissionId`, `GameMode`, `SessionPhase`, `RoundPhase`, `QuestionPhase`, `AnswerSource`, `SyncReason`, `ParticipantRole`, `ConnectionStatus`, `ParticipationStatus`, `AnswerSaveStatus`, `AnswerSubmitResult`, `AnswerRejectionCode`, `JelajahKataState`, `KotaCahayaState`, `MainGameState`.
- **domain/entities** — `MainQuestionSnapshot` (+ `PublicQuestionView`), `MainTeam` (+ regu default Jelajah Kata: Elang/Harimau/Rusa/Badak), `MainSession`, `MainPlayer`, `MainRound` (eligibility dikunci sebelum round dibuka), `MainAnswer`.
- **domain/rules** — type guards runtime (`isGameMode`, `isSessionPhase`, `isAnswerSubmitResult`, `isMainGameState`, dll.) dan `validateQuestionSnapshot` + `toPublicQuestionView` (strip answer key).
- **contracts/views** — `StudentSessionView` (discriminated union per fase: pre-round / question / reveal — bentuk non-reveal secara tipe tidak punya field kebenaran jawaban), `TeacherSessionView`, `ProjectorSessionView` (public-safe).
- **contracts/events** — nama event (`session:join`, `answer:submit`, `state:request`, `session:start`, `round:close`, `round:discuss`, `round:next`, `session:pause`, `session:resume`, `session:end`, `state:sync`, `answer:ack`, `session:update`) + payload bertipe.
- **contracts/repositories** — interface minimum `SessionRepository`, `PlayerRepository`, `RoundRepository`, `AnswerRepository` (tanpa tipe Prisma/Supabase).

QA: `npx tsx scripts/test-main-bersama-contracts.ts` (46 asersi: type guards, validasi snapshot, anti-leakage view, repo bebas ORM) dan `npx tsc --noEmit`.

Layer `application/`, `games/`, `adapters/`, `infrastructure/`, `presentation/` masih kosong — diisi bertahap pada fase coding berikutnya.

## Status Session & Game Engine (Fase 3A-3B)

- **application/services/session-engine.ts** — SessionEngine authoritative (state machine fase, join/late join, disconnect, answer idempotency dua lapis, pause/resume dengan sisa waktu, close idempotent, end). Clock di-inject (`domain/types/clock.ts`). Expected error = typed result (`domain/types/engine-result.ts`).
- **application/services/round-facts-projection.ts** — mapper `buildRoundFacts()`: SessionEngine → `GameRoundFacts` (kontrak di `contracts/GameRoundFacts.ts`, dengan validator runtime).
- **games/jelajah-kata/jelajah-kata-engine.ts** — scoring 4 regu berbasis accuracy (denominator = eligible snapshot terkunci; fairness: ukuran regu tidak memengaruhi delta), ranking competition 1,1,3, tie via epsilon 1e-9.
- **games/kota-cahaya/kota-cahaya-engine.ts** — misi kolaboratif: kontribusi = jawaban benar, target dari config stabil, progress capped 100, milestone garden/library/homes/town-center (25/50/75/100%).
- **games/game-router.ts** — resolver tipis 2 mode.

QA: `npx tsx scripts/test-main-bersama-session-engine.ts` (46) · `npx tsx scripts/test-main-bersama-game-engine.ts` (58, termasuk integration Session→Game) · `npx tsx scripts/test-main-bersama-contracts.ts` (47).

## Status Persistence (Fase 4)

- **infrastructure/persistence/mappers.ts** — mapping eksplisit DB↔domain (Prisma types tidak bocor keluar infrastructure).
- **infrastructure/persistence/load-session-runtime.ts** — rekonstruksi `SessionRuntimeState` dari PostgreSQL (phase, round aktif, players, eligible snapshot, answers, pause, game state, applied rounds).
- **infrastructure/repositories/** — `PrismaSessionRepository`, `PrismaPlayerRepository`, `PrismaRoundRepository`, `PrismaAnswerRepository` (submit transaksional + attempt ledger `MainAnswerSubmission`), `PrismaGameStateRepository`.
- **Schema (add-only)**: 9 model `Main*` di `prisma/schema.prisma`; migration authoritative `prisma/migrations/20260918000000_main_bersama_tables/migration.sql` (9 CREATE TABLE, 0 DROP/ALTER existing) — tervalidasi (paritas SQL identik dengan `migrate diff --from-empty`; dikenali `migrate resolve --applied` → `_prisma_migrations`).
- **DEPLOYMENT STAGING/PRODUCTION (keputusan terkunci)**: JANGAN pakai `npm run db:migrate` / `prisma migrate deploy` — folder legacy `prisma/migrations/manual/` terdeteksi Prisma sebagai migration pending (technical-debt repo terpisah, jangan disentuh dari pekerjaan Main Bersama). Prosedur: `migration.sql` → review → apply via **Supabase SQL Editor / mekanisme SQL deployment repo** → verifikasi tabel/constraint → `npx prisma migrate resolve --applied 20260918000000_main_bersama_tables`. Tidak perlu jalankan migration ke production sekarang.
- Keamanan jawaban: business uniqueness `UNIQUE(MainAnswer.roundId, playerId)` + request idempotency `UNIQUE(MainAnswerSubmission.submissionId)` global — race concurrent ditangani transaction + P2002→domain result.
- Team snapshot per round persist di `MainRoundEligiblePlayer.teamId` (tidak berubah saat assignment mutable berubah).

QA persistence: `TEST_DATABASE_URL="postgresql://postgres:mbtest@localhost:54329/mbtest?schema=public" npx tsx scripts/test-main-bersama-persistence.ts` (68 asersi, repeatable; guard `test-db-guard.ts` + `require-test-db.ts` — wajib TEST_DATABASE_URL eksplisit host lokal/mbtest, tanpa fallback ke DATABASE_URL, abort sebelum mutation).

## Status Integrasi BC (Fase 5 — Bank Soal, Auth, KelasKu)

Integrasi dengan sistem existing BahasaCerdas TANPA menduplikasi data — semua melalui adapter, integration stop di boundary application:

- **adapters/bank-soal/adapt-question.ts** (murni) — `BankSoalQuestionInput` → `MainQuestionSnapshot`. Supported v1: `PILIHAN_GANDA`/`pilihan_ganda` (single-choice), `BENAR_SALAH` (true-false), soal ber-stimulus → `passage-single-choice`. Tipe lain (ISIAN_SINGKAT, constructed, dll.) → ditolak eksplisit (`UNSUPPORTED_QUESTION_TYPE`/`INVALID_QUESTION` + reason) — TANPA silent drop.
- **adapters/bank-soal/compatibility.ts** — evaluasi paket: total/supported/unsupported + reason per soal, urutan terjaga. Dua jalur (review fix): **strict** (default) — paket campuran ditolak `PACKAGE_INCOMPATIBLE`; **`useSupportedQuestions()`** — keputusan EKSPLISIT caller untuk memakai soal kompatibel saja; result tetap membawa `unused: {count, sourceQuestionIds, details}` — tidak pernah ada silent drop.
- **Mapping tipe soal (review fix)**: SOURCE TYPE adalah authority — `BENAR_SALAH` → `true-false` (bentuk Benar/Salah divalidasi; bentuk salah → `INVALID_QUESTION`); pilihan ganda + passage → `passage-single-choice`; pilihan ganda tanpa passage → `single-choice`. Dua opsi pada pilihan ganda TIDAK otomatis true-false.
- **adapters/bank-soal/bank-soal-source.ts** — sumber soal existing read-only: `SOAL_SET` (model Soal via Prisma) & `MASTER_THEME` (data/question-bank/master/*.json). Semantik `correctAnswer` = index 0-based (konvensi repo).
- **adapters/auth/teacher-actor.ts** — identity guru dari server context Supabase (`getUser()` konvensi repo → User Prisma) → `VerifiedTeacherActor`. TIDAK ada auth baru; teacherId TIDAK pernah dari request body.
- **adapters/kelas/class-directory.ts** — baca KelasKu (model `Group`) untuk ownership + className snapshot. Tidak ada class table baru.
- **application/use-cases/create-main-session.ts** — use case prepared session: verify teacher → optional class auth → load soal → compatibility → snapshot → persist atomik (session + snapshots + initial game state SATU transaksi) → phase `preparing`.
- **application/use-cases/session-defaults.ts** — default eksplisit & deterministik (round 60s).
- **Target policy Kota Cahaya (review fix)**: target eksplisit guru → `FINAL` (validasi integer > 0); tanpa target → `PENDING_ROSTER` — prepared session menyimpan `kotaTargetCorrect: null` (kolom nullable sejak Tahap 4, TANPA sentinel angka magic) dan TANPA baris initial game state; finalisasi target (policy berbasis roster) dilakukan saat start-session/realtime nanti. Kandidat default `DEFAULT_KOTA_TARGET_CORRECT = 15` adalah konstanta policy finalisasi, BUKAN nilai yang diterapkan di prepared session.
- **application/use-cases/ports.ts** — port diinjeksi (BankSoalQuestionSource, MainBersamaClassDirectory, MainSessionCreationStore, IdGenerator/PinGenerator); application bebas Prisma/Supabase.
- **infrastructure/repositories/prisma-session-creation-store.ts** — transaksi pembuatan sesi (P2002 PIN → `PIN_TAKEN`).
- Static boundary diperluas: adapters/ hanya boleh `@/lib/db` & `@/lib/supabase/server`; domain/application/games/contracts tetap murni (dicek contracts + persistence test).

QA integrasi: `TEST_DATABASE_URL=... npx tsx scripts/test-main-bersama-integrations.ts` (98 asersi: adapter + type mapping 31, compatibility + subset 16, auth/kelas/use-case 36, target policy 9, audit real 180 soal master JSON → 162 compatible / 18 unsupported `ISIAN_SINGKAT`, transaksi DB nyata 7).

**Belum dibuat (tahap berikutnya)**: API route, realtime (Socket.IO/SSE), UI guru/siswa/proyektor, subdomain, QR, guest join flow.

## Status API + Realtime Gateway (Fase 6)

Main Bersama kini dapat berjalan sebagai live multiplayer classroom system (backend penuh) — TANPA UI production.

### Keputusan transport (audit runtime §0 + hardening review)
**Supabase Realtime Broadcast + HTTP command (final)** — produksi = Vercel serverless yang TIDAK menjamin request/connection sesi sama berjalan pada instance sama, sehingga hub in-memory TIDAK valid sebagai fanout produksi (review full-pass). Arsitektur final:
- **Command** tetap HTTP POST → application service → Session/Game Engine → PostgreSQL → **sinyal invalidation** via `deps.realtimeSignal` (Supabase Broadcast REST `/realtime/v1/api/broadcast`, tanpa dependency baru).
- **Sinyal** = payload MINIMAL `{type: 'session:update', revision?}` di channel topic `main-bersama:session:<sessionId>` (sessionId, BUKAN PIN). TANPA answer/identity/game state.
- **Sinyal TIDAK dipercaya (§5)**: client hanya melakukan debounce/coalesce → refetch GET role-nya (pull-on-notify); broadcast palsu maksimal menyebabkan refetch authoritative.
- **Guest** subscribe channel PUBLIC Supabase (tanpa auth Supabase); trade-off terdokumentasi: topic sessionId high-entropy per sesi + payload tanpa data privat + payload spoofed harmless.
- **SSE route `/api/main-bersama/realtime` DIHAPUS** — tidak ada dua realtime system; client helper `lib/main-bersama/subscribe-session-updates.ts` (subscribe Broadcast + coalescing gate + safety poll 15s bila realtime tidak tersedia).
- Hub in-memory **dihapus** dari production wiring; cross-instance correctness diuji lewat provider abstraction (`scripts/test-main-bersama-realtime.ts`).

### API routes (`app/api/main-bersama/`)
| Route | Fungsi |
|---|---|
| `POST /teacher/commands` | SATU endpoint command guru: `create-session` (use-case Tahap 5), `open-lobby`, `start`, `close-round`, `discuss`, `next-round`, `pause`, `resume`, `end`. Identity guru SELALU dari `resolveVerifiedTeacherActor()` (cookie Supabase) — teacherId body TIDAK dipercaya; ownership via query scoped teacherId. |
| `GET /teacher/state` | Teacher view operasional penuh (answer key, participants, allowedActions) — ownership ditegakkan. |
| `POST /student/join` | Join via PIN → credential opaque + student-safe view. Authenticated student ter-link userId; guest null (tanpa Supabase user). |
| `GET /student/state` | Reconnect/state siswa via credential — view personal tanpa answer key sebelum reveal. |
| `POST /student/answers` | Submit jawaban — ACK tanpa correctness (idempotent transaksional). |
| `GET /projector/state` | View publik read-only via PIN/sessionId — tanpa identitas individual. TIDAK ada command endpoint projector. |

_Realtime tidak punya route HTTP — sinyal dikirim server-side via Supabase Broadcast; client subscribe via `lib/main-bersama/subscribe-session-updates.ts`._

### Komponen baru
- **application/services/session-commands.ts** — orchestrator command guru: ownership → Session Engine → persist → game engine apply (idempotent durable, double-close tidak double-score). **startSession** finalisasi target Kota PENDING_ROSTER SEBELUM round pertama dibuka — target FIXED setelahnya.
- **application/services/kota-target-policy.ts** — `finalizeKotaTarget = ceil(eligiblePlayers × totalRounds × DEFAULT_KOTA_SUCCESS_RATIO)`, ratio **0.60** (achievable tapi menantang untuk kelas 4–6; kelas kecil tidak dihukum — roster 1 pun dapat target > 0). Deterministik, integer, `roster 0 → null` (caller wajib menolak start `NO_ELIGIBLE_PLAYERS`).
- **application/services/student-flows.ts** — join (guest + authenticated, re-join semantics), reconnect via credential, submit answer (engine validate → persist transaksional → ACK tanpa correctness).
- **application/services/team-assignment.ts** — regu Jelajah berimbang deterministic: anggota tersedikit, tie = urutan domain stabil (elang→harimau→rusa→badak); HANYA join baru mengubah komposisi (rejoin mempertahankan regu).
- **application/services/display-name.ts** — trim, 2–24 char, tolak kosong & control chars; bukan identity proof.
- **infrastructure/repositories/player-credential.ts** — reconnect credential opaque **stateless-signed HMAC-SHA256** (`playerId.sessionId.signature`, 256-bit, timing-safe compare). TIDAK ADA yang disimpan di DB — kebocoran DB tidak membocorkan apa pun. **Schema/migration change: NIHIL** (§20). Secret dari `MAIN_BERSAMA_CREDENTIAL_SECRET` — **produksi WAJIB tersedia (≥32 char), tanpa itu HARD FAIL configuration error** (bukan random fallback per proses); dev/test fallback random memoized per proses. Transport **header-only `x-mb-credential`** — query string DITOLAK (bocor log/Referer); tidak pernah di SSE URL/Broadcast topic/log; hanya diberikan SEKALI ke student pada join; tidak pernah ke teacher/projector/view.
- **infrastructure/realtime/signal.ts** — pengirim sinyal Supabase Broadcast REST (fetch, timeout 3s, best-effort — kegagalan tidak mengubah hasil command).
- **contracts/events/signal.ts** — kontrak murni sinyal: `SESSION_UPDATE_EVENT`, `sessionTopic()`, guard payload minimal.
- **lib/main-bersama/subscribe-session-updates.ts** — client browser helper: subscribe Broadcast channel publik + coalescing gate (debounce 400ms) + safety poll 15s; notification tidak dipercaya, selalu refetch authoritative.
- **infrastructure/orchestrator-composition.ts** — composition root: wire port orchestrator → Prisma repos nyata + signal Supabase + serializer game state runtime↔JSON eksplisit.
- **presentation/view-mappers.ts** (Tahap 6 ditulis ulang) — TIGA serializer role: Student (tanpa key sebelum reveal), Projector (agregat publik), Teacher (operasional penuh, tanpa credential siapa pun). Security boundary di server, bukan konvensi frontend.
- **presentation/http-errors.ts** — mapper typed error → status HTTP (400/401/403/404/409/410/500) + pesan Indonesia; framework-agnostic; stack tidak pernah bocor.

### Recovery & kebenaran jangka panjang
- **loader Tahap 4 diperbaiki (gap faktual)**: `loadSessionRuntime` kini juga memuat **attempt ledger** (`attemptsByRound`) dari `MainAnswerSubmission` — retry identik setelah restart server tetap `already-saved`, bukan salah ditolak (§29).
- Restart: command apa pun memuat ulang sesi dari PostgreSQL; fase/round/answers/pause/game state terekonstruksi; views setelah recovery identik (§44 diuji).

### Keamanan (§24/§25/§45 — diuji dengan recursive scanner)
- Student pre-reveal (question/paused): TANPA `correctOptionId/correctAnswer/isCorrect/explanation/answerKey/teacherId/reconnectToken/userId` — nested object/array.
- Projector: tanpa `userId/selectedOptionId/reconnectToken/credential`; reveal agregat hanya setelah discussion.
- Teacher: tanpa credential/token; tidak bisa kontrol/melihat sesi guru lain (404/401, bukan stack).

QA API+realtime: `TEST_DATABASE_URL=... npx tsx scripts/test-main-bersama-api-realtime.ts` — **84 asersi** (authorization, join, start+finalisasi Kota, answer idempotency, close+game idempotent, discussion/next/summary, pause durability, multi-session sinyal ter-scoped, restart recovery, payload security, credential transport, Kota target policy, unit team/display-name). QA realtime hardening: `npx tsx scripts/test-main-bersama-realtime.ts` — **24 asersi** (static composition tanpa hub, production secret hard-fail lintas-proses, cross-instance publisher→subscriber, forbidden-key scanner payload broadcast). Regresi penuh: contracts 47, session-engine 46, game-engine 58, persistence 68, integrations 91, api-realtime 84, realtime 24 — semua lulus; `tsc --noEmit` 0 error.

**Belum dibuat (tahap berikutnya)**: UI production (guru/siswa/proyektor), subdomain (`main-bersama`/`ayo`/`layar`), QR, rewards/XP, laporan final, Game Feel & Identity (custom fonts, mascot, soundtrack — sengaja ditunda; state/event backend sudah bersih untuk tahap visual).

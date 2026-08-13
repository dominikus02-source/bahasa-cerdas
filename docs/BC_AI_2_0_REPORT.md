# BC AI 2.0 — Contextual Learning & Teaching Companion (Phase 5.3)

**Tanggal**: 13 Agustus 2026 · **Status**: IMPLEMENTED + VERIFIED — **BELUM di-commit/push (menunggu Founder Review)**
**Lingkup**: Upgrade AI BC dari chatbot generik menjadi companion kontekstual per-peran (Murid = Teman Belajarmu, Guru = Teman Guru) di atas shell terpadu 5.x, dengan route chat SSE baru yang reusable terhadap inti provider AI.

---

## 1. Ringkasan Eksekutif

AI BC sekarang adalah satu produk, satu pengalaman per peran, berbasis sesi:
- **Murid** → `/arena/ai` (shell Arena, tema violet, persona "Teman Belajarmu")
- **Guru** → `/guru/ai-bc` (shell Guru, tema emerald, persona "Teman Guru")
- **Publik** → `/ai-bc` (redirect by role; anonymous melihat landing page)
- **Route chat baru** `POST /api/ai/bc/chat` (SSE) — memakai ulang `streamProviderText` (DeepSeek→Groq→Gemini, rotasi multi-key), guardrails `checkInput` (warn-only), rate limit `checkAgentRateLimit` (30/menit, premium ×2), dan `logUsage` (fire-and-forget). **Tanpa potongan kredit** — konsisten dengan legacy `/api/ai/chat` yang gratis; hanya generator (RPP/Soal/PPT/dll.) yang memakai kuota.

## 2. Temuan Audit (PHASE A)

| # | Temuan | Severity | Resolusi |
|---|--------|----------|----------|
| A1 | Persona tidak konsisten: system prompt "AI BC" vs sapaan beranda arena "AI Cerdik" | Medium | Persona engine baru `src/ai/bc/personas.ts` (nama tunggal "AI BC") |
| A2 | `app/ai-bc` punya switch peran (murid/guru) yang bertentangan dengan "role selalu dari sesi" | High | Dihapus — redirect role-based dari `getUser()` |
| A3 | Footer lama "Ditenagai oleh Google Gemini AI" | High | Dihapus; footer baru: "AI BC adalah pendamping belajar — bukan pengganti guru" |
| A4 | Domain mati `bahasacerdas.site` di system prompt | Medium | Dihilangkan (domain legacy BIGT tidak lagi dipakai di prompt) |
| A5 | 4 persona duplikat (`/ai-bc`, `/arena/ai`, `/murid/ai`, `bc-assistant`) | Medium | Kanonik: satu persona engine; 3 entry point terarah; `bc-assistant` agent tetap utuh untuk alat AI |
| A6 | Chat AI BC tidak tercatat di AIUsage | Medium | `logUsage` di route baru (feature `ai-bc-chat`, agentId `bc-assistant`) |
| A7 | Tidak ada persistensi percakapan (state client-only `useState`) | Low | Di luar lingkup fase ini (additive; tanpa migrasi Prisma) |
| A8 | `/ai-bc` tanpa shell terpadu 5.x | Medium | Landing publik berdiri sendiri (by design) + redirect terarah ke shell |

## 3. Keputusan Arsitektur

1. **Route baru, bukan upgrade agent-stream**: `app/api/ai/bc/chat/route.ts` memakai core yang sudah ada (provider/guardrails/rate-limit/usage-logger) daripada menempel ke agent framework — chat companion beda karakter dari generator; reuse inti = konsisten & tanpa risiko regresi ke 9 agent.
2. **Peran hanya dari sesi**: `getPersonaForRole(user.role)` server-side; payload klien hanya `{ messages }`; tidak ada field mode/role dari klien.
3. **Persona tunggal**: murid "Teman Belajarmu", guru "Teman Guru"; identitas: *"AI BC — Teman cerdas untuk belajar dan mengajar Bahasa Indonesia."*
4. **Kontekstual & aman**: `gatherBcContext` best-effort per-sumber (try/catch per blok — kegagalan tidak pernah menggagalkan chat), tanpa tulis DB (read-only: `db.profile`, `db.playerProfile.findUnique`, `getSkillProfile`), tanpa dump mentah, cap 6 item/1200 char/90 char per nilai.
5. **Tanpa biaya tersembunyi**: tidak ada `deductCredit`; rate limit 30/menit + `checkInput` warn-only (konsisten core).
6. **SSE streaming**: delta per token, event `done`/`error` non-throwing (teks parsial tetap tampil), abort signal untuk "Hentikan".
7. **Additive-only**: legacy `/api/ai/chat` + `/murid/ai` redirect + 9 agent + shell 5.x tidak disentuh.

## 4. File Baru

| File | Fungsi |
|------|--------|
| `src/ai/bc/personas.ts` | Engine persona: `BcPersonaKey`, `BcIntentMode`, `STUDENT_PERSONA`, `TEACHER_PERSONA`, `getPersonaForRole`, `classifyIntent`, `buildChatHistory`, `buildSystemPrompt` |
| `lib/ai-bc/context.ts` | `gatherBcContext(user)` (best-effort, read-only), `buildContextText` (pure, compact), `getBcHints` (peran + personalisasi skill terlemah) |
| `app/api/ai/bc/chat/route.ts` | SSE endpoint: `maxDuration = 60`, delta stream, guardrails, rate limit, `logUsage` di `finally`, tanpa deduct |
| `components/ai-bc/ai-bc-types.ts` | Tipe klien: `BcRole`, `BcHint`, `BcClientMessage`, aksi cepat (label eksak), `AI_BC_TAGLINE` |
| `components/ai-bc/ai-bc-stream.ts` | Parser SSE (`parseSseData` di-export untuk test), abort, `BcStreamError` |
| `components/ai-bc/AiBcLanding.tsx` | Landing in-chat: avatar/pill/aksi cepat/kartu hint/disclaimer |
| `components/ai-bc/AiBcChatView.tsx` | Chat: markdown `prose`, streaming bubble live, Salin/Tanya ulang/Mulai baru, a11y (`role="status"`, `aria-live`) |
| `components/ai-bc/AiBcModule.tsx` | Orkestrasi landing→chat, draft streaming, reset abort; tanpa nav kedua/BackHome/ThemeToggle/Bell/logout |
| `app/(dashboard)/guru/ai-bc/page.tsx` | Halaman guru (GURU/founder; non-guru redirect `/arena/ai`) |
| `scripts/test-ai-bc-{architecture,personas,context,navigation,theme,ui}.ts` | 6 suite, 170 assertion |

## 5. File Diubah

| File | Perubahan |
|------|-----------|
| `app/arena/ai/page.tsx` | Server component: `getUser()` → role → `<AiBcModule role hints />` (tema violet) |
| `app/ai-bc/page.tsx` | Public landing + redirect by role (`isTeacher = GURU\|ADMIN\|isFounder` → `/guru/ai-bc`, lain → `/arena/ai`) |
| `app/ai-bc/layout.tsx` | Metadata + tidak mengandung "Generate" |
| `components/dashboard/GuruNav.tsx` | Nav item "AI BC" (Sparkles) setelah "Alat AI" |
| `package.json` | 6 script `test:ai-bc-*` |

## 6. Aksi Cepat (label di-pin oleh test)

- **Murid**: Belajar · Latihan · Jelaskan · Tantang Aku
- **Guru**: Buat Materi · Buat Soal · Rancang Pembelajaran · Cari Ide

## 7. Aturan Persona (dijaga oleh test)

- Identitas tunggal AI BC; nama/klaim vendor apa pun dilarang ("Gemini/Google" dll.)
- Tanpa klise pembuka "Sebagai AI," / "Sebagai asisten," — langsung jawab isi pertanyaan
- Bahasa Indonesia; tanpa emoji di sapaan; label UI: Salin/Tersalin, Tanya ulang, Mulai baru
- Saat ditanya "kamu siapa?" → perkenalkan sebagai "AI BC, Teman Belajarnya/Gurunya di BahasaCerdas"
- Murid: dorong menulis draf sendiri; Guru: hasil siap pakai + saran diferensiasi

## 8. Konteks Peran (best-effort, read-only)

- Murid: Nama, Kelas/Sekolah (profile), Level + Streak (PlayerProfile), Skill terlemah (LearningSkill)
- Guru: Nama, Kelas dikelola (group count), Murid (anggota grup), Karya siswa (count)
- Tanpa `JSON.stringify`, tanpa dump tabel, tanpa tulis DB; maks 6 item / 1200 char

## 9. Keamanan & Kepatuhan

- Role-gated: route chat menolak tanpa sesi (401); peran dari sesi server-side
- `checkInput` guardrails warn-only (konsisten core — tidak blokir konten belajar yang ambigu)
- Tidak ada `correctAnswer`/kunci jawaban yang dibahasakan; tidak ada data PII dikirim ke provider selain konteks yang sudah disaring
- Rate limit 30/menit (premium ×2) anti-spam
- Protected zones (prisma/, app/api/ai/chat, lib/gamification/, lib/learning-loop/, lib/coins.ts, lib/award-xp.ts) = 0 diff

## 10. Tema & UI

- Murid: `from-violet-600 to-purple-600`; Guru: `from-emerald-600 to-teal-600`
- `dark:` variant penuh; icon lucide (Sparkles/Send/Copy/Check/RefreshCw/MessageSquarePlus)
- Bahasa Indonesia penuh; a11y (`role="status"`, `aria-live="polite"`, aria-label tombol)

## 11. Verifikasi

| Check | Hasil |
|-------|-------|
| `npm run test:ai-bc-architecture` | ✅ 28/28 |
| `npm run test:ai-bc-personas` | ✅ 42/42 |
| `npm run test:ai-bc-context` | ✅ 19/19 |
| `npm run test:ai-bc-navigation` | ✅ 23/23 |
| `npm run test:ai-bc-theme` | ✅ 21/21 |
| `npm run test:ai-bc-ui` | ✅ 37/37 |
| `npm run test:gamification-engine` | ✅ SEMUA LULUS |
| `npm run test:guru-phase` | ✅ SEMUA LULUS |
| `npm run test:unified-shell` | ✅ 61/61 |
| `npm run test:arena-nav-theme` | ✅ 33/33 |
| `npm run test:icon-system` | ✅ 47/47 |
| `npm run test:navigation-context` | ✅ 30/30 |
| `test:student-shell` / `student-home` / `student-consolidation` | ✅ 34/34 · ✅ 51/51 · ✅ 19/19 |
| `test:karya-consolidation` / `global-works-discovery` | ✅ 40/40 · ✅ 31/31 |
| `test:premium-economy` / `social-hardening` | ✅ 63/63 · ✅ 27/27 |
| `test:arena-web` / `arena-chat` / `unified-header` | ✅ 56/56 · ✅ 94/94 · ✅ 48/48 |
| `test:simulation-workflow` / `phase-simulation-workflow` (tsx) | ✅ All passed · ✅ All passed |
| `test:bigt-menu` / `phase9g-admin-payments` (tsx) | ✅ 26/26 · ✅ 28/28 |
| `test:game-question-shuffle` | ✅ 24/24 |
| `test:bahasa-indonesia-ui` | 57/62 (5 gagal pre-eksis: BigtInfoPage + panel RPP — luar changeset) |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (17 file baru/diubah) | ✅ 0 violations |
| `npm run build` (dummy env) | ✅ Compiled successfully, exit 0 |
| `git diff --check` | ✅ bersih |
| Protected zones | ✅ 0 diff (prisma/ app/api/ai/chat lib/gamification/ lib/learning-loop/ lib/coins.ts lib/award-xp.ts) |

## 12. Perbaikan Selama Pengembangan (dokumentasi)

1. **False positive "Sebagai AI"**: aturan anti-klise awalnya mengecek substring "sebagai ai" — memotong frasa sah "perkenalkan dirimu sebagai AI BC". Diperketat ke pola klise pembuka `"sebagai ai,"` (komma) di test.
2. **buildContextText tidak menormalkan nilai**: nilai multi-baris/kepanjangan hanya dirapikan di `pushItem` (jalur gathering), sehingga builder pure gagal pada item yang dibangun langsung di test. Diperbaiki: builder sendiri meng-`condense` setiap nilai (collapse `\s+`, cap 90 char + `…`, cap total 1200 char).
3. **Enum `Role` tanpa "FOUNDER"** (TS2367 di 3 file): founder adalah `isFounder` boolean, bukan nilai enum. Diganti `user.isFounder` di `app/ai-bc/page.tsx`, `app/arena/ai/page.tsx`, `lib/ai-bc/context.ts`.
4. **Test navigasi mengecek literal berbeda** (mis. `role === "FOUNDER"` vs implementasi `user.isFounder`; label "Kelas dikelola" vs pola `role === "student"` branch): assertions diselaraskan ke implementasi tanpa melemahkan makna.

## 13. Risiko & Catatan

1. **`/api/ai/chat` legacy tetap ada** — dua pintu chat AI BC (legacy tanpa konteks peran + baru berkonteks). Tidak dihapus (backward compatible); rekomendasi fase berikut: arahkan semua konsumen ke route baru.
2. **Persistensi percakapan belum ada** — state `useState` per sesi halaman; tanpa migrasi Prisma (protected zone). Fase berikutnya bisa memakai `AiSavedResult` atau model baru bila founder setuju.
3. **`db.playerProfile` & `getSkillProfile` shape** terverifikasi via tsc (compile-clean), tapi runtime data kosong di DB saat ini (fresh) — fallback elegan (item di-skip bila null).
4. **`maxDuration = 60`** — stream model panjang (contoh/soal) bisa terpotong Vercel jika >60 s; UI menyediakan "Tanya ulang". Bila sering terjadi, naikkan atau pindah ke background job.
5. **Audio/animasi tidak ditambahkan** — konsisten dengan modul chat lain (tanpa fitur baru di luar lingkup).

## 14. Langkah Verifikasi Manual (setelah deploy)

1. Login murid → `/arena/ai` → persona "Teman Belajarmu", tema violet, aksi cepat murid, kirim pesan → streaming + Salin bekerja.
2. Login guru → `/guru/ai-bc` → persona "Teman Guru", tema emerald, aksi cepat guru, konteks menampilkan "Kelas dikelola X kelas, Y murid, Z karya siswa".
3. Anonymous → `/ai-bc` → landing; login murid → `/ai-bc` redirect ke `/arena/ai`; login guru → redirect ke `/guru/ai-bc`.
4. `/api/ai/bc/chat` tanpa sesi → 401; dengan sesi → SSE delta + event done; rate limit >30/menit → 429.
5. `AIUsage` berisi baris feature `ai-bc-chat` per percakapan (tanpa pengurangan kuota di `/api/ai/quota`).

## 15. File Lain yang Disentuh

- `scripts/test-ai-bc-*.ts` ×6, `package.json` (6 script).
- `app/ai-bc/layout.tsx` (metadata), `components/dashboard/GuruNav.tsx` (nav item).
- Docs: `docs/BC_AI_2_0_REPORT.md` (ini), `AGENTS.md` (section Phase 5.3).

## 16. Status & Tindak Lanjut

- **TIDAK di-commit/push** — menunggu Founder Review (pola 4.2.x / 5.0 / 5.2.1).
- Setelah review: `git add` file baru + `package.json` + 3 halaman + GuruNav + layout + scripts, commit `feat:`, push.
- Remaining project (tidak berubah): TKA UTBK/Guru 30→150; game server revival; GameRoom migration SQL; UI game solo badge-score kosmetik; SQL `2026-08-02_no_absen.sql` & `2026-08-08_school_identity.sql` (Production+Preview).

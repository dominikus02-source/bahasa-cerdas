# BC AI KNOWLEDGE 2.0 — "BC Brain" Knowledge Layer (Phase 1 Report)

**Tanggal**: 13 Agustus 2026 · **Status**: AUDIT + PROPOSAL — **BELUM ada perubahan kode, BELUM commit/push (menunggu Founder Review)**
**Lingkup**: Lapisan pengetahuan kanonik tentang BahasaCerdas untuk AI BC (chat `/api/ai/bc/chat`) — agar AI BC menjawab pertanyaan *tentang produk itu sendiri* dengan akurat, konsisten, dan sesuai peran — tanpa menyentuh engine AI, tanpa hardcode ke system prompt abadi, tanpa fine-tuning.
**Perintah**: Fase 1 = AUDIT → REPORT → PROPOSE ARCHITECTURE → **STOP untuk Founder Review** (tanpa implementasi).

---

## 1. Arsitektur AI BC Saat Ini (AUDIT HASIL)

Alur lengkap `POST /api/ai/bc/chat` (SSE, `app/api/ai/bc/chat/route.ts`, 160 baris):

```
SESI (getUser)
  → persona dari role saja: getPersonaForRole(user.role)          (src/ai/bc/personas.ts)
  → buildChatHistory(body.messages)                                (sanitasi: cap 12 msg/8.000 char)
  → checkInput (warn-only, tidak memblokir)
  → checkAgentRateLimit(req, "bc-assistant", isPremium)            (30/menit, premium ×2)
  → gatherBcContext(user) → buildContextText                        (lib/ai-bc/context.ts — konteks PENGGUNA)
  → classifyIntent(lastMsg)                                        (6 mode pedagogi: tanya/jelaskan/latihan/contoh/menulis/strategi)
  → buildSystemPrompt({ persona, contextText, intentMode })        (persona + konteks pengguna + panduan mode)
  → streamProviderText (deepseek → groq → gemini, multi-key)       (engine yang SAMA dengan agent lain)
  → logUsage (fire-and-forget, feature `ai-bc-chat`, agentId bc-assistant)
  → TANPA potongan kredit (chat gratis, konsisten legacy /api/ai/chat)
```

**Konteks yang tersedia saat ini HANYA konteks pengguna** (`lib/ai-bc/context.ts`):
- Murid: nama, kelas/sekolah, level, streak, skill terlemah — 6 item / 1.200 char / 90 char per nilai.
- Guru: nama, jumlah kelas, jumlah murid, jumlah karya murid.
- **TIDAK ADA pengetahuan tentang produk** (fitur, modul, harga, gamifikasi, asesmen, ekonomi kreatif).

**Engine AI (protected, tidak disentuh)**: `streamProviderText`, `checkInput`, `checkAgentRateLimit`, `logUsage` — semua dipakai apa adanya, tanpa modifikasi.

## 2. Pengetahuan yang SUDAH ADA (yang ditemukan di repo)

| # | Aset | Lokasi | Isi | Status |
|---|------|--------|-----|--------|
| K1 | **Identity & Trust Knowledge Layer** | `lib/ai/knowledge/bahasa-cerdas-identity.ts` (257 baris) | Badan usaha (CV Obah Mamah/Teras Kata/NIB), founder & tim, hak cipta, riwayat, kontak, domain, template jawaban, kalimat ketidaktahuan | ✅ Machine-readable SSOT |
| K2 | **Identity Registry (manusia)** | `docs/BAHASACERDAS_IDENTITY_REGISTRY.md` (192 baris) | Dokumen kanonik identitas; aturan sinkronisasi wajib dengan K1 | ✅ SSOT |
| K3 | **llms.txt** | `public/llms.txt` | Ringkasan produk untuk AI crawler (fitur, harga, target) | ✅ Publik |
| K4 | **FAQ publik** | `app/faq/page.tsx`, `components/landing/FAQSection.tsx` | Q&A publik (landing + halaman FAQ) | ✅ Publik |
| K5 | **Halaman Tentang** | `app/tentang/page.tsx` | Fakta identitas publik, rekonsiliasi eksternal | ✅ Publik |
| K6 | **Legacy agent `bc-assistant`** | `src/ai/agents/bc-assistant-agent.ts` | Prompt berisi pengetahuan routing ke fitur (hardcoded, legacy, agent framework) | ⚠️ Legacy |
| K7 | **Legacy chat** | `app/api/ai/chat/route.ts`, `src/ai/core/prompt-builder.ts` | Menempelkan `buildBahasaCerdasIdentityInstruction()` (K1) ke system prompt | ⚠️ Legacy |
| K8 | **Test identitas** | `scripts/test-bahasa-cerdas-identity.ts` | Pengujian K1 | ✅ |

**Yang TIDAK ada** (verifikasi via `rg -i "rag|embedding|knowledge base|retrieval"` + inspeksi):
- ❌ Tidak ada RAG / embedding / vector store / retrieval apa pun.
- ❌ Tidak ada basis pengetahuan produk (fitur, modul, gamifikasi, ekonomi, asesmen) untuk chat.
- ❌ Tidak ada pemahaman "apakah pertanyaan ini tentang BahasaCerdas?" (no intent classification for BC questions).
- ❌ `workflowSteps` legacy `bc-assistant-agent` menyebut "Cari informasi relevan dari basis pengetahuan" — **tapi basis pengetahuan itu tidak pernah ada** (hanya identitas + konteks pengguna).

## 3. Knowledge Gap (yang HARUS dijawab AI BC tapi belum)

AI BC 2.0 saat ini **tidak bisa menjawab dengan benar** (model hanya menebak dari pengetahuan umum, risiko halusinasi tinggi karena produk baru 2026):

| Domain | Contoh pertanyaan | Akibat tanpa knowledge |
|--------|-------------------|------------------------|
| Produk | "Apa itu BahasaCerdas?" / "Apa itu Jalur Cerdas?" / "Apa itu Arena?" | Jawaban umum/vague |
| Murid | "Bagaimana cara naik level?" / "Apa itu rank?" / "Bagaimana cara dapat koin?" | Angka/aturan dikarang |
| Guru | "Apa itu Guru Pro?" / "Berapa harga Pro?" / "Apa saja alat AI guru?" | Harga salah (Rp 49.000/bulan, trial 30 hari) |
| Asesmen | "Apa itu UKBI/TKA?" / "Apa itu BIGT?" / "Dokumen Hasil Latihan?" | Kebingungan BIGT vs BC |
| Identitas | "Siapa founder BahasaCerdas?" | **TIDAK termasuk identity instruction** (K1 hanya di legacy `/api/ai/chat` + agent builder, TIDAK di `/api/ai/bc/chat`!) |
| Ekonomi | "Bagaimana cara jual karya?" / "Komisi berapa?" | Angka komisi dikarang |
| Gamifikasi | "XP dari mana saja?" / "Apa itu Lencana?" / "Apa itu streak?" | Aturan salah |

**Gap terverifikasi kritis**: `buildBahasaCerdasIdentityInstruction()` (K1) **TIDAK** di-import di `app/api/ai/bc/chat/route.ts` — hanya di `src/ai/core/prompt-builder.ts` (agent tools) dan `app/api/ai/chat/route.ts` (legacy chat). Jadi pertanyaan identitas pun dijawab AI BC dari tebakan model.

## 4. Sumber Kebenaran (SSOT) yang Tersedia

| # | Sumber | Kapan dipakai |
|---|--------|---------------|
| S1 | `lib/ai/knowledge/bahasa-cerdas-identity.ts` + `docs/BAHASACERDAS_IDENTITY_REGISTRY.md` | Identitas (domain A) — **sudah SSOT, wajib dipakai ulang, jangan duplikasi** |
| S2 | `AGENTS.md` (repo history) + `README.md` | Sejarah produk, fitur, fase, status |
| S3 | `lib/billing/plans.ts` | Harga/plan: Guru Pro Bulanan Rp 49.000/30 hari/500 kredit, Tahunan Rp 399.000/365 hari — SSOT kode |
| S4 | `lib/gamification/` (xp-config.ts: 15 sumber XP, ranks.ts: 9 rank/band level, levels.ts: kurva XP, rank-rewards.ts), `lib/coins.ts`, `lib/award-xp.ts` | Gamifikasi (domain G) |
| S5 | Route map: `app/(dashboard)/murid/*`, `app/arena/*`, `app/(dashboard)/guru/*`, `app/(dashboard)/admin/*` | Struktur produk/route |
| S6 | `prisma/schema.prisma` (models/enums) | Fakta domain (JALUR vs PANDUAN, jenis karya, seksi UKBI, dll.) |
| S7 | `app/faq`, `app/tentang`, `app/ai-bc`, `public/llms.txt` | Copy publik (reconciliation) |
| S8 | `docs/*` (45+ dokumen audit/plan) | Detail fitur per fase (BC_STUDENT_IA_AUDIT, OFFICIAL_RANK_SYSTEM_REPORT, LEARNING_LOOP_REPORT, GURU_* dll.) |

**Fakta sensitif yang HARUS direfleksikan ke knowledge base** (jangan klaim yang tidak benar):
- Game server VPS **mati** sejak Juni 2026 → multiplayer (Kuis Battle, Tebak Kata, Adu Cepat) **tidak bisa diklaim berjalan**.
- Soal MENDENGARKAN UKBI belum ada file audio → tidak diklaim "bisa latihan mendengarkan".
- TKA UTBK/Guru baru 30 soal (enrichment 150 tertunda).
- Terminologi resmi: **"Pro"** (bukan Premium), trial 30 hari **sekali**, tanpa auto-renew, kupon Rp 1.000 hanya paket Bulanan.
- Founder = `isFounder` boolean (role enum TIDAK punya FOUNDER).

## 5. Arsitektur yang Diusulkan

### 5.1 Prinsip (mengikuti direktif)
1. **Static knowledge base** — file TS murni (pure, tanpa server deps, tanpa DB), sejalan dengan `personas.ts` yang sudah pure.
2. **Retrieval berbasis aturan (tanpa LLM/embedding)** — klasifikasi intent + skor alias/keyword, O(n) kecil.
3. **Priority ladder**: L1 konteks pengguna (sudah ada) → L2 state produk → L3 canonical BC knowledge (BARU) → L4 pengetahuan Bahasa Indonesia → L5 model.
4. **Satu knowledge base, banyak layer presentasi** — field `audience` (student/teacher/all) memfilter per persona.
5. **Anti-halusinasi**: frasa gap resmi; identitas dari K1 (jangan duplikasi).
6. **Traceability**: `knowledgeId/source/version` di metadata internal (logUsage input + console), TIDAK ditampilkan ke pengguna.
7. **Additive-only**: engine (`provider/guardrails/rate-limit/usage-logger`), persona lama, dan 9 agent TIDAK disentuh.

### 5.2 Struktur file (proposal — menunggu review)

```
src/ai/bc/knowledge/
├── types.ts                 # BcKnowledgeEntry, BcKnowledgeDomain, BcKnowledgeIntent, dsb.
├── registry.ts              # index semua domain + VERSION + lastUpdated
├── domains/
│   ├── identity.ts          # wrapper tipis ke lib/ai/knowledge/bahasa-cerdas-identity.ts (SSOT)
│   ├── product.ts           # apa itu BC, modul (Jalur Cerdas, Arena, Karya, Kompetisi, UKBI/TKA, BIGT)
│   ├── student.ts           # pengalaman murid (level/rank/streak/quest/leaderboard)
│   ├── teacher.ts           # guru (kelas, alat AI, Guru Pro, trial, data siswa, penilaian)
│   ├── content.ts           # materi/learning content (JALUR vs PANDUAN, 72 unit, 720 soal)
│   ├── assessment.ts        # UKBI/TKA/BIGT/dokumen hasil/simulasi (apa yang bisa diklaim saat ini)
│   ├── gamification.ts      # XP (15 sumber), koin, badge, achievement, league, season
│   ├── economy.ts           # Toko Karya, komisi 80/20, koin shop, premium
│   ├── ai-bc.ts             # self-awareness AI BC (persona/tagline/limitasi)
│   └── philosophy.ts        # visi: ekosistem guru↔murid, learning loop
├── retrieval.ts             # classifyKnowledgeIntent(message) + retrieveKnowledgeEntries(msg, role) + scoring
└── prompt.ts                # buildKnowledgeBlock(entries) (cap ~2000 char) + ANTI_HALLUCINATION_PHRASES
```

### 5.3 Wiring (additive, tanpa ubah engine)
- `buildSystemPrompt` (`personas.ts`) menerima parameter OPSIONAL `knowledgeBlock?: string` — bila ada, disisipkan setelah konteks pengguna: `"Pengetahuan resmi BahasaCerdas (jawab dari sini, jangan diulang ke pengguna):"`.
- `app/api/ai/bc/chat/route.ts`: setelah `classifyIntent`, panggil `classifyKnowledgeIntent(msg)`; bila intent BC → `retrieveKnowledgeEntries(msg, persona.key)` → `buildKnowledgeBlock` → teruskan ke `buildSystemPrompt`. **Route lama & engine tidak berubah**; untuk intent BAHASA murni, knowledge block TIDAK disisipkan (hemat token, nol false positive).
- Identitas: domain `identity.ts` menyalurkan `buildBahasaCerdasIdentityInstruction()` — AI BC kini mendapat fakta identitas resmi (menutup gap §3) tanpa duplikasi data (SSOT K1).

### 5.4 Konten knowledge base (draf entri per domain — detail saat implementasi)
- Setiap entri: `{ id, domain, title, aliases[], keywords[], audience, canonicalAnswer, source, lastUpdated, confidence }`.
- ~50–80 entri total; contoh: `product-jalur-cerdas`, `product-arena`, `gamification-xp-sources`, `gamification-rank-bands`, `teacher-guru-pro`, `assessment-ukbi-seksi`, `economy-komisi`, `identity-founder` (dari K1).
- Update workflow: edit file domain → `npm run test:ai-bc-knowledge` → bump VERSION di registry.

### 5.5 Gap/conflict handling
- Bila repo & founder docs bertentangan → **TIDAK menebak**; lapor ke Founder (lihat §7).

## 6. File yang Akan Dibuat/Dimodifikasi (saat review disetujui)

**BARU**:
- `src/ai/bc/knowledge/types.ts`, `registry.ts`, `retrieval.ts`, `prompt.ts`
- `src/ai/bc/knowledge/domains/{identity,product,student,teacher,content,assessment,gamification,economy,ai-bc,philosophy}.ts`
- `scripts/test-ai-bc-knowledge.ts` (+ package script `test:ai-bc-knowledge`)
- `docs/BC_AI_KNOWLEDGE_2_0.md` (dokumen ini)

**DIMODIFIKASI (minimal, additive)**:
- `src/ai/bc/personas.ts` — `buildSystemPrompt` + parameter opsional `knowledgeBlock` (default kosong → perilaku lama identik)
- `app/api/ai/bc/chat/route.ts` — panggil retrieval + sisipkan knowledge block
- `AGENTS.md` — section fase ini

**TIDAK DISENTUH** (protected): `src/ai/core/*`, `app/api/ai/chat/*`, `lib/gamification/*`, `lib/learning-loop/*`, `lib/coins.ts`, `lib/award-xp.ts`, `prisma/*`, 9 agent tools, shell 5.x.

## 7. Risiko & Mitigasi

| Risiko | Severity | Mitigasi |
|--------|----------|----------|
| Knowledge basi (harga/aturan berubah) | High | `lastUpdated` + `VERSION` + workflow update; test bundle |
| Token membengkak | Medium | Cap block 2.000 char, top-N (≤4) entri per intent, hanya untuk intent BC |
| False positive retrieval (pertanyaan Bahasa tersangkut "BC") | Medium | Gate `classifyKnowledgeIntent` + aliases/kata kunci diset ketat + test negatif |
| Duplikasi identitas (K1 vs knowledge baru) | Medium | Domain `identity.ts` = wrapper ke K1, bukan salinan |
| Metadata internal bocor ke pengguna | Medium | Instruksi "jangan diulang ke pengguna" di prompt block; test |
| Klaim fitur yang sebenarnya mati (game server, audio listening) | High | Entri assessment/game mencerminkan REALITA saat ini (VPS mati, audio 0) |
| Conflict sumber (registry vs live, docs vs kode) | High | Aturan: kode + registry menang; **lapor ke Founder, jangan menebak** |

## 8. Rencana Tes (saat implementasi)

**Unit (pure, tanpa DB)** — `scripts/test-ai-bc-knowledge.ts`:
- 20 pertanyaan dari direktif (Jalur Cerdas/Arena/Karya/founder/Guru Pro/naik level → harus ke knowledge) + variasi: typo ("jalur cerdaz"), sinonim ("jalur pembelajaran"), informal ("gimana cara naikin level?"), ambigu ("apa itu level?"), no-answer ("apakah besok hujan?" → TIDAK ke knowledge).
- Validasi entri: id unik, canonicalAnswer non-empty, source/audience/lastUpdated terisi, aliases non-duplikat.
- Filter audience (student vs teacher vs all).
- Cap panjang block (≤2.000 char) & top-N.
- Frase gap publik + internal ("Knowledge gap detected.") hadir.
- `buildSystemPrompt` tanpa `knowledgeBlock` → output IDENTIK dengan sebelumnya (regresi 0).
- SSOT: `test-bahasa-cerdas-identity` tetap hijau.

**Integrasi/statik**: route memanggil retrieval sebelum stream (assertion); protected zones 0 diff; engine imports tak berubah.

**Regresi penuh** (standar): 6 suite AI BC (`test:ai-bc-*`) + `test:gamification-engine`, `test:guru-phase`, `test:unified-shell`, `test:arena-nav-theme`, `test:icon-system`, `test:navigation-context`, `test:student-*`, `test:karya-consolidation`, `test:global-works-discovery`, `test:premium-economy`, `test:social-hardening`, `test:arena-web`, `test:arena-chat`, `test:unified-header`, `test:simulation-workflow`, `test:bigt-menu`, `test:game-question-shuffle`, `test:phase9g-admin-payments`, `test:phase-simulation-workflow` (tsx), `npx tsc --noEmit`, ESLint, `npm run build` (dummy env), `git diff --check`.

---

## Keputusan yang Ditunggu dari Founder
1. Setujui arsitektur §5 (struktur `src/ai/bc/knowledge/`, wiring di `buildSystemPrompt` + route, wrapper identitas ke K1)?
2. Setujui cakupan entri awal (§5.4) — atau kurangi/luas sesuai prioritas?
3. Setujui fakta "harus mencerminkan realita" (§4) — khususnya status game server mati & audio listening 0?
4. Frasa gap publik final: "Untuk informasi itu aku belum menemukan data resmi BahasaCerdas yang cukup. Aku tidak mau menebak." (internal: "Knowledge gap detected.") — ok?

**Fase 1 selesai. TIDAK ada perubahan kode, TIDAK ada commit/push. Menunggu review.**

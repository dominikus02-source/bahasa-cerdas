# PHASE 6 STEP 9B — BC Class Identity & Class Code Sharing

> Status: **DONE** — warna kelas deterministik, kode prominent, modal Lihat
> Kode + Salin + WhatsApp share. 0 backend change. NO COMMIT (Founder Review).

---

## Changed
| File | Perubahan |
|---|---|
| `components/kelas/classroom.css` | Palette 8 tint deterministik (`bc-class-tint-0..7`) dengan pasangan light/dark (`--class-accent/soft/border`); header tinted gradient; `.bc-class-code` (mono, 22px, bold, letter-spacing 0.14em); `.bc-code-sheet` (modal 440px). |
| `app/(dashboard)/guru/kelasku/page.tsx` | Card redesign: header tinted (badge jenjang) + body clean; section **Kode Kelas** (kode besar + tombol Salin dengan feedback "Tersalin"); aksi **Lihat Kode** (QrCode) + hapus; modal `ClassCodeModal` (Escape close, kode 30px, Salin Kode → "✓ Kode Disalin", Bagikan ke WhatsApp via `wa.me` + join URL). Helper `stableClassTint(id)` (djb2 hash → index, deterministic) + `waShareUrl()` (NEXT_PUBLIC_SITE_URL canonical, fallback bahasacerdas.com, join route `/murid/gabung-kelas`). |

## Visual
- Class colors: **PASS** — 8 warna soft premium, deterministic (hash class id, tanpa Math.random).
- Code prominence: **PASS** — section "KODE KELAS" + kode 22px mono bold + letter-spacing, contrast tinggi, tetap readable di mobile.
- Card tetap menjawab: nama, jenjang, jumlah siswa, kode, cara masuk, cara share — bukan dashboard mini.

## Sharing
- Copy code: **PASS** — Clipboard API + fallback execCommand; feedback "Tersalin"/"✓ Kode Disalin" (aria-live).
- WhatsApp: **PASS** — `https://wa.me/?text=<encoded>` target blank, tanpa backend/API WhatsApp.
- Join URL: **PASS** — message menyertakan `{site}/murid/gabung-kelas` dari `NEXT_PUBLIC_SITE_URL`.

## Responsive
- 375px: **PASS (code-level)** — card compact, kode truncate aman, tombol ≥44px, modal = bottom sheet (bc-sheet) — manual browser belum tersedia.
- 390px: **PASS (code-level)**.
- 1280px: **PASS (code-level)** — grid 3 kolom, modal centered 440px — manual browser belum tersedia.

## Theme
- Light: **PASS (code-level)** — tint pastel lembut + body clean.
- Dark: **PASS (code-level)** — setiap tint punya override `.dark` (soft gelap, accent terang), kontras terjaga.
- Tanpa theme engine baru (token CSS existing + `dark` class).

## Regression
| Suite | Discovered | Executed | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| 6.0–6.7 (8 suite) | 233 | 233 | 233 | 0 | 0 |
| guru-phase ✅ · student-home 61 · my-day-home 37 · mobile-navigation 48 · unified-shell 61 · arena-web 56 · gamification ✅ · premium-economy ✅ | | | | | |
| tsc 0 · lint 0 · build exit 0 · diff-check bersih | ✅ | | | | |

Harness `fn()` — Discovered == Executed == Passed.

## Backend
Endpoint baru: **0** · Migration: **0** · Schema: **0** · DB: **READ ONLY**.

## Protected Zones
**0 diff** (prisma, adaptive, learner-state, gamification, learning-loop,
award-xp, coins, diagnostic, app/api/player, engines, apk). GuruNav/composer/
ClassPicker/TodayView/SubmissionReview tidak disentuh.

## Acceptance (A1–A12)
A1 beda warna kelas ✅ · A2 deterministic ✅ · A3 kode jelas tanpa buka kelas ✅ · A4 Lihat Kode satu aksi ✅ · A5 kode besar ✅ · A6 Salin ✅ · A7 WhatsApp terisi ✅ · A8 join URL ✅ · A9 0 backend ✅ · A10 light/dark ✅ (code-level) · A11 mobile ✅ (code-level) · A12 regression GREEN ✅.

## Final verdict
**YELLOW → GREEN-menuju**: implementasi lengkap & regression hijau; manual
browser QA (desktop/mobile/light/dark) belum tersedia di environment → YELLOW
sampai QA visual nyata, lalu GREEN.

---

### Git (NO COMMIT / NO PUSH)
```
M app/(dashboard)/guru/kelasku/page.tsx
M components/kelas/classroom.css
?? docs/PHASE_6_STEP_9B_CLASS_IDENTITY_AND_CODE_SHARING.md
```

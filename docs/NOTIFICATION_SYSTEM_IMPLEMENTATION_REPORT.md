# NOTIFICATION SYSTEM IMPLEMENTATION REPORT

Fase: Unified XP + Coin + Reward Notification Experience 1.0
Status: SELESAI — menunggu Founder Review (belum commit/push).

## A. Root Cause
Deteksi reward berbasis diff polling (bukan event) + 3 entry point tanpa sinkronisasi (diff, enqueue manual claim, redeem rank) + queue minimal (tanpa timeout/prioritas/identity) + mount global Arena tanpa quiet zone saat gameplay.

## B. Architecture Before
- `player-context.tsx`: diff `prevProfileRef` vs `/api/player/profile` (polling 20 dtk + focus) → push popup XP DAN popup COIN terpisah; id `xp-${Date.now()}`; tanpa in-flight guard; rank-up memicu modal + popup sekaligus; tanpa timeout.
- `reward-popup.tsx`: render head FIFO, dismiss manual saja, tanpa a11y.
- Claim cards: `enqueuePopup` + `refresh()` → double popup via diff.

## C. Architecture After
- **`components/arena/player/reward-queue.ts`** (BARU, murni): event identity stabil (`type:title:amount:coin:body` — bukan Date.now), dedupe window 5 dtk, prioritas P0 (LEVEL_UP/RANK_UP) > P1 (REWARD/XP/COIN) > P2 (BADGE/ACHIEVEMENT), durasi P0 6 dtk / transient 4 dtk, FIFO per prioritas.
- **`player-context.tsx`**: in-flight guard (`fetchingRef`) anti race polling/focus; diff XP+Coin → SATU event gabungan via `buildRewardEvents`; `refresh(silent)` memperbarui baseline tanpa popup; serialisasi P0 (`pendingRankRef` — Rank muncul setelah Level selesai); quiet mode (`deferredRef` — reward ditahan & di-flush setelah gameplay); `enqueuePopup` memakai identity + dedupe.
- **`reward-popup.tsx`**: render tipe `REWARD` gabungan (dua nilai XP+Koin), auto-dismiss (timer dibersihkan, unmount-safe), `role="status"` + `aria-live="polite"`, icon `aria-hidden`, `useReducedMotion`, safe-area top, hidden saat modal P0 aktif.
- **`lib/notif-quiet.ts`** (BARU): flag quiet module-level; dipasang di Kuis Tempur (`fase === "main"`) dan Menara Cerdas (`phase === "playing"`).

## D. Unified Reward Flow
ACTION → RESULT (server award) → polling diff → **SATU event "Reward Didapat"** (+N XP · +N Koin) → queue → popup → auto-dismiss → motivasi lanjut. Event terpisah tetap berurutan tanpa overlap.

## E. Deduplication
1. Claim quest/achievement → `refresh(true)` SILENT (baseline diperbarui, popup diff tidak terpicu) → 1 popup saja.
2. Race polling+fokus → in-flight guard → fetch konkuren tidak menggandakan deteksi.
3. Identity + dedupe window → event sama dalam 5 dtk tidak dobel.
4. Rank-up → modal + popup reward rank (P0 dulu, P1 sesudahnya — bukan tumpang tindih).

## F. Queue
Satu FIFO per prioritas; satu aktif; auto-dismiss; cleanup timer; unmount-safe; tidak macet (dequeue per-id).

## G. Priority
P0 Level/Rank (modal serial: LEVEL → RANK → reward berikutnya) · P1 Reward gabungan/XP/Coin · P2 Badge/Achievement/Quest. Popup tidak dirender saat modal P0 aktif.

## H. Game Quiet Mode
Selama gameplay Kuis Tempur & Menara Cerdas, popup global ditahan di `deferredRef`; di-flush otomatis setelah profil berikutnya ter-refresh di luar quiet (dan reward TIDAK hilang). Tidak menutupi soal/jawaban/HP/timer/avatar/HUD.

## I. XP + Coin Consolidation
Satu event logis (+XP & +Koin bersamaan) = satu popup "Reward Didapat" dengan baris nilai ganda. Perhitungan XP/Coin server 100% tidak berubah.

## J. Dark Mode
Popup tetap bahasa zona navy premium (`bg-[#0e1735]/85` + gold/sky tint) — konsisten di kedua mode, tanpa white flash, teks `--px-text` kontras, hover tombol OK jelas.

## K. Light Mode
Sama (zona player by design navy di kedua mode) — surface jelas, nilai reward gold/sky kuat.

## L. Mobile
`w-[calc(100%-2rem)] max-w-sm` + `top-[max(4rem,env(safe-area-inset-top))]` — tidak overflow, tidak menutupi bottom nav (posisi atas), aman 390px.

## M. Accessibility
aria-live polite, role status, icon aria-hidden, tidak mencuri fokus, prefers-reduced-motion, tombol OK ber-aria-label.

## N. Files Changed
| File | Perubahan |
|------|-----------|
| `components/arena/player/reward-queue.ts` | BARU — queue murni (identity/dedupe/priority/duration/buildRewardEvents) |
| `components/arena/player/player-context.tsx` | guard race, gabungan event, silent refresh, serialisasi P0, quiet defer |
| `components/arena/player/reward-popup.tsx` | tipe REWARD gabungan, auto-dismiss, a11y, reduced-motion, safe-area |
| `components/arena/player/daily-quest-card.tsx` | claim → refresh(true) silent |
| `components/arena/player/achievement-grid.tsx` | claim → refresh(true) silent |
| `components/game/KuisTempurSolo.tsx` | quiet mode saat fase main |
| `components/game/MenaraCerdas.tsx` | quiet mode saat phase playing |
| `lib/notif-quiet.ts` | BARU — flag quiet module-level |
| `scripts/test-notification-system.ts` | BARU — 32 asersi |
| `package.json` | + `test:notification-system` |
| `docs/NOTIFICATION_SYSTEM_AUDIT_REPORT.md` | audit (fase sebelumnya) |

## O. Protected Zones
**0 diff** — prisma/, app/api/, lib/gamification/, lib/learning-loop/, engines/, lib/apk.ts, lib/xp.ts, lib/coins.ts, lib/award-xp.ts, bottom-nav.tsx. Semua perubahan murni klien (presentasi & queue).

## P. Tests
**test:notification-system 32/32** (XP/Coin/gabungan, queue, dedupe, identity stabil, priority P0/P1/P2, auto-dismiss, race/focus/rerender protection, quiet mode KuisTempur+Menara, serialisasi Level→Rank, aria-live, reduced-motion, safe-area, dark consistency) · theme-consistency · game-question-quality 29 · game-question-shuffle 24 · premium-economy · gamification-engine · student-shell 34 · student-home 51 · arena-web 56 · arena-chat 94 · kuis-tempur-progression-ux 26 · ai-bc-arena-ux · social-hardening 27 · simulation-workflow 63 — **SEMUA PASS**.

## Q. tsc
`npx tsc --noEmit` ✅ 0 errors

## R. ESLint
✅ 0 errors baru (file yang diubah)

## S. Build
`npm run build` (dummy env) ✅ exit 0

## T. Diff Check
`git diff --check` ✅ bersih

## U. Remaining Gaps
1. Game solo lain (BenarSalah, IramaKata, ZelbyDash, dll.) belum diberi quiet flag — hook `setQuiet` sudah siap, tinggal pasang per game (rekomendasi inkremental).
2. Popup reward zona player tetap navy di kedua mode (by design) — bell persistent tetap terpisah sebagai riwayat server.
3. Flush deferred reward bergantung pada fetch profil berikutnya setelah quiet berakhir; jika user langsung pindah halaman tanpa fetch, reward tertunda sampai fetch berikutnya (tidak hilang).

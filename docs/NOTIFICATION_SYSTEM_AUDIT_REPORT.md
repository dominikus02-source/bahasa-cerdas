# NOTIFICATION SYSTEM AUDIT REPORT

Fase: Unified XP + Coin + Reward Notification Experience 1.0
Status: **AUDIT ONLY — menunggu persetujuan Founder sebelum implementasi.**
Prinsip: JANGAN mengubah business logic XP/Coin/Gamification. Fokus: konsolidasi presentasi + hardening queue.

## A. Notification Inventory
| # | Sistem | File | Trigger | Tipe | Persistent/Transient |
|---|--------|------|---------|------|----------------------|
| 1 | Reward popup queue (Player) | `components/arena/player/reward-popup.tsx` | diff profil saat polling/fokus | XP, COIN, BADGE, ACHIEVEMENT, LEVEL_UP, RANK_UP | Transient (auto queue, dismiss manual "OK") |
| 2 | PlayerContext (deteksi gain) | `components/arena/player/player-context.tsx` | `fetchProfile()` polling 20 dtk + event `focus` | XP gain / Coin gain / Level-up / Rank-up | State transient |
| 3 | LevelUpModal | `components/arena/player/level-up-modal.tsx` | `levelUp` state | Naik level | Transient modal (z-100, dismiss klik) |
| 4 | RankUpModal | `components/gamification/RankUpModal.tsx` | `rankUp` state | Naik rank + reward rank | Transient modal fullscreen (z-100) |
| 5 | Redeem rank rewards | `player-context.tsx` `redeemRankRewards` | saat rank berubah | Popup RANK_UP (judul/koin/badge/title/frame/box) | Transient popup |
| 6 | Claim misi harian | `components/arena/player/daily-quest-card.tsx` | tombol Klaim | `enqueuePopup` COIN | Transient popup |
| 7 | Claim pencapaian | `components/arena/player/achievement-grid.tsx` | tombol Klaim | `enqueuePopup` XP + COIN (2 popup) | Transient popup |
| 8 | Confetti | `components/arena/player/confetti.tsx` | dipakai LevelUp/RankUp | efek visual | Transient |
| 9 | Notification Center (pemain) | `components/arena/player/notification-center.tsx` | fetch `/api/player/notifications` | agregasi riwayat event (XP/koin/badge/achievement/quest/level-up) | Persistent (server) |
| 10 | NotificationBell (murid) | `components/dashboard/NotificationBell.tsx` | polling `/api/notifikasi?unread=true` (3 menit, throttled visibility) | badge merah + daftar | Persistent (server Notifikasi) |
| 11 | Bell guru | `components/dashboard/GuruNav.tsx` / layout guru | `/api/notifikasi` | notif guru (murid berkarya, like, trending) | Persistent (server) |
| 12 | Halaman notifikasi guru | `app/(dashboard)/guru/notifikasi` | daftar server | — | Persistent |
| 13 | Feedback inline hasil | layar hasil gim (`KuisTempurSolo` dkk.), layar complete Jalur Cerdas, hasil simulasi | render inline | +XP/+Koin teks | Inline statis (bukan popup) |
| 14 | Reward rank-up redeem | `POST /api/player/rank-up/redeem` | server idempotent | — | — |

**Tidak ada toast library** (sonner/react-hot-toast/re-toastify = 0). Semua notifikasi = komponen custom.

## B. Current Architecture
- **Dua lapis**: (1) *Transient reward* = `PlayerProvider` (context) + `PlayerOverlay` (queue popup + level-up modal + rank-up modal) — hanya di-mount di **Arena** (`app/arena/arena-client.tsx`). (2) *Persistent* = server `Notifikasi` records + bell murid/guru + Notification Center pemain.
- XP & Coin detection = **diff profiling**: bandingkan `prevProfileRef` vs response `/api/player/profile` saat polling 20 dtk & `focus`. Tidak ada event push dari server — semuanya "ditebak" dari delta.
- Queue popup: array `popups`, hanya render `popups[0]` (satu aktif), berikutnya menyusul — **queue sudah ada**, tapi tanpa timeout otomatis (hanya tombol OK manual), tanpa prioritas, tanpa event identity stabil.

## C. XP Notification Flow
`fetchProfile()` → `data.profile.totalXp > prev.totalXp && prev.totalXp !== 0` → push popup `{id: xp-${Date.now()}, type: XP, title: +N XP}` → render `RewardPopupQueue` (atas-tengah, z-90, backdrop navy, BadgeIcon ⚡).

## D. Coin Notification Flow
Sama, via `data.profile.coin > prev.coin` → popup COIN (🪙). PLUS sumber langsung: claim misi → `enqueuePopup(COIN)`; claim pencapaian → `enqueuePopup(XP)` + `enqueuePopup(COIN)`.

## E. Duplicate/Overlap Risks (ditemukan — bukti file:baris)
1. **Claim ganda (KRITIS)**: `daily-quest-card.tsx:47` `enqueuePopup(COIN)` lalu `:49 refresh()` → polling diff mendeteksi kenaikan koin YANG SAMA → popup COIN kedua. Claim pencapaian (`achievement-grid.tsx:47-48` enqueue XP+COIN + `:50 refresh()`) → hingga **4 popup untuk 1 event**.
2. **XP+Coin terpecah**: satu aksi (mis. menyelesaikan unit) menghasilkan popup XP lalu popup COIN berurutan — bukan SATU "Reward Didapat" (§4–5).
3. **Race polling+fokus**: `fetchProfile` tanpa in-flight guard; dua fetch konkuren membandingkan `prev` yang sama → gain terdeteksi 2× → popup duplikat (`player-context.tsx:92-144`).
4. **Rank-up triple**: rank berubah → `setRankUp` (modal fullscreen) + `redeemRankRewards` (popup RANK_UP) + koin reward rank terdeteksi diff berikutnya (popup COIN) = modal + 2 popup untuk 1 event (`player-context.tsx:107-131`).
5. **Level+Rank bersamaan** (naik rank di level batas band): LevelUpModal DAN RankUpModal sama-sama z-[100] fullscreen → bertabrakan/tumpang-tindih.
6. **Tanpa timeout otomatis**: popup bertahan sampai tombol "OK" — jika user tidak menekan, queue macet (popup berikutnya tidak pernah muncul).
7. **ID tidak stabil**: `xp-${Date.now()}` — dua event dalam milidetik sama bisa bentrok; tidak ada event identity untuk dedupe (§6).
8. **Popup muncul saat game berjalan**: PlayerProvider ada di SELURUH arena (termasuk `/arena/game/*`) — popup z-90 top-16 bisa menutupi HUD/timer/soal Kuis Tempur & game lain (§10).
9. **Bell vs popup berbeda bahasa visual**: bell = badge merah + list server; popup = navy/gold glass — dua keluarga visual terpisah (bukan "satu reward experience").

## F. Root Causes
1. Deteksi reward berbasis **diff polling** (bukan event) — semua risiko duplikat/terpecah berakar di sini.
2. Tiga entry point penambah popup tanpa sinkronisasi: diff polling, `enqueuePopup` manual (claim), redeem rank.
3. Queue minimal: tanpa prioritas, tanpa timeout, tanpa dedupe identity.
4. Mount global di Arena tanpa kesadaran konteks game (tidak ada "quiet zone" saat gameplay).

## G. Existing Components That Can Be Reused
- `RewardPopupQueue` + `TYPE_META` (bisa diperluas: judul gabungan XP+Koin, prioritas).
- `LevelUpModal`, `RankUpModal`, `Confetti` — tetap, cukup di-serial-kan (jangan bersamaan).
- `player-context.tsx` — queue + diff logic cukup DIKERASKAN (guard in-flight, event identity, dedupe window).
- `NotificationCard` (persistent) — tanpa perubahan.
- Token visual: `--px-*` (navy/gold) + `dark:` variant + `motion` (framer-motion) + `prefers-reduced-motion` (sudah dipakai di `LevelUpModal`/`kt-pop`).

## H. Proposed Unified Notification Architecture (untuk approval)
1. **SATU queue reward** di `player-context.tsx` dengan: event identity (`type:source:key`), dedupe window (mis. 3 detik per identity), timeout otomatis (4 dtk + dapat di-dismiss), prioritas P0 Level/Rank → P1 Reward gabungan → P2 Badge/Quest → P3 info.
2. **Reward gabungan**: satu event yang menghasilkan XP+Koin → SATU popup "Reward Didapat" dengan dua nilai (XP kiri, Koin kanan) — kumpulkan event dalam 800ms sebelum render agar XP+Koin tiba-tiba bergabung.
3. **Serialisasi modal**: LevelUp dan RankUp tidak boleh bersamaan — queue modal terpisah (rank menunggu level selesai).
4. **Diff dedupe vs claim**: `refresh()` setelah claim memakai "baseline baru" (skip diff satu kali setelah claim/refresh yang dipicu aksi lokal) ATAU claim tidak memanggil refresh diff untuk gain (hanya refresh angka). Tanpa mengubah server.
5. **Game quiet mode**: selama `fase === "main"` di game, popup reward tidak dirender (atau dikurangi jadi chip kecil non-blocking di bawah HUD); reward tetap tampil di layar hasil (existing inline).
6. Bell & popup tetap dua keluarga (persistent vs transient) — tapi visual popup diselaraskan token (navy/gold + dark: variant konsisten, tanpa teks tenggelam).

## I. Queue Strategy
- 1 aktif; sisanya FIFO; prioritas menyusun ulang (P0 naik ke depan).
- Timeout otomatis per popup (4 dtk) + tombol OK.
- Identity: `type:source:eventId`; dedupe jika identity sama dalam 5 detik terakhir.
- Aman rerender: queue di context (bukan di dalam render komponen); event tidak hilang saat komponen re-mount (context persists selama Arena).
- Non-blocking: container `pointer-events-none`, tombol OK `pointer-events-auto`.

## J. Light/Dark Problems
- Popup reward: `bg-[#0e1735]/85` navy solid — terlihat sama di light/dark (by design zona player). OK, tapi `text-[var(--px-text-dim)]` di atas navy sudah benar; **tidak ada dark: variant masalah** — konsistensi aman.
- `RankUpModal`/`LevelUpModal` sudah solid + glow; light/dark = zona premium navy (dipertahankan).
- Yang perlu QA: posisi `top-16` di mobile + safe-area; warna gold vs latar terang.

## K. Mobile Problems
- Popup `w-[calc(100%-2rem)] max-w-sm` — aman 390px; tapi `top-16` bisa menutupi header game; tanpa `safe-area-inset-top` (di APK/TWA notch bisa terpotong).
- Modal fullscreen `p-4` — aman, sudah responsif.

## L. Game Compatibility
- **RISIKO**: PlayerOverlay global di Arena → popup muncul di game (kuis-tempur, menara, dll.) menutupi HUD/soal. Perlu quiet mode saat gameplay (`fase main`).

## M. Accessibility
- Popup: tombol OK punya `aria-label` ✓; konten teks putih di atas navy ✓; TANPA `aria-live` (reward transient tidak diumumkan ke screen reader) — rekomendasi `role="status"`/`aria-live="polite"`.
- Modal level/rank: fokus tidak dijebak (klik di mana pun menutup) — OK, tapi tanpa `role="dialog"`/`aria-modal`.
- `prefers-reduced-motion`: dipakai di beberapa tempat (kt-pop, confetti animasi) — RankUpModal timers reveal tidak memperhitungkan reduced motion (kosmetik).

## N. Files Proposed To Change (setelah approval)
- `components/arena/player/player-context.tsx` — event identity, dedupe window, in-flight guard, timeout, reward gabungan, prioritas, serialisasi modal, game quiet flag.
- `components/arena/player/reward-popup.tsx` — tampilan gabungan XP+Koin, timeout otomatis, aria-live, safe-area.
- `components/arena/player/player-overlay.tsx` — serialisasi LevelUp/RankUp.
- `components/arena/player/daily-quest-card.tsx` + `achievement-grid.tsx` — claim memakai identity (bukan refresh-diff dobel).
- `scripts/test-notification-system.ts` (BARU) + package.json.
- `components/game/KuisTempurSolo.tsx` — hanya bila quiet mode butuh sinyal fase (opsional; bisa via context global "in game").

## O. Files That Must NOT Change
`prisma/`, `app/api/` (kecuali TIDAK diperlukan — semuanya client-side), `lib/gamification/`, `lib/learning-loop/`, `engines/`, `lib/apk.ts`, `lib/xp.ts`, `lib/coins.ts`, `lib/award-xp.ts`, `bottom-nav.tsx`. XP/Coin/reward calculation SERVER 100% tidak disentuh.

## P. Test Plan (`test:notification-system`, 18 asersi directive §16)
1 XP render · 2 Coin render · 3 gabungan event sama · 4 queue berurutan · 5 dedupe identity · 6 tidak overlap · 7 prioritas level-up · 8 light · 9 dark · 10 mobile width · 11 safe-area · 12 game compatibility (quiet mode) · 13 reduced motion · 14 aria-live · 15 dismiss/timeout · 16 rerender tidak duplikat · 17 polling tidak duplikat · 18 focus tidak duplikat. (Statik + logic murni pada fungsi queue yang akan di-extract — pola sama test suites existing.)

## Q. Risk Assessment
- **Rendah**: perubahan murni klien (presentasi + queue), server/XP/Coin tidak disentuh, protected zones 0 diff.
- **Sedang**: perilaku popup berubah (timeout/gabungan) — perlu QA visual founder di 390–1440 light/dark + semua game.
- **Perhatian**: `refresh()` setelah claim dipakai juga untuk memperbarui angka — perubahan diff-skip harus tetap memperbarui profil (hanya skip POPUP, bukan state).

---

**STOP DI SINI — menunggu approval Founder untuk fase implementasi.**

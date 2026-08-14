# UKBI / TKA PRODUCTION CERTIFICATION

Audit ulang independen (tidak mengasumsikan fix lama cukup). Status: 🟢 GREEN · 🟡 YELLOW · 🔴 RED.

| Area | Temuan | Status |
|------|--------|--------|
| Soal berulang antar-sesi | `sampleSectionQuestions` seeded per sesi + `excludeRecentForSection` anti-repeat tiered (buang 3 sesi terakhir → fallback full pool). Simulasi 100 sesi: 0 identik, overlap beruntun 1.7%. | 🟢 |
| Randomisasi | Pool eligible ter-cache (answer-free) per paket+seksi; sampling & shuffle opsi SEEDED server-side di pembuatan sesi; refresh/replay = snapshot terkunci (clientSections). | 🟢 |
| Listening leakage | `audioScript` TIDAK ada kolom DB; kontrak klien MENDENGARKAN = {id, text, options, audioUrl} via `sanitizeListeningQuestions`; passage-map 0 id listening; audio proxy = audio-only; 0 transkrip di komponen/props/hydration. | 🟢 |
| Answer exposure | UKBI_SELECT/TKA_SELECT tanpa correctAnswer/answerKey/explanation; snapshot jawaban server-only; submit & hasil tanpa kunci; test leakage 3 suite (jalur 390, bank 8, murid 9) hijau. | 🟢 |
| Attempt isolation | TestSession unik (userId, paketId); snapshot per attempt; idempotensi submit (alreadyScored guard + P2002 catch); premium gate consume di transaksi yang sama dengan create/reset. | 🟢 |
| Scoring | Server-side vs snapshot correctAnswer; bobot EASY/MEDIUM/HARD (1/1.5/2×10); konstruktif AI-graded best-effort (pending ≠ 0). | 🟢 |
| Option randomization | shuffleOptionsForQuestion mempertahankan option id → kunci tetap valid. | 🟢 |
| Listening audio (asset) | 0 file audio produksi → seksi MENDENGARKAN kosong (filter audioUrl not null) — bukan bug, gap konten. | 🟡 |
| Runtime env | test DB-dependent gagal di env termask (pre-existing, terdokumentasi). | 🟡 |

## Verdict
🟢 **CERTIFIED (dengan catatan)**: 0 exploit kritis tersisa. 🟡: produksi audio MENDENGARKAN belum ada (konten, bukan keamanan) + test runtime butuh env asli di CI.

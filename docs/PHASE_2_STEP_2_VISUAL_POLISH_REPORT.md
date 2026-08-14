# PHASE 2B — STUDENT HOME VISUAL POLISH REPORT

Scope: visual/UX only untuk `/murid/beranda`. Business logic, Learning Loop, Premium Economy, API, database, dan authentication tidak diubah.

# Before
- Student Home terasa seperti dashboard SaaS dengan banyak raised card, gradient, shadow, dan warna aksen yang bersaing.
- Hero identitas memakai container berat.
- Mentor memakai gradient biru/ungu besar.
- Seksi sekunder (Perjalanan, Ruang Belajar, Simulasi, Karya, Kabar) tampil sebagai kartu yang relatif setara.
- Background light terlalu dekoratif dan tombol sekunder berbentuk pill.

# After
- Background light menjadi warm white dengan atmosfer lavender yang sangat halus.
- Identitas siswa menjadi area editorial ringan dengan whitespace.
- Aksi Hari Ini tetap menjadi satu-satunya focal point dengan surface tenang, typography besar, dan aksen kiri.
- Mentor menjadi catatan personal ringkas tanpa gradient besar.
- SkillRadar menjadi progress section yang lebih bersih.
- Arena menjadi baris motivasi kompak.
- Premium menjadi value layer kecil, bukan sales card.
- Perjalanan, Ruang Belajar, Simulasi, Karya, dan Kabar menggunakan grouped rows/rules, bukan kumpulan kartu besar.

# Design Changes
- Scoped visual token override pada `.px-theme-app`; Arena theme navy di luar Student Home tidak disentuh.
- Surface light: putih hangat/transparan, border tipis, shadow sangat ringan, radius konsisten.
- CTA utama: orange solid dengan radius medium-large, bukan gradient pill.
- CTA sekunder: outline/ghost dengan radius medium.
- Chip streak/koin/XP dibuat lebih netral dan tidak seperti badge game besar.
- Gradient dekoratif besar di hero, mentor, Arena, Ruang Belajar, dan AI BC dihilangkan atau dikurangi.
- Typography memakai semibold dan tracking editorial; bold berlebihan dikurangi.
- Pill tetap dipakai untuk metadata/status kecil saja.

# Component Changes
- `app/(dashboard)/murid/beranda/page.tsx`: spacing antar kelompok dinaikkan dari `space-y-6` ke `space-y-8`; hierarchy logic/rendering tetap.
- `app/arena/player-theme.css`: scoped Student Home surfaces, buttons, chips, skeleton, mentor note, progress bar, dan section rules.
- `StudentHomeHero.tsx`: container diringankan, avatar 48px, heading editorial, decorative blob dihapus.
- `ContinueLearningCard.tsx`: hero aksi lebih besar, dekorasi dikurangi; semua state dan API tetap sama.
- `MentorCard.tsx`: gradient besar diganti quiet note; insight rule-based tetap sama, hanya dua insight ditampilkan secara visual.
- `SkillRadar.tsx`: header/icon/bar diringankan; data, empty state, dan retry tetap sama.
- `ArenaHomeSection.tsx`: icon dan row dipadatkan; data XP/rank/title dan route tetap sama.
- `PremiumValueCard.tsx`: icon/surface dibuat tenang; status entitlement dan pesan free/PRO tetap server-authoritative.
- `AIBCHomeCard.tsx`: gradient besar dihapus, CTA tetap sekunder.
- `LearningJourneySection.tsx`: tiles menjadi compact navigation rows.
- `RuangBelajarSection.tsx`: dua kartu besar menjadi grouped rows dengan CTA ghost.
- `SimulasiUjianSection.tsx`: tool cards menjadi daftar/grid ringan dengan link teks.
- `RecentWorksSection.tsx`: karya menjadi horizontal-style grouped rows; metadata tetap.
- `SecondaryLearningInfo.tsx`: Kabar Kelas menjadi calm information section tanpa raised card.

# Responsive Changes
- Struktur existing mobile-first dipertahankan: `grid-cols-1` sebagai default, lalu breakpoint `sm/md/xl`.
- CTA utama tetap full-width/terlihat pada mobile melalui layout flex column.
- Secondary rows stack pada mobile dan menjadi grid pada desktop.
- Tidak ada fixed width baru; container tetap `max-w-[1200px]`.
- `truncate` dan `line-clamp` tetap menjaga title panjang tidak menyebabkan overflow.
- Target manual Founder QA: 390px, 375px, 768px, 1280px, 1440px.

# Accessibility
- Semantic headings, links, buttons, dan existing `aria-label` dipertahankan.
- CTA utama tetap berupa link/button yang valid, bukan div klik.
- Status tidak dikomunikasikan lewat warna saja; teks tetap tersedia.
- Focus behavior existing tidak dihapus.
- Tidak ada icon artwork baru atau library icon baru.

# Regression Tests
| Command | Result |
|---------|--------|
| `npm run test:my-day-home` | ✅ 34/34 |
| `npm run test:student-home` | ✅ 61/61 |
| `npm run test:student-shell` | ✅ 34/34 |
| `npm run test:student-consolidation` | ✅ 19/19 |
| `npm run test:premium-production` | ✅ 24/24 |
| `npm run test:premium-economy` | ✅ LULUS |
| `npm run test:gamification-engine` | ✅ LULUS |
| `npm run test:simulation-workflow` | ✅ 63/63 |
| `npm run test:arena-web` | ✅ 56/56 |
| `npm run test:arena-chat` | ✅ 94/94 |
| `npx tsc --noEmit` | ✅ exit 0 |
| ESLint changed TSX files | ✅ 0 errors |
| `npm run build` | ✅ exit 0 |
| `git diff --check` | ✅ bersih |

# Browser Verification
**BROWSER VERIFICATION = NOT AVAILABLE**. Tidak ada browser automation yang tersedia dalam environment ini. Tidak ada klaim visual runtime dibuat.

# Known Limitations
1. Visual rendering belum diverifikasi langsung pada 390px/375px/768px/1280px/1440px.
2. Premium murid belum memiliki halaman upgrade khusus; polish hanya mempertahankan value layer yang sudah ada tanpa membuat route baru.
3. Dark mode mempertahankan bahasa visual existing; polish paling signifikan ditujukan pada Student Home light mode/iOS Edu.
4. `item.accent` data metadata pada komponen simulasi masih ada karena tidak mengubah data/logic, tetapi tidak lagi dipakai untuk gradient visual.

# Classification
**VISUAL POLISH: YELLOW**

Reason: implementasi visual selesai, seluruh regresi hijau, dan tidak ada perubahan business logic; browser verification runtime masih perlu dilakukan manual oleh Founder.

Tidak ada commit dan tidak ada push.

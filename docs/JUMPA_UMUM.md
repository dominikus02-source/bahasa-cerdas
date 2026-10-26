# JUMPA untuk akun UMUM

Akun **UMUM** (mahasiswa, dosen, masyarakat umum) memakai JUMPA **berdiri sendiri**:
tanpa kelas, tanpa komunitas MGMP. Guru dan murid yang diberi tautan/kode boleh ikut sebagai
peserta (lihat "Siapa boleh apa"). Fitur ruang (lobi, ruang video,
obrolan, moderasi host, token LiveKit, tutup-otomatis ruang kosong) dipakai ulang apa adanya.

## Gerbang (flag)

Semua perilaku di bawah hanya aktif bila **kedua** flag menyala:

| Flag | Default | Peran |
|---|---|---|
| `NEXT_PUBLIC_JUMPA_ENABLED` | mati | JUMPA secara umum (`jumpaDisabledResponse`) |
| `ENABLE_ROLE_UMUM` | **mati** | Peran efektif JUMPA `UMUM` (`loadActor` → `umumEnabled`) |

Saat `ENABLE_ROLE_UMUM` mati, `effectiveRole()` untuk akun UMUM tetap `null`, jadi membuat &
masuk ruang ditolak `403 ROLE_NOT_ALLOWED "Akun ini belum bisa memakai JUMPA."` (perilaku lama).
Beranda `/jumpa` untuk akun UMUM lalu hanya menampilkan "Ruang JUMPA untuk akun umum belum
dibuka." tanpa ketentuan kelas/murid.

## Jenis ruang `UMUM`

- Migrasi aditif `prisma/migrations/20261026000000_jumpa_room_kind_umum`:
  `ALTER TYPE "JumpaRoomKind" ADD VALUE IF NOT EXISTS 'UMUM'`. Tidak ada kolom/baris yang
  diubah. Rollback: biarkan nilai enum (Postgres tidak bisa `DROP VALUE`); matikan flag.
- `POST /api/jumpa/rooms` `{ kind: "UMUM", title? }` — tanpa `groupId`/`communityId`,
  `mode = MEETING`, `notifyClass = false`, `creatorRole = UMUM`.
- Tidak bisa dijadwalkan (`KIND_NOT_SCHEDULABLE`), tidak ada webinar (`WEBINAR_NOT_AVAILABLE`),
  tidak ada notifikasi siaran (`noticeAudience` / `notifyRoomLive` → kosong).

## Siapa boleh apa — `lib/jumpa/permissions.ts`

Keputusan founder (2026-10-26): **akun BahasaCerdas mana pun yang login dan memegang tautan
atau kode ruang UMUM boleh masuk sebagai peserta**. Isolasi kini **satu arah**: akun UMUM
tetap tidak pernah masuk ruang sekolah.

| Penonton \ Ruang | KELAS | GURU | MURID | UMUM |
|---|---|---|---|---|
| UMUM | ❌ | ❌ | ❌ | ✅ tautan/kode (pembuat = HOST) |
| GURU | (aturan lama) | (aturan lama) | (aturan lama) | ✅ tautan/kode → **MEMBER** |
| Founder | (aturan lama) | (aturan lama) | (aturan lama) | ✅ tautan/kode → **MEMBER** (peran efektif GURU) |
| MURID | (aturan lama) | ❌ | (aturan lama) | ✅ tautan/kode → **MEMBER** + pengingat lobi |
| Murid **Junior** (TK–SD) | (aturan lama) | ❌ | ❌ | ❌ `JUNIOR_NOT_ALLOWED` |
| ADMIN non-founder | ❌ | ❌ | ❌ | ❌ (tidak berubah: tanpa peran JUMPA) |

| Tindakan | Akun UMUM | Guru / founder / murid |
|---|---|---|
| **Membuat** ruang UMUM | ✅ (pagar paket & penyalahgunaan) | ❌ `ROLE_NOT_ALLOWED` |
| Masuk ruang UMUM (tautan/kode) | ✅ | ✅ sebagai MEMBER |
| Kuasa pemandu di ruang UMUM (bisukan, keluarkan, kunci, akhiri, hapus obrolan orang lain) | HOST/COHOST saja | ❌ tidak pernah (COHOST tersimpan pun diabaikan) |
| Dijadikan wakil pemandu (`SET_COHOST`) di ruang UMUM | ✅ | ❌ `BAD_TARGET` |
| Dikenai tindakan pemandu UMUM (bisukan/keluarkan) | ✅ | ✅ |
| Mengundang ke ruang UMUM | pemandu: tautan/kode saja | ❌ (tanpa direktori, tanpa lembar bagikan) |
| Berbagi layar di ruang UMUM | ✅ | guru ✅, murid ❌ (kamera + mik) |
| "Laporkan" | ✅ → admin | ✅ → admin |
| Masuk KELAS/GURU/MURID | ❌ `ROLE_NOT_ALLOWED` | aturan lama (tidak berubah) |

Rincian penerapan:

- `umumIsolation()` hanya menolak **UMUM → ruang sekolah**, sebelum semua relasi.
- `evaluateJoin` ruang UMUM: flag `ENABLE_ROLE_UMUM` mati → ruang UMUM tertutup untuk **semua**
  akun (`loadActor` kini mengisi `umumEnabled` untuk setiap akun; `effectiveRole` tetap hanya
  memberi `UMUM` pada akun ber-Role UMUM). Murid Junior ditolak (`JUMPA_UMUM_ALLOW_JUNIOR = false`).
  Pemegang tautan/kode → `MEMBER/LINK`; `HOST` hanya pembuat (selalu akun UMUM). Ruang
  dikunci, penuh (10), dikeluarkan, kedaluwarsa → ditolak seperti biasa.
- `canModerate`: kuasa di ruang UMUM hanya untuk aktor UMUM (HOST/COHOST). Sasaran boleh
  guru/murid; `SET_COHOST` tetap khusus sasaran UMUM.
- `canInvite`: ruang UMUM → `LINK` dari pemandu UMUM saja; `searchInvitees` → kosong.
- UI (`JumpaRoomView`, `RoomPanels`, obrolan server): "pemandu dewasa" di ruang UMUM = akun
  UMUM saja, jadi guru peserta tidak melihat kontrol pemandu.

### Tidak pernah didaftarkan ke guru/murid

Ruang UMUM tidak muncul di beranda/riwayat JUMPA guru/murid (jenis ruang mereka tetap
`KELAS/GURU/MURID`), tidak ada notifikasi siaran (`noticeAudience` → kosong), tidak bisa
dijadwalkan, dan tidak ada pencarian pengguna. Satu-satunya jalan masuk: tautan atau kode
yang dibagikan langsung.

### Perlindungan murid

- **Pengingat lobi**: murid yang membuka ruang UMUM melihat "Ruang ini dibuat akun umum,
  bukan kelasmu. Jangan bagikan data pribadi (nomor HP, alamat, sekolah). Kalau ada yang
  membuatmu tidak nyaman, keluar dan tekan Laporkan." Tautan `?u=` **tidak** auto-join untuk
  murid, supaya pengingat selalu terbaca sebelum masuk.
- Pemandu bisa membisukan, mengeluarkan (tidak bisa masuk lagi) dan mengunci ruang.
- "Laporkan" tersedia untuk setiap peserta (termasuk yang sudah dikeluarkan) dan hanya
  dikirim ke admin/founder, bukan ke pemandu UMUM.
- Data murid yang terlihat peserta lain: nama tampilan (panggilan atau nama lengkap) +
  inisial dan label peran "Murid". Foto profil murid **tidak** dikirim di ruang UMUM (token
  `avatar: null`). Tidak ada email, kelas, sekolah, atau data akun lain. Ringkasan kehadiran
  untuk pembuat juga hanya nama + menit.

### Keputusan: kode ruang = undangan (seperti Meet)

`JUMPA_UMUM_CODE_JOIN = true`: akun BC yang login dan tahu kode `xxx-xxxx-xxx` (≈ 8·10¹⁴
kemungkinan) bisa masuk, karena tugasnya "undang lewat tautan atau kode". Mitigasi: hanya akun
yang login, batas 10 orang, host bisa kunci/keluarkan, rate limit, ruang kosong tutup otomatis.
Bisa diperketat (hanya tautan `?u=` 24 jam) dengan mengubah konstanta ke `false`.

### Undangan

Ruang UMUM hanya bisa dibagikan lewat **tautan/kode** (`canInvite` → `LINK` saja). Tidak ada
pencarian/direktori pengguna (`searchInvitees` → kosong) agar akun publik tidak bisa
dienumerasi. Laporan ("Laporkan") di ruang UMUM hanya ke admin.

## Paket Gratis UMUM — `lib/jumpa/tiers.ts`

| | Gratis (aktif) | `UMUM_PREMIUM` (kait, **mati**) |
|---|---|---|
| Peserta | 10 | 25 |
| Durasi | 45 menit | 120 menit |
| Video | 720p | 1080p |
| Ruang/hari | 3 (hari WIB) | tanpa batas |
| Webinar | tidak ada | tidak ada |

Ruang UMUM selalu `tier = FREE` dan tidak membaca langganan → pembayaran tidak tersentuh.
`JUMPA_UMUM_PREMIUM_ENABLED = false`; jangan nyalakan sebelum ada alur bayar UMUM.

## Pagar penyalahgunaan — `lib/jumpa/caps.ts` + `createUmumRoom`

Urutan dalam satu transaksi dengan `pg_advisory_xact_lock` (serialisasi antar-permintaan):

1. Ruang aktif milik sendiri dengan sisa > 5 menit → dipakai ulang (`reused: true`).
2. **Satu ruang aktif per akun** → selain itu `409 TOO_MANY_ROOMS`.
3. **Kuota harian** 3 ruang → `429 TIER_DAILY_LIMIT` (tanpa ajakan upgrade).
4. **Batas global** ruang UMUM aktif bersamaan: env `JUMPA_UMUM_MAX_CONCURRENT_ROOMS`
   (default 50; nilai tidak valid → 50; `0` = tutup sementara; maks 10000) →
   `429 UMUM_CAPACITY_FULL` "JUMPA sedang ramai sekali. Semua ruang umum sedang terpakai,
   coba lagi beberapa menit lagi ya."

"Aktif" = sudah mulai dan belum melewati durasi, atau belum mulai dan dibuat ≤ 3 jam lalu.
Catatan: ruang yang ditutup LiveKit karena kosong lalu dibuka lagi oleh host tidak melewati
pagar global lagi, jadi angka nyata bisa sedikit di atas batas (sementara, ≤ durasi ruang).

Tetap berlaku seperti sebelumnya: rate limit `jumpa-create` 10/menit, tutup-otomatis ruang
kosong, TTL token LiveKit.

## Beranda `/jumpa` untuk UMUM

- Kartu **"Mulai ruang baru"** (topik opsional, batas paket & sisa ruang hari ini).
- Ketentuan JUMPA versi UMUM (tanpa batas kelas/murid/webinar).
- "Dasbor" → `/umum`. Tampilan guru & murid tidak berubah.

## Pengujian

`npm run test:jumpa-umum` (murni): buat/masuk, guru/founder/murid masuk ruang UMUM lewat
tautan/kode sebagai MEMBER tanpa kuasa pemandu, tolak buat ruang UMUM & undangan direktori,
UMUM ✕ ruang sekolah, murid Junior ditolak, flag mati, satu ruang aktif, batas global, kuota harian, paket, moderasi, undangan.

E2E lokal (Postgres lokal, Supabase tiruan, LiveKit tiruan, tanpa kunci produksi): murid
membuka tautan → lobi dengan catatan keamanan (tidak gabung otomatis) → gabung → token
MEMBER/MURID (kamera+mik, tanpa foto profil); guru membuka tautan → token MEMBER/GURU;
guru/murid tidak bisa undang lewat direktori, moderasi, atau buat ruang UMUM; laporan
peserta tersimpan; host mengeluarkan murid → `REMOVED`; akun UMUM ke ruang KELAS → 403.

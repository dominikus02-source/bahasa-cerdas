# JUMPA untuk akun UMUM

Akun **UMUM** (mahasiswa, dosen, masyarakat umum) memakai JUMPA **berdiri sendiri**:
tanpa kelas, tanpa guru/murid, tanpa komunitas MGMP. Fitur ruang (lobi, ruang video,
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

## Isolasi (dua arah) — `lib/jumpa/permissions.ts`

| Penonton \ Ruang | KELAS | GURU | MURID | UMUM |
|---|---|---|---|---|
| UMUM | ❌ | ❌ | ❌ | ✅ (tautan/kode) |
| MURID | (aturan lama) | ❌ | (aturan lama) | ❌ "Ruang ini khusus akun umum." |
| GURU | (aturan lama) | (aturan lama) | (aturan lama) | ❌ **default** |
| Founder | (aturan lama) | (aturan lama) | (aturan lama) | ❌ **default** |
| ADMIN non-founder | ❌ | ❌ | ❌ | ❌ |

`umumIsolation()` berjalan **sebelum** semua relasi (pembuat, undangan, tautan, peserta lama),
jadi tidak ada jalur masuk silang. Hal yang sama berlaku di `canCreateRoom`, `canModerate`
(host guru tidak punya kuasa di ruang UMUM dan sebaliknya), `canInvite` dan `publishSourcesFor`.

### Keputusan: GURU tidak bisa masuk ruang UMUM (default **TIDAK**)

- Ruang UMUM adalah ruang antar-orang-dewasa di luar sekolah; guru yang ingin ikut cukup
  memakai akun UMUM terpisah. Menjaga satu identitas = satu konteks mencegah akun guru (yang
  terhubung ke murid) dipakai sebagai jembatan antara publik dan kelas.
- Founder juga ditolak sebagai peserta; pemantauan tetap lewat panel admin / log ruang.
- Membuka akses guru nanti = ubah `umumIsolation()` + tes `test:jumpa-umum` §4 dengan sengaja.

### Keputusan: kode ruang = undangan (seperti Meet)

`JUMPA_UMUM_CODE_JOIN = true`: akun UMUM yang tahu kode `xxx-xxxx-xxx` (≈ 8·10¹⁴ kemungkinan)
bisa masuk, karena tugasnya "undang lewat tautan atau kode". Mitigasi: hanya akun UMUM yang
login, batas 10 orang, host bisa kunci/keluarkan, rate limit, ruang kosong tutup otomatis.
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

`npm run test:jumpa-umum` (murni): buat/masuk, isolasi MURID↔UMUM & GURU/founder↔UMUM,
flag mati, satu ruang aktif, batas global, kuota harian, paket, moderasi, undangan.

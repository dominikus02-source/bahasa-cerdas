# TAHAP: Teacher Experience Polish — keputusan desain terkunci

## Scope
- 2 area: Hero `/guru/beranda` + Bank Soal sebagai Content Discovery Hub.
- Bukan fitur baru; Main Bersama engine/API/realtime tidak disentuh.

## Hero (TeacherCommandCenter)
- 3 zona: TOP greeting+badge, MIDDLE 3 metrik (Tugas/Kelas/Siswa, data sama),
  BOTTOM action bar 4 tombol: Buat Materi, AI BC, Main Bersama, Dasbor Murid.
- Main Bersama = featured (accent surface teal + chip "Live"), ikon MonitorPlay.
- Dasbor Murid pindah dari kanan atas → action bar.
- Visual: gradient mint→lavender sangat halus, 2 blob abstrak, tanpa mascot/asset.
- Tidak ada font baru; token CSS siap diganti owner.

## Bank Soal
- Header hidup + stats strip compact + search prominent + 4 tab existing tetap.
- Discovery shelves sebelum grid: Jelajahi Tema (editorial), Coba di Main Bersama
  (hanya soalset guru dengan struktur PG valid — verified, bukan klaim),
  Pilihan Berdasarkan Kategori.
- Category sections: Tata Bahasa / Sastra / Jenis Teks / Fungsional / Lainnya,
  subtitle deskriptif, ThemeCard prosedural.
- Cover prosedural: palet per kategori (emerald/teal, violet/magenta, blue/cyan,
  amber/orange, indigo/slate) + variasi pattern via themeCode hash — deterministik.
- Interaksi handoff ke Main Bersama: `POST` ulang with `themeId` (contextual,
  tervalidasi; SoalSet pribadi vs tema publik tidak bisa dipreselect via URL
  publik — kompatibilitas selalu dihitung server-side).
- Latihan Saya tetap di bawah dengan hierarchy lebih baik.

## Non-goals
- Tidak ada engine/API/persistence/auth/Prisma schema berubah.
- Tidak ada asset final/mascot/font custom.

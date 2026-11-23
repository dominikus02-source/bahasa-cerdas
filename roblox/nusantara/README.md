# NUSANTARA: Kebangkitan Bahasa — Roblox (prototipe v0.1)

Port awal dari **GimNusantara_v9.3_Playable.html**. Sumber desain dan data: 8 wilayah, 8 NPC, 3 rahasia, 7 jenis kuis bahasa dan arena Penjaga Makna.

## Menjalankan
1. Instal **Roblox Studio** dan **Rojo** (plugin Studio + CLI sesuai versi terbaru).
2. Buka template Baseplate di Studio, lalu di folder ini jalankan `rojo serve default.project.json`.
3. Hubungkan plugin Rojo di Studio, lakukan sinkronisasi, lalu **Play**.
4. Untuk memublikasikan, masuk ke akun Roblox pemilik, pilih **File → Publish to Roblox As…**, isi nama dan deskripsi experience, kemudian atur visibilitas/audience di Creator Dashboard sesuai persyaratan Roblox.

## Yang tersedia
- Pulau 3D, 8 wilayah terinspirasi tata letak v9.3, warna dan landmark masing-masing.
- 8 NPC dengan interaksi ProximityPrompt (tombol E di PC / tombol sentuh pada mobile).
- Kuis interaktif; validasi jawaban, XP dan level dihitung server.
- 3 area rahasia dengan XP penemuan; eksplorasi wilayah memberi XP.
- GUI untuk PC dan perangkat seluler, kuis final Penjaga Makna.
- Semua aset 3D awal dibuat dari primitive Roblox tanpa unduhan model eksternal.

## Batasan prototipe (belum setara HTML)
- Belum termasuk seluruh bank soal bertingkat, skill tempur, semua quest branching, data save lintas sesi, multiplayer room HTML, cutscene, cuaca dan musik.
- Data pemain masih tersimpan di memori server; belum ada DataStore.
- Belum diuji live di server Roblox dan **belum dipublikasikan**. GitHub publik ≠ experience Roblox publik.
- Proyek terisolasi di `roblox/nusantara/` agar tidak memengaruhi web produksi BahasaCerdas.

## Sumber
Original: `GimNusantara_v9.3_Playable.html` (arsip yang ditemukan di Library proyek pengguna); versi Roblox adalah adaptasi native Luau, bukan menjalankan HTML/Three.js di Roblox.

# Soal milik guru untuk Main Bersama

## Riset alur produk (2 Oktober 2026)

- Kahoot: penulisan manual dan impor PDF; pertanyaan, pilihan, serta kunci bisa diperiksa di editor sebelum dimainkan. https://support.kahoot.com/hc/en-us/articles/115002884788-How-to-make-a-kahoot
- Blooket: judul paket, tambah soal dan tandai jawaban; impor CSV bertemplate dilanjutkan ke editor. Paket privat tetap dapat dipakai untuk host permainan. https://help.blooket.com/hc/en-us/articles/15980599804823-How-to-Create-a-Blooket-Question-Set dan https://help.blooket.com/hc/en-us/articles/16002377931543-How-to-Import-Questions-from-a-Spreadsheet-into-Blooket
- Quizizz/Wayground: unggah dokumen atau tempel soal, edit hasil, lalu publish. Mendukung PDF dan DOCX, dengan instruksi memeriksa hasil ekstraksi. https://help.wayground.com/support/solutions/articles/158000405095-wayground-ai-turn-worksheets-question-banks-more-into-interactive-assessments

Penerapan: sumber soal → editor yang sama → konfirmasi kunci → simpan dan otomatis pilih untuk Main Bersama. Tidak menyalin branding atau memperkenalkan pilihan game tambahan.

## Implementasi

Editor langsung di langkah Pilih Paket Soal; tidak perlu pindah tab. Input manual, PDF/DOCX, dan tempel teks; 2–5 pilihan per soal dengan satu jawaban benar, pembahasan opsional, maksimum 50 soal. Paket panjang memakai kartu soal yang bisa dilipat. Indikator soal terisi membantu pemeriksaan. Menutup editor tetap mempertahankan isinya selama halaman terbuka; reload belum menyimpan draft.

PDF/DOCX dibaca di server lalu dikembalikan sebagai draft, tanpa menebak kunci atau menghasilkan pertanyaan baru. Format parser: nomor 1. / 1), pilihan A. / A), Jawaban: A; kunci terpisah Kunci Jawaban dan 1. A. Teks asli selalu tersedia untuk pemeriksaan format/bacaan yang tidak dikenali. Tidak ada OCR, ekstraksi gambar, atau jaminan layout tabel/multikolom; dokumen yang formatnya berbeda perlu dirapikan melalui teks sumber atau editor. Batas dokumen 3 MB, PDF 100 halaman, teks 100.000 karakter. Batas di bawah payload Vercel.

Simpan menggunakan SoalSet/Soal yang sudah ada, create nested atomic; creatorId dan uploaderId dari akun guru terverifikasi server, bukan request. Source adapter untuk cek kompatibilitas dan pembuatan sesi membatasi paket ke milik actor atau paket yang sudah publik; ID paket privat guru lain ditolak. Privat secara default; tidak ada publikasi atau salinan untuk guru lain pada tahap ini. Urutan editor dipertahankan untuk source adapter; engine membuat snapshot soal untuk sesi seperti sebelumnya. Tidak ada perubahan schema.

PDF parser modern dipasang dengan alias pdf-parse-modern agar ekstraksi baru bekerja pada PDF modern tanpa mengubah pemakai pdf-parse 1.x yang lama. Dependency canvas dan worker PDF dimasukkan eksplisit ke tracing fungsi Vercel agar parser dapat dimuat di produksi. Parser dibersihkan dengan destroy pada success/error, evaluasi JS PDF dimatikan.

## Verifikasi

- Parser: kunci hilang, nomor sumber bukan 1, dua soal dan pembahasan.
- Validasi: review wajib, kunci valid, pilihan berbeda, paket nonkosong.
- DOCX dan PDF nyata dibuat dari fixture dan dibaca ulang; file palsu/kelebihan ukuran ditolak.
- DB lokal mbtest: kepemilikan, privat, nested save, urutan dan kompatibilitas adapter Main Bersama; input invalid tidak menghasilkan paket.
- UI browser: editor terbuka, tempel teks menghasilkan draft dan kunci; validasi tanpa review; pemeriksaan mobile.


## Mixed question types — October 2, 2026

The question studio now offers three explicit cards: Pilihan ganda, Benar / salah, Isian singkat. A package can mix types. True/false uses fixed Benar/Salah options. Short answers require a single key of up to 200 characters. Student UI provides a text input and an explicit submit button. Server scoring normalizes Unicode NFKC, case and repeated whitespace; it does not use fuzzy matching or AI grading.

No schema migration. Soal.type uses existing enums. For isian, Soal.options is empty and correctAnswer contains the key. Existing one-option/index-key Bank Soal isian is adapted to text. Runtime short-answer snapshots have no public options; their private correctOptionId field stores accepted text, and the existing selectedOptionId transport/persistence field stores the submitted text for this type. Keys are revealed only in discussion/final views. Teacher, classroom, projector and student reveal render text keys.

Text/PDF/DOCX import recognizes explicit `Jenis: Benar Salah` + `Jawaban: Benar`, or `Jenis: Isian Singkat` + `Jawaban: kecil`. Existing multiple-choice import is retained. Switching type clears answer configuration while keeping the prompt, with an on-screen notice.

Reference: [Kahoot question types](https://support.kahoot.com/hc/en-us/articles/115002308428-Kahoot-question-types?page=1): explicit type selection, fixed true/false answers and text-answer interaction.

Verification: mixed-type parser/schema/adaptation, server correctness/deadline/key-isolation tests; both game modes and idempotent retries; real local PostgreSQL mixed package save/load/privacy; integration suite; game engine regression; desktop/mobile UI checks.

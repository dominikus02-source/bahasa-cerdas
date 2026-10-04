# SOP hak subjek data, pelaporan dan moderasi

## Permintaan privasi
Status: RECEIVED → PROCESSING → COMPLETED / REJECTED.

Jenis sistem: ACCESS, COPY, CORRECTION, RESTRICT, OTHER. Penghapusan akun memakai flow deletion tersendiri; withdrawal consent memakai guardian/privacy flow.

- Catat waktu masuk dan `deadlineAt` 72 jam.
- Verifikasi identitas/otoritas secara proporsional sebelum membuka data.
- Wali terverifikasi dapat bertindak untuk anak yang terhubung.
- Jangan mengirim dataset penuh ke email yang belum diverifikasi.
- Penolakan harus mempunyai alasan spesifik, dasar dan jalur keberatan.
- Setiap penyelesaian menyimpan reference/evidence secukupnya, bukan payload sensitif lengkap.

## Laporan keselamatan/konten
Prioritas internal:
- P0: keselamatan anak / eksploitasi / ancaman nyata — eskalasi segera.
- P1: doxxing, perundungan berat, akun diambil alih — target <=4 jam.
- P2: harassment / inappropriate content — target <=24 jam.
- P3: spam / sengketa rendah — target <=72 jam.

SLA di atas adalah target operasional internal, bukan angka hukum untuk semua kategori laporan.

Status: OPEN → REVIEWING → RESOLVED / ESCALATED. Keputusan dan moderator harus tercatat. Setelah masa retensi payload berakhir, detail/contact/reporter identifier diminimalkan sesuai retention sweep kecuali legal hold aktif.

## Escalation
Kasus yang menyangkut keselamatan anak, indikasi tindak pidana, breach atau ancaman fisik dipisahkan dari moderation biasa dan masuk incident/child-safety response.

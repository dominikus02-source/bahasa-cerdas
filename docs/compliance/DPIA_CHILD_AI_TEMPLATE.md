# DPIA data anak dan AI grading / assessment

Status: template pra-aktivasi, bukan penilaian yang telah disetujui. Pemilik: CV Obah Mamah. Versi, reviewer PDP, guru, perwakilan wali dan tanggal review harus diisi. UU PDP Pasal 34 menjadi dasar evaluasi risiko tinggi; asesmen dampak harus menggunakan konfigurasi serta praktik aktual.

## Proses yang dinilai

Akun umur 6–9 / 10–12 / 13–15 / 16–17; consent/verifikasi wali; kelas dan karya privat; progres/penskoran; rekaman; AI esai/assessment; profil/reward; Main Bersama tamu; integrasi vendor/transfer. Bedakan kuis kunci jawaban, rekomendasi diagnostik, dan AI constructed response. Telaah indikator Permenkomdigi 9/2026 serta Kepmen 142/2026 beserta perubahan 219/2026 menggunakan dokumen terbaru.

Isi: diagram sumber → aplikasi → DB/storage/cache → AI/payment/email → output guru/murid → backup → delete. Cantumkan data, kategori subjek, volume/frekuensi, usia, konteks sekolah, hubungan controller/processor/joint-controller, pihak yang melihat, negara, legal basis, retention, dan safeguards transfer.

## Kebutuhan dan proporsionalitas

- Apa manfaat pendidikan terukur? Bisakah proses dilakukan tanpa AI, tanpa identitas lengkap, tanpa rekaman, atau dengan pseudonim?
- Mengapa setiap data dibutuhkan? Jangan meminta KTP/biometrik hanya demi convenience. Metode assurance usia dan otoritas wali dipilih sesuai risiko; guru sendiri tidak menggantikan wali.
- Apakah consent per tujuan bebas, jelas, terbukti dan dapat dicabut? Bagaimana verifikasi/pembaruan versi, koreksi usia, pergantian wali, usia dewasa dan penghentian processor?
- Apakah murid tetap mendapat penilaian manual tanpa AI? Bagaimana guru melihat ketidakpastian, meninjau rubrik, mengubah dan mengesahkan nilai, serta menangani keberatan murid?

## Register risiko (isi setiap baris)

| Risiko | Probabilitas/dampak sebelum | Pengendalian | Bukti uji | Risiko sisa | Pemilik/batas waktu |
|---|---|---|---|---|---|
| Anak menyamar dewasa atau wali palsu | Isi | DOB terkunci; email wali; review independen; jalur koreksi | Adversarial test dan record verifikasi | Isi | Isi |
| Profil/karya/rekaman anak terbuka | Isi | default privat; RLS; endpoint ownership/class; storage privat | Direct Data API + signed asset test + migrasi legacy | Isi | Isi |
| AI bias/hallucination dan nilai berdampak | Isi | advisory; rubric; human review; correction; no auto pass/fail | samples per jenjang/variasi bahasa + provider outage test | Isi | Isi |
| Vendor training/retensi atau transfer tidak sah | Isi | DPA; no-training; negara/subprocessor; transfer assessment; provider allowlist | kontrak/region/tes egress | Isi | Isi |
| Reidentifikasi melalui kelas/leaderboard/chat | Isi | minimisasi; audience terbatas; no stranger contact | role/class negative access tests | Isi | Isi |
| Aduan/breach terlambat | Isi | antrean; on-call; log bukti; tabletop tenggat | hasil drill | Isi | Isi |
| Penghapusan gagal/restore menghidupkan akun | Isi | tombstone; durable retry; backup replay | fault injection + restore drill | Isi | Isi |
| Gamifikasi mendorong penggunaan berlebihan | Isi | review streak/reward/notifications, jam belajar, no manipulative upsell | child/wali usability research | Isi | Isi |
| Guest Main Bersama tanpa consent sah | Isi | verifikasi sekolah/wali, pseudonim, credential expiry, retention session | classroom-consent audit | Isi | Isi |

## Keputusan

Catat konsultasi guru/wali/anak, mitigasi wajib, risiko sisa yang belum dapat diterima, penanggung jawab penerimaan risiko, status izin rilis, serta tanggal evaluasi ulang. Jangan isi hasil risiko rendah hanya karena produk pendidikan. Hasil per PLF harus mengikuti assessment/verifikasi otoritas yang berlaku. Material change (provider/model, publikasi, scope anak, monetisasi, fitur interaksi) memicu review ulang.

## Age-assurance evidence still required before child release
Test evasion by an actual child declaring an adult DOB or selecting teacher role. Self-declared adult DOB is not independently verified by this implementation; record residual risk, proportional additional assurance and applicable PLF requirements. Independently verify child DOB and guardian adulthood/authority against school or another suitable channel before reviewing consent. Do not treat email ownership as proof of adulthood or guardianship. Do not enable the child-readiness gate or describe age assurance as fully validated until this assessment is complete.

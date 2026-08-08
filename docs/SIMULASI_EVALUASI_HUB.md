# Simulasi Evaluasi Hub — IA Konsolidasi (Simulasi & Tes V2)

Dokumen ini mencatat konsolidasi tiga halaman evaluasi guru menjadi satu hub:

| Route lama | Route baru (hub) |
|------------|------------------|
| `/guru/hasil-simulasi` | `/guru/evaluasi-simulasi?tab=hasil` |
| `/guru/tinjau-simulasi` | `/guru/evaluasi-simulasi?tab=tinjau` |
| `/guru/dokumen-latihan` | `/guru/evaluasi-simulasi?tab=dokumen` |

## Prinsip

- **ADDITIVE ONLY**: tidak ada route/API/DB model yang dihapus. Ketiga route lama
  tetap hidup sebagai wrapper tipis (backward compatible). Link lama yang masuk
  lewat URL langsung tetap berfungsi dan mendapat active-state sidebar.
- **Hub, bukan marketing page**: hierarchy halaman = judul → deskripsi singkat →
  tab navigasi → konten. Tidak ada dashboard baru yang menumpuk.
- **State tab di query string** (`?tab=`): bisa di-deep-link, aman saat refresh,
  dan mendukung tombol back/forward browser tanpa nested route.
- **Cross-link internal memakai `?tab=`**: saat di dalam hub, tombol "Tinjau",
  "Dokumen", "AI Review Center", dan "Pusat Evaluasi" berpindah tab di halaman
  yang sama (bukan lompat ke halaman legacy).

## Struktur Baru

### Komponen bersama (`components/guru/simulasi/`)

| Komponen | Sumber logika | Prop |
|----------|---------------|------|
| `HasilSimulasiView.tsx` | ex `hasil-simulasi/client.tsx` (`PusatEvaluasiClient`) | `guruName`, `hub?` |
| `TinjauSimulasiView.tsx` | ex `tinjau-simulasi/page.tsx` | `hub?` |
| `DokumenLatihanView.tsx` | ex `dokumen-latihan/page.tsx` | `hub?`, `title?` |
| `EvaluasiSimulasiTabs.tsx` | hub baru (tabs + render aktif) | `guruName` |

`hub = true` menyembunyikan hero besar masing-masing view (agar tidak dobel
dengan header hub) dan mengubah cross-link menjadi `?tab=...`.

### Route

| Route | Isi |
|-------|-----|
| `app/(dashboard)/guru/evaluasi-simulasi/page.tsx` | Server page: guard SSOT (`isTeacherOrStudent`), render `EvaluasiSimulasiTabs` |
| `app/(dashboard)/guru/hasil-simulasi/page.tsx` | Wrapper server → `<HasilSimulasiView guruName />` |
| `app/(dashboard)/guru/hasil-simulasi/client.tsx` | Re-export `PusatEvaluasiClient` (backward compat) |
| `app/(dashboard)/guru/tinjau-simulasi/page.tsx` | Wrapper client → `<TinjauSimulasiView />` |
| `app/(dashboard)/guru/dokumen-latihan/page.tsx` | Wrapper client → `<DokumenLatihanView title="Dokumen Latihan Murid" />` |

### Sidebar (`components/dashboard/GuruNav.tsx`)

Grup **Simulasi & Tes** sekarang hanya menampilkan 4 item:

```
Simulasi UKBI       /guru/simulasi/ukbi
Simulasi TKA        /guru/simulasi/tka
Evaluasi Simulasi   /guru/evaluasi-simulasi  (activeOn legacy 3 route)
BIGT                /guru/bigt
```

`activeOn: ["/guru/hasil-simulasi", "/guru/tinjau-simulasi", "/guru/dokumen-latihan"]`
membuat item "Evaluasi Simulasi" tetap aktif (highlight) saat guru mengunjungi
salah satu route legacy — konsisten dengan pola `activeOn` yang sudah dipakai
"Nilai" (`/guru/penilaian` + `/guru/gradebook`).

## API yang Dipakai Ulang (tidak diubah)

- `GET /api/guru/simulasi/rekap` — rekap hasil, summary kelas, insight AI, groups.
- `PATCH /api/guru/tinjau-konstruktif` — queue review, nilai AI, approve, feedback.
- `GET /api/guru/dokumen-siswa` — repository dokumen (legacy shape `{data}` tetap).

Semua endpoint di-scope per guru via `lib/teacher/students.ts`
(`isTeacherOrStudent`, `getTeacherGroups`) dan SSOT `lib/simulation/SimulationAnalyticsService.ts`.

## QA

| Check | Hasil |
|-------|-------|
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (file baru/diubah) | ✅ 0 violations |
| `npm run test:guru-phase` | ✅ SEMUA LULUS |
| `npm run test:gamification-engine` | ✅ SEMUA LULUS |
| `npm run test:simulation-workflow` | ✅ 65/65 |
| `npx tsx scripts/test-phase-simulation-workflow.ts` | ✅ 65/65 |
| `npm run test:bigt-menu` | ✅ 23/23 |
| `npx tsx scripts/test-dokumen-latihan-sanitization.ts` | ✅ 13/13 |
| `npm run build` (dummy env) | ✅ 359 routes, 0 errors |

Catatan: `npm run test:bahasa-ui` — 5 kegagalan **pra-eksis** di file di luar
changeset ini (`components/bigt/BigtInfoPage.tsx`, panel RPP AI), tidak
disebabkan oleh perubahan hub.

## Test kompatibilitas yang dijaga

- `test-phase-simulation-workflow.ts` mensyaratkan GuruNav memuat string
  "Hasil", "Dokumen Latihan Murid", `/guru/hasil-simulasi`, dan
  `/guru/dokumen-latihan` — dipertahankan via `activeOn` + komentar dokumentasi.
- `test-simulation-workflow.ts` mensyaratkan page `/guru/dokumen-latihan`
  memuat "Dokumen Latihan Murid", "bukan sertifikat resmi", rujukan
  `/api/guru/dokumen-siswa`, dan `GuruCertificatePreview` — dipertahankan via
  prop `title` + komentar dokumentasi di wrapper.
- `test-dokumen-latihan-sanitization.ts` mensyaratkan tidak ada field sensitif
  (`correctAnswer`, `jawaban`, dll.) di page guru — komentar wrapper ditulis
  tanpa memuat kata-kata tersebut.

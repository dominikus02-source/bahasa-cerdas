# Master Bank Soal Bahasa Indonesia

## Arsitektur

```
data/question-bank/master/       ← JSON data files (50 tema × 30 soal)
├── spok.json
├── kalimat.json
├── cerpen.json
├── novel.json
├── puisi.json
└── ...

app/api/guru/latihan/pick/route.ts   ← Random pick from bank for guru
app/api/admin/bank-soal/route.ts     ← Admin stats & search
app/(dashboard)/admin/bank-soal/     ← Admin page
app/(dashboard)/guru/bank-soal/      ← Guru Latihan Harian (with source picker)

scripts/
├── build-question-bank-data.ts      ← Generate JSON data files
├── seed-question-bank.ts            ← Seed JSON → database
├── generate-question-bank-data.ts   ← AI batch generation (needs API keys)
```

### Database

Gunakan model `Soal` yang sudah ada. Field baru ditambahkan:

| Field | Type | Keterangan |
|-------|------|------------|
| `kodeSoal` | `String?` @unique | Kode unik: `BC-SPOK-0001` |
| `judul` | `String?` | Judul singkat soal |
| `semester` | `Int?` | Semester (1 atau 2) |
| `kompetensi` | `String?` | Kode KD (3.1, 3.2, dst) |
| `indikator` | `String?` | Indikator pencapaian |
| `levelBerpikir` | `Int?` | 1-5 (Pengetahuan→Evaluasi) |
| `kataKunci` | `String?` | JSON string array |
| `estimasiWaktu` | `Int?` | Detik |
| `usedCount` | `Int` @default(0) | Berapa kali soal dipakai |
| `correctCount` | `Int` @default(0) | Jawaban benar |
| `wrongCount` | `Int` @default(0) | Jawaban salah |
| `totalTimeSpent` | `Int` @default(0) | Total waktu pengerjaan |

## Cara Menambah Tema Baru

1. Buka `data/question-bank/master/`
2. Buat file `tema-baru.json`
3. Isi dengan array soal (lihat format di bawah)
4. Jalankan seeder: `npm run seed:question-bank`

Atau tambahkan ke `scripts/build-question-bank-data.ts` di array `themes`, lalu regenerate.

## Cara Menambah Soal ke Tema Existing

**Via JSON langsung:**
1. Buka `data/question-bank/master/{tema}.json`
2. Tambahkan objek baru ke array
3. Jalankan: `npm run seed:question-bank:build` lalu `npm run seed:question-bank`

**Via AI batch:**
```bash
npm run seed:question-bank:build:force   # rebuild all data files
npm run seed:question-bank               # seed to database
```

## Format Soal

```json
{
  "kodeSoal": "BC-SPOK-0001",
  "judul": "Identifikasi Subjek",
  "tema": "SPOK",
  "kelas": "7",
  "semester": 1,
  "kompetensi": "3.1",
  "indikator": "Mengidentifikasi subjek dalam kalimat",
  "difficulty": "MUDAH",
  "levelBerpikir": 1,
  "type": "PILIHAN_GANDA",
  "text": "Pertanyaan lengkap...",
  "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
  "correctAnswer": "0",
  "explanation": "Pembahasan lengkap...",
  "kataKunci": ["spok", "subjek"],
  "estimasiWaktu": 30,
  "isHOTS": false
}
```

**Tipe Soal:** `PILIHAN_GANDA`, `BENAR_SALAH`, `ISIAN_SINGKAT`

**Tingkat Kesulitan:** `MUDAH` (40%), `SEDANG` (40%), `SULIT` (20%)

**Level Berpikir:** 1=Pengetahuan, 2=Pemahaman, 3=Aplikasi, 4=Analisis, 5=Evaluasi

## Cara Maintenance

### Validasi data files
```bash
node -e "const fs=require('fs'); const dir='data/question-bank/master'; const files=fs.readdirSync(dir).filter(f=>f.endsWith('.json')); files.forEach(f=>{const d=JSON.parse(fs.readFileSync(dir+'/'+f,'utf-8')); console.log(f, d.length, 'soal');})"
```

### Update from 30 → 100 soal per tema
1. Edit `scripts/build-question-bank-data.ts` — ubah loop count dari 30 ke 100
2. Tambahkan konten soal baru di array `pgQuestions` untuk soal spesifik
3. Jalankan: `npm run seed:question-bank:build:force`
4. Seed: `npm run seed:question-bank`

### Audit struktur soal
```bash
npm run seed:question-bank:dry-run
```

## Distribusi Per Tema (Saat Ini)

| Tema | Soal | Tema | Soal |
|------|------|------|------|
| SPOK | 30 | Kalimat | 30 |
| Kalimat Efektif | 30 | Paragraf | 30 |
| Ide Pokok | 30 | Gagasan Utama | 30 |
| Simpulan | 30 | Sinonim | 30 |
| Antonim | 30 | Makna Kata | 30 |
| Imbuhan | 30 | Kata Baku | 30 |
| Kata Tidak Baku | 30 | PUEBI | 30 |
| Ejaan | 30 | Tanda Baca | 30 |
| Majas | 30 | Puisi | 30 |
| Pantun | 30 | Syair | 30 |
| Gurindam | 30 | Cerpen | 30 |
| Novel | 30 | Drama | 30 |
| Fabel | 30 | Legenda | 30 |
| Hikayat | 30 | Mitos | 30 |
| Cerita Inspiratif | 30 | Teks Deskripsi | 30 |
| Teks Narasi | 30 | Teks Eksposisi | 30 |
| Teks Eksplanasi | 30 | Teks Persuasi | 30 |
| Teks Argumentasi | 30 | Teks Prosedur | 30 |
| Teks Berita | 30 | Teks Editorial | 30 |
| Teks Ulasan | 30 | Resensi | 30 |
| Surat Pribadi | 30 | Surat Dinas | 30 |
| Proposal | 30 | Pidato | 30 |
| Poster | 30 | Iklan | 30 |
| Slogan | 30 | Artikel | 30 |
| Editorial | 30 | Anekdot | 30 |

**Total: 50 tema × 30 soal = 1.500 soal**

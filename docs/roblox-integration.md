# Integrasi Roblox — BahasaCerdas Kota Aksara

Kontrak untuk server permainan Roblox (`HttpService`). Pemain menautkan akun di web, lalu mengetik kode di dalam permainan. Permainan tidak boleh mengirim pemain ke situs luar.

Nilai bawaan (bisa ditimpa env):

| | |
|---|---|
| Nama | BahasaCerdas Kota Aksara |
| Universe ID | `10778759021` |
| Root place ID | `83804286143888` |
| URL publik | https://www.roblox.com/games/83804286143888 |

Tombol **Buka di Roblox** memakai `ROBLOX_EXPERIENCE_URL`. Kalau kosong, URL dirakit dari `ROBLOX_PLACE_ID`. Kalau itu juga kosong, yang dipakai URL publik di atas.

## Env produksi

Isi di `/opt/bahasacerdas/config/web.env` (bukan di repositori). `ROBLOX_SERVER_SECRET` hanya untuk server Roblox dan proses web. Jangan taruh di LocalScript atau ModuleScript yang direplikasi ke klien.

| Variabel | Bawaan | Fungsi |
|---|---|---|
| `ROBLOX_SERVER_SECRET` | kosong | Nilai Bearer. Sama dengan secret Roblox `BAHASACERDAS_ROBLOX_KEY`. |
| `ROBLOX_PLACE_ID` | `83804286143888` | Place id bila URL tidak diisi. |
| `ROBLOX_UNIVERSE_ID` | `10778759021` | Dicantumkan di halaman tautan. |
| `ROBLOX_EXPERIENCE_URL` | `https://www.roblox.com/games/83804286143888` | Tujuan tombol Buka di Roblox. |
| `ROBLOX_EXPERIENCE_NAME` | `BahasaCerdas Kota Aksara` | Nama yang ditampilkan. |
| `ROBLOX_AGE_GATE_ENABLED` | `true` | `false` membuka semua usia. |
| `ROBLOX_MIN_AGE` | `16` | Batas usia. `0` sama dengan gerbang mati. |
| `ROBLOX_LINK_CODE_TTL_SECONDS` | `600` | Umur kode tautan. |
| `ROBLOX_QUESTION_TTL_SECONDS` | `2700` | Umur satu paket soal. |
| `ROBLOX_TIMESTAMP_SKEW_MS` | `300000` | Selisih `x-roblox-timestamp` yang ditolak (5 menit). |

Gerbang usia hanya dibaca dari konfigurasi ini. Halaman Arena meminta pemain mengkonfirmasi batas yang sedang berlaku. Menaikkan batas meminta konfirmasi baru. Menurunkan batas, atau mematikan gerbang, tidak meminta konfirmasi ulang.

## Migrasi

Jalankan sebelum proses web yang memuat kode ini melayani lalu lintas:

`prisma/migrations/20261125120000_roblox_link/migration.sql`

SQL-nya idempoten (`IF NOT EXISTS`). Tabel:

- `RobloxLink` — satu baris aktif, `userId` unik dan `robloxUserId` unik.
- `RobloxLinkRevocation` — salinan saat tautan diputus. Akun boleh menaut lagi.
- `RobloxLinkCode` — kode 8 karakter, sekali pakai.
- `RobloxAgeAttestation` — batas usia yang dikonfirmasi di web, bukan tanggal lahir.
- `RobloxPlaySession` — paket soal. `answerKey` tidak pernah dikirim balik.

Penghapusan akun memutus tautan aktif supaya userId Roblox itu bisa dipakai lagi.

## Alur tautan

1. Pemain yang sudah masuk membuka **BahasaCerdas Kota Aksara** di Arena (`/arena/game/roblox`).
2. Web membuat kode (contoh `AB3K-9Q2M`) berlaku 10 menit.
3. Pemain mengetik kode di dalam Roblox, dalam akun Roblox-nya sendiri.
4. **Server** Roblox memanggil `POST /api/roblox/link/verify` dengan kode dan `robloxUserId`.
5. Lawatan berikutnya cukup `POST /api/roblox/session`.

Halaman web (cookie sesi, bukan HMAC):

| Metode | Path | Isi |
|---|---|---|
| GET | `/api/roblox/link/status` | Status tautan, kode yang masih berlaku, gerbang usia. |
| POST | `/api/roblox/link/issue` | `{ "confirmAge": true, "regenerate": false }` |
| POST | `/api/roblox/link/age` | Konfirmasi ulang batas usia tanpa kode baru. |
| POST | `/api/roblox/link/revoke` | Putuskan tautan. |

## Autentikasi server

Jalur permainan (`/api/roblox/link/verify`, `/api/roblox/session`, `/api/roblox/questions`, `/api/roblox/results`, `/api/roblox/badges`) hanya POST atau GET dengan `Content-Type: application/json` pada POST. Cookie sesi tidak diterima di sini.

Secrets Store Roblox (`HttpService:GetSecret`) mengembalikan objek yang tidak bisa dibaca sebagai teks, jadi server permainan tidak bisa menghitung HMAC. Skema utama: taruh secret di header lewat `AddPrefix`.

Header wajib:

- `authorization: Bearer <ROBLOX_SERVER_SECRET>`
- `x-roblox-timestamp` — milidetik Unix, 13 digit. Ditolak bila selisih lebih dari 5 menit (`ROBLOX_TIMESTAMP_SKEW_MS`, bawaan `300000`). `os.time()` (detik) ditolak.
- `x-request-id` — nonce unik per percobaan HTTP, 8–80 karakter `[A-Za-z0-9-]`. Disimpan di Redis selama jendela waktu yang sama. Pengiriman ulang dengan id yang sama: `409 REPLAYED_REQUEST`. Percobaan ulang yang sah memakai id baru.
- `content-type: application/json` untuk POST.

Header opsional, dicatat di log bila ada (bukan rahasia):

- `x-roblox-job-id` — `game.JobId`
- `x-roblox-place-id` — `game.PlaceId`

Nama secret di Roblox: `BAHASACERDAS_ROBLOX_KEY`. Nilainya harus sama dengan `ROBLOX_SERVER_SECRET` di web.env. Jangan replikasi secret ke klien.

```lua
local HttpService = game:GetService("HttpService")

local function postRoblox(path: string, payload)
	local body = HttpService:JSONEncode(payload)
	local secret = HttpService:GetSecret("BAHASACERDAS_ROBLOX_KEY")
	return HttpService:RequestAsync({
		Url = "https://www.bahasacerdas.com" .. path,
		Method = "POST",
		Headers = {
			["Content-Type"] = "application/json",
			["Authorization"] = secret:AddPrefix("Bearer "),
			["x-roblox-timestamp"] = tostring(DateTime.now().UnixTimestampMillis),
			["x-request-id"] = HttpService:GenerateGUID(false),
			["x-roblox-job-id"] = game.JobId,
			["x-roblox-place-id"] = tostring(game.PlaceId),
		},
		Body = body,
	})
end
```

`GenerateGUID(false)` menghasilkan id baru setiap panggilan. Kalau jawaban hilang di jalan, panggil lagi dengan `x-request-id` baru dan `idempotencyKey` yang sama supaya XP tidak berganda.

Token dibandingkan secara timing-safe (hash SHA-256 kedua sisi). Secret salah atau waktu kedaluwarsa: `401`. Redis untuk nonce tidak siap: `503 REPLAY_STORE_UNAVAILABLE` (gagal-tertutup, supaya ulang tidak lolos). Pembatas laju tetap per `robloxUserId`, bukan per IP. Kuota XP harian di database tetap berlaku.

### HMAC opsional

Bila header `Authorization` tidak dikirim dan `x-roblox-signature` ada, tanda tangan HMAC-SHA256 atas `{timestamp}.{rawBody}` (base64url tanpa padding) masih diterima. Ini bukan jalur permainan: secret Roblox tidak bisa dibaca untuk menandatangani. Vektor:

```
secret    = test-secret
timestamp = 1700000000000
body      = {"ping":true}
pesan     = 1700000000000.{"ping":true}
signature = WAkTMIWDkX3KQPldfsBIRm4vjzIX0ghrAZH-JX68akY
```

Nonce dan timestamp tetap wajib pada jalur HMAC.

## Endpoint server

Basis: `https://www.bahasacerdas.com`. Semua body JSON. Jawaban kesalahan: `{ "error": "KODE", "message": "..." }`.

### POST `/api/roblox/link/verify`

```json
{ "code": "AB3K-9Q2M", "robloxUserId": "123456789", "robloxUsername": "Pemain_1", "robloxDisplayName": "Pemain" }
```

`robloxUserId` string angka (sampai 20 digit), bukan number — id Roblox bisa lebih besar dari aman di JavaScript.

```json
{ "linked": true, "alreadyLinked": false }
```

Kode: `INVALID_CODE`, `CODE_USED`, `CODE_EXPIRED`, `ACCOUNT_ALREADY_LINKED`, `ROBLOX_ALREADY_LINKED`, `AGE_GATE`, `LINK_CONFLICT`.

### POST `/api/roblox/session`

```json
{ "robloxUserId": "123456789" }
```

Belum tertaut:

```json
{ "linked": false }
```

Tertaut:

```json
{
  "linked": true,
  "ageAllowed": true,
  "displayName": "Sinta",
  "level": 4,
  "xp": 1200,
  "rank": "BRONZE",
  "robloxUserId": "123456789",
  "robloxUsername": "Pemain_1"
}
```

Tidak ada email, NISN, atau kunci soal. `ageAllowed: false` berarti pemain harus mengkonfirmasi usia lagi di web.

### POST `/api/roblox/questions`

```json
{ "robloxUserId": "123456789", "level": 1, "count": 5 }
```

`unitId` boleh menggantikan `level` (menang bila keduanya ada). `count` 1–10, bawaan 5. Soal diambil dari unit Jalur Cerdas level itu.

```json
{
  "sessionId": "cm...",
  "expiresAt": "2026-11-25T05:00:00.000Z",
  "level": 1,
  "unitId": "cm...",
  "unitTitle": "Mengenal Bunyi dan Huruf",
  "questions": [
    { "id": "u01f", "type": "pilihan_ganda", "prompt": "Huruf pertama ...", "options": ["t", "l", "e", "r"] }
  ]
}
```

Tidak ada `jawaban`, `correctAnswer`, atau pembahasan. Jangan teruskan kunci ke klien Roblox — kunci tidak ada di jawaban ini.

### POST `/api/roblox/results`

Nilai dihitung di server. Kirim jawaban, bukan XP.

```json
{
  "robloxUserId": "123456789",
  "sessionId": "cm...",
  "idempotencyKey": "run-7f3a9c2e",
  "answers": [{ "questionId": "u01f", "answer": 0 }],
  "badgeCodes": ["roblox-kota-aksara"]
}
```

`idempotencyKey` 8–80 karakter `[A-Za-z0-9_:-]`, stabil untuk satu pengumpulan jawaban. `x-request-id` tetap baru pada setiap percobaan HTTP, termasuk ulang. Untuk pilihan ganda, `answer` boleh indeks (0) atau teks pilihan (`"t"`). Benar/salah dan isian memakai string.

```json
{
  "sessionId": "cm...",
  "correct": 4,
  "total": 5,
  "score": 80,
  "xp": 40,
  "alreadyRewarded": false,
  "replay": false,
  "totalXp": 1240,
  "level": 4,
  "rank": "BRONZE",
  "badgesAwarded": [],
  "feedback": [{ "questionId": "u01f", "correct": true, "explanation": "..." }]
}
```

XP dasar satu sesi sempurna adalah 50 (`ROBLOX` di `lib/gamification/xp-config.ts`), dikali rasio benar, lalu dipotong batas per kiriman (200) dan kuota harian lewat `awardXp()`. Referensi idempotensi adalah `roblox-session:{sessionId}`. Kiriman ulang dengan kunci yang sama mengembalikan hasil tersimpan, `replay: true`, dan tidak menambah XP. Kunci berbeda pada sesi yang sudah selesai: `409 SESSION_CONSUMED`.

`replay` atau `alreadyRewarded` berarti saldo tidak bertambah lagi. Pakai `totalXp` sebagai saldo.

Pembahasan di `feedback` hanya ada sesudah sesi dinilai. Jangan simpan itu di klien sebelum pemain menjawab.

### POST `/api/roblox/badges`

```json
{ "robloxUserId": "123456789", "codes": ["roblox-kota-aksara"] }
```

Kode lencana harus diawali `roblox-` dan sudah ada di tabel `Badge` (`isActive`). Selain itu diabaikan. Panggilan ini juga menjalankan `evaluateBadges`, jadi lencana dengan syarat `XP_SOURCE_TOTAL` + `source: "ROBLOX"` ikut terbuka. Jawaban: `{ "evaluated": true, "badgesAwarded": ["roblox-kota-aksara"] }`.

Hasil soal juga menilai lencana. `badgeCodes` di sana mengikuti aturan yang sama.

## Yang tidak dilakukan

- Permainan tidak membuka bahasacerdas.com.
- Klien Roblox tidak memegang cookie situs dan tidak memanggil `/api/game/xp`.
- Sign in with Roblox (OAuth) belum dipakai.

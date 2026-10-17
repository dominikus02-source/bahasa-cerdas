# JUMPA — Rencana Teknis (v0.2 — disetujui founder; Fase 1 diimplementasikan di branch `feat/jumpa-phase1`)

Disusun 18 Okt 2026 (WIB) dari `main` @ `0904b9a`. v0.2: keputusan founder — domain `jumpa.bahasacerdas.com`; spesifikasi VPS 16 vCPU/16 GB (±11,9 GB terpakai)/120 GB; kamera NYALA default di lobby seperti Zoom/Meet; LiveKit dibatasi 2 CPU/1,5 GB & mudah dipindah ke VPS terpisah; TURN ditunda ke Fase 2. Semua klaim soal kode di bawah merujuk file nyata; yang **estimasi** atau **belum terverifikasi** ditandai jelas.

---

## 1. Temuan penting di codebase

| Area | Temuan | Sumber |
|---|---|---|
| Framework | Next.js **16.2.6** App Router + **React 18.3.1** (lockfile), TS strict, Tailwind 3.4, framer-motion, lucide-react, zustand, `output: "standalone"`. AGENTS.md mewajibkan baca `node_modules/next/dist/docs/` sebelum coding (Next versi ini punya breaking change). | `package.json`, `package-lock.json`, `next.config.ts`, `AGENTS.md:1-5` |
| Catatan dokumen | Bagian "Tech Stack/Critical Context" di AGENTS.md **sudah usang** (bilang Vercel + VPS mati). Kondisi nyata: push ke `main` → CI → **auto-deploy ke VPS** `103.242.10.81` via `ops/vps/deploy.sh`. | `AGENTS.md:55-110`, `.github/workflows/deploy-production.yml` |
| Auth | Sesi Supabase via cookie (`@supabase/ssr`). `getUser()` verifikasi JWT pakai `getClaims()` lalu baca baris Prisma `User` by `supabaseId`; wewenang selalu dari DB, bukan JWT. Helper `requireAuth()`, `requireRole()`, `requireFounder()`. | `lib/supabase/server.ts:85-142`, `lib/supabase/proxy.ts` |
| Guru vs murid | `User.role` enum `Role { GURU, MURID, ADMIN }` default `MURID`, plus flag `User.isFounder`. Layout guru menolak non-GURU kecuali founder; layout arena menerima MURID & GURU (pratinjau). | `prisma/schema.prisma:183,1819`, `app/(dashboard)/guru/layout.tsx`, `app/arena/layout.tsx:54-57` |
| Akun anak | `ArenaJuniorAkun` (TK–SD, email sintetis, login PIN, didaftarkan guru). Relevan untuk proteksi anak. | `prisma/schema.prisma:2575` |
| Kelas | `Group` (kelas guru: `teacherId`, `accessCode`, `isActive`, `chatLocked`) + `GroupMember` (`role` string, unik `[groupId,userId]`). Sumber utama undangan "dari daftar kelas". `Community`/`CommunityMember` (MGMP/KKG) cocok untuk guru↔guru. | `prisma/schema.prisma:1499-1545, 109-152` |
| Preseden moderasi | `ChatMessage` dengan soft-delete `deletedAt/deletedBy` + lock obrolan (OBROLAN 4.0). | `prisma/schema.prisma:1593`, `docs/OBROLAN_4_FINAL_REPORT.md` |
| Data & RLS | Semua data lewat **Prisma (role postgres, BYPASSRLS)**; 0 pemakaian `supabase.from()`. RLS di-enable deny-all di semua tabel `public` sebagai penutup PostgREST. Otorisasi bisnis = kode aplikasi. Migrasi: `prisma/migrations/<ts>_*` + SQL manual di `prisma/migrations/manual/`. | `prisma/migrations/manual/2026-07-17_enable_rls_public.sql`, `supabase-rls.sql` |
| UI/tema | Satu provider next-themes, token semantik `hsl(var(--…))`, primitif `.bc-badge-*`, larangan hardcode warna & `dark:` patch (THEME RULE). `components/ui/*` gaya shadcn (button, card, badge, modal, tabs, input…). Logo via registry `lib/brand.ts`. Guru = emerald, Murid = violet. Main Bersama pakai scope CSS sendiri `.mb-scope .mb-premium`. | `AGENTS.md:3917-3940`, `tailwind.config.ts`, `app/main-bersama/layout.tsx`, `components/main-bersama/premium-layout.css` |
| Routing | `app/(dashboard)/guru/*`, `app/(dashboard)/murid/*`, `app/arena/*` (shell murid + scope APK/TWA), `app/main-bersama/*`, API di `app/api/*`. Middleware membedakan `publicPaths`/`selfAuthPaths`/`dashboardPaths`. | `lib/supabase/proxy.ts:32-52` |
| Realtime (preseden) | `game-server/` Socket.IO 4.8.4 → service compose `game` (profile `realtime`, `cpus 4`, `mem 2g`, port `127.0.0.1:3001`, healthcheck), Caddy `{$GAME_DOMAIN} → game:3001`, dinyalakan `ENABLE_REALTIME=1` di `deploy.sh`. Auth: Next route mencetak token Ed25519 umur 5 menit, diverifikasi di server game. **Pola ini persis yang kita butuhkan untuk token LiveKit.** Env per service dipecah oleh `prepare-runtime-envs.sh`. | `ops/vps/docker-compose.yml`, `ops/vps/Caddyfile`, `ops/vps/deploy.sh`, `app/api/game/socket-token/route.ts`, `game-server/src/server.ts:478-520` |
| Blocker header | `Permissions-Policy: camera=()` → **kamera diblokir total** di semua halaman. CSP `connect-src` belum memuat domain media. Wajib diubah di PR 1. | `next.config.ts:66`, `middleware.ts` (`buildCsp`) |
| Feature flag | Pola `NEXT_PUBLIC_*_ENABLED` (contoh `MULTIPLAYER_ENABLED`). | `lib/features.ts` |
| Cron | Container cron memanggil `/api/cron/*` via `bc-cron-call`. | `ops/vps/cron/root.crontab`, `app/api/cron/` |
| Testing | Tidak ada jest/vitest. Test = skrip `tsx` berasersi (`scripts/test-*.ts`) didaftarkan di `package.json`; CI menjalankan typecheck, beberapa test, lint, build. Playwright ad-hoc (`scripts/test-ai-bc-browser.mjs`), k6 di `tests/load/`. | `.github/workflows/ci.yml` |
| Kapasitas VPS | **Dari founder: 16 vCPU, 16 GB RAM (±11,9 GB terpakai), 120 GB disk; kuota bandwidth belum diketahui** (tidak tercatat di repo). Batas compose saat ini: web 6 CPU/4 GB, game 4/2 GB, agent 2/2 GB, redis 1/1 GB, caddy 1/512 MB, plus stack Supabase self-host. | `ops/vps/docker-compose.yml` |

---

## 2. Arsitektur

### 2.1 Keputusan stack: **LiveKit self-hosted — dikonfirmasi, dengan penyesuaian**

Kenapa LiveKit (vs Jitsi): LiveKit = SFU murni + SDK; UI 100% milik kita (penting untuk tampilan "mewah"), `@livekit/components-react` (peer `react >=18`, cocok React 18.3), `livekit-server-sdk` Node untuk token/moderasi/webhook, data channel untuk kuis live, Egress untuk rekaman nanti. Jitsi = aplikasi utuh (Prosody/Jicofo/JVB/web), lebih banyak container & RAM, kustom UI berarti melawan UI bawaannya (iframe) atau pakai `lib-jitsi-meet` yang lebih kasar; auth JWT bisa tapi konsep peran/moderasi tidak natural ke model kita.

Penyesuaian dari usulan awal:
1. **Klien tidak pernah dapat `roomAdmin`.** Semua kontrol host (mute, keluarkan, kunci, akhiri) lewat route API kita → cek DB → `RoomServiceClient`. Konsisten dengan pola "server authoritative" di repo.
2. **Chat lewat API** (persist dulu, lalu server broadcast via `sendData`), bukan chat client-side LiveKit — supaya log di ruang murid tidak bisa dilewati dan moderasi/lock chat berlaku. Reaksi & angkat tangan tetap via data channel (ephemeral).
3. **Webhook LiveKit** → `/api/jumpa/webhook` untuk absensi (join/leave) & status ruang.
4. **Rekaman tidak di V1.** Egress menyusul, hanya bisa dimulai guru.
5. Di belakang **feature flag** `NEXT_PUBLIC_JUMPA_ENABLED` karena merge ke `main` = deploy produksi.

### 2.2 Deploy di VPS (ikut pola service `game`) — *diperbarui v0.2, sesuai implementasi Fase 1*

VPS saat ini: **16 vCPU, 16 GB RAM (±11,9 GB terpakai), disk 120 GB, kuota bandwidth belum diketahui.** Karena itu LiveKit diberi batas sederhana dan dibuat **mudah dipindah ke VPS terpisah** (hanya ganti env, tanpa coupling kode).

```yaml
# ops/vps/docker-compose.yml
  livekit:
    profiles: ["jumpa"]
    image: livekit/livekit-server:v1.13.10
    command: --config /etc/livekit.yaml
    restart: unless-stopped
    cpus: 2.0
    mem_limit: 1536m
    env_file: [ "${BC_CONFIG_DIR:-/opt/bahasacerdas/config}/livekit.env" ]  # LIVEKIT_KEYS="key: secret"
    volumes: [ "./livekit.yaml:/etc/livekit.yaml:ro" ]
    ports:
      - "127.0.0.1:7880:7880"  # API/sinyal, hanya localhost (publik lewat Caddy 443)
      - "7881:7881/tcp"        # ICE/TCP fallback
      - "7882:7882/udp"        # ICE/UDP mux (satu port)
    networks: [edge]
```

`ops/vps/livekit.yaml`: `port: 7880`, `rtc: { tcp_port: 7881, udp_port: 7882, use_external_ip: true }`, **`turn: { enabled: false }`** (TURN/TLS ditunda ke Fase 2 — butuh rentang port relay + sertifikat), `room: { empty_timeout: 600, departure_timeout: 60, max_participants: 50 }`, `limit: { num_tracks: 400 }`. Webhook menyusul Fase 2.

Caddy (TLS sinyal di 443) lewat snippet opsional `ops/vps/caddy/jumpa.caddy`, di-*import* dari `Caddyfile` via `import /etc/caddy/conf.d/*.caddy` (glob kosong = tidak ada perubahan saat JUMPA mati):
```
{$JUMPA_DOMAIN:jumpa.bahasacerdas.com} {
  reverse_proxy livekit:7880
}
```
Firewall VPS buka: **7881/tcp, 7882/udp** (Fase 1). `deploy.sh`: blok `ENABLE_JUMPA=1` (pola `ENABLE_REALTIME`) → pull + up `livekit`, health `curl http://127.0.0.1:7880`, pasang snippet Caddy, recreate caddy. Env: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL=http://livekit:7880` (server SDK, internal), `NEXT_PUBLIC_LIVEKIT_WS_URL=wss://jumpa.bahasacerdas.com`; `prepare-runtime-envs.sh` menulis `livekit.env` (`LIVEKIT_KEYS`).

**Pindah ke VPS media terpisah:** jalankan `livekit` + Caddy di VPS baru, arahkan DNS `jumpa.` ke sana, lalu di web.env set `LIVEKIT_URL=https://jumpa.bahasacerdas.com` dan kunci yang sama. Tidak ada perubahan kode.

**Risiko jaringan sekolah:** banyak jaringan memblokir UDP & port non-443. Fase 1: UDP 7882 → TCP 7881. Fase 2: TURN/UDP + TURN/TLS (idealnya di 443 via SNI routing / IP kedua) setelah uji lapangan.

**Estimasi sumber daya (KASAR, wajib divalidasi `lk load-test`):**
- Beban SFU dominan **bandwidth**, bukan CPU. Simulcast + adaptive stream: publisher kamera ~1–1,7 Mbps naik; tiap subscriber ~0,3–0,6 Mbps per tile terlihat.
- Kelas 30 orang: egress server **~40–80 Mbps** per ruang.
- Batas 2 vCPU / 1,5 GB cukup untuk ±2–3 kelas paralel; sisa RAM VPS hanya ±4 GB, jadi **jangan naikkan batas tanpa memantau**. Kuota bandwidth IDCloudHost perlu dicek sebelum dipakai luas; >3 kelas paralel → VPS media terpisah.

### 2.3 Token API

`POST /api/jumpa/rooms/[code]/token` (Route Handler, `force-dynamic`, `Cache-Control: private, no-store`, rate limit `lib/rate-limit.ts` per sesi):
1. `getUser()` → 401 bila null. Peran efektif: `GURU` | `MURID` (ADMIN/founder → lihat open question).
2. Muat `JumpaRoom`; tolak bila `ENDED`, lewat `maxDurationMin`, `isLocked` (kecuali host/peserta lama), atau penuh.
3. `canJoin(user, room)` (matrix 2.5) → 403 dengan pesan Indonesia.
4. Upsert `JumpaParticipant`, tulis event `JOIN_GRANTED`.
5. `AccessToken(identity=user.id, name=nickname||fullName, ttl=10m, metadata={bcRole, roomRole, avatar})` dengan grant: `roomJoin`, `room=livekitRoomName`, `canSubscribe`, `canPublishData`, `canPublishSources` sesuai peran (murid: kamera+mic; `screen_share` hanya jika diizinkan host), `canUpdateOwnMetadata=false` (peran tidak bisa dipalsukan), **tanpa** `roomAdmin`/`recorder`.
6. Ruang LiveKit dibuat server-side (`createRoom` dengan `maxParticipants`, `emptyTimeout`) saat token pertama.

Route lain: `POST /api/jumpa/rooms` (buat), `GET /api/jumpa/rooms/[code]` (info lobby), `POST …/moderation` (`MUTE_AUDIO|MUTE_VIDEO|REMOVE|LOCK|UNLOCK|END|ALLOW_SCREEN|SET_COHOST`; mute permanen = `updateParticipant` cabut `canPublishSources`), `POST …/chat`, `POST …/report`, `POST /api/jumpa/webhook` (`WebhookReceiver`), `GET /api/cron/jumpa-sweep` (akhiri ruang lewat batas waktu, via cron container). Logika di `lib/jumpa/` (domain murni: `permissions.ts`, `caps.ts`) supaya bisa dites tanpa DB, mengikuti pola `src/main-bersama/domain`.

### 2.4 Skema DB (Prisma + SQL manual, RLS on)

```prisma
enum JumpaRoomKind   { KELAS GURU MURID }          // KELAS = guru+murid
enum JumpaRoomMode   { MEETING CLASS WEBINAR }     // mode pakai, bukan sistem berbeda
enum JumpaRoomStatus { SCHEDULED LIVE ENDED }
enum JumpaRoomRole   { HOST COHOST MEMBER }

model JumpaRoom {
  id String @id @default(cuid())
  code String @unique            // slug pendek untuk URL, bukan credential
  livekitRoomName String @unique
  title String
  kind JumpaRoomKind
  mode JumpaRoomMode @default(MEETING)
  status JumpaRoomStatus @default(SCHEDULED)
  createdById String             // User.id
  creatorRole Role               // snapshot saat dibuat
  groupId String?                // KelasKu, plain string (konvensi MainSession.classId)
  communityId String?
  scheduledAt DateTime?  startedAt DateTime?  endedAt DateTime?
  maxParticipants Int  maxDurationMin Int
  isLocked Boolean @default(false)
  chatEnabled Boolean @default(true)
  allowMuridScreenShare Boolean @default(false)
  allowMuridUnmute Boolean @default(true)
  recordingAllowed Boolean @default(false)
  createdAt DateTime @default(now())  updatedAt DateTime @updatedAt
  @@index([createdById]) @@index([groupId]) @@index([status])
}
model JumpaParticipant { id, roomId, userId, roomRole JumpaRoomRole, invitedVia String,
  firstJoinedAt DateTime?, lastLeftAt DateTime?, totalSeconds Int @default(0),
  removedAt DateTime?, removedById String?, @@unique([roomId,userId]) }
model JumpaInvite { id, roomId, kind String /*LINK|GROUP|USER*/, tokenHash String? @unique,
  groupId String?, userId String?, createdById, expiresAt DateTime?, revokedAt DateTime? }
model JumpaChatMessage { id, roomId, userId, content, createdAt, deletedAt?, deletedById?
  @@index([roomId, createdAt]) }                       // mirror ChatMessage
model JumpaEvent { id, roomId, actorId?, targetUserId?, action String, metadata Json?, createdAt
  @@index([roomId, createdAt]) }                       // join/leave/moderasi = audit log
model JumpaReport { id, roomId, reporterId, reportedUserId?, category String, description String?,
  chatSnapshot Json?, status String @default("OPEN"), reviewedById?, reviewedAt?, createdAt }
```

**RLS:** sesuai konvensi `2026-07-17_enable_rls_public.sql` — `ALTER TABLE "Jumpa…" ENABLE ROW LEVEL SECURITY;` **tanpa policy** (deny-all untuk `anon`/`authenticated`), karena aplikasi hanya akses via Prisma. Jika kelak ada akses supabase-js, policy minimal: `SELECT` chat/room hanya bila `auth.uid()` = `User.supabaseId` milik peserta (join `JumpaParticipant`). Otorisasi utama tetap di `lib/jumpa/permissions.ts`. Migrasi mengikuti runbook Main Bersama (`docs/MAIN_BERSAMA_PRODUCTION_MIGRATION_RUNBOOK.md`) + health endpoint `storage: ready`.

### 2.5 Matriks izin

| Aksi | Guru (host) | Guru (peserta) | Murid (host ruang MURID) | Murid (peserta) |
|---|---|---|---|---|
| Buat ruang KELAS / GURU | ✅ | — | ❌ | ❌ |
| Buat ruang MURID | ❌ | — | ✅ (maks 8 org, 60 mnt) | — |
| Undang | link, kelas (`Group` miliknya), komunitas, user | — | hanya murid **sekelas** (berbagi `Group` aktif) | ❌ |
| Mute / keluarkan peserta | ✅ | ✅ jika COHOST | ❌ (pakai Laporkan) | ❌ |
| Kunci / akhiri ruang | ✅ | COHOST: kunci | ✅ ruang sendiri | ❌ |
| Screen share | ✅ | ✅ | ✅ | hanya jika diizinkan host |
| Hapus chat orang lain | ✅ | COHOST | ❌ | ❌ |
| Rekam (fase berikut) | ✅ (dengan pemberitahuan; wajah murid off default) | ❌ | ❌ | ❌ |
| Tombol Laporkan | ✅ | ✅ | ✅ | ✅ (wajib tampil di ruang MURID) |

Aturan join: ruang GURU = hanya GURU; ruang MURID = hanya MURID sekelas pembuat (cegah orang asing menghubungi anak; murid Junior → open question); ruang KELAS = guru pembuat + anggota `Group` terkait + undangan individual; link tetap mensyaratkan login BC dan lolos aturan kind. Tidak ada tamu.

Batas default (bisa diubah di `lib/jumpa/caps.ts`): MURID 8 org/60 mnt, KELAS 50 org/120 mnt, WEBINAR 100 org (hanya host/cohost publish video), GURU 25 org/120 mnt.

---

## 3. Frontend

### 3.1 Rute & komponen
- *Fase 1 (implementasi):* hanya `/jumpa/[code]` (lobby → ruang); `/jumpa` me-redirect ke dasbor; `/jumpa/baru` dan daftar ruang menyusul Fase 2.
- `app/jumpa/` (segmen netral, bisa diakses kedua peran, pola `app/main-bersama/`), layout `jumpa-scope` (gelap, scoped CSS) + gerbang `getUser()` server-side. Tambahkan `/jumpa/` ke `selfAuthPaths` di `lib/supabase/proxy.ts`.
  - `/jumpa` — daftar ruang saya + tombol "Mulai JUMPA".
  - `/jumpa/baru` — form buat ruang (judul, kelas, mode) — bisa dilewati lewat "Mulai sekarang".
  - `/jumpa/[code]` — lobby (preview kamera/mic, pilih perangkat) → ruang (satu halaman, state berganti, tanpa reload).
- Titik masuk: kartu/CTA di `app/(dashboard)/guru/kelasku` (per kelas: "Mulai JUMPA"), beranda guru, dan beranda murid / `app/arena` ("Kelas sedang live — Gabung").
- Komponen di `components/jumpa/`: `JumpaLobby`, `JumpaRoom` (`LiveKitRoom` wrapper), `VideoStage` (grid/speaker via `GridLayout`/`FocusLayout`), `ParticipantTile` (kustom, nama + badge peran + tangan), `ControlBar`, `MoreMenu`, `ChatPanel`, `PeoplePanel` (aksi host), `ReactionsLayer`, `ReportDialog`, `HostToast`. Hook `hooks/useJumpaRoom.ts`. Pakai komponen headless LiveKit (hooks `useTracks`, `useParticipants`, `useLocalParticipant`), **tidak** pakai styles default mereka, supaya tampilan sepenuhnya BC.
- Wajib PR 1: `Permissions-Policy` → `camera=(self), microphone=(self), display-capture=(self)`; CSP `connect-src` + `wss://jumpa.bahasacerdas.com https://jumpa.bahasacerdas.com`.

### 3.2 Arah desain (arahan founder: kekinian, berkarakter, tapi gak ribet)
- **Alur minim klik:** dari dashboard/kelas → klik "Mulai JUMPA" → lobby (kamera sudah menyala di preview, perangkat terakhir diingat) → klik "Masuk" = **2 klik sampai di ruang**. Murid: notifikasi/kartu "Kelas live" → lobby → Masuk. Undangan link langsung mendarat di lobby.
- **Kamera seperti Zoom/Meet (keputusan founder):** lobby menyalakan kamera **default** dengan preview langsung; pengguna bisa mematikan kamera/mik sebelum "Gabung sekarang"; pilihan terakhir disimpan di `localStorage` (`bc-jumpa-media-v1`) dan dipakai lagi di lobby & ruang berikutnya.
- **Lobby bersih:** preview video besar di tengah, dua toggle bulat (mic/kamera), satu tombol utama "Gabung sekarang", nama ruang + avatar peserta yang sudah ada. Pengaturan perangkat disembunyikan di ikon gear.
- **Fase 1 (implementasi):** Mikrofon, Kamera, Lainnya (Grid / Pembicara / Salin tautan undangan), Keluar.
- **Control bar minimal (target V1):** 4–5 ikon besar saja — Mic, Kamera, Bagikan layar, Angkat tangan, **Keluar** (merah). Sisanya (chat, peserta, reaksi, ganti tata letak, pengaturan, laporkan, kontrol host) di menu **"Lainnya" (⋯)**. Chat & peserta juga bisa dibuka dari ikon kecil di pojok atas dengan badge jumlah.
- **Gaya visual:** gelap elegan dengan **glassmorphism** (panel `backdrop-blur`, border tipis transparan, bayangan lembut), aksen **hijau BC** (emerald untuk aksi utama & ring pembicara aktif), violet hanya untuk badge murid; logo dari `lib/brand.ts`. Token warna lewat CSS variable di `jumpa-scope` (bukan hex tersebar di komponen) agar tetap selaras THEME RULE.
- **Micro-animation halus** (framer-motion, sudah ada): ring pembicara berdenyut, tile masuk/keluar fade-scale, reaksi melayang, tangan terangkat bergoyang sekali; durasi 150–250 ms, hormati `prefers-reduced-motion`.
- **Mobile-first:** di HP tampilan speaker default + strip thumbnail yang bisa digeser; control bar menempel bawah dengan target sentuh ≥ 48 px; panel chat/peserta jadi bottom sheet. Desktop: grid adaptif + panel samping.
- **Label jelas Bahasa Indonesia** di setiap ikon (tooltip desktop, label kecil di bawah ikon mobile): "Mikrofon", "Kamera", "Bagikan Layar", "Angkat Tangan", "Keluar", "Lainnya". Ikon lucide, tanpa emoji (ada test `test:no-emoji-icons`).
- Status yang menenangkan: banner koneksi lemah ("Jaringan lemah — video dimatikan sementara"), toast saat dimute host, empty state hangat saat sendirian.

---

## 4. Rencana bertahap

### Fase 1 — PR pertama (kecil, bisa direview, di belakang flag)
Scope: fondasi + "panggilan jalan" guru↔murid untuk ruang KELAS.
- Infra: service `livekit` (profile `jumpa`), `livekit.yaml`, blok Caddy, env di `prepare-runtime-envs.sh`, `ENABLE_JUMPA` di `deploy.sh`.
- Header: Permissions-Policy + CSP.
- Skema: `JumpaRoom`, `JumpaParticipant`, `JumpaEvent` + SQL manual + enable RLS.
- `lib/jumpa/permissions.ts` & `caps.ts` (murni), route buat ruang, info ruang, token.
- UI: `/jumpa/[code]` lobby + ruang dengan video/audio, grid/speaker, control bar minimal, tema gelap BC; CTA "Mulai JUMPA" di halaman kelas guru; murid masuk via link (cek keanggotaan `Group`).
- Flag `NEXT_PUBLIC_JUMPA_ENABLED` (default off).
- Test: `scripts/test-jumpa-permissions.ts` (matriks + caps), `scripts/test-jumpa-token.ts` (grant tidak pernah berisi roomAdmin; murid non-anggota ditolak; ruang terkunci/penuh/berakhir ditolak), didaftarkan di `package.json`.

Kriteria terima: guru buat ruang dari kelas dalam ≤ 2 klik; 2 guru + 5 murid tersambung stabil 30 menit di staging; murid di luar kelas mendapat 403; kamera/mic jalan di Chrome Android, Chrome/Edge desktop, Safari iOS; `typecheck`, `lint`, `build`, test baru lulus; flag off = tidak ada perubahan perilaku produksi.

### Fase 2 — fitur V1 lengkap
Screen share, chat persisten via API, angkat tangan, reaksi, kontrol host (mute, keluarkan, kunci, akhiri, cohost), undangan link (token hash + expiry) & dari daftar kelas/komunitas, ruang GURU dan MURID dengan batas + tombol Laporkan + log, webhook absensi, cron sweep, panel laporan di admin, uji jaringan sekolah + TURN.
Kriteria terima: semua aksi host tercatat di `JumpaEvent`; murid yang dimute permanen tidak bisa unmute; ruang MURID otomatis berakhir di 60 menit; laporan muncul di admin dengan snapshot chat; load test 3 ruang × 30 peserta tanpa degradasi parah; tersambung dari minimal 3 jaringan sekolah nyata.

### Fase 3 — Kuis live
Guru pilih paket dari Bank Soal (adapter yang sama dengan `src/main-bersama/adapters/bank-soal`), soal dikirim **server-side** via `sendData` topik `jumpa.quiz` (tanpa kunci jawaban, pakai `toPublicQuestionView`-style stripping), jawaban dikirim ke API (authoritative, idempotent), skor dan leaderboard dibroadcast. Pertimbangkan reuse `SessionEngine` Main Bersama ketimbang engine baru.
Kriteria terima: kunci jawaban tidak pernah sampai klien sebelum reveal; double-submit aman; hasil tersimpan per murid & masuk Buku Nilai (opsional).
(Rekaman via LiveKit Egress = fase terpisah setelah kebijakan disetujui.)

---

## 5. Risiko & pertanyaan untuk founder

1. ~~Spesifikasi VPS~~ **Terjawab:** 16 vCPU / 16 GB (±11,9 GB terpakai) / 120 GB. **Masih terbuka:** port speed & kuota bandwidth — cek sebelum dipakai luas.
2. **Jaringan sekolah** sering blok UDP/port non-443 — Fase 1 hanya 7881/tcp + 7882/udp (TURN mati). Untuk Fase 2: boleh tambah subdomain `turn.` dan buka port 3478/5349, atau langsung investasi TURN di 443 (IP kedua / Caddy layer4)?
3. **Mobile & sinyal lemah:** ~~default kamera~~ **Terjawab:** kamera nyala default (bisa dimatikan di lobby, diingat). Mode "hemat data" (audio-only + slide) di V1?
4. **Kebijakan proteksi anak:** murid boleh buat ruang hanya dengan teman sekelas — setuju? Akun Arena Junior (TK–SD) dilarang bikin/ikut ruang MURID? Siapa yang menerima laporan: guru kelas, admin, atau keduanya? Berapa lama log chat/laporan disimpan?
5. **Rekaman:** perlu persetujuan orang tua/sekolah? Disimpan di Supabase Storage self-host berapa lama?
6. **Peran ADMIN & founder** diperlakukan sebagai guru di JUMPA, atau punya mode "pengawas" tersembunyi?
7. **Monetisasi/batas:** JUMPA gratis untuk semua atau durasi/peserta lebih besar khusus Premium (`premiumPlan`)?
8. ~~Domain~~ **Terjawab:** `jumpa.bahasacerdas.com`.
9. **APK (TWA):** perlu izin kamera/mic di manifest TWA (`twa/`) — termasuk Fase 1 atau web dulu?
10. AGENTS.md bagian status sudah usang (Vercel/VPS mati); boleh diperbarui sekalian saat PR JUMPA?

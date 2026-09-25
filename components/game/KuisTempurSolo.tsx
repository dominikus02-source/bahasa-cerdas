"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { Heart, Volume2, VolumeX, Loader2, RotateCcw, ArrowLeft } from "lucide-react"
import { QUESTION_BANK_EXPANDED, type BankQuestion } from "@/lib/game/question-bank"
import { gambarKarakter, KARAKTER, PROFIL, type Karakter } from "@/lib/arena-junior/karakter"
import { bacaKarakter, simpanKarakter } from "@/lib/arena-junior/karakter-simpan"
import { sfx, startBGM, stopBGM, isSoundOn, toggleSound, haptic } from "@/lib/game/sound"
import { rankFromLevel, RANK_META } from "@/lib/gamification/ranks"
import { RankIcon } from "@/components/gamification/RankIcon"
import { levelFromXp } from "@/lib/gamification/xp-engine"
import { setQuiet } from "@/lib/notif-quiet"
import {
  kurvaPemain,
  lawanBot,
  statDasarBot,
  komposisiBot,
  LABEL_TIPE,
  WARNA_TIPE,
  type StatBot,
} from "@/lib/game/kuis-tempur-progression"
import {
  buildWorld,
  worldColliders,
  collidersToPixels,
  preloadWorldImages,
  drawWorldBackdrop,
  drawWorldLayer,
  getWorldImage,
  isWorldImageReady,
  SHADOW_SOFT_URL,
  type WorldState,
} from "@/lib/game/kuis-tempur-world"

// Gaya "chunky cream" yang dipakai seluruh ekosistem gim solo BahasaCerdas
// (ZelbyDash, LariKata, BenarSalah, dll). Keyframes unik per gim supaya tidak
// bentrok saat beberapa gim ter-mount bersamaan.
const KT_STYLE = `
@keyframes kt-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes kt-pop{0%{transform:scale(0) rotate(-30deg)}60%{transform:scale(1.3) rotate(8deg)}100%{transform:scale(1) rotate(0)}}
.kt-screen{animation:kt-fade .35s ease}
.kt-pop{animation:kt-pop .5s ease}
@media (prefers-reduced-motion: reduce){.kt-screen,.kt-pop{animation:none}}
`

// Kuis Tempur (mode solo) — bertahan di kampung kata melawan bot.
//
// Gelung intinya: BERLINDUNG → JAWAB BENAR → DAPAT PELURU → KELUAR → TEMBAK.
// Peluru hanya bisa diperoleh dengan menjawab benar, dan itulah yang membuat
// soal menjadi sumber daya alih-alih gangguan. Versi sebelumnya menembak otomatis
// ke musuh terdekat setiap jawaban benar; akibatnya anak menekan asal supaya
// cepat kembali menghindar, dan gimnya berhenti mengajar.
//
// Berjalan SEPENUHNYA di perangkat — tidak ada server pertandingan yang bisa
// mematikannya, seperti yang terjadi pada gim multiplayer lain.

const GAME_TYPE = "RIMBA_KATA"
const HP_AWAL = 100
const DMG_SALAH = 10
const R = 22
const KUNCI_LEVEL = "bc-kuis-tempur-level"
// Batas waktu menjawab. Tekanan waktu menggantikan tekanan menghindar yang terus
// menerus: murid boleh berlindung dengan tenang, tapi tidak boleh berdiam
// selamanya tanpa menjawab.
const DETIK_SOAL = 15
// Durasi satu sesi bertahan (5 menit). Dulu gim berakhir begitu 4 bot awal
// tersingkir — terlalu cepat untuk sebuah "pertempuran". Sekarang bot terus
// berdatangan dan pemenangnya adalah yang sanggup bertahan sampai waktu nol.
const DURASI = 300

// Wajah musuh berasal dari aset avatar bernomor di public/avatar/ (1–10).
// Catatan: berkas 1.webp belum ada, jadi daftar ini memakai 2–10 yang ada.
// Tambahkan 1.webp dan daftar di bawah untuk memakainya kembali.
const AVATAR_BOT = ["2", "3", "4", "5", "6", "7", "8", "9", "10"].map((n) => `/avatar/${n}.webp`)

// Jumlah musuh, statistik arena, kurva pemain, dan komposisi arketipe bot
// dihitung di lib/game/kuis-tempur-progression.ts (murni & teruji).

type Rintangan =
  | { jenis: "rumah"; x: number; y: number; w: number; h: number; warna: string }
  | { jenis: "pohon"; x: number; y: number; r: number }
  | { jenis: "batu"; x: number; y: number; r: number }

type Pemain = {
  nama: string
  gambar: HTMLImageElement | null
  warna: string
  x: number; y: number; tx: number; ty: number
  hp: number
  hpMax: number
  hidup: boolean
  kamu: boolean
  kedip: number
  langkah: number   // fase ayunan jalan
  hadap: number     // -1 kiri, 1 kanan
  tinggi?: number   // denyut skala visual (kosmetik; tidak memengaruhi tabrakan)
  stat?: StatBot    // statistik arketipe bot (pemain tidak memakai ini)
}
type Peluru = { x: number; y: number; vx: number; vy: number; dari: number; umur: number; dmg: number }
type Partikel = { x: number; y: number; vx: number; vy: number; umur: number; warna: string }
type Angka = { x: number; y: number; teks: string; umur: number; warna: string }

const NAMA_BOT = ["Raka", "Sari", "Bima", "Lia", "Dewi", "Andi", "Nisa", "Fajar", "Gilang", "Putri"]

function kocok<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function kenaRintangan(x: number, y: number, r: Rintangan): boolean {
  if (r.jenis === "rumah") return x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h
  return Math.hypot(x - r.x, y - r.y) < r.r
}

export default function KuisTempurSolo({ backHref = "/arena/game" }: { backHref?: string }) {
  const [fase, setFase] = useState<"pilih" | "main" | "selesai">("pilih")
  // Karakter terpilih dibaca dari penyimpanan bersama (bc-karakter) supaya
  // pilihan bertahan antar sesi dan dipakai konsisten di arena/junior.
  const [karakterku, setKarakterku] = useState<Karakter>(() => bacaKarakter())
  const [namaku, setNamaku] = useState("Kamu")
  const [suara, setSuara] = useState(true)

  const [hp, setHp] = useState(HP_AWAL)
  const [combo, setCombo] = useState(0)
  const [level, setLevel] = useState(1)
  const [peluru, setPeluru] = useState(0)
  const [dipilih, setDipilih] = useState<number | null>(null)
  const [soal, setSoal] = useState<{ q: BankQuestion; opsi: { teks: string; benar: boolean }[] } | null>(null)
  const [kunci, setKunci] = useState(false)
  const [feed, setFeed] = useState<{ id: number; teks: string }[]>([])
  const [hasil, setHasil] = useState<{ menang: boolean; peringkat: number; xp: number } | null>(null)
  const [mengirim, setMengirim] = useState(false)
  // Rank & koin diambil dari data asli murid — bukan hiasan. Menampilkan angka
  // karangan di HUD membuat seluruh papan terasa tidak bisa dipercaya.
  const [profil, setProfil] = useState<{ rank: string; rankKey: string; warna: string; levelXp: number; koin: number } | null>(null)
  const [waktu, setWaktu] = useState(DETIK_SOAL)
  const [sisaWaktu, setSisaWaktu] = useState(DURASI)
  const [kalahkan, setKalahkan] = useState(0)
  // KUIS TEMPUR 3.0 — progresi level DARI PERFORMANCE (bukan timer): tiap level
  // punya target musuh (lawanBot(level)); tercapai → overlay LEVEL SELESAI →
  // naik level (musuh/escalation bertambah). Timer 5 menit hanya batas sesi.
  const [levelSelesai, setLevelSelesai] = useState(false)
  const [sisaMusuh, setSisaMusuh] = useState(0)
  const [kalahHp, setKalahHp] = useState(false)
  const [waktuAkhir, setWaktuAkhir] = useState(DURASI)
  const levelRef = useRef(1)
  const dibunuhLevelRef = useRef(0)

  const cvRef = useRef<HTMLCanvasElement>(null)
  const pRef = useRef<Pemain[]>([])
  const bRef = useRef<Peluru[]>([])
  const partRef = useRef<Partikel[]>([])
  const angkaRef = useRef<Angka[]>([])
  const rintRef = useRef<Rintangan[]>([])
  // WORLD DATA (normalisasi 0..1) — divisualkan oleh lib/game/kuis-tempur-world.
  // rintRef di atas adalah proyeksi piksel tabrakannya (lihat collidersToPixels),
  // dihitung ulang saat resize supaya komposisi tetap valid.
  const worldRef = useRef<WorldState | null>(null)
  const zonaRef = useRef({ x: 0, y: 0, r: 0 })
  const rafRef = useRef(0)
  const jalanRef = useRef(false)
  const benarRef = useRef(0)
  const salahRef = useRef(0)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const tembakRef = useRef(0)
  const peluruRef = useRef(0)
  const sisaWaktuRef = useRef(DURASI)
  const feedIdRef = useRef(0)
  const kantongRef = useRef<BankQuestion[]>([])
  const aturanRef = useRef(statDasarBot(1))
  // Statistik pemain ronde ini (nyawa maks & kerusakan peluru dari kurva).
  const statkuRef = useRef(kurvaPemain(1))
  // Berapa bot yang sudah dikalahkan (bot terus berdatangan sampai waktu habis).
  const dibunuhRef = useRef(0)
  const giliranBotRef = useRef(0)
  // Mencegah soal yang sama dijawab/habis dua kali: diisi saat jawab atau waktu
  // habis, dikosongkan lagi oleh soalBaru().
  const teratasiRef = useRef(false)
  // Untuk membedakan ketukan (menembak) dari seretan (berjalan).
  const tekanRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const naikTimerRef = useRef<number>(0)
  // Keyboard movement state: direction booleans consumed by game loop.
  const keyRef = useRef({ up: false, down: false, left: false, right: false })

  useEffect(() => {
    levelRef.current = level
  }, [level])

  // NOTIFICATION 1.0 — game quiet mode: reward global TIDAK menutupi gameplay
  // (soal/HUD/timer); reward tetap di-queue & muncul setelah sesi selesai.
  useEffect(() => {
    setQuiet(fase === "main")
    return () => setQuiet(false)
  }, [fase])

  useEffect(() => {
    return () => { if (naikTimerRef.current) clearTimeout(naikTimerRef.current) }
  }, [])

  useEffect(() => {
    setSuara(isSoundOn())
    const l = Number(localStorage.getItem(KUNCI_LEVEL) || "1")
    if (Number.isFinite(l) && l >= 1) setLevel(Math.min(l, 99))
    fetch("/api/user/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const u = d?.user ?? d
        if (u?.nickname || u?.fullName) setNamaku(String(u.nickname || u.fullName).split(" ")[0])
        if (typeof u?.xp === "number") {
          const lv = levelFromXp(u.xp)
          const rk = rankFromLevel(lv)
          setProfil({ rank: RANK_META[rk].label, rankKey: rk, warna: RANK_META[rk].color, levelXp: lv, koin: u.coins ?? 0 })
        }
      })
      .catch(() => {})
    return () => stopBGM()
  }, [])

  const tulisFeed = useCallback((teks: string) => {
    const id = ++feedIdRef.current
    setFeed((f) => [...f.slice(-2), { id, teks }])
    setTimeout(() => setFeed((f) => f.filter((x) => x.id !== id)), 3000)
  }, [])

  const soalBaru = useCallback(() => {
    teratasiRef.current = false
    if (kantongRef.current.length === 0) kantongRef.current = kocok(QUESTION_BANK_EXPANDED)
    const q = kantongRef.current.pop()!
    // Dua pilihan, bukan empat. Di tengah permainan, membaca empat opsi di layar
    // ponsel memakan waktu yang seharusnya dipakai berpikir — dan menebak tetap
    // mahal karena salah berarti kehilangan combo dan tidak dapat peluru.
    const pengecoh = kocok(q.opsi.filter((_, i) => i !== q.jawaban))[0]
    const opsi = kocok([
      { teks: q.opsi[q.jawaban], benar: true },
      { teks: pengecoh, benar: false },
    ])
    setSoal({ q, opsi })
    setKunci(false)
    setWaktu(DETIK_SOAL)
  }, [])

  const kirimXp = useCallback(async (menang: boolean, peringkat: number) => {
    const skor =
      benarRef.current * 10 +
      maxComboRef.current * 3 +
      tembakRef.current * 5 +
      dibunuhRef.current * 10 +
      (menang ? 40 : 0)
    setMengirim(true)
    try {
      const res = await fetch("/api/game/xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: skor, correct: benarRef.current, wrong: salahRef.current,
          maxStreak: maxComboRef.current, gameType: GAME_TYPE,
        }),
      })
      const d = await res.json().catch(() => ({}))
      setHasil({ menang, peringkat, xp: d?.xpEarned ?? d?.xp ?? skor })
    } catch {
      setHasil({ menang, peringkat, xp: 0 })
    } finally {
      setMengirim(false)
    }
  }, [])

  const selesaikan = useCallback((menang: boolean, peringkat: number) => {
    if (!jalanRef.current) return
    jalanRef.current = false
    cancelAnimationFrame(rafRef.current)
    stopBGM()
    setWaktuAkhir(Math.max(0, DURASI - sisaWaktuRef.current))
    if (!menang) setKalahHp(true)
    if (menang) {
      sfx.win()
      setLevel((l) => {
        const baru = Math.min(l + 1, 99)
        try { localStorage.setItem(KUNCI_LEVEL, String(baru)) } catch {}
        return baru
      })
    } else sfx.gameover()
    setFase("selesai")
    kirimXp(menang, peringkat)
  }, [kirimXp])

  // KUIS TEMPUR 3.0 — naik level di TENGAH sesi: arena di-reset untuk level
  // baru (lebih banyak musuh, arketipe & statistik meningkat), HP pemain diisi
  // ke kurva level baru, timer 5 menit TETAP berjalan (level bukan dari timer).
  const naikLevel = useCallback(() => {
    const baru = Math.min(levelRef.current + 1, 99)
    aturanRef.current = statDasarBot(baru)
    statkuRef.current = kurvaPemain(baru)
    const cv = cvRef.current
    const W = cv?.clientWidth || window.innerWidth
    const H = cv?.clientHeight || window.innerHeight
    const z = zonaRef.current
    const lawan = lawanBot(baru)
    const botWajah = kocok(AVATAR_BOT)
    const botNama = kocok(NAMA_BOT).slice(0, lawan)
    const img = (src: string) => { const i = new Image(); i.src = src; return i }
    const aku = pRef.current[0]
    if (aku) {
      aku.hp = statkuRef.current.hpMax
      aku.hpMax = statkuRef.current.hpMax
      aku.hidup = true
      aku.kedip = 0
    }
    const bot = Array.from({ length: lawan }, (_, i) => {
      const sudut = ((Math.PI * 2) / (lawan + 1)) * (i + 1) - Math.PI / 2
      const jarak = Math.min(W, H) * 0.32
      const x = W / 2 + Math.cos(sudut) * jarak
      const y = H / 2 + Math.sin(sudut) * jarak
      const stat = komposisiBot(baru, giliranBotRef.current++)
      return {
        nama: botNama[i], gambar: img(botWajah[i % botWajah.length]),
        warna: WARNA_TIPE[stat.tipe],
        x, y, tx: x, ty: y,
        hp: stat.hpMax, hpMax: stat.hpMax,
        hidup: true, kamu: false, kedip: 0, langkah: 0, hadap: 1, stat,
      }
    })
    pRef.current = [pRef.current[0], ...bot]
    bRef.current = []
    peluruRef.current = 0
    dibunuhLevelRef.current = 0
    setPeluru(0)
    setHp(statkuRef.current.hpMax)
    setSisaMusuh(lawan)
    setLevel(baru)
    setLevelSelesai(false)
    jalanRef.current = true
    tulisFeed(`Level ${baru} — ${lawan} musuh baru!`)
    sfx.levelup()
  }, [tulisFeed])

  const mulai = useCallback(() => {
    const cv = cvRef.current
    const W = cv?.clientWidth || window.innerWidth
    const H = cv?.clientHeight || window.innerHeight
    const aturan = statDasarBot(level)
    aturanRef.current = aturan
    const statku = kurvaPemain(level)
    statkuRef.current = statku

    // Peta kampung dibangun oleh world engine (posisi normalisasi 0..1):
    // rumah/pohon/batu menahan gerakan & peluru (tabrakan), sisanya dekorasi.
    // Rintangan menahan peluru, jadi peta inilah yang memberi murid pilihan —
    // berlindung dulu, baru berpikir.
    const world = buildWorld(W, H)
    worldRef.current = world
    rintRef.current = collidersToPixels(worldColliders(world), W, H)
    preloadWorldImages(world)
    // Hangatkan cache bayangan karakter sejak awal (fallback elips menutup).
    getWorldImage(SHADOW_SOFT_URL)

    // Jumlah musuh mengikuti ronde. Wajah mereka memakai aset avatar bernomor
    // (public/avatar/1–10) — bukan karakter pemain, supaya kawan vs lawan jelas.
    const lawan = lawanBot(level)
    const botWajah = kocok(AVATAR_BOT)
    const botNama = kocok(NAMA_BOT).slice(0, lawan)
    const img = (src: string) => { const i = new Image(); i.src = src; return i }

    // Tiap bot lahir dengan arketipe acak (ringan/sedang/berat/penembak) yang
    // bobotnya mengikuti ronde — ronde tinggi berarti musuh lebih kuat & rajin
    // menembak. Pemain memakai kurva ronde sendiri (nyawa & peluru).
    const lahirStat = () => komposisiBot(level, giliranBotRef.current)

    pRef.current = Array.from({ length: lawan + 1 }, (_, i) => {
      const sudut = ((Math.PI * 2) / (lawan + 1)) * i - Math.PI / 2
      const jarak = Math.min(W, H) * 0.32
      const kamu = i === 0
      const src = kamu
        ? gambarKarakter(karakterku, "happy")
        : botWajah[(i - 1) % botWajah.length]
      const x = W / 2 + Math.cos(sudut) * jarak
      const y = H / 2 + Math.sin(sudut) * jarak
      const stat = kamu ? undefined : lahirStat()
      return {
        nama: kamu ? namaku : botNama[i - 1], gambar: img(src),
        warna: stat ? WARNA_TIPE[stat.tipe] : "#34D399",
        x, y, tx: x, ty: y,
        hp: stat?.hpMax ?? statku.hpMax,
        hpMax: stat?.hpMax ?? statku.hpMax,
        hidup: true, kamu, kedip: 0, langkah: 0, hadap: 1, stat,
        tinggi: 1,
      }
    })

    bRef.current = []; partRef.current = []; angkaRef.current = []
    zonaRef.current = { x: W / 2, y: H / 2, r: Math.max(W, H) * 0.66 }
    benarRef.current = 0; salahRef.current = 0; tembakRef.current = 0
    comboRef.current = 0; maxComboRef.current = 0; peluruRef.current = 0
    dibunuhRef.current = 0; giliranBotRef.current = 0
    kantongRef.current = kocok(QUESTION_BANK_EXPANDED)
    jalanRef.current = true

    setHp(statku.hpMax); setCombo(0); setPeluru(0)
    setSisaWaktu(DURASI); setKalahkan(0)
    setFeed([]); setHasil(null); setDipilih(null)
    sisaWaktuRef.current = DURASI
    dibunuhLevelRef.current = 0
    setSisaMusuh(lawan)
    setLevelSelesai(false)
    setKalahHp(false)
    setFase("main")
    soalBaru()
    sfx.start()
    startBGM()
  }, [karakterku, namaku, soalBaru, level])

  useEffect(() => {
    const cv = cvRef.current
    if (!cv || fase !== "main") return
    const atur = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = cv.clientWidth * dpr
      cv.height = cv.clientHeight * dpr
      cv.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0)
      // Dunia memakai koordinat normalisasi, jadi komposisi tetap valid saat
      // resize/rotasi — cukup petakan ulang tabrakan ke piksel baru. Entitas
      // (pemain/musuh) sengaja tidak dipindah (perilaku lama dipertahankan).
      const world = worldRef.current
      if (world) {
        rintRef.current = collidersToPixels(worldColliders(world), cv.clientWidth, cv.clientHeight)
      }
    }
    atur()
    window.addEventListener("resize", atur)
    return () => window.removeEventListener("resize", atur)
  }, [fase])

  // Ketukan = menembak musuh yang diketuk. Seretan = berjalan. Keduanya di
  // kanvas yang sama, jadi dibedakan dari jarak dan lama sentuhan — bukan dari
  // tombol terpisah yang memakan ruang layar dan menambah hal untuk dipelajari.
  useEffect(() => {
    const cv = cvRef.current
    if (!cv || fase !== "main") return

    const titik = (e: TouchEvent | MouseEvent) => {
      const r = cv.getBoundingClientRect()
      const cx = "touches" in e ? (e.touches[0] ?? e.changedTouches[0])?.clientX : e.clientX
      const cy = "touches" in e ? (e.touches[0] ?? e.changedTouches[0])?.clientY : e.clientY
      return cx == null || cy == null ? null : { x: cx - r.left, y: cy - r.top }
    }

    const mulaiTekan = (e: TouchEvent | MouseEvent) => {
      e.preventDefault()
      const t = titik(e)
      if (t) tekanRef.current = { ...t, t: Date.now() }
    }
    const gerak = (e: TouchEvent | MouseEvent) => {
      const aku = pRef.current[0]
      if (!aku?.hidup) return
      if ("buttons" in e && e.buttons !== 1) return
      e.preventDefault()
      const t = titik(e)
      if (!t) return
      const awal = tekanRef.current
      if (awal && Math.hypot(t.x - awal.x, t.y - awal.y) > 12) {
        aku.tx = t.x; aku.ty = t.y
      }
    }
    const lepas = (e: TouchEvent | MouseEvent) => {
      const awal = tekanRef.current
      tekanRef.current = null
      const aku = pRef.current[0]
      if (!awal || !aku?.hidup) return
      const t = titik(e) ?? awal
      const jauh = Math.hypot(t.x - awal.x, t.y - awal.y)
      const lama = Date.now() - awal.t
      if (jauh > 12 || lama > 400) return // itu seretan, bukan ketukan

      // Ketukan: cari musuh di titik itu. Radius sentuh dilonggarkan jadi R+14
      // supaya jempol anak tidak perlu presisi.
      const sasaran = pRef.current.findIndex(
        (p, i) => i !== 0 && p.hidup && Math.hypot(t.x - p.x, t.y - p.y) < R + 14
      )
      if (sasaran === -1) return
      if (peluruRef.current <= 0) {
        tulisFeed("Peluru habis — jawab benar dulu!")
        sfx.wrong()
        return
      }
      peluruRef.current--
      setPeluru(peluruRef.current)
      tembakRef.current++
      const o = pRef.current[sasaran]
      const a = Math.atan2(o.y - aku.y, o.x - aku.x)
      aku.hadap = Math.cos(a) >= 0 ? 1 : -1
      bRef.current.push({
        x: aku.x, y: aku.y,
        vx: Math.cos(a) * 10, vy: Math.sin(a) * 10,
        dari: 0, umur: 110, dmg: statkuRef.current.dmgTembak,
      })
      sfx.tap(); haptic(15)
    }

    cv.addEventListener("touchstart", mulaiTekan, { passive: false })
    cv.addEventListener("touchmove", gerak, { passive: false })
    cv.addEventListener("touchend", lepas)
    cv.addEventListener("mousedown", mulaiTekan)
    cv.addEventListener("mousemove", gerak)
    cv.addEventListener("mouseup", lepas)
    return () => {
      cv.removeEventListener("touchstart", mulaiTekan)
      cv.removeEventListener("touchmove", gerak)
      cv.removeEventListener("touchend", lepas)
      cv.removeEventListener("mousedown", mulaiTekan)
      cv.removeEventListener("mousemove", gerak)
      cv.removeEventListener("mouseup", lepas)
    }
  }, [fase, tulisFeed])

  // ── KEYBOARD MOVEMENT ────────────────────────────────────────────────
  // Arrow keys + WASD. Direction state consumed by game loop for smooth
  // continuous movement while held. Prevents browser scroll on arrow keys.
  useEffect(() => {
    if (fase !== "main") return
    const k = keyRef.current
    const down = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowUp": case "KeyW": k.up = true; e.preventDefault(); break
        case "ArrowDown": case "KeyS": k.down = true; e.preventDefault(); break
        case "ArrowLeft": case "KeyA": k.left = true; e.preventDefault(); break
        case "ArrowRight": case "KeyD": k.right = true; e.preventDefault(); break
      }
    }
    const up = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowUp": case "KeyW": k.up = false; break
        case "ArrowDown": case "KeyS": k.down = false; break
        case "ArrowLeft": case "KeyA": k.left = false; break
        case "ArrowRight": case "KeyD": k.right = false; break
      }
    }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => {
      k.up = k.down = k.left = k.right = false
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [fase])

  useEffect(() => {
    if (fase !== "main") return
    const cv = cvRef.current
    const ctx = cv?.getContext("2d")
    if (!cv || !ctx) return

    const ledak = (x: number, y: number, warna: string, n = 10) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const s = 1 + Math.random() * 3
        partRef.current.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, umur: 26, warna })
      }
    }

    const bunuh = (i: number, oleh: string) => {
      const p = pRef.current[i]
      if (!p.hidup) return
      p.hidup = false; p.hp = 0
      ledak(p.x, p.y, p.warna, 20)
      tulisFeed(`${oleh} menumbangkan ${p.nama} ${p.stat ? LABEL_TIPE[p.stat.tipe] : ""}`)
      const s = pRef.current.filter((x) => x.hidup).length
      if (p.kamu) selesaikan(false, s + 1)
      else {
        sfx.levelup()
        dibunuhRef.current++
        dibunuhLevelRef.current++
        setKalahkan(dibunuhRef.current)
        const sisa = Math.max(0, lawanBot(levelRef.current) - dibunuhLevelRef.current)
        setSisaMusuh(sisa)
        // KUIS TEMPUR 3.0 — target level tercapai → pause sebentar → naik level.
        if (dibunuhLevelRef.current >= lawanBot(levelRef.current)) {
          jalanRef.current = false
          setLevelSelesai(true)
          naikTimerRef.current = window.setTimeout(() => naikLevel(), 1600)
          return
        }
      }
    }

    // Dorong keluar kalau menembus rintangan — karakter tidak boleh berjalan
    // menembus rumah atau pohon, kalau tidak "berlindung" kehilangan artinya.
    const dorongKeluar = (p: Pemain) => {
      for (const r of rintRef.current) {
        // Pohon DAN batu sama-sama lingkaran; hanya rumah yang persegi.
        if (r.jenis === "pohon" || r.jenis === "batu") {
          const d = Math.hypot(p.x - r.x, p.y - r.y)
          const min = r.r + R * 0.55
          if (d < min && d > 0.01) {
            p.x = r.x + ((p.x - r.x) / d) * min
            p.y = r.y + ((p.y - r.y) / d) * min
          }
        } else {
          const m = R * 0.5
          if (p.x > r.x - m && p.x < r.x + r.w + m && p.y > r.y - m && p.y < r.y + r.h + m) {
            const kiri = p.x - (r.x - m), kanan = r.x + r.w + m - p.x
            const atas = p.y - (r.y - m), bawah = r.y + r.h + m - p.y
            const min = Math.min(kiri, kanan, atas, bawah)
            if (min === kiri) p.x = r.x - m
            else if (min === kanan) p.x = r.x + r.w + m
            else if (min === atas) p.y = r.y - m
            else p.y = r.y + r.h + m
          }
        }
      }
    }

    const gelung = () => {
      if (!jalanRef.current) return
      const W = cv.clientWidth, H = cv.clientHeight
      const z = zonaRef.current
      const at = aturanRef.current

      // ── WORLD ──────────────────────────────────────────────────────────
      // Urutan lapisan: back → mid ── entitas (di bawah) ── front.
      // Tabrakan (rintRef) dipetakan dari WORLD DATA yang sama melalui
      // collidersToPixels, sehingga visual & logika tidak bisa meleset.
      const world = worldRef.current
      if (world) {
        drawWorldBackdrop(ctx, world, W, H)
        drawWorldLayer(ctx, world, "back", W, H)
        drawWorldLayer(ctx, world, "mid", W, H)
      } else {
        ctx.fillStyle = "#5E9337"
        ctx.fillRect(0, 0, W, H)
      }

      pRef.current.forEach((p, i) => {
        if (!p.hidup) return
        // ── Keyboard movement: override tx/ty for continuous movement ──
        if (p.kamu) {
          const k = keyRef.current
          const kmx = (k.left ? -1 : 0) + (k.right ? 1 : 0)
          const kmy = (k.up ? -1 : 0) + (k.down ? 1 : 0)
          if (kmx !== 0 || kmy !== 0) {
            const laju = 2.6
            const len = Math.hypot(kmx, kmy)
            p.tx = p.x + (kmx / len) * laju
            p.ty = p.y + (kmy / len) * laju
            // Update facing direction for sprite flip
            if (kmx !== 0) p.hadap = kmx > 0 ? 1 : -1
          }
        }
        const dx = p.tx - p.x, dy = p.ty - p.y
        const jarak = Math.hypot(dx, dy)
        const bergerak = jarak > 2
        if (bergerak) {
          const laju = p.kamu ? 2.6 : (p.stat?.laju ?? at.lajuBot) * 3
          p.x += (dx / jarak) * Math.min(laju, jarak)
          p.y += (dy / jarak) * Math.min(laju, jarak)
          p.langkah += 0.28
          if (Math.abs(dx) > 1) p.hadap = dx > 0 ? 1 : -1
        } else {
          p.langkah += 0.06
        }
        dorongKeluar(p)
        if (p.kedip > 0) p.kedip--
        // nilai zona perlindungan karakter utama sesuatukan dengan luas canvas
        if (p.kamu && p.tinggi !== undefined && p.tinggi < 1) p.tinggi += 2 * 0.01

        if (Math.hypot(p.x - z.x, p.y - z.y) > z.r) {
          p.hp -= 0.12
          if (p.kamu) setHp(Math.max(0, Math.round(p.hp)))
          if (p.hp <= 0) bunuh(i, "Kabut")
        } else {
          if (p.kamu) p.tinggi = Math.min((p.tinggi ?? 1) + 0.008, 1.5)
          else          p.tinggi = Math.min((p.tinggi ?? 1) + 0.005, 1.5)
        }

        if (!p.kamu && p.kedip === 0) {
          p.tinggi = Math.min((p.tinggi ?? 1) + Math.random() * 0.1, 1.5)
        }

        if (!p.kamu) {
          if (jarak < 12) {
            const aku = pRef.current[0]
            for (let c = 0; c < 12; c++) {
              let nx: number, ny: number
              // Bot mendekati pemain lebih sering supaya arena terasa hidup dan
              // peluru pemain selalu punya sasaran terdekat.
              if (aku?.hidup && Math.random() < 0.55) {
                const a = Math.random() * Math.PI * 2
                const d = 60 + Math.random() * 100
                nx = aku.x + Math.cos(a) * d
                ny = aku.y + Math.sin(a) * d
              } else {
                const a = Math.random() * Math.PI * 2
                const rr = Math.random() * z.r * 0.75
                nx = z.x + Math.cos(a) * rr
                ny = z.y + Math.sin(a) * rr
              }
              if (nx < 24 || nx > W - 24 || ny < 56 || ny > H - 64) continue
              if (!rintRef.current.some((o) => kenaRintangan(nx, ny, o))) { p.tx = nx; p.ty = ny; break }
            }
          }
          if (Math.random() < (p.stat?.peluangTembak ?? at.peluangTembak)) {
            const t = pRef.current.findIndex((x, j) => j !== i && x.hidup)
            if (t !== -1) {
              const o = pRef.current[t]
              const a = Math.atan2(o.y - p.y, o.x - p.x) + (Math.random() - 0.5) * (p.stat?.sebaran ?? at.sebaran)
              bRef.current.push({
                x: p.x, y: p.y, vx: Math.cos(a) * at.lajuPeluru, vy: Math.sin(a) * at.lajuPeluru,
                dari: i, umur: 120, dmg: p.stat?.dmg ?? at.dmgBot,
              })
            }
          }
        }

        // Rasa berjalan tanpa lembar sprite: badan naik-turun mengikuti langkah,
        // condong sedikit ke arah gerak, dan bayangan memipih saat kaki menapak.
        // Hanya Alby yang punya pose "running", jadi animasi dibuat prosedural
        // agar ketiga karakter dan foto profil murid ikut terasa hidup.
        const ayun = bergerak ? Math.sin(p.langkah) * 3.2 : Math.sin(p.langkah) * 0.8
        const py = p.y + ayun
        const condong = bergerak ? Math.sin(p.langkah) * 0.07 * p.hadap : 0

        // Bayangan kontak = sprite shadow_soft.png (QT-WORLD-02 §11).
        // Elips prosedural hanya fallback saat gambar belum termuat — tidak
        // ada lingkaran/halo/ring target di sini (dihapus QT-WORLD-01).
        const bayang = getWorldImage(SHADOW_SOFT_URL)
        if (isWorldImageReady(bayang)) {
          const bw = R * 3.4
          const bh = bw * 0.32
          ctx.drawImage(bayang, p.x - bw / 2, p.y + R * 0.82 - bh / 2, bw, bh)
        } else {
          ctx.fillStyle = "rgba(0,0,0,0.28)"
          ctx.beginPath()
          ctx.ellipse(p.x, p.y + R * 0.82, R * (0.62 - ayun * 0.02), R * 0.22, 0, 0, Math.PI * 2)
          ctx.fill()
        }

        // Grounding karakter = bayangan kontak lembut di atas (tanpa lingkaran
        // target/seleksi — lingkaran besar dihapus QT-WORLD-01).
        ctx.save()
        ctx.translate(p.x, py)
        ctx.rotate(condong)
        ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.clip()
        if (p.gambar?.complete && p.gambar.naturalWidth > 0) {
          ctx.drawImage(p.gambar, -R, -R, R * 2, R * 2)          } else {
          ctx.fillStyle = p.warna; ctx.fillRect(-R, -R, R * 2, R * 2)
        }
        ctx.restore()

        // Nama & bilah nyawa tetap di atas karakter (tidak diubah).

        ctx.fillStyle = "#fff"; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "center"
        ctx.fillText(p.nama, p.x, py - R - 13)
        ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(p.x - 21, py - R - 9, 42, 4)
        ctx.fillStyle = p.hp > 35 ? "#34D399" : "#F87171"
        ctx.fillRect(p.x - 21, py - R - 9, 42 * Math.max(0, p.hp / Math.max(1, p.hpMax)), 4)
      })

      // Lapisan depan (foreground jarang, tidak menutupi gameplay) — selalu di
      // bawah peluru/partikel/UI supaya keterbacaan tempur terjaga.
      if (world) drawWorldLayer(ctx, world, "front", W, H)

      for (let i = bRef.current.length - 1; i >= 0; i--) {
        const b = bRef.current[i]
        b.x += b.vx; b.y += b.vy; b.umur--

        if (rintRef.current.some((r) => kenaRintangan(b.x, b.y, r))) {
          for (let n = 0; n < 5; n++) {
            const a = Math.random() * Math.PI * 2
            partRef.current.push({ x: b.x, y: b.y, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, umur: 14, warna: "#E2E8F0" })
          }
          bRef.current.splice(i, 1); continue
        }

        let kena = false
        pRef.current.forEach((t, j) => {
          if (kena || j === b.dari || !t.hidup) return
          if (Math.hypot(b.x - t.x, b.y - t.y) < R) {
            t.hp -= b.dmg; t.kedip = 6
            angkaRef.current.push({ x: t.x, y: t.y - R, teks: `-${b.dmg}`, umur: 32, warna: b.dari === 0 ? "#34D399" : "#F87171" })
            ledak(t.x, t.y, b.dari === 0 ? "#34D399" : "#F87171", 7)
            if (t.kamu) { setHp(Math.max(0, Math.round(t.hp))); haptic(30) }
            if (t.hp <= 0) bunuh(j, pRef.current[b.dari].nama)
            kena = true
          }
        })
        if (kena || b.umur <= 0) bRef.current.splice(i, 1)
        else {
          ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2)
          ctx.fillStyle = b.dari === 0 ? "#34D399" : "#F87171"
          ctx.shadowBlur = 10; ctx.shadowColor = ctx.fillStyle as string
          ctx.fill(); ctx.shadowBlur = 0
        }
      }

      for (let i = partRef.current.length - 1; i >= 0; i--) {
        const q = partRef.current[i]
        q.x += q.vx; q.y += q.vy; q.vx *= 0.94; q.vy *= 0.94; q.umur--
        if (q.umur <= 0) { partRef.current.splice(i, 1); continue }
        ctx.globalAlpha = q.umur / 26; ctx.fillStyle = q.warna
        ctx.fillRect(q.x - 2, q.y - 2, 4, 4); ctx.globalAlpha = 1
      }

      for (let i = angkaRef.current.length - 1; i >= 0; i--) {
        const a = angkaRef.current[i]
        a.y -= 0.8; a.umur--
        if (a.umur <= 0) { angkaRef.current.splice(i, 1); continue }
        ctx.globalAlpha = Math.min(1, a.umur / 20)
        ctx.fillStyle = a.warna;          ctx.font = "900 15px system-ui, sans-serif"; ctx.textAlign = "center"
        ctx.fillText(a.teks, a.x, a.y); ctx.globalAlpha = 1
      }

      // Bingkai dalam krem tipis — menautkan arena gelap ke chrome krem gim.
      ctx.strokeStyle = "rgba(253, 230, 138, 0.15)"
      ctx.lineWidth = 2
      ctx.strokeRect(1.5, 1.5, W - 3, H - 3)

      rafRef.current = requestAnimationFrame(gelung)
    }
    rafRef.current = requestAnimationFrame(gelung)
    return () => cancelAnimationFrame(rafRef.current)
  }, [fase, selesaikan, tulisFeed, level, naikLevel])

  const jawab = (idx: number, benar: boolean) => {
    if (kunci || teratasiRef.current || fase !== "main") return
    teratasiRef.current = true
    setKunci(true); setDipilih(idx)
    const aku = pRef.current[0]

    if (benar) {
      benarRef.current++
      comboRef.current++
      maxComboRef.current = Math.max(maxComboRef.current, comboRef.current)
      setCombo(comboRef.current)
      comboRef.current > 1 ? sfx.combo(comboRef.current) : sfx.correct()
      // Combo memberi peluru tambahan: benar berturut-turut membuka lebih banyak
      // tembakan, jadi ketelitian berbuah kekuatan — bukan sekadar poin di akhir.
      const dapat = 1 + (comboRef.current >= 3 ? 1 : 0)
      peluruRef.current += dapat
      setPeluru(peluruRef.current)
      angkaRef.current.push({ x: aku.x, y: aku.y - R, teks: `+${dapat} peluru`, umur: 40, warna: "#FBBF24" })
    } else {
      salahRef.current++
      comboRef.current = 0
      setCombo(0)
      sfx.wrong(); haptic([20, 40, 20])
      aku.hp -= DMG_SALAH; aku.kedip = 8
      angkaRef.current.push({ x: aku.x, y: aku.y - R, teks: `-${DMG_SALAH}`, umur: 32, warna: "#F87171" })
      setHp(Math.max(0, Math.round(aku.hp)))
      if (aku.hp <= 0) {
        const s = pRef.current.filter((x) => x.hidup).length
        aku.hidup = false; selesaikan(false, s); return
      }
    }
    setTimeout(() => { setDipilih(null); soalBaru() }, 750)
  }

  // Hitung mundur waktu menjawab. Habis waktu = kehilangan combo dan tidak dapat
  // peluru, TETAPI tidak mengurangi HP: berlindung sambil berpikir tidak boleh
  // dihukum seperti menjawab salah. Yang dihukum adalah diam saja.
  //
  // Penting: efek ini TIDAK boleh berhenti karena kunci berubah menjadi true —
  // dulu `kunci` ikut dalam dependency sehingga begitu waktu habis lalu setKunci
  // memicu render ulang, cleanup membatalkan timeout yang seharusnya mengganti
  // soal. Akibatnya soal membeku sampai sesi berakhir. Kini "sudah teratasi"
  // dijaga lewat ref, jadi timeout penggantian soal selalu sempat berjalan.
  useEffect(() => {
    if (fase !== "main" || teratasiRef.current || !soal) return
    if (waktu <= 0) {
      teratasiRef.current = true
      setKunci(true)
      comboRef.current = 0
      setCombo(0)
      salahRef.current++
      sfx.wrong()
      tulisFeed("Waktu habis!")
      const t = setTimeout(() => { setDipilih(null); soalBaru() }, 600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setWaktu((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [waktu, fase, soal, soalBaru, tulisFeed])

  // Timer 5 menit seluruh sesi. Bertahan sampai nol = menang. Dulu sesi
  // berakhir cepat karena cukup menyingkirkan 4 bot awal; sekarang selama
  // masih hidup kamu terus menghadapi bot yang berdatangan.
  useEffect(() => {
    if (fase !== "main") return
    sisaWaktuRef.current = sisaWaktu
    if (sisaWaktu <= 0) {
      const aku = pRef.current[0]
      if (aku?.hidup) selesaikan(true, 1)
      return
    }
    const t = setTimeout(() => setSisaWaktu((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [sisaWaktu, fase, selesaikan])

  const gantiSuara = () => {
    const on = toggleSound()
    setSuara(on)
    if (fase === "main") on ? startBGM() : stopBGM()
  }

  // ── Rangka visual chunky cream yang sama dengan gim solo lain ─────────────
  const chunky = "border-4 border-[#161B3A] dark:border-white/25 shadow-[6px_6px_0_#DC2626]"
  const btn = `inline-flex items-center justify-center gap-2 font-extrabold rounded-2xl ${chunky} transition-transform active:translate-x-1.5 active:translate-y-1.5 active:shadow-none`
  const avatarHasil = gambarKarakter(karakterku, hasil?.menang ? "celebrate" : "idle")
  const avatarHdr = gambarKarakter(karakterku, "happy")

  const Hdr = (
    <div className="mb-3 flex w-full items-center justify-between">
      <div className="flex items-center gap-2">
        <Link
          href={backHref}
          aria-label="Kembali ke daftar gim"
          className={`${btn} h-12 w-12 shrink-0 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 text-[#161B3A] dark:text-[#F1EDFF] hover:bg-slate-50 dark:hover:bg-slate-700`}
        >
          <ArrowLeft className="h-5 w-5 text-[#161B3A] dark:text-[#F1EDFF]" />
        </Link>
        <div className="kt-pop h-11 w-11 shrink-0 overflow-hidden rounded-2xl border-4 border-[#161B3A] dark:border-white/25 bg-white dark:bg-[#241218] shadow-[4px_4px_0_#DC2626]">
          <img src={avatarHdr} alt="" className="h-full w-full object-cover" />
        </div>
        <div>
          <div className="text-lg font-extrabold leading-none">Kuis Tempur</div>
          <div className="mt-0.5 text-[10px] font-semibold opacity-60">Bertahan di kampung kata!</div>
        </div>
      </div>
      <button
        onClick={gantiSuara}
        aria-label={suara ? "Matikan suara" : "Nyalakan suara"}
        className={`${btn} h-11 w-11 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 text-[#161B3A] dark:text-[#F1EDFF] hover:bg-slate-50 dark:hover:bg-slate-700`}
      >
        {suara ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
      </button>
    </div>
  )

  if (fase === "pilih") {
    const pilihan = KARAKTER.map((k) => ({ id: k, nama: PROFIL[k].nama, src: gambarKarakter(k, "happy") }))
    return (
      <div className="game-env game-env-kuis fixed inset-0 z-[60] overflow-y-auto game-env-bg bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#150A0A] dark:to-[#200E0E] text-[#161B3A] dark:text-[#F1EDFF]">
        <style>{KT_STYLE}</style>
        <div className="relative mx-auto flex min-h-full max-w-xl flex-col items-center px-4 py-5">
          {Hdr}
          <div className={`kt-screen w-full max-w-md rounded-3xl game-env-card bg-white dark:bg-gradient-to-br dark:from-[#241218] dark:to-[#301C24] p-6 text-center ${chunky}`}>
            <div className="kt-pop mx-auto mb-3 h-24 w-24 overflow-hidden rounded-3xl border-4 border-[#161B3A] dark:border-white/25 shadow-[6px_6px_0_#DC2626]">
              <img src={avatarHdr} alt="" className="h-full w-full object-cover" />
            </div>
            <h1 className="font-game-display mb-2 text-3xl font-extrabold">Kuis Tempur</h1>
            <p className="mb-5 text-sm opacity-70">Jawab benar untuk menembak, salah kamu yang terluka. Kalahkan semua musuh untuk naik level — sejauh mana kamu bisa dalam 5 menit?</p>

            <div className="mb-5 space-y-1.5 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-left text-xs font-semibold text-amber-800">
              <p><b className="text-amber-900">1.</b> Sembunyi di balik rumah atau pohon — peluru tertahan di situ.</p>
              <p><b className="text-amber-900">2.</b> Jawab benar untuk mendapat <b>peluru</b>.</p>
              <p><b className="text-amber-900">3.</b> Ketuk musuh untuk menembaknya. Seret untuk berjalan.</p>
              <p><b className="text-amber-900">4.</b> Kalahkan <b>semua musuh</b> untuk naik level — musuh makin banyak dan makin kuat.</p>
              <p><b className="text-amber-900">5.</b> Jawab sebelum <b>15 detik</b> — waktu habis, soal diganti otomatis.</p>
            </div>

            <h2 className="mb-2 text-left text-xs font-extrabold uppercase tracking-wider opacity-60">Pilih karaktermu</h2>
            <div className="mb-4 grid grid-cols-2 gap-3">
              {pilihan.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setKarakterku(p.id); simpanKarakter(p.id); sfx.tap() }}
                  className={`rounded-2xl border-[3px] p-3 text-center transition-all active:scale-95 ${
                    karakterku === p.id ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-500/15" : "border-[#161B3A] dark:border-white/25/20 bg-white dark:bg-[#241218] shadow-[4px_4px_0_#DC2626]"
                  }`}
                >
                  <img src={p.src} alt="" className="mx-auto h-16 w-16 rounded-full object-cover" />
                  <span className="mt-2 block truncate text-xs font-extrabold">{p.nama}</span>
                </button>
              ))}
            </div>

            <div className="mb-4 flex items-center justify-center gap-3 text-xs font-bold opacity-70">
              <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-rose-500" /> Level {level}</span>
              <span>·</span>
              <span>⏱ 5 menit</span>
              <span>·</span>
              <span>{lawanBot(level)} lawan</span>
              {profil && (
                <span className="flex items-center gap-1" style={{ color: profil.warna }}>
                  <RankIcon rank={profil.rankKey} size={14} /> Lv {profil.levelXp}
                </span>
              )}
            </div>

            <button onClick={mulai} className={`${btn} w-full bg-emerald-400 px-5 py-4 text-lg`}>
              Masuk Kampung
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (fase === "selesai") {
    return (
      <div className="game-env game-env-kuis fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#150A0A] dark:to-[#200E0E] text-[#161B3A] dark:text-[#F1EDFF]">
        <style>{KT_STYLE}</style>
        <div className="relative mx-auto flex min-h-full max-w-xl flex-col items-center justify-center px-4 py-5">
          {Hdr}
          <div className={`kt-screen w-full max-w-md rounded-3xl bg-white dark:bg-gradient-to-br dark:from-[#241218] dark:to-[#301C24] p-6 text-center ${chunky}`}>
            <div
              className={`kt-pop relative mx-auto mb-3 h-24 w-24 overflow-hidden rounded-3xl border-4 border-[#161B3A] dark:border-white/25 shadow-[6px_6px_0_#DC2626] ${hasil?.menang ? "" : "opacity-70 grayscale"}`}
              style={{ boxShadow: profil && hasil?.menang ? `0 0 32px ${profil.warna}66` : undefined }}
            >
              <img src={avatarHasil} alt="" className="h-full w-full object-cover" />
              {hasil?.menang && <span className="absolute -bottom-1 -right-1 text-2xl">🏆</span>}
            </div>
            <h2 className="font-game-display mb-1 text-3xl font-extrabold">
              {hasil?.menang ? "Waktu Habis!" : "Pertempuran Selesai!"}
            </h2>
            <p className="mb-1 text-sm font-semibold opacity-70">
              {hasil?.menang
                ? "Kamu bertahan sampai akhir sesi."
                : "HP kamu habis."}
            </p>
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-xl bg-[#161B3A] px-3 py-1.5 text-xs font-extrabold text-amber-300 shadow-[3px_3px_0_#FBBF24]">
              Level tertinggi: LEVEL {level}
            </p>
            {profil && (
              <p className="mb-4 flex items-center justify-center gap-1.5 text-xs font-extrabold" style={{ color: profil.warna }}>
                <RankIcon rank={profil.rankKey} size={20} /> {profil.rank} · Lv {profil.levelXp}
              </p>
            )}
            <div className="mb-2 grid grid-cols-2 gap-2 text-[11px] font-bold">
              <div className="rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 bg-white dark:bg-[#241218] px-2 py-1.5 shadow-[3px_3px_0_#DC2626]">
                <span className="opacity-60">Musuh dikalahkan</span> · {kalahkan}
              </div>
              <div className="rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 bg-white dark:bg-[#241218] px-2 py-1.5 shadow-[3px_3px_0_#DC2626]">
                <span className="opacity-60">Waktu bertahan</span> · {Math.floor(waktuAkhir / 60)}:{String(waktuAkhir % 60).padStart(2, "0")}
              </div>
              <div className="rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 bg-white dark:bg-[#241218] px-2 py-1.5 shadow-[3px_3px_0_#DC2626]">
                <span className="opacity-60">Soal dijawab</span> · {benarRef.current + salahRef.current}
              </div>
              <div className="rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 bg-white dark:bg-[#241218] px-2 py-1.5 shadow-[3px_3px_0_#DC2626]">
                <span className="opacity-60">Akurasi</span> · {benarRef.current + salahRef.current > 0 ? Math.round((benarRef.current / (benarRef.current + salahRef.current)) * 100) : 0}%
              </div>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 bg-[#161B3A] px-2 py-2 text-white shadow-[3px_3px_0_#DC2626]">
                <div className="text-[9px] font-extrabold uppercase opacity-70">Benar</div>
                <div className="text-lg font-extrabold leading-none">{benarRef.current}</div>
              </div>
              <div className="rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 bg-rose-500 px-2 py-2 text-white shadow-[3px_3px_0_#DC2626]">
                <div className="text-[9px] font-extrabold uppercase opacity-80">Salah</div>
                <div className="text-lg font-extrabold leading-none">{salahRef.current}</div>
              </div>
              <div className="rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 bg-amber-300 px-2 py-2 text-[#161B3A] dark:text-[#F1EDFF] shadow-[3px_3px_0_#DC2626]">
                <div className="text-[9px] font-extrabold uppercase opacity-70">Rentetan</div>
                <div className="text-lg font-extrabold leading-none">{maxComboRef.current}x</div>
              </div>
            </div>
            <div className="mb-4 rounded-2xl bg-[#161B3A] px-6 py-4 text-white shadow-[5px_5px_0_#FBBF24]">
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">XP Didapat</div>
              <div className="text-4xl font-extrabold leading-none">
                {mengirim ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : `+${hasil?.xp ?? 0}`}
              </div>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={mulai} className={`${btn} bg-emerald-400 px-5 py-3`}>
                <RotateCcw className="h-4 w-4" /> Main Lagi
              </button>
              <Link href={backHref} className={`${btn} bg-[#FBBF24] hover:brightness-110 px-5 py-3`}>Daftar Gim</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="game-env game-env-kuis fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#150A0A] dark:to-[#200E0E] text-[#161B3A] dark:text-[#F1EDFF]">
      <style>{KT_STYLE}</style>
      <div className="relative mx-auto flex min-h-full w-full max-w-[1280px] flex-col items-center px-4 py-3">
        {Hdr}

        <div className="kt-screen flex w-full flex-col items-center">
          <div className="mb-2 grid w-full grid-cols-5 gap-2">
            <div className="rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 bg-[#161B3A] px-2 py-2 text-white shadow-[3px_3px_0_#DC2626]">
              <div className="text-[8px] font-extrabold uppercase opacity-70">Nyawa</div>
              <div className="flex items-center gap-1 text-lg font-extrabold leading-none">
                <span className="text-rose-400">❤️</span> {hp}/{kurvaPemain(level).hpMax}
              </div>
            </div>
            <div className={`rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 px-2 py-2 shadow-[3px_3px_0_#DC2626] ${peluru > 0 ? "bg-amber-300" : "bg-white dark:bg-[#241218] opacity-70"}`}>
              <div className="text-[8px] font-extrabold uppercase opacity-70">Peluru</div>
              <div className="text-lg font-extrabold leading-none">{peluru}</div>
            </div>
            <div className={`rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 px-2 py-2 shadow-[3px_3px_0_#DC2626] ${combo > 1 ? "bg-orange-300" : "bg-white dark:bg-[#241218] opacity-70"}`}>
              <div className="text-[8px] font-extrabold uppercase opacity-70">Rentetan</div>
              <div className="text-lg font-extrabold leading-none">{combo}x</div>
            </div>
            <div className="rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 bg-white dark:bg-[#241218] px-2 py-2 shadow-[3px_3px_0_#DC2626]">
              <div className="text-[8px] font-extrabold uppercase opacity-70">Level</div>
              <div className="text-lg font-extrabold leading-none">{level}</div>
            </div>
            <div className="rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 bg-violet-500 px-2 py-2 text-white shadow-[3px_3px_0_#DC2626]">
              <div className="text-[8px] font-extrabold uppercase opacity-80">Kalahkan</div>
              <div className="text-lg font-extrabold leading-none">{kalahkan}</div>
            </div>
          </div>

          {/* Sisa waktu bertahan — batas sesi 5 menit. Level naik dari performa
              (kalahkan semua musuh), BUKAN dari waktu. */}
          <div className="mb-2 w-full">
            <div className={`mb-1 flex items-center justify-between text-[11px] font-extrabold ${sisaWaktu <= 60 ? "text-rose-600" : "text-[#161B3A] dark:text-[#F1EDFF]/70"}`}>
              <span>⏱ Bertahan</span>
              <span>{Math.floor(sisaWaktu / 60)}:{String(sisaWaktu % 60).padStart(2, "0")}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full border border-[#161B3A] dark:border-white/25/20 bg-[#161B3A]/10">
              <span
                className={`block h-full rounded-full transition-all duration-1000 ease-linear ${sisaWaktu <= 60 ? "bg-rose-500" : "bg-violet-400"}`}
                style={{ width: `${(sisaWaktu / DURASI) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] font-bold text-[#161B3A] dark:text-[#F1EDFF]/70">
              {sisaMusuh > 0
                ? `Kalahkan ${sisaMusuh} musuh lagi untuk naik ke Level ${Math.min(level + 1, 99)}!`
                : "Semua musuh tumbang!"}
            </p>
          </div>

          {/* Baris rank & koin dari data murid yang sebenarnya. Kalau belum
              termuat, tidak menampilkan angka karangan sama sekali. */}
          {profil && (
            <div className="mb-2 flex w-full items-center justify-between text-[11px] font-extrabold">
              <span className="flex items-center gap-1.5" style={{ color: profil.warna }}>
                <RankIcon rank={profil.rankKey} size={16} /> {profil.rank} · Lv {profil.levelXp}
              </span>
              <span className="flex items-center gap-1 text-amber-600">
                <span aria-hidden>🪙</span> {profil.koin.toLocaleString("id-ID")}
              </span>
            </div>
          )}

          <div className="relative w-full">
            {/* LEVEL COMPLETE — jeda singkat lalu naik level otomatis */}
            {levelSelesai && (
              <div className="kt-pop absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl border-4 border-[#161B3A] dark:border-white/25 bg-[#161B3A]/90 p-6 text-center text-white">
                <p className="text-3xl font-black tracking-wide text-amber-300">LEVEL {level} SELESAI!</p>
                <p className="text-sm font-semibold text-white/85">Hebat! Musuh bertambah dan tantangan meningkat.</p>
                <p className="mt-2 rounded-xl bg-amber-300 px-4 py-2 text-sm font-extrabold text-[#161B3A] dark:text-[#F1EDFF]">
                  LANJUT KE LEVEL {Math.min(level + 1, 99)}…
                </p>
              </div>
            )}
            <div className="pointer-events-none absolute right-2 top-2 z-10 flex flex-col items-end gap-1">
              {feed.map((f) => (
                <span key={f.id} className="rounded-lg bg-[#161B3A]/90 px-2 py-1 text-[10px] font-semibold text-white">{f.teks}</span>
              ))}
            </div>
            <canvas ref={cvRef} className="h-[60dvh] max-h-[620px] min-h-[380px] w-full touch-none rounded-2xl border-4 border-[#161B3A] dark:border-white/25 shadow-[6px_6px_0_#DC2626]" />
          </div>

          <div className="mt-2 w-full max-w-[900px]">
            <div className="mb-2 rounded-2xl border-4 border-[#161B3A] dark:border-white/25 bg-white dark:bg-[#241218] px-4 py-3 text-center shadow-[4px_4px_0_#DC2626]">
              <p className="text-[15px] font-bold leading-snug text-[#161B3A] dark:text-[#F1EDFF]">{soal?.q.soal}</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {soal?.opsi.map((o, i) => {
                const terbuka = dipilih !== null
                let gaya = "bg-white dark:bg-[#2E1A20] border-[#161B3A] dark:border-white/25 text-[#161B3A] dark:text-[#F1EDFF]"
                if (terbuka && o.benar) gaya = "bg-emerald-200 dark:bg-emerald-500/25 border-emerald-700 dark:border-emerald-400 text-emerald-900 dark:text-emerald-200"
                else if (terbuka && dipilih === i) gaya = "bg-rose-200 dark:bg-rose-500/25 border-rose-700 dark:border-rose-400 text-rose-900 dark:text-rose-200"
                else if (terbuka) gaya = "bg-white/60 dark:bg-white/5 border-[#161B3A] dark:border-white/25 text-[#161B3A]/50 dark:text-[#F1EDFF]/40"
                return (
                  <button
                    key={i}
                    onClick={() => jawab(i, o.benar)}
                    disabled={kunci}
                    className={`flex items-center gap-2 rounded-2xl border-[3px] px-3 py-3.5 text-left text-sm font-bold shadow-[3px_3px_0_#DC2626] transition-all active:scale-[0.97] ${gaya}`}
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 border-current text-[11px] font-black">
                      {i === 0 ? "A" : "B"}
                    </span>
                    <span className="leading-tight">{o.teks}</span>
                  </button>
                )
              })}
            </div>

            {/* Sisa waktu. Bilah menipis lebih cepat terbaca daripada angka saat
                mata sedang tertuju ke arena. */}
            <div className="mt-2.5 flex items-center gap-2">
              <span className="shrink-0 text-[11px] font-bold text-[#161B3A] dark:text-[#F1EDFF]/60">⏱ Waktu jawab {waktu} dtk</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full border border-[#161B3A] dark:border-white/25/20 bg-[#161B3A]/10">
                <span
                  className={`block h-full rounded-full transition-all duration-1000 ease-linear ${waktu <= 5 ? "bg-rose-500" : "bg-emerald-400"}`}
                  style={{ width: `${(waktu / DETIK_SOAL) * 100}%` }}
                />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

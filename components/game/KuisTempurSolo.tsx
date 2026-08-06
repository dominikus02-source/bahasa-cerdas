"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, Users, Volume2, VolumeX, Loader2, Flame, Crosshair } from "lucide-react"
import { QUESTION_BANK, type BankQuestion } from "@/lib/game/question-bank"
import { gambarKarakter, KARAKTER, PROFIL, type Karakter } from "@/lib/arena-junior/karakter"
import { sfx, startBGM, stopBGM, isSoundOn, toggleSound, haptic } from "@/lib/game/sound"
import { rankFromLevel, RANK_META } from "@/lib/gamification/ranks"
import { levelFromXp } from "@/lib/gamification/xp-engine"

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
const JUMLAH = 5
const HP_AWAL = 100
const DMG_TEMBAK = 34
const DMG_SALAH = 10
const R = 22
const KUNCI_LEVEL = "bc-kuis-tempur-level"
// Batas waktu menjawab. Tekanan waktu menggantikan tekanan menghindar yang terus
// menerus: murid boleh berlindung dengan tenang, tapi tidak boleh berdiam
// selamanya tanpa menjawab.
const DETIK_SOAL = 15

function aturanLevel(level: number) {
  const n = Math.min(level, 10)
  return {
    peluangTembak: 0.0010 + n * 0.0005,
    lajuPeluru: 2.8 + n * 0.25,
    dmgBot: 9 + n,
    sebaran: 0.55 - n * 0.03,
    lajuZona: n <= 2 ? 0 : 0.05 + n * 0.015, // dua level pertama tanpa kabut
    lajuBot: 0.35 + n * 0.05,
  }
}

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
  hidup: boolean
  kamu: boolean
  kedip: number
  langkah: number   // fase ayunan jalan
  hadap: number     // -1 kiri, 1 kanan
}
type Peluru = { x: number; y: number; vx: number; vy: number; dari: number; umur: number; dmg: number }
type Partikel = { x: number; y: number; vx: number; vy: number; umur: number; warna: string }
type Angka = { x: number; y: number; teks: string; umur: number; warna: string }

const NAMA_BOT = ["Raka", "Sari", "Bima", "Lia", "Dewi", "Andi", "Nisa", "Fajar", "Gilang", "Putri"]
const WARNA = ["#34D399", "#F87171", "#FBBF24", "#60A5FA", "#C084FC"]
const ATAP = ["#EF4444", "#F97316", "#0EA5E9", "#8B5CF6", "#14B8A6"]

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

export default function KuisTempurSolo() {
  const [fase, setFase] = useState<"pilih" | "main" | "selesai">("pilih")
  const [karakterku, setKarakterku] = useState<Karakter | "sendiri">("zelby")
  const [avatarku, setAvatarku] = useState<string | null>(null)
  const [namaku, setNamaku] = useState("Kamu")
  const [suara, setSuara] = useState(true)

  const [hp, setHp] = useState(HP_AWAL)
  const [sisa, setSisa] = useState(JUMLAH)
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
  const [profil, setProfil] = useState<{ rank: string; warna: string; levelXp: number; koin: number } | null>(null)
  const [waktu, setWaktu] = useState(DETIK_SOAL)

  const cvRef = useRef<HTMLCanvasElement>(null)
  const pRef = useRef<Pemain[]>([])
  const bRef = useRef<Peluru[]>([])
  const partRef = useRef<Partikel[]>([])
  const angkaRef = useRef<Angka[]>([])
  const rintRef = useRef<Rintangan[]>([])
  const zonaRef = useRef({ x: 0, y: 0, r: 0 })
  const rafRef = useRef(0)
  const jalanRef = useRef(false)
  const benarRef = useRef(0)
  const salahRef = useRef(0)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const tembakRef = useRef(0)
  const peluruRef = useRef(0)
  const feedIdRef = useRef(0)
  const kantongRef = useRef<BankQuestion[]>([])
  const aturanRef = useRef(aturanLevel(1))
  // Untuk membedakan ketukan (menembak) dari seretan (berjalan).
  const tekanRef = useRef<{ x: number; y: number; t: number } | null>(null)

  useEffect(() => {
    setSuara(isSoundOn())
    const l = Number(localStorage.getItem(KUNCI_LEVEL) || "1")
    if (Number.isFinite(l) && l >= 1) setLevel(Math.min(l, 99))
    fetch("/api/user/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const u = d?.user ?? d
        if (u?.avatar) setAvatarku(u.avatar)
        if (u?.nickname || u?.fullName) setNamaku(String(u.nickname || u.fullName).split(" ")[0])
        if (typeof u?.xp === "number") {
          const lv = levelFromXp(u.xp)
          const rk = rankFromLevel(lv)
          setProfil({ rank: RANK_META[rk].label, warna: RANK_META[rk].color, levelXp: lv, koin: u.coins ?? 0 })
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
    if (kantongRef.current.length === 0) kantongRef.current = kocok(QUESTION_BANK)
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
    const skor = benarRef.current * 10 + maxComboRef.current * 3 + tembakRef.current * 5 + (menang ? 40 : 0)
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

  const mulai = useCallback(() => {
    const cv = cvRef.current
    const W = cv?.clientWidth || window.innerWidth
    const H = cv?.clientHeight || window.innerHeight
    const aturan = aturanLevel(level)
    aturanRef.current = aturan

    // Peta kampung: rumah dan pohon tersebar, menyisakan jalur di antaranya.
    // Rintangan menahan peluru, jadi peta inilah yang memberi murid pilihan —
    // berlindung dulu, baru berpikir.
    const rint: Rintangan[] = []
    const jumlahRumah = 4
    const jumlahPohon = 6
    const jauhDariTengah = (x: number, y: number) => Math.hypot(x - W / 2, y - H / 2) > Math.min(W, H) * 0.16
    for (let i = 0; i < jumlahRumah; i++) {
      for (let c = 0; c < 24; c++) {
        const w = 58 + Math.random() * 34
        const h = 42 + Math.random() * 22
        const x = 16 + Math.random() * (W - w - 32)
        const y = 60 + Math.random() * (H - h - 130)
        if (!jauhDariTengah(x + w / 2, y + h / 2)) continue
        if (rint.some((r) => r.jenis === "rumah" && x < r.x + r.w + 22 && x + w + 22 > r.x && y < r.y + r.h + 22 && y + h + 22 > r.y)) continue
        rint.push({ jenis: "rumah", x, y, w, h, warna: ATAP[i % ATAP.length] })
        break
      }
    }
    for (let i = 0; i < 3; i++) {
      for (let c = 0; c < 24; c++) {
        const r = 13 + Math.random() * 7
        const x = 24 + Math.random() * (W - 48)
        const y = 70 + Math.random() * (H - 150)
        if (!jauhDariTengah(x, y)) continue
        if (rint.some((o) => kenaRintangan(x, y, o))) continue
        rint.push({ jenis: "batu", x, y, r })
        break
      }
    }
    for (let i = 0; i < jumlahPohon; i++) {
      for (let c = 0; c < 24; c++) {
        const r = 16 + Math.random() * 8
        const x = 24 + Math.random() * (W - 48)
        const y = 70 + Math.random() * (H - 150)
        if (!jauhDariTengah(x, y)) continue
        if (rint.some((o) => kenaRintangan(x, y, o) || (o.jenis === "pohon" && Math.hypot(x - o.x, y - o.y) < r + o.r + 16))) continue
        rint.push({ jenis: "pohon", x, y, r })
        break
      }
    }
    rintRef.current = rint

    const botKar = kocok(KARAKTER.filter((k) => k !== karakterku)) as Karakter[]
    const botNama = kocok(NAMA_BOT).slice(0, JUMLAH - 1)
    const img = (src: string) => { const i = new Image(); i.src = src; return i }

    pRef.current = Array.from({ length: JUMLAH }, (_, i) => {
      const sudut = ((Math.PI * 2) / JUMLAH) * i - Math.PI / 2
      const jarak = Math.min(W, H) * 0.32
      const kamu = i === 0
      const kar = kamu ? karakterku : botKar[(i - 1) % botKar.length]
      const src = kamu && karakterku === "sendiri" && avatarku
        ? avatarku
        : gambarKarakter(kar === "sendiri" ? "zelby" : kar, "happy")
      const x = W / 2 + Math.cos(sudut) * jarak
      const y = H / 2 + Math.sin(sudut) * jarak
      return {
        nama: kamu ? namaku : botNama[i - 1], gambar: img(src), warna: WARNA[i],
        x, y, tx: x, ty: y, hp: HP_AWAL, hidup: true, kamu, kedip: 0, langkah: 0, hadap: 1,
      }
    })

    bRef.current = []; partRef.current = []; angkaRef.current = []
    zonaRef.current = { x: W / 2, y: H / 2, r: Math.max(W, H) * 0.66 }
    benarRef.current = 0; salahRef.current = 0; tembakRef.current = 0
    comboRef.current = 0; maxComboRef.current = 0; peluruRef.current = 0
    kantongRef.current = kocok(QUESTION_BANK)
    jalanRef.current = true

    setHp(HP_AWAL); setSisa(JUMLAH); setCombo(0); setPeluru(0)
    setFeed([]); setHasil(null); setDipilih(null)
    setFase("main")
    soalBaru()
    sfx.start()
    startBGM()
  }, [karakterku, avatarku, namaku, soalBaru, level])

  useEffect(() => {
    const cv = cvRef.current
    if (!cv || fase !== "main") return
    const atur = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = cv.clientWidth * dpr
      cv.height = cv.clientHeight * dpr
      cv.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0)
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
        dari: 0, umur: 110, dmg: DMG_TEMBAK,
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
      tulisFeed(`${oleh} menumbangkan ${p.nama}`)
      const s = pRef.current.filter((x) => x.hidup).length
      setSisa(s)
      if (p.kamu) selesaikan(false, s + 1)
      else { sfx.levelup(); if (s === 1 && pRef.current[0].hidup) selesaikan(true, 1) }
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

      // Latar rumput
      ctx.fillStyle = "#14532d"
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = "rgba(34, 197, 94, 0.10)"
      for (let gx = 0; gx < W; gx += 34) for (let gy = 0; gy < H; gy += 34) ctx.fillRect(gx, gy, 17, 17)

      if (z.r > Math.min(W, H) * 0.18) z.r -= at.lajuZona

      // Luar kabut digelapkan — batasnya terbaca sekali lihat tanpa teks.
      ctx.fillStyle = "rgba(76, 29, 149, 0.45)"
      ctx.fillRect(0, 0, W, H)
      ctx.save()
      ctx.globalCompositeOperation = "destination-out"
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(196, 132, 252, 0.85)"; ctx.lineWidth = 3; ctx.stroke()

      // Rintangan digambar sebelum karakter, jadi pemain tampak berdiri di depan.
      rintRef.current.forEach((r) => {
        if (r.jenis === "rumah") {
          ctx.fillStyle = "rgba(0,0,0,0.28)"
          ctx.fillRect(r.x + 3, r.y + r.h - 3, r.w, 7)
          ctx.fillStyle = "#FEF3C7"
          ctx.fillRect(r.x, r.y + r.h * 0.42, r.w, r.h * 0.58)
          ctx.fillStyle = r.warna
          ctx.beginPath()
          ctx.moveTo(r.x - 5, r.y + r.h * 0.44)
          ctx.lineTo(r.x + r.w / 2, r.y - 4)
          ctx.lineTo(r.x + r.w + 5, r.y + r.h * 0.44)
          ctx.closePath(); ctx.fill()
          ctx.fillStyle = "#92400E"
          ctx.fillRect(r.x + r.w * 0.42, r.y + r.h * 0.66, r.w * 0.16, r.h * 0.34)
        } else if (r.jenis === "batu") {
          ctx.fillStyle = "rgba(0,0,0,0.3)"
          ctx.beginPath(); ctx.ellipse(r.x, r.y + r.r * 0.6, r.r * 0.9, r.r * 0.3, 0, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = "#64748B"
          ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = "#94A3B8"
          ctx.beginPath(); ctx.arc(r.x - r.r * 0.3, r.y - r.r * 0.3, r.r * 0.45, 0, Math.PI * 2); ctx.fill()
        } else {
          ctx.fillStyle = "rgba(0,0,0,0.28)"
          ctx.beginPath(); ctx.ellipse(r.x, r.y + r.r * 0.75, r.r * 0.8, r.r * 0.3, 0, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = "#78350F"
          ctx.fillRect(r.x - 3.5, r.y, 7, r.r * 0.85)
          ctx.fillStyle = "#16A34A"
          ctx.beginPath(); ctx.arc(r.x, r.y - r.r * 0.2, r.r, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = "#22C55E"
          ctx.beginPath(); ctx.arc(r.x - r.r * 0.3, r.y - r.r * 0.45, r.r * 0.6, 0, Math.PI * 2); ctx.fill()
        }
      })

      pRef.current.forEach((p, i) => {
        if (!p.hidup) return
        const dx = p.tx - p.x, dy = p.ty - p.y
        const jarak = Math.hypot(dx, dy)
        const bergerak = jarak > 2
        if (bergerak) {
          const laju = p.kamu ? 2.6 : at.lajuBot * 3
          p.x += (dx / jarak) * Math.min(laju, jarak)
          p.y += (dy / jarak) * Math.min(laju, jarak)
          p.langkah += 0.28
          if (Math.abs(dx) > 1) p.hadap = dx > 0 ? 1 : -1
        } else {
          p.langkah += 0.06
        }
        dorongKeluar(p)
        if (p.kedip > 0) p.kedip--

        if (Math.hypot(p.x - z.x, p.y - z.y) > z.r) {
          p.hp -= 0.12
          if (p.kamu) setHp(Math.max(0, Math.round(p.hp)))
          if (p.hp <= 0) bunuh(i, "Kabut")
        }

        if (!p.kamu) {
          if (jarak < 12) {
            for (let c = 0; c < 12; c++) {
              const a = Math.random() * Math.PI * 2
              const rr = Math.random() * z.r * 0.75
              const nx = z.x + Math.cos(a) * rr, ny = z.y + Math.sin(a) * rr
              if (!rintRef.current.some((o) => kenaRintangan(nx, ny, o))) { p.tx = nx; p.ty = ny; break }
            }
          }
          if (Math.random() < at.peluangTembak) {
            const t = pRef.current.findIndex((x, j) => j !== i && x.hidup)
            if (t !== -1) {
              const o = pRef.current[t]
              const a = Math.atan2(o.y - p.y, o.x - p.x) + (Math.random() - 0.5) * at.sebaran
              bRef.current.push({
                x: p.x, y: p.y, vx: Math.cos(a) * at.lajuPeluru, vy: Math.sin(a) * at.lajuPeluru,
                dari: i, umur: 120, dmg: at.dmgBot,
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

        ctx.fillStyle = "rgba(0,0,0,0.32)"
        ctx.beginPath()
        ctx.ellipse(p.x, p.y + R * 0.82, R * (0.62 - ayun * 0.02), R * 0.22, 0, 0, Math.PI * 2)
        ctx.fill()

        if (p.kamu) {
          ctx.beginPath(); ctx.arc(p.x, py, R + 7, 0, Math.PI * 2)
          ctx.fillStyle = "rgba(52, 211, 153, 0.22)"; ctx.fill()
        }

        ctx.save()
        ctx.translate(p.x, py)
        ctx.rotate(condong)
        ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.clip()
        if (p.gambar?.complete && p.gambar.naturalWidth > 0) {
          ctx.drawImage(p.gambar, -R, -R, R * 2, R * 2)
        } else {
          ctx.fillStyle = p.warna; ctx.fillRect(-R, -R, R * 2, R * 2)
        }
        ctx.restore()

        ctx.beginPath(); ctx.arc(p.x, py, R, 0, Math.PI * 2)
        ctx.strokeStyle = p.kedip > 0 ? "#FFFFFF" : p.kamu ? "#34D399" : p.warna
        ctx.lineWidth = p.kamu ? 4 : 3; ctx.stroke()

        // Penanda bidik pada musuh: mengajak diketuk, dan hanya menyala saat
        // pemain punya peluru — aturannya terlihat, tidak perlu dihafal.
        if (!p.kamu && peluruRef.current > 0) {
          ctx.strokeStyle = "rgba(248, 113, 113, 0.9)"; ctx.lineWidth = 2
          ctx.beginPath(); ctx.arc(p.x, py, R + 7, 0, Math.PI * 2); ctx.setLineDash([4, 5]); ctx.stroke()
          ctx.setLineDash([])
        }

        ctx.fillStyle = "#fff"; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "center"
        ctx.fillText(p.nama, p.x, py - R - 13)
        ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(p.x - 21, py - R - 9, 42, 4)
        ctx.fillStyle = p.hp > 35 ? "#34D399" : "#F87171"
        ctx.fillRect(p.x - 21, py - R - 9, 42 * Math.max(0, p.hp / HP_AWAL), 4)
      })

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
        ctx.fillStyle = a.warna; ctx.font = "900 15px system-ui, sans-serif"; ctx.textAlign = "center"
        ctx.fillText(a.teks, a.x, a.y); ctx.globalAlpha = 1
      }

      rafRef.current = requestAnimationFrame(gelung)
    }
    rafRef.current = requestAnimationFrame(gelung)
    return () => cancelAnimationFrame(rafRef.current)
  }, [fase, selesaikan, tulisFeed])

  const jawab = (idx: number, benar: boolean) => {
    if (kunci || fase !== "main") return
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
        aku.hidup = false; setSisa(s - 1); selesaikan(false, s); return
      }
    }
    setTimeout(() => { setDipilih(null); soalBaru() }, 750)
  }

  // Hitung mundur waktu menjawab. Habis waktu = kehilangan combo dan tidak dapat
  // peluru, TETAPI tidak mengurangi HP: berlindung sambil berpikir tidak boleh
  // dihukum seperti menjawab salah. Yang dihukum adalah diam saja.
  useEffect(() => {
    if (fase !== "main" || kunci || !soal) return
    if (waktu <= 0) {
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
  }, [waktu, fase, kunci, soal, soalBaru, tulisFeed])

  const gantiSuara = () => {
    const on = toggleSound()
    setSuara(on)
    if (fase === "main") on ? startBGM() : stopBGM()
  }

  if (fase === "pilih") {
    const pilihan = [
      ...(avatarku ? [{ id: "sendiri" as const, nama: namaku, src: avatarku }] : []),
      ...KARAKTER.map((k) => ({ id: k, nama: PROFIL[k].nama, src: gambarKarakter(k, "happy") })),
    ]
    return (
      <div className="game-fullscreen min-h-[100dvh] bg-gradient-to-b from-[#1a0b2e] via-[#2d1b4e] to-[#0f0a1e] px-5 py-6 text-white">
        <Link href="/arena/game" className="mb-5 inline-flex items-center gap-1.5 text-sm text-violet-300">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <div className="flex items-center gap-2.5">
          <h1 className="text-3xl font-extrabold tracking-tight">Kuis Tempur</h1>
          <span className="rounded-full bg-violet-500/25 px-2.5 py-1 text-xs font-black text-violet-200">Level {level}</span>
        </div>

        <div className="mt-3 space-y-1.5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-violet-200">
          <p><b className="text-white">1.</b> Sembunyi di balik rumah atau pohon — peluru tertahan di situ.</p>
          <p><b className="text-white">2.</b> Jawab benar untuk mendapat <b className="text-amber-300">peluru</b>.</p>
          <p><b className="text-white">3.</b> Ketuk musuh untuk menembaknya. Seret untuk berjalan.</p>
        </div>

        <h2 className="mt-6 text-xs font-bold uppercase tracking-wider text-violet-400">Pilih karaktermu</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {pilihan.map((p) => (
            <button
              key={p.id}
              onClick={() => { setKarakterku(p.id); sfx.tap() }}
              className={`rounded-2xl border-2 p-3 text-center transition-all active:scale-95 ${
                karakterku === p.id ? "border-emerald-400 bg-emerald-400/15" : "border-white/10 bg-white/5"
              }`}
            >
              <img src={p.src} alt="" className="mx-auto h-20 w-20 rounded-full object-cover" />
              <span className="mt-2 block truncate text-xs font-bold">{p.nama}</span>
            </button>
          ))}
        </div>

        <button
          onClick={mulai}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-4 text-base font-extrabold shadow-lg shadow-emerald-500/25 active:scale-[0.98]"
        >
          Masuk Kampung
        </button>
        <button onClick={gantiSuara} className="mx-auto mt-4 flex items-center gap-2 text-xs text-violet-400">
          {suara ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          Suara {suara ? "aktif" : "mati"}
        </button>
      </div>
    )
  }

  if (fase === "selesai") {
    return (
      <div className="game-fullscreen flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-[#1a0b2e] via-[#2d1b4e] to-[#0f0a1e] px-6 text-center text-white">
        <div className="text-6xl">{hasil?.menang ? "🏆" : "🌫️"}</div>
        <h1 className="mt-4 text-2xl font-extrabold">
          {hasil?.menang ? "Juara Bertahan!" : `Peringkat #${hasil?.peringkat ?? "-"}`}
        </h1>
        <p className="mt-1.5 text-sm font-bold text-violet-300">
          {hasil?.menang ? `Naik ke Level ${level}` : `Level ${level} — coba lagi`}
        </p>
        <div className="mt-4 flex gap-5 text-sm text-violet-300">
          <span><b className="text-white">{benarRef.current}</b> benar</span>
          <span><b className="text-white">{salahRef.current}</b> salah</span>
          <span><b className="text-white">{maxComboRef.current}</b> combo</span>
        </div>
        {mengirim ? (
          <Loader2 className="mt-5 h-5 w-5 animate-spin text-violet-300" />
        ) : (
          <p className="mt-5 rounded-xl bg-emerald-500/20 px-5 py-2 font-bold text-emerald-300">+{hasil?.xp ?? 0} XP</p>
        )}
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          <button onClick={mulai} className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 font-extrabold active:scale-95">
            Main Lagi
          </button>
          <Link href="/arena/game" className="rounded-2xl border-2 border-white/20 py-3.5 font-bold active:scale-95">
            Daftar Gim
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="game-fullscreen relative flex h-[100dvh] flex-col overflow-hidden bg-[#0f0a1e] text-white">
      {/* Baris atas mengikuti rancangan: nyawa - rank - koin. Rank dan koin
          diambil dari data murid yang sebenarnya; kalau belum termuat, keduanya
          tidak ditampilkan sama sekali daripada memasang angka karangan. */}
      <div className="flex items-center justify-between px-4 pt-3 text-xs font-bold">
        <span className="flex items-center gap-1.5">
          <span aria-hidden>❤️</span>
          <span className="w-8 tabular-nums">{hp}</span>
          <span className="h-2 w-16 overflow-hidden rounded-full bg-white/15">
            <span className="block h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-200" style={{ width: `${hp}%` }} />
          </span>
        </span>
        {profil && (
          <span className="flex items-center gap-1.5" style={{ color: profil.warna }}>
            <span aria-hidden>🔰</span> {profil.rank} · Lv {profil.levelXp}
          </span>
        )}
        <span className="flex items-center gap-1 text-amber-300">
          <span aria-hidden>🪙</span> {profil ? profil.koin.toLocaleString("id-ID") : "—"}
        </span>
      </div>

      <div className="flex items-center justify-end gap-2 px-4 pt-2 text-xs font-bold">
        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${peluru > 0 ? "bg-amber-400/25 text-amber-300" : "bg-white/10 text-white/50"}`}>
          <Crosshair className="h-3.5 w-3.5" /> {peluru} peluru
        </span>
        {combo > 1 && (
          <span className="flex items-center gap-1 rounded-full bg-orange-400/20 px-2 py-1 text-orange-300">
            <Flame className="h-3.5 w-3.5" /> {combo}
          </span>
        )}
        <span className="rounded-full bg-violet-500/25 px-2 py-1 text-violet-200">Ronde {level}</span>
        <span className="flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-1">
          <Users className="h-3.5 w-3.5" /> {sisa}
        </span>
        <button onClick={gantiSuara} aria-label="Suara" className="text-violet-300">
          {suara ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>

      <div className="pointer-events-none absolute right-3 top-12 z-10 flex flex-col items-end gap-1">
        {feed.map((f) => (
          <span key={f.id} className="rounded-lg bg-black/70 px-2 py-1 text-[10px] font-medium">{f.teks}</span>
        ))}
      </div>

      <canvas ref={cvRef} className="w-full flex-1 touch-none" />

      <div className="px-3 pb-4">
        <div className="mb-2.5 rounded-2xl border-4 border-[#161B3A] bg-white px-4 py-3 text-center shadow-[4px_4px_0_#161B3A]">
          <p className="text-[15px] font-bold leading-snug text-[#161B3A]">{soal?.q.soal}</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {soal?.opsi.map((o, i) => {
            const terbuka = dipilih !== null
            let gaya = "bg-white border-[#161B3A] text-[#161B3A]"
            if (terbuka && o.benar) gaya = "bg-emerald-200 border-emerald-700 text-emerald-900"
            else if (terbuka && dipilih === i) gaya = "bg-rose-200 border-rose-700 text-rose-900"
            else if (terbuka) gaya = "bg-white/60 border-[#161B3A]/25 text-[#161B3A]/50"
            return (
              <button
                key={i}
                onClick={() => jawab(i, o.benar)}
                disabled={kunci}
                className={`flex items-center gap-2 rounded-2xl border-[3px] px-3 py-3.5 text-left text-sm font-bold shadow-[3px_3px_0_#161B3A] transition-all active:scale-[0.97] ${gaya}`}
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
          <span className="text-[11px] font-bold text-white/60">⏱ {waktu} detik</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/12">
            <span
              className={`block h-full rounded-full transition-all duration-1000 ease-linear ${waktu <= 5 ? "bg-rose-400" : "bg-violet-400"}`}
              style={{ width: `${(waktu / DETIK_SOAL) * 100}%` }}
            />
          </span>
        </div>
      </div>
    </div>
  )
}

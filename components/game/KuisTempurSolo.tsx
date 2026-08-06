"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, Heart, Users, Trophy, Loader2 } from "lucide-react"
import { QUESTION_BANK, type BankQuestion } from "@/lib/game/question-bank"
import { gambarKarakter, KARAKTER, PROFIL, type Karakter } from "@/lib/arena-junior/karakter"

// Kuis Tempur (mode solo) — battle royale literasi melawan bot.
//
// Dipakai saat MULTIPLAYER_ENABLED mati, menggantikan layar "Segera Hadir".
// Nama dan slotnya sengaja sama dengan versi multiplayer: murid selalu mendapat
// Kuis Tempur yang bisa dimainkan, dan ketika server pertandingan hidup lagi
// flag itu mengembalikan versi lawan-teman tanpa perubahan kode.
//
// Sengaja TIDAK memakai server pertandingan. Dua gim Arena yang bergantung pada
// VPS gim (adu-cepat, kuis-tempur) mati total ketika VPS-nya tidak menjawab, dan
// murid tidak bisa berbuat apa-apa. Gim ini berjalan sepenuhnya di perangkat:
// tidak ada yang bisa mati selain ponselnya sendiri. Kalau nanti dijadikan
// multiplayer sungguhan, jalur yang masuk akal adalah Supabase Realtime yang
// sudah dipakai proyek ini — bukan VPS baru.

const GAME_TYPE = "RIMBA_KATA"
const JUMLAH_PEMAIN = 5
const HP_AWAL = 100
const DMG_PELURU = 25
const DMG_SALAH = 15
const RADIUS = 22

type Pemain = {
  nama: string
  karakter: Karakter | "sendiri"
  gambar: HTMLImageElement | null
  warna: string
  x: number
  y: number
  tx: number
  ty: number
  hp: number
  hidup: boolean
  kamu: boolean
}

type Peluru = { x: number; y: number; vx: number; vy: number; dari: number; umur: number }

const NAMA_BOT = ["Raka", "Sari", "Bima", "Lia", "Dewi", "Andi", "Nisa", "Fajar"]
const WARNA = ["#2ECC71", "#E74C3C", "#F1C40F", "#3498DB", "#9B59B6"]

function acak<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function KuisTempurSolo() {
  const [fase, setFase] = useState<"pilih" | "main" | "selesai">("pilih")
  const [karakterku, setKarakterku] = useState<Karakter | "sendiri">("zelby")
  const [avatarku, setAvatarku] = useState<string | null>(null)
  const [namaku, setNamaku] = useState("Kamu")

  const [hp, setHp] = useState(HP_AWAL)
  const [hidupCount, setHidupCount] = useState(JUMLAH_PEMAIN)
  const [soal, setSoal] = useState<BankQuestion | null>(null)
  const [kunci, setKunci] = useState(false)
  const [feed, setFeed] = useState<{ id: number; teks: string }[]>([])
  const [hasil, setHasil] = useState<{ menang: boolean; peringkat: number; xp: number } | null>(null)
  const [mengirim, setMengirim] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pemainRef = useRef<Pemain[]>([])
  const peluruRef = useRef<Peluru[]>([])
  const zonaRef = useRef({ x: 0, y: 0, r: 0 })
  const rafRef = useRef<number>(0)
  const jalanRef = useRef(false)
  const benarRef = useRef(0)
  const salahRef = useRef(0)
  const feedIdRef = useRef(0)

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const u = d?.user ?? d
        if (u?.avatar) setAvatarku(u.avatar)
        if (u?.nickname || u?.fullName) setNamaku((u.nickname || u.fullName).split(" ")[0])
      })
      .catch(() => {})
  }, [])

  const tulisFeed = useCallback((teks: string) => {
    const id = ++feedIdRef.current
    setFeed((f) => [...f.slice(-2), { id, teks }])
    setTimeout(() => setFeed((f) => f.filter((x) => x.id !== id)), 3200)
  }, [])

  const soalBaru = useCallback(() => {
    setSoal(QUESTION_BANK[Math.floor(Math.random() * QUESTION_BANK.length)])
    setKunci(false)
  }, [])

  const kirimXp = useCallback(async (menang: boolean, peringkat: number) => {
    // Skor dihitung dari jawaban benar, bukan dari kemenangan saja — supaya
    // menang dengan asal tembak tidak bernilai sama dengan menang sambil
    // menjawab benar. Server tetap membatasi ulang; angka dari klien tidak
    // pernah dipercaya apa adanya.
    const skor = benarRef.current * 10 + (menang ? 40 : 0)
    setMengirim(true)
    try {
      const res = await fetch("/api/game/xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: skor,
          correct: benarRef.current,
          wrong: salahRef.current,
          maxStreak: 0,
          gameType: GAME_TYPE,
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

  const selesaikan = useCallback(
    (menang: boolean, peringkat: number) => {
      if (!jalanRef.current) return
      jalanRef.current = false
      cancelAnimationFrame(rafRef.current)
      setFase("selesai")
      kirimXp(menang, peringkat)
    },
    [kirimXp]
  )

  const mulai = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    const W = cv.clientWidth
    const H = cv.clientHeight

    const karakterBot = acak(KARAKTER.filter((k) => k !== karakterku)) as Karakter[]
    const namaBot = acak(NAMA_BOT).slice(0, JUMLAH_PEMAIN - 1)

    const buatGambar = (src: string) => {
      const img = new Image()
      img.src = src
      return img
    }

    const daftar: Pemain[] = []
    for (let i = 0; i < JUMLAH_PEMAIN; i++) {
      const sudut = ((Math.PI * 2) / JUMLAH_PEMAIN) * i
      const jarak = Math.min(W, H) * 0.28
      const kamu = i === 0
      const karakter: Karakter | "sendiri" = kamu
        ? karakterku
        : karakterBot[(i - 1) % karakterBot.length]
      const src =
        kamu && karakterku === "sendiri" && avatarku
          ? avatarku
          : gambarKarakter(karakter === "sendiri" ? "zelby" : karakter, "happy")
      daftar.push({
        nama: kamu ? namaku : namaBot[i - 1],
        karakter,
        gambar: buatGambar(src),
        warna: WARNA[i],
        x: W / 2 + Math.cos(sudut) * jarak,
        y: H / 2 + Math.sin(sudut) * jarak,
        tx: W / 2 + Math.cos(sudut) * jarak,
        ty: H / 2 + Math.sin(sudut) * jarak,
        hp: HP_AWAL,
        hidup: true,
        kamu,
      })
    }

    pemainRef.current = daftar
    peluruRef.current = []
    zonaRef.current = { x: W / 2, y: H / 2, r: Math.max(W, H) * 0.62 }
    benarRef.current = 0
    salahRef.current = 0
    jalanRef.current = true

    setHp(HP_AWAL)
    setHidupCount(JUMLAH_PEMAIN)
    setFeed([])
    setHasil(null)
    setFase("main")
    soalBaru()
  }, [karakterku, avatarku, namaku, soalBaru])

  // Ukuran canvas mengikuti perangkat, termasuk layar rapat (devicePixelRatio).
  // Tanpa penskalaan ini gambar terlihat buram di ponsel modern.
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv || fase !== "main") return
    const atur = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = cv.clientWidth * dpr
      cv.height = cv.clientHeight * dpr
      const ctx = cv.getContext("2d")
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    atur()
    window.addEventListener("resize", atur)
    return () => window.removeEventListener("resize", atur)
  }, [fase])

  // Gerak pemain: seret di mana pun pada arena.
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv || fase !== "main") return
    const geser = (e: TouchEvent | MouseEvent) => {
      const p = pemainRef.current[0]
      if (!p?.hidup) return
      e.preventDefault()
      const rect = cv.getBoundingClientRect()
      const cx = "touches" in e ? e.touches[0]?.clientX : e.clientX
      const cy = "touches" in e ? e.touches[0]?.clientY : e.clientY
      if (cx == null || cy == null) return
      p.tx = cx - rect.left
      p.ty = cy - rect.top
    }
    const seretMouse = (e: MouseEvent) => {
      if (e.buttons === 1) geser(e)
    }
    cv.addEventListener("touchstart", geser, { passive: false })
    cv.addEventListener("touchmove", geser, { passive: false })
    cv.addEventListener("mousedown", geser)
    cv.addEventListener("mousemove", seretMouse)
    return () => {
      cv.removeEventListener("touchstart", geser)
      cv.removeEventListener("touchmove", geser)
      cv.removeEventListener("mousedown", geser)
      cv.removeEventListener("mousemove", seretMouse)
    }
  }, [fase])

  // Gelung permainan.
  useEffect(() => {
    if (fase !== "main") return
    const cv = canvasRef.current
    const ctx = cv?.getContext("2d")
    if (!cv || !ctx) return

    const bunuh = (i: number, oleh: string) => {
      const p = pemainRef.current[i]
      if (!p.hidup) return
      p.hidup = false
      p.hp = 0
      tulisFeed(`${oleh} menumbangkan ${p.nama}`)
      const sisa = pemainRef.current.filter((x) => x.hidup).length
      setHidupCount(sisa)
      if (p.kamu) selesaikan(false, sisa + 1)
      else if (sisa === 1 && pemainRef.current[0].hidup) selesaikan(true, 1)
    }

    const gelung = () => {
      if (!jalanRef.current) return
      const W = cv.clientWidth
      const H = cv.clientHeight
      const zona = zonaRef.current
      ctx.clearRect(0, 0, W, H)

      if (zona.r > Math.min(W, H) * 0.16) zona.r -= 0.22

      // Zona aman
      ctx.save()
      ctx.beginPath()
      ctx.arc(zona.x, zona.y, zona.r, 0, Math.PI * 2)
      ctx.clip()
      ctx.fillStyle = "rgba(124, 58, 237, 0.10)"
      ctx.fillRect(0, 0, W, H)
      ctx.restore()
      ctx.beginPath()
      ctx.arc(zona.x, zona.y, zona.r, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(167, 139, 250, 0.9)"
      ctx.lineWidth = 3
      ctx.stroke()

      pemainRef.current.forEach((p, i) => {
        if (!p.hidup) return
        p.x += (p.tx - p.x) * 0.06
        p.y += (p.ty - p.y) * 0.06

        const dz = Math.hypot(p.x - zona.x, p.y - zona.y)
        if (dz > zona.r) {
          p.hp -= 0.12
          if (p.kamu) setHp(Math.max(0, Math.round(p.hp)))
          if (p.hp <= 0) bunuh(i, "Kabut")
        }

        if (!p.kamu) {
          if (Math.hypot(p.x - p.tx, p.y - p.ty) < 12) {
            const a = Math.random() * Math.PI * 2
            const r = Math.random() * zona.r * 0.7
            p.tx = zona.x + Math.cos(a) * r
            p.ty = zona.y + Math.sin(a) * r
          }
          if (Math.random() < 0.004) {
            const sasaran = pemainRef.current.findIndex((t, j) => j !== i && t.hidup)
            if (sasaran !== -1) {
              const t = pemainRef.current[sasaran]
              const a = Math.atan2(t.y - p.y, t.x - p.x) + (Math.random() - 0.5) * 0.35
              peluruRef.current.push({
                x: p.x, y: p.y,
                vx: Math.cos(a) * 5, vy: Math.sin(a) * 5,
                dari: i, umur: 90,
              })
            }
          }
        }

        // Avatar dipotong bulat
        if (p.gambar?.complete && p.gambar.naturalWidth > 0) {
          ctx.save()
          ctx.beginPath()
          ctx.arc(p.x, p.y, RADIUS, 0, Math.PI * 2)
          ctx.clip()
          ctx.drawImage(p.gambar, p.x - RADIUS, p.y - RADIUS, RADIUS * 2, RADIUS * 2)
          ctx.restore()
        } else {
          ctx.beginPath()
          ctx.arc(p.x, p.y, RADIUS, 0, Math.PI * 2)
          ctx.fillStyle = p.warna
          ctx.fill()
        }
        ctx.beginPath()
        ctx.arc(p.x, p.y, RADIUS, 0, Math.PI * 2)
        ctx.strokeStyle = p.kamu ? "#FFFFFF" : p.warna
        ctx.lineWidth = p.kamu ? 4 : 3
        ctx.stroke()

        ctx.fillStyle = "#fff"
        ctx.font = "bold 11px system-ui, sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(p.nama, p.x, p.y - RADIUS - 12)
        ctx.fillStyle = "rgba(255,255,255,0.25)"
        ctx.fillRect(p.x - 20, p.y - RADIUS - 8, 40, 4)
        ctx.fillStyle = p.hp > 30 ? "#34D399" : "#F87171"
        ctx.fillRect(p.x - 20, p.y - RADIUS - 8, 40 * Math.max(0, p.hp / HP_AWAL), 4)
      })

      for (let i = peluruRef.current.length - 1; i >= 0; i--) {
        const b = peluruRef.current[i]
        b.x += b.vx
        b.y += b.vy
        b.umur--
        let kena = false
        pemainRef.current.forEach((t, j) => {
          if (kena || j === b.dari || !t.hidup) return
          if (Math.hypot(b.x - t.x, b.y - t.y) < RADIUS) {
            t.hp -= DMG_PELURU
            if (t.kamu) setHp(Math.max(0, Math.round(t.hp)))
            if (t.hp <= 0) bunuh(j, pemainRef.current[b.dari].nama)
            kena = true
          }
        })
        if (kena || b.umur <= 0) {
          peluruRef.current.splice(i, 1)
        } else {
          ctx.beginPath()
          ctx.arc(b.x, b.y, 4, 0, Math.PI * 2)
          ctx.fillStyle = b.dari === 0 ? "#34D399" : "#F87171"
          ctx.fill()
        }
      }

      rafRef.current = requestAnimationFrame(gelung)
    }

    rafRef.current = requestAnimationFrame(gelung)
    return () => cancelAnimationFrame(rafRef.current)
  }, [fase, selesaikan, tulisFeed])

  const jawab = (idx: number) => {
    if (kunci || !soal || fase !== "main") return
    setKunci(true)
    const aku = pemainRef.current[0]

    if (idx === soal.jawaban) {
      benarRef.current++
      let dekat = -1
      let min = Infinity
      pemainRef.current.forEach((p, i) => {
        if (i === 0 || !p.hidup) return
        const d = Math.hypot(aku.x - p.x, aku.y - p.y)
        if (d < min) { min = d; dekat = i }
      })
      if (dekat !== -1) {
        const t = pemainRef.current[dekat]
        const a = Math.atan2(t.y - aku.y, t.x - aku.x)
        peluruRef.current.push({
          x: aku.x, y: aku.y,
          vx: Math.cos(a) * 9, vy: Math.sin(a) * 9,
          dari: 0, umur: 90,
        })
      }
    } else {
      salahRef.current++
      aku.hp -= DMG_SALAH
      setHp(Math.max(0, Math.round(aku.hp)))
      if (aku.hp <= 0) {
        const sisa = pemainRef.current.filter((x) => x.hidup).length
        aku.hidup = false
        setHidupCount(sisa - 1)
        selesaikan(false, sisa)
        return
      }
    }
    setTimeout(soalBaru, 450)
  }

  // ---------- Layar pilih karakter ----------
  if (fase === "pilih") {
    const pilihan: { id: Karakter | "sendiri"; nama: string; src: string }[] = [
      ...(avatarku ? [{ id: "sendiri" as const, nama: namaku, src: avatarku }] : []),
      ...KARAKTER.map((k) => ({ id: k, nama: PROFIL[k].nama, src: gambarKarakter(k, "happy") })),
    ]
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-violet-950 to-slate-900 px-4 py-6 text-white">
        <Link href="/arena/game" className="mb-6 inline-flex items-center gap-1.5 text-sm text-violet-300">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <h1 className="text-2xl font-extrabold">Rimba Kata</h1>
        <p className="mt-1 text-sm text-violet-300">
          Lima pemain, satu rimba. Jawab benar untuk menyerang — salah, kamu yang terluka.
          Kabut menyempit terus, jadi jangan berdiam di tepi.
        </p>

        <h2 className="mt-7 text-sm font-bold text-violet-200">Pilih karaktermu</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {pilihan.map((p) => (
            <button
              key={p.id}
              onClick={() => setKarakterku(p.id)}
              className={`rounded-2xl border-2 p-3 text-center transition-all active:scale-95 ${
                karakterku === p.id
                  ? "border-violet-400 bg-violet-500/20"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <img src={p.src} alt="" className="mx-auto h-20 w-20 rounded-full object-cover" />
              <span className="mt-2 block truncate text-xs font-bold">{p.nama}</span>
            </button>
          ))}
        </div>

        <button
          onClick={mulai}
          className="mt-7 w-full rounded-2xl bg-violet-500 py-4 text-base font-extrabold active:scale-[0.98]"
        >
          Masuk Rimba
        </button>
      </div>
    )
  }

  // ---------- Layar hasil ----------
  if (fase === "selesai") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-violet-950 to-slate-900 px-6 text-center text-white">
        <div className="text-6xl">{hasil?.menang ? "🏆" : "🌫️"}</div>
        <h1 className="mt-4 text-2xl font-extrabold">
          {hasil?.menang ? "Kamu Juara Rimba!" : `Peringkat #${hasil?.peringkat ?? "-"}`}
        </h1>
        <p className="mt-2 text-sm text-violet-300">
          {benarRef.current} jawaban benar &middot; {salahRef.current} salah
        </p>
        {mengirim ? (
          <Loader2 className="mt-5 h-5 w-5 animate-spin text-violet-300" />
        ) : (
          <p className="mt-5 rounded-xl bg-violet-500/20 px-5 py-2 font-bold text-violet-200">
            +{hasil?.xp ?? 0} XP
          </p>
        )}
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          <button onClick={mulai} className="rounded-2xl bg-violet-500 py-3.5 font-extrabold active:scale-95">
            Main Lagi
          </button>
          <Link
            href="/arena/game"
            className="rounded-2xl border-2 border-white/20 py-3.5 font-bold active:scale-95"
          >
            Daftar Gim
          </Link>
        </div>
      </div>
    )
  }

  // ---------- Layar bermain ----------
  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-slate-950 text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-rose-400" />
          <div className="h-2 w-24 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${hp}%` }}
            />
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold">
          <Users className="h-3.5 w-3.5" /> {hidupCount} hidup
        </span>
      </div>

      <div className="pointer-events-none absolute right-3 top-14 z-10 flex flex-col items-end gap-1">
        {feed.map((f) => (
          <span key={f.id} className="rounded-lg bg-black/60 px-2 py-1 text-[10px] font-medium">
            {f.teks}
          </span>
        ))}
      </div>

      <canvas ref={canvasRef} className="w-full flex-1 touch-none" />

      <div className="px-3 pb-4">
        <div className="mb-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wide text-violet-300">Jawab benar untuk menyerang</p>
          <p className="text-sm font-bold leading-snug">{soal?.soal}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {soal?.opsi.map((o, i) => (
            <button
              key={i}
              onClick={() => jawab(i)}
              disabled={kunci}
              className="rounded-xl border-2 border-white/15 bg-white/5 px-3 py-3 text-sm font-bold active:scale-95 disabled:opacity-40"
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

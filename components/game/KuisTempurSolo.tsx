"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, Users, Volume2, VolumeX, Loader2, Flame } from "lucide-react"
import { QUESTION_BANK, type BankQuestion } from "@/lib/game/question-bank"
import { gambarKarakter, KARAKTER, PROFIL, type Karakter } from "@/lib/arena-junior/karakter"
import { sfx, startBGM, stopBGM, isSoundOn, toggleSound, haptic } from "@/lib/game/sound"

// Kuis Tempur (mode solo) — battle royale literasi melawan bot.
//
// Dipakai saat MULTIPLAYER_ENABLED mati, menggantikan layar "Segera Hadir".
// Slotnya sengaja sama dengan versi multiplayer: murid selalu mendapat Kuis
// Tempur yang bisa dimainkan, dan ketika server pertandingan hidup lagi flag itu
// mengembalikan versi lawan-teman tanpa perubahan kode.
//
// Berjalan SEPENUHNYA di perangkat. Itu keputusan sadar: gim yang bergantung
// pada VPS gim ikut mati ketika VPS-nya berhenti menjawab, dan murid tidak bisa
// berbuat apa-apa.

const GAME_TYPE = "RIMBA_KATA"
const JUMLAH = 5
const HP_AWAL = 100
const DMG_DASAR = 22
const DMG_SALAH = 14
const R = 24

type Pemain = {
  nama: string
  gambar: HTMLImageElement | null
  warna: string
  x: number; y: number; tx: number; ty: number
  hp: number
  hidup: boolean
  kamu: boolean
  kedip: number
}
type Peluru = { x: number; y: number; vx: number; vy: number; dari: number; umur: number; dmg: number }
type Partikel = { x: number; y: number; vx: number; vy: number; umur: number; warna: string }
type Angka = { x: number; y: number; teks: string; umur: number; warna: string }

const NAMA_BOT = ["Raka", "Sari", "Bima", "Lia", "Dewi", "Andi", "Nisa", "Fajar", "Gilang", "Putri"]
const WARNA = ["#34D399", "#F87171", "#FBBF24", "#60A5FA", "#C084FC"]

function kocok<T>(arr: T[]): T[] {
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
  const [suara, setSuara] = useState(true)

  const [hp, setHp] = useState(HP_AWAL)
  const [sisa, setSisa] = useState(JUMLAH)
  const [combo, setCombo] = useState(0)
  const [soal, setSoal] = useState<{ q: BankQuestion; opsi: { teks: string; benar: boolean }[] } | null>(null)
  const [kunci, setKunci] = useState(false)
  const [feed, setFeed] = useState<{ id: number; teks: string }[]>([])
  const [hasil, setHasil] = useState<{ menang: boolean; peringkat: number; xp: number } | null>(null)
  const [mengirim, setMengirim] = useState(false)

  const cvRef = useRef<HTMLCanvasElement>(null)
  const pRef = useRef<Pemain[]>([])
  const bRef = useRef<Peluru[]>([])
  const partRef = useRef<Partikel[]>([])
  const angkaRef = useRef<Angka[]>([])
  const zonaRef = useRef({ x: 0, y: 0, r: 0 })
  const rafRef = useRef(0)
  const jalanRef = useRef(false)
  const benarRef = useRef(0)
  const salahRef = useRef(0)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const feedIdRef = useRef(0)
  // Kantong soal: diambil tanpa pengembalian, diisi ulang saat habis. Acak murni
  // mengulang soal yang sama beberapa kali dalam satu ronde pendek — terasa
  // seperti gim yang kehabisan bahan, padahal banknya 143 soal.
  const kantongRef = useRef<BankQuestion[]>([])

  useEffect(() => {
    setSuara(isSoundOn())
    fetch("/api/user/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const u = d?.user ?? d
        if (u?.avatar) setAvatarku(u.avatar)
        if (u?.nickname || u?.fullName) setNamaku(String(u.nickname || u.fullName).split(" ")[0])
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
    // Opsi diacak tiap kali: kalau jawaban benar selalu di posisi sama, murid
    // belajar posisinya, bukan bahasanya.
    const opsi = kocok(q.opsi.map((teks, i) => ({ teks, benar: i === q.jawaban })))
    setSoal({ q, opsi })
    setKunci(false)
  }, [])

  const kirimXp = useCallback(async (menang: boolean, peringkat: number) => {
    const skor = benarRef.current * 10 + maxComboRef.current * 3 + (menang ? 40 : 0)
    setMengirim(true)
    try {
      const res = await fetch("/api/game/xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: skor,
          correct: benarRef.current,
          wrong: salahRef.current,
          maxStreak: maxComboRef.current,
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

  const selesaikan = useCallback((menang: boolean, peringkat: number) => {
    if (!jalanRef.current) return
    jalanRef.current = false
    cancelAnimationFrame(rafRef.current)
    stopBGM()
    if (menang) sfx.win()
    else sfx.gameover()
    setFase("selesai")
    kirimXp(menang, peringkat)
  }, [kirimXp])

  const mulai = useCallback(() => {
    const cv = cvRef.current
    const W = cv?.clientWidth || window.innerWidth
    const H = cv?.clientHeight || window.innerHeight

    const botKarakter = kocok(KARAKTER.filter((k) => k !== karakterku)) as Karakter[]
    const botNama = kocok(NAMA_BOT).slice(0, JUMLAH - 1)
    const img = (src: string) => { const i = new Image(); i.src = src; return i }

    pRef.current = Array.from({ length: JUMLAH }, (_, i) => {
      const sudut = ((Math.PI * 2) / JUMLAH) * i - Math.PI / 2
      const jarak = Math.min(W, H) * 0.3
      const kamu = i === 0
      const kar = kamu ? karakterku : botKarakter[(i - 1) % botKarakter.length]
      const src = kamu && karakterku === "sendiri" && avatarku
        ? avatarku
        : gambarKarakter(kar === "sendiri" ? "zelby" : kar, "happy")
      const x = W / 2 + Math.cos(sudut) * jarak
      const y = H / 2 + Math.sin(sudut) * jarak
      return {
        nama: kamu ? namaku : botNama[i - 1],
        gambar: img(src), warna: WARNA[i],
        x, y, tx: x, ty: y,
        hp: HP_AWAL, hidup: true, kamu, kedip: 0,
      }
    })

    bRef.current = []; partRef.current = []; angkaRef.current = []
    zonaRef.current = { x: W / 2, y: H / 2, r: Math.max(W, H) * 0.6 }
    benarRef.current = 0; salahRef.current = 0
    comboRef.current = 0; maxComboRef.current = 0
    kantongRef.current = kocok(QUESTION_BANK)
    jalanRef.current = true

    setHp(HP_AWAL); setSisa(JUMLAH); setCombo(0); setFeed([]); setHasil(null)
    setFase("main")
    soalBaru()
    sfx.start()
    startBGM()
  }, [karakterku, avatarku, namaku, soalBaru])

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

  useEffect(() => {
    const cv = cvRef.current
    if (!cv || fase !== "main") return
    const geser = (e: TouchEvent | MouseEvent) => {
      const p = pRef.current[0]
      if (!p?.hidup) return
      e.preventDefault()
      const r = cv.getBoundingClientRect()
      const cx = "touches" in e ? e.touches[0]?.clientX : e.clientX
      const cy = "touches" in e ? e.touches[0]?.clientY : e.clientY
      if (cx == null || cy == null) return
      p.tx = cx - r.left; p.ty = cy - r.top
    }
    const drag = (e: MouseEvent) => { if (e.buttons === 1) geser(e) }
    cv.addEventListener("touchstart", geser, { passive: false })
    cv.addEventListener("touchmove", geser, { passive: false })
    cv.addEventListener("mousedown", geser)
    cv.addEventListener("mousemove", drag)
    return () => {
      cv.removeEventListener("touchstart", geser)
      cv.removeEventListener("touchmove", geser)
      cv.removeEventListener("mousedown", geser)
      cv.removeEventListener("mousemove", drag)
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
        partRef.current.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, umur: 28, warna })
      }
    }

    const bunuh = (i: number, oleh: string) => {
      const p = pRef.current[i]
      if (!p.hidup) return
      p.hidup = false; p.hp = 0
      ledak(p.x, p.y, p.warna, 22)
      tulisFeed(`${oleh} menumbangkan ${p.nama}`)
      const s = pRef.current.filter((x) => x.hidup).length
      setSisa(s)
      if (p.kamu) selesaikan(false, s + 1)
      else {
        sfx.levelup()
        if (s === 1 && pRef.current[0].hidup) selesaikan(true, 1)
      }
    }

    const gelung = () => {
      if (!jalanRef.current) return
      const W = cv.clientWidth, H = cv.clientHeight
      const z = zonaRef.current
      ctx.clearRect(0, 0, W, H)
      if (z.r > Math.min(W, H) * 0.15) z.r -= 0.2

      // Luar zona digelapkan, dalam zona bersih — batasnya terbaca sekali lihat
      // tanpa perlu membaca teks apa pun.
      ctx.fillStyle = "rgba(88, 28, 135, 0.35)"
      ctx.fillRect(0, 0, W, H)
      ctx.save()
      ctx.globalCompositeOperation = "destination-out"
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(196, 132, 252, 0.9)"; ctx.lineWidth = 3; ctx.stroke()

      pRef.current.forEach((p, i) => {
        if (!p.hidup) return
        p.x += (p.tx - p.x) * 0.07
        p.y += (p.ty - p.y) * 0.07
        if (p.kedip > 0) p.kedip--

        if (Math.hypot(p.x - z.x, p.y - z.y) > z.r) {
          p.hp -= 0.14
          if (p.kamu) setHp(Math.max(0, Math.round(p.hp)))
          if (p.hp <= 0) bunuh(i, "Kabut")
        }

        if (!p.kamu) {
          if (Math.hypot(p.x - p.tx, p.y - p.ty) < 14) {
            const a = Math.random() * Math.PI * 2
            const r = Math.random() * z.r * 0.72
            p.tx = z.x + Math.cos(a) * r; p.ty = z.y + Math.sin(a) * r
          }
          if (Math.random() < 0.0038) {
            const t = pRef.current.findIndex((x, j) => j !== i && x.hidup)
            if (t !== -1) {
              const o = pRef.current[t]
              const a = Math.atan2(o.y - p.y, o.x - p.x) + (Math.random() - 0.5) * 0.4
              bRef.current.push({ x: p.x, y: p.y, vx: Math.cos(a) * 4.6, vy: Math.sin(a) * 4.6, dari: i, umur: 100, dmg: 16 })
            }
          }
        }

        if (p.kamu) {
          ctx.beginPath(); ctx.arc(p.x, p.y, R + 6, 0, Math.PI * 2)
          ctx.fillStyle = "rgba(52, 211, 153, 0.18)"; ctx.fill()
        }
        if (p.gambar?.complete && p.gambar.naturalWidth > 0) {
          ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.clip()
          ctx.drawImage(p.gambar, p.x - R, p.y - R, R * 2, R * 2); ctx.restore()
        } else {
          ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fillStyle = p.warna; ctx.fill()
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2)
        ctx.strokeStyle = p.kedip > 0 ? "#FFFFFF" : p.kamu ? "#34D399" : p.warna
        ctx.lineWidth = p.kamu ? 4 : 3; ctx.stroke()

        ctx.fillStyle = "#fff"; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "center"
        ctx.fillText(p.nama, p.x, p.y - R - 13)
        ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fillRect(p.x - 21, p.y - R - 9, 42, 4)
        ctx.fillStyle = p.hp > 35 ? "#34D399" : "#F87171"
        ctx.fillRect(p.x - 21, p.y - R - 9, 42 * Math.max(0, p.hp / HP_AWAL), 4)
      })

      for (let i = bRef.current.length - 1; i >= 0; i--) {
        const b = bRef.current[i]
        b.x += b.vx; b.y += b.vy; b.umur--
        let kena = false
        pRef.current.forEach((t, j) => {
          if (kena || j === b.dari || !t.hidup) return
          if (Math.hypot(b.x - t.x, b.y - t.y) < R) {
            t.hp -= b.dmg; t.kedip = 6
            angkaRef.current.push({ x: t.x, y: t.y - R, teks: `-${b.dmg}`, umur: 34, warna: b.dari === 0 ? "#34D399" : "#F87171" })
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
        ctx.globalAlpha = q.umur / 28
        ctx.fillStyle = q.warna
        ctx.fillRect(q.x - 2, q.y - 2, 4, 4)
        ctx.globalAlpha = 1
      }

      for (let i = angkaRef.current.length - 1; i >= 0; i--) {
        const a = angkaRef.current[i]
        a.y -= 0.8; a.umur--
        if (a.umur <= 0) { angkaRef.current.splice(i, 1); continue }
        ctx.globalAlpha = Math.min(1, a.umur / 20)
        ctx.fillStyle = a.warna; ctx.font = "900 15px system-ui, sans-serif"; ctx.textAlign = "center"
        ctx.fillText(a.teks, a.x, a.y)
        ctx.globalAlpha = 1
      }

      rafRef.current = requestAnimationFrame(gelung)
    }
    rafRef.current = requestAnimationFrame(gelung)
    return () => cancelAnimationFrame(rafRef.current)
  }, [fase, selesaikan, tulisFeed])

  const jawab = (benar: boolean) => {
    if (kunci || fase !== "main") return
    setKunci(true)
    const aku = pRef.current[0]

    if (benar) {
      benarRef.current++
      comboRef.current++
      maxComboRef.current = Math.max(maxComboRef.current, comboRef.current)
      setCombo(comboRef.current)
      comboRef.current > 1 ? sfx.combo(comboRef.current) : sfx.correct()

      // Combo menambah kerusakan: menjawab benar berturut-turut lebih berharga
      // daripada sekadar sering menembak. Inilah yang mengikat belajar ke
      // permainan — bukan sekadar hadiah di akhir.
      const dmg = DMG_DASAR + Math.min(comboRef.current - 1, 5) * 4
      let dekat = -1, min = Infinity
      pRef.current.forEach((p, i) => {
        if (i === 0 || !p.hidup) return
        const d = Math.hypot(aku.x - p.x, aku.y - p.y)
        if (d < min) { min = d; dekat = i }
      })
      if (dekat !== -1) {
        const t = pRef.current[dekat]
        const a = Math.atan2(t.y - aku.y, t.x - aku.x)
        bRef.current.push({ x: aku.x, y: aku.y, vx: Math.cos(a) * 9.5, vy: Math.sin(a) * 9.5, dari: 0, umur: 100, dmg })
      }
    } else {
      salahRef.current++
      comboRef.current = 0
      setCombo(0)
      sfx.wrong(); haptic([20, 40, 20])
      aku.hp -= DMG_SALAH
      aku.kedip = 8
      angkaRef.current.push({ x: aku.x, y: aku.y - R, teks: `-${DMG_SALAH}`, umur: 34, warna: "#F87171" })
      setHp(Math.max(0, Math.round(aku.hp)))
      if (aku.hp <= 0) {
        const s = pRef.current.filter((x) => x.hidup).length
        aku.hidup = false
        setSisa(s - 1)
        selesaikan(false, s)
        return
      }
    }
    setTimeout(soalBaru, 420)
  }

  const gantiSuara = () => {
    const on = toggleSound()
    setSuara(on)
    if (fase === "main") on ? startBGM() : stopBGM()
  }

  // ---------- Pilih karakter ----------
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
        <h1 className="text-3xl font-extrabold tracking-tight">Kuis Tempur</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-violet-300">
          Lima bertahan, satu juara. Jawab benar untuk menembak — salah, kamu yang terluka.
          Kabut terus menyempit, jadi jangan berdiam di tepi.
        </p>

        <h2 className="mt-7 text-xs font-bold uppercase tracking-wider text-violet-400">Pilih karaktermu</h2>
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
          className="mt-7 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-4 text-base font-extrabold shadow-lg shadow-emerald-500/25 active:scale-[0.98]"
        >
          Masuk Arena
        </button>
        <button onClick={gantiSuara} className="mx-auto mt-4 flex items-center gap-2 text-xs text-violet-400">
          {suara ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          Suara {suara ? "aktif" : "mati"}
        </button>
      </div>
    )
  }

  // ---------- Hasil ----------
  if (fase === "selesai") {
    return (
      <div className="game-fullscreen flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-[#1a0b2e] via-[#2d1b4e] to-[#0f0a1e] px-6 text-center text-white">
        <div className="text-6xl">{hasil?.menang ? "🏆" : "🌫️"}</div>
        <h1 className="mt-4 text-2xl font-extrabold">
          {hasil?.menang ? "Juara Bertahan!" : `Peringkat #${hasil?.peringkat ?? "-"}`}
        </h1>
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

  // ---------- Bermain ----------
  return (
    <div className="game-fullscreen relative flex h-[100dvh] flex-col overflow-hidden bg-[#0f0a1e] text-white">
      <div className="flex items-center gap-3 px-4 pt-3">
        <div className="flex-1">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-200"
              style={{ width: `${hp}%` }}
            />
          </div>
        </div>
        {combo > 1 && (
          <span className="flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-1 text-xs font-black text-amber-300">
            <Flame className="h-3.5 w-3.5" /> {combo}
          </span>
        )}
        <span className="flex items-center gap-1.5 rounded-full bg-rose-500/20 px-2.5 py-1 text-xs font-bold">
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
        <div className="mb-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2.5 text-center">
          <p className="text-sm font-bold leading-snug">{soal?.q.soal}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {soal?.opsi.map((o, i) => (
            <button
              key={i}
              onClick={() => jawab(o.benar)}
              disabled={kunci}
              className="rounded-xl border-2 border-white/15 bg-white/5 px-3 py-3.5 text-sm font-bold active:scale-95 disabled:opacity-40"
            >
              {o.teks}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

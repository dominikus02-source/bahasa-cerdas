"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Chrome, ArrowRight, Smartphone, BookOpen, Eye, EyeOff } from "lucide-react"
import { SwRegister } from "@/components/SwRegister"
import { InstallGuide } from "@/components/InstallGuide"

export default function ArenaLoginPage() {
  const [guideOpen, setGuideOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [lihatSandi, setLihatSandi] = useState(false)

  // Layar ini dipasang di dua rute: /auth/arena-login (lama) dan /arena/login
  // (dipakai APK). Path dibaca dari alamat sebenarnya, bukan ditulis tetap —
  // versi lama selalu menulis "/auth/arena-login", sehingga membuka layar ini
  // dengan ?error= di dalam APK memindahkan URL ke luar scope /arena.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("error")) {
      setError(params.get("error") || "")
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  // Tautan daftar mengikuti pohon tempat layar ini dipasang, supaya murid di
  // dalam APK tidak terlempar ke tab browser saat hendak membuat akun.
  // usePathname(), bukan window.location: nilainya sama di server dan klien,
  // sehingga tidak memicu ketidakcocokan hidrasi.
  const daftarHref = pathname.startsWith("/arena") ? "/arena/register" : "/register"

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // ── Server-side login (NO direct Supabase Auth call) ──
      // Routes through /api/auth/login which does NOT forward the school IP
      // to Supabase Auth, preventing per-IP rate limit from blocking schools.
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase(),
          password,
        }),
      })
      const loginData = await loginRes.json().catch(() => ({}))

      if (!loginRes.ok) {
        setError(loginData.error || "Gagal masuk. Silakan coba lagi.")
        setLoading(false)
        return
      }

      const dbUser = loginData.user
      if (!dbUser) { setError("Gagal memuat data user"); setLoading(false); return }
      if (dbUser.role !== "MURID" && !dbUser.isFounder) {
        setError("Akun ini bukan akun murid. Silakan login di dasbor guru.")
        setLoading(false)
        return
      }

      router.push("/arena")
    } catch (err: any) {
      console.error("Login error:", err)
      setError(
        err?.message?.includes("Failed to fetch")
          ? "Koneksi terputus. Periksa koneksi internet kamu."
          : "Terjadi kesalahan. Silakan coba lagi."
      )
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
      redirectTo: `${location.origin}/auth/callback?next=/arena`,
    })
    if (resetError) {
      setError(resetError.message)
      setLoading(false)
    } else {
      setResetSent(true)
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError("")
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || location.origin || "https://www.bahasacerdas.com"
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${baseUrl}/auth/callback?next=/arena`,
      },
    })
    if (error) setError(error.message)
  }

  // Dihitung setelah terpasang, bukan saat render. `typeof window` membuat server
  // dan klien menghasilkan nilai berbeda, sehingga di dalam APK ajakan "Install
  // Arena di HP-mu" sempat berkedip muncul lalu hilang — mengganggu, dan
  // membingungkan karena aplikasinya memang sudah terpasang.
  const [isInstalled, setIsInstalled] = useState(true)
  useEffect(() => {
    setIsInstalled(window.matchMedia("(display-mode: standalone)").matches)
  }, [])

  return (
    <>
      <SwRegister />
      <div className="min-h-dvh bg-gradient-to-b from-violet-600 via-violet-500 to-purple-600 flex flex-col relative overflow-hidden">
        {/* Batik motif background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "url('/batik%20bg%20bc.png')",
            backgroundSize: "400px",
            backgroundRepeat: "repeat",
            backgroundPosition: "center",
            opacity: 0.08,
            mixBlendMode: "overlay",
          }}
        />
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12">
        <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center mb-4 shadow-2xl">
          <img src="/brand/bc2026-icon.png" alt="BahasaCerdas" className="h-12 w-12 object-contain" />
        </div>

        <h1 className="text-3xl font-extrabold text-white text-center mb-1">Arena</h1>
        <p className="text-violet-200 text-sm text-center mb-10 max-w-xs">
          Belajar Bahasa Indonesia — seru, kompetitif, bareng teman
        </p>

        {error && (
          <div className="w-full max-w-sm mb-4 p-3 rounded-xl bg-red-500/20 border border-red-400/30 text-red-100 text-sm text-center">
            {error}
          </div>
        )}

        {resetSent ? (
          <div className="w-full max-w-sm p-4 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-100 text-sm text-center">
            Link reset password sudah dikirim ke <strong>{email}</strong>. Cek inbox/spam email kamu.
          </div>
        ) : resetMode ? (
          <form onSubmit={handleResetPassword} className="w-full max-w-sm space-y-3">
            <p className="text-sm text-violet-200 text-center mb-1">Masukkan email untuk menerima link reset password</p>
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              placeholder="Surel"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl bg-white/15 border border-white/20 text-white placeholder-violet-300/70 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 transition-all"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-white text-violet-700 font-bold text-sm hover:bg-violet-50 disabled:opacity-60 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? "Mengirim..." : "Kirim Link Reset"}
            </button>
            <button
              type="button"
              onClick={() => setResetMode(false)}
              className="w-full text-sm text-violet-300 hover:text-white transition-colors text-center"
            >
              Kembali ke login
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="w-full max-w-sm space-y-3">
            {/* name + autoComplete ada supaya pengelola sandi Android/Chrome mau
                menawarkan isi otomatis DAN menawarkan simpan setelah berhasil.
                Tanpa keduanya murid mengetik ulang alamat surel panjang setiap
                kali masuk — keluhan yang paling sering muncul di ponsel.
                autoCapitalize/autoCorrect dimatikan karena papan ketik Android
                mengapitalkan kata pertama secara bawaan, dan surel yang berubah
                jadi "Budi@..." ditolak tanpa penjelasan yang bisa dimengerti. */}
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              placeholder="Surel"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl bg-white/15 border border-white/20 text-white placeholder-violet-300/70 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 transition-all"
              required
            />

            <div className="relative">
              <input
                type={lihatSandi ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                enterKeyHint="go"
                placeholder="Kata Sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 pr-12 rounded-xl bg-white/15 border border-white/20 text-white placeholder-violet-300/70 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 transition-all"
                required
              />
              {/* Tombol lihat sandi. Di ponsel, sandi yang tak terlihat adalah
                  sumber kegagalan masuk yang paling sering pada anak — mereka
                  tidak bisa membedakan salah ketik dari sandi yang keliru.
                  Ukurannya 44px agar nyaman disentuh jempol. */}
              <button
                type="button"
                onClick={() => setLihatSandi((v) => !v)}
                aria-label={lihatSandi ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                aria-pressed={lihatSandi}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-11 w-11 flex items-center justify-center rounded-lg text-violet-200 hover:text-white active:scale-95 transition-all"
              >
                {lihatSandi ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={() => setResetMode(true)}
                className="text-xs text-violet-300 hover:text-white transition-colors"
              >
                Lupa password?
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-white text-violet-700 font-bold text-sm hover:bg-violet-50 disabled:opacity-60 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? "Masuk..." : "Masuk"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="w-full max-w-sm flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/20" />
          <span className="text-xs text-violet-300">atau</span>
          <div className="flex-1 h-px bg-white/20" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full max-w-sm py-3.5 rounded-xl bg-white/10 border border-white/20 text-white font-medium text-sm hover:bg-white/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          <Chrome className="w-5 h-5" />
          Lanjut dengan Google
        </button>

        {/* Daftar dinaikkan jadi tombol utuh. Sebelumnya ia teks 12px berwarna
            violet pudar di atas latar violet — nyaris tak terbaca di layar
            ponsel, padahal ini satu-satunya jalan bagi murid yang belum punya
            akun. Kalau jalan masuk itu tak terlihat, mereka berhenti di sini. */}
        <div className="w-full max-w-sm mt-6 text-center">
          <p className="text-sm text-violet-200 mb-2">Belum punya akun?</p>
          <a
            href={daftarHref}
            className="block w-full py-3.5 rounded-xl border-2 border-white/40 text-white font-bold text-sm hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            Daftar Akun Baru
          </a>
        </div>
      </div>

      {!isInstalled && (
        <div className="px-6 pb-8">
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 p-4">
            <div className="flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-violet-200 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Install Arena di HP-mu</p>
                <p className="text-xs text-violet-200/80">Buka di Chrome → ⋮ → Add to Home Screen</p>
              </div>
              <button onClick={() => setGuideOpen(true)} className="px-3 py-2 rounded-xl bg-white/15 text-white text-xs font-medium flex items-center gap-1 shrink-0">
                <BookOpen className="w-3.5 h-3.5" /> Panduan
              </button>
            </div>
          </div>
        </div>
      )}

      {guideOpen && <InstallGuide onClose={() => setGuideOpen(false)} />}
      </div>
    </>
  )
}

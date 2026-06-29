"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Chrome, ArrowRight, Smartphone, BookOpen } from "lucide-react"
import { SwRegister } from "@/components/SwRegister"
import { InstallGuide } from "@/components/InstallGuide"

export default function ArenaLoginPage() {
  const [guideOpen, setGuideOpen] = useState(false)
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("error")) {
      setError(params.get("error") || "")
      window.history.replaceState({}, "", "/auth/arena-login")
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    })

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Email atau password salah"
          : authError.message === "Email not confirmed"
          ? "Email belum dikonfirmasi. Cek inbox/spam kamu."
          : authError.message
      )
      setLoading(false)
      return
    }

    if (!data.user) { setError("Gagal masuk"); setLoading(false); return }

    const createRes = await fetch("/api/user/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supabaseId: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name,
        role: data.user.user_metadata?.role || "MURID",
      }),
    })
    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}))
      await supabase.auth.signOut()
      setError(errData?.error || "Gagal login")
      setLoading(false)
      return
    }

    const me = (await createRes.json())?.user
    if (!me) { setError("Gagal memuat data"); setLoading(false); return }
    if (me.role !== "MURID" && !me.isFounder) {
      await supabase.auth.signOut()
      setError("Akun ini bukan akun murid. Silakan login di dasbor guru.")
      setLoading(false)
      return
    }

    router.push("/arena")
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

  const isInstalled = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches

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
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"/>
          </svg>
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
            <input
              type="email"
              placeholder="Surel"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl bg-white/15 border border-white/20 text-white placeholder-violet-300/70 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 transition-all"
              required
            />
            <input
              type="password"
              placeholder="Kata Sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl bg-white/15 border border-white/20 text-white placeholder-violet-300/70 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 transition-all"
              required
            />
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

        <p className="text-xs text-violet-300/70 mt-6 text-center">
          Belum punya akun?{" "}
          <a href="/register" className="text-white font-semibold underline underline-offset-2">
            Daftar
          </a>
        </p>
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

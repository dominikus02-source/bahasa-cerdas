"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  GraduationCap, Users, ArrowRight, ArrowLeft, Copy, Check,
  Loader2, Sparkles, ExternalLink, MessageCircle, Link2
} from "lucide-react"
import { buildClassJoinUrl, buildShareMessage } from "@/lib/guru/gcs-copy"
import { trackProductEvent } from "@/lib/analytics/product-track"

interface CreatedClass {
  id: string
  name: string
  accessCode: string
}

const GRADES = [
  "VII", "VIII", "IX", "X", "XI", "XII"
]

const TAHUN_AJARAN = (() => {
  const now = new Date()
  const y = now.getFullYear()
  return [`${y - 1}/${y}`, `${y}/${y + 1}`, `${y + 1}/${y + 2}`]
})()

export default function GuruOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<"timeout" | "unauthorized" | "unavailable" | "unknown" | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [fullName, setFullName] = useState("")
  const [trialDays, setTrialDays] = useState(30)

  // Step 2 — create class
  const [className, setClassName] = useState("")
  const [classGrade, setClassGrade] = useState("VII")
  const [classTahun, setClassTahun] = useState(TAHUN_AJARAN[0])
  const [creating, setCreating] = useState(false)
  const [createdClass, setCreatedClass] = useState<CreatedClass | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  // Step 3 — copy/share
  const [copied, setCopied] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Step 4 — student milestone visibility (P0 #3c)
  const [milestoneStep, setMilestoneStep] = useState(0) // 0-loading,1-waiting,2-first-joined,3-threesome
  const [memberCount, setMemberCount] = useState(0)
  const [firstStudentName, setFirstStudentName] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10000)

    const loadUser = async () => {
      setLoading(true)
      setLoadError(null)

      try {
        const response = await fetch("/api/user/me", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        })

        let data: any = null
        try {
          data = await response.json()
        } catch {}

        if (!response.ok) {
          if (response.status === 401 || !data?.user && response.status === 401) {
            setLoadError("unauthorized")
          } else if (response.status === 503 || data?.code === "AUTH_TEMPORARILY_UNAVAILABLE") {
            setLoadError("unavailable")
          } else {
            setLoadError("unknown")
          }
          return
        }

        const u = data?.user
        if (!u) {
          setLoadError("unauthorized")
          return
        }

        if (u.onboarded) {
          router.replace("/guru/beranda")
          return
        }

        setFullName(u.fullName || "Guru")
        if (u.trialEndsAt) {
          const days = Math.ceil((new Date(u.trialEndsAt).getTime() - Date.now()) / 86400000)
          setTrialDays(Math.max(0, days))
        }
      } catch (error: any) {
        if (error?.name === "AbortError") {
          setLoadError("timeout")
        } else {
          setLoadError("unknown")
        }
      } finally {
        window.clearTimeout(timeout)
        setLoading(false)
      }
    }

    void loadUser()

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [router, loadAttempt])

  const handleCreateClass = async () => {
    if (!className.trim()) { setCreateError("Nama kelas wajib diisi"); return }
    setCreating(true); setCreateError(null)
    try {
      const res = await fetch("/api/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: className.trim(),
          grade: classGrade,
          tahunAjaran: classTahun,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal membuat kelas")
      setCreatedClass({ id: data.group.id, name: data.group.name, accessCode: data.code })
      setStep(2)
    } catch (e: any) {
      setCreateError(e.message || "Terjadi kesalahan")
    } finally {
      setCreating(false)
    }
  }

  const handleCopyCode = async () => {
    if (!createdClass) return
    try {
      await navigator.clipboard.writeText(createdClass.accessCode)
      setCopied(true)
      trackProductEvent("class_invite_shared", { method: "code", flow: "onboarding" })
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleCopyLink = async () => {
    if (!createdClass) return
    const origin = typeof window !== "undefined" ? window.location.origin : "https://www.bahasacerdas.com"
    const link = buildClassJoinUrl(origin, createdClass.accessCode)
    try {
      await navigator.clipboard.writeText(link)
      setCopiedLink(true)
      trackProductEvent("class_invite_shared", { method: "link", flow: "onboarding" })
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {}
  }

  const handleFinish = async () => {
    try { await fetch("/api/user/onboarded", { method: "POST" }) } catch {}
    window.location.href = "/guru/beranda"
  }

  // Advance from share-code (step 2) to the student-milestone screen (step 3).
  const handleGoToMilestone = () => {
    setMilestoneStep(1)
    setStep(3)
  }

  // Live-poll the group's student-join milestone while on the milestone screen.
  useEffect(() => {
    if (step !== 3 || !createdClass?.id) return
    const id = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/guru/onboarding/status?groupId=${createdClass.id}`)
        const data = await res.json()
        if (!res.ok || !data.hasGroup) return
        setMemberCount(data.memberCount ?? 0)
        if (data.firstStudentName) setFirstStudentName(data.firstStudentName)
        setMilestoneStep(
          data.memberCount >= 3 ? 3 : data.memberCount >= 1 ? 2 : 1
        )
      } catch {}
    }, 4000)
    return () => window.clearInterval(id)
  }, [step, createdClass?.id])

  const handleSkipToClass = async () => {
    try { await fetch("/api/user/onboarded", { method: "POST" }) } catch {}
    window.location.href = "/guru/kelasku"
  }

  const waShareUrl = createdClass
    ? (() => {
        const origin = typeof window !== "undefined" ? window.location.origin : "https://www.bahasacerdas.com"
        const joinUrl = buildClassJoinUrl(origin, createdClass.accessCode)
        const msg = buildShareMessage({ name: createdClass.name, accessCode: createdClass.accessCode })
        return `https://wa.me/?text=${encodeURIComponent(msg + "\n\n" + joinUrl)}`
      })()
    : ""

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Menyiapkan akun guru...</h1>
          <p className="text-sm text-slate-500 mt-2">Kami sedang memuat profil Anda.</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    const isUnauthorized = loadError === "unauthorized"
    const isUnavailable = loadError === "timeout" || loadError === "unavailable"

    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <GraduationCap className="w-8 h-8 text-amber-500" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            {isUnauthorized ? "Sesi guru belum siap" : "Koneksi autentikasi sedang lambat"}
          </h1>

          <p className="text-sm leading-relaxed text-slate-500 mb-6">
            {isUnauthorized
              ? "Sesi login tidak ditemukan. Silakan masuk kembali untuk melanjutkan."
              : isUnavailable
                ? "Layanan autentikasi sedang merespons lebih lambat dari biasanya. Data akun Anda tetap aman."
                : "Profil guru belum dapat dimuat. Silakan coba lagi."}
          </p>

          <div className="flex flex-col gap-3">
            {isUnauthorized ? (
              <button
                onClick={() => { window.location.href = "/login?next=/guru/onboarding" }}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
              >
                Masuk Kembali
              </button>
            ) : (
              <button
                onClick={() => setLoadAttempt(v => v + 1)}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
              >
                Coba Lagi
              </button>
            )}
            <Link
              href="/login"
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Kembali ke halaman masuk
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-lg mx-auto w-full">

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-10">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? "w-8 bg-emerald-500" : i < step ? "w-2 bg-emerald-300" : "w-2 bg-slate-200"
            }`} />
          ))}
        </div>

        {/* Step 1 — Welcome */}
        {step === 0 && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg mb-6 mx-auto">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
              Selamat datang, {fullName}!
            </h1>
            <p className="text-slate-500 leading-relaxed mb-4">
              BahasaCerdas adalah platform Bahasa Indonesia untuk guru dan murid.
              Mulai dari membuat kelas, mengundang murid, hingga mengajar dengan AI.
            </p>
            {trialDays > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full text-sm text-emerald-700 font-medium mb-8">
                <Sparkles size={14} className="text-emerald-500" />
                Guru Pro gratis selama {trialDays} hari
              </div>
            )}
            <div className="flex flex-col gap-3 mt-2">
              <button
                onClick={() => setStep(1)}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
              >
                Buat Kelas Pertama <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={handleSkipToClass}
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Lewati dulu, buat kelas nanti
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Create Class */}
        {step === 1 && (
          <div className="w-full">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg mb-4 mx-auto">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                Buat Kelas Pertama
              </h2>
              <p className="text-slate-500 text-sm">
                Kelas membantu kamu mengelola murid. Nanti kamu bisa membuat kelas lagi.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Kelas</label>
                <input
                  type="text"
                  value={className}
                  onChange={e => { setClassName(e.target.value); setCreateError(null) }}
                  placeholder="Contoh: Bahasa Indonesia VII-A"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tingkat</label>
                  <select
                    value={classGrade}
                    onChange={e => setClassGrade(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  >
                    {GRADES.map(g => <option key={g} value={g}>Kelas {g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tahun Ajaran</label>
                  <select
                    value={classTahun}
                    onChange={e => setClassTahun(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  >
                    {TAHUN_AJARAN.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {createError && (
                <p className="text-sm text-red-500">{createError}</p>
              )}

              <button
                onClick={handleCreateClass}
                disabled={creating || !className.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-200"
              >
                {creating ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Membuat...</>
                ) : (
                  <><Check className="w-5 h-5" /> Buat Kelas</>
                )}
              </button>

              <button
                onClick={() => setStep(0)}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors mx-auto"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Share Code */}
        {step === 2 && createdClass && (
          <div className="w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg mb-4 mx-auto">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
              Kelas "{createdClass.name}" dibuat!
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Bagikan tautan atau kode ke muridmu. Cukup satu klik — murid langsung ke halaman gabung kelas.
            </p>

            {/* Access code display */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Kode Akses</p>
              <p className="text-4xl sm:text-5xl font-mono font-bold text-emerald-600 tracking-[0.2em]">
                {createdClass.accessCode}
              </p>
            </div>

            {/* Action buttons — deep-link primary */}
            <div className="flex flex-col gap-3 mb-6">
              <button
                onClick={handleCopyLink}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
              >
                {copiedLink ? <Check className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
                {copiedLink ? "Tautan Tersalin!" : "Salin Tautan Undangan"}
              </button>

              <button
                onClick={handleCopyCode}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-emerald-200 text-emerald-700 rounded-xl font-semibold hover:bg-emerald-50 transition-colors"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? "Kode Tersalin!" : "Salin Kode Saja"}
              </button>

              <a
                href={waShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#25D366] text-white rounded-xl font-semibold hover:bg-[#20BA5C] transition-colors"
              >
                <MessageCircle className="w-5 h-5" /> Bagikan via WhatsApp
              </a>

              <Link
                href={`/murid/gabung-kelas`}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
              >
                <ExternalLink className="w-5 h-5" /> Lihat Halaman Murid
              </Link>
            </div>

            <p className="text-xs text-slate-400 mb-6">
              Murid klik tautan → buka BahasaCerdas → langsung gabung kelas
            </p>

            <button
              onClick={handleGoToMilestone}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
            >
              Undang Murid & Mulai Mengajar 🚀
            </button>
          </div>
        )}

        {/* Step 4 — Milestone visibility (first student joins) */}
        {step === 3 && createdClass && (
          <div className="w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg mb-4 mx-auto">
              {milestoneStep >= 2 ? <Sparkles className="w-8 h-8 text-white" /> : <Users className="w-8 h-8 text-white" />}
            </div>

            {milestoneStep === 2 || milestoneStep === 3 ? (
              <>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                  {milestoneStep === 3 ? "Hebat! Kelasmu sudah ramai 🎉" : "Murid pertamamu bergabung! 🎉"}
                </h2>
                <p className="text-slate-500 text-sm mb-6">
                  {milestoneStep === 3
                    ? `${memberCount} murid sudah ada di "${createdClass.name}".`
                    : (firstStudentName
                        ? `${firstStudentName} bergabung ke "${createdClass.name}".`
                        : `Seorang murid bergabung ke "${createdClass.name}".`)}
                  {" "}Ajak terus murid lain agar kelasmu lebih hidup.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                  Tunggu murid pertamamu
                </h2>
                <p className="text-slate-500 text-sm mb-6">
                  Bagikan kode <span className="font-mono font-semibold text-emerald-600">{createdClass.accessCode}</span> ke muridmu.
                  Halaman ini akan otomatis memperbarui begitu ada yang bergabung.
                </p>
              </>
            )}

            {/* Live counter */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 mb-6">
              <div className="flex items-center justify-center gap-3">
                <Users className="w-5 h-5 text-emerald-600" />
                <p className="text-sm text-slate-500">
                  <span className="text-3xl font-bold text-slate-900">{memberCount}</span>{" "}
                  murid bergabung
                </p>
              </div>
              <div className="mt-3 flex items-center justify-center gap-1.5">
                {[1, 2, 3].map(n => (
                  <div key={n} className={`w-10 h-2 rounded-full ${
                    memberCount >= n ? "bg-emerald-500" : "bg-slate-200"
                  }`} />
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3">
                {memberCount >= 3 ? "3 murid — target kelas aktif tercapai" : "3 murid = kelas aktif"}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href={`/murid/gabung-kelas?kode=${createdClass.accessCode}`}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-emerald-200 text-emerald-700 rounded-xl font-semibold hover:bg-emerald-50 transition-colors"
              >
                <ExternalLink className="w-5 h-5" /> Lihat Halaman Murid
              </Link>
              <button
                onClick={handleSkipToClass}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
              >
                <ArrowRight className="w-4 h-4" /> Ke Halaman Kelasku
              </button>
              <button
                onClick={handleFinish}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
              >
                Selesai ke Dasbor
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { X, Smartphone, ChevronRight, Download, CheckCircle2 } from "lucide-react"

const steps = [
  {
    icon: "1",
    title: "Buka Chrome",
    desc: "Buka Google Chrome di HP-mu",
    img: null,
  },
  {
    icon: "2",
    title: "Login",
    desc: "Masuk ke akun BahasaCerdas-mu",
    img: null,
  },
  {
    icon: "3",
    title: "Tap ⋮ (titik tiga)",
    desc: "Di pojok kanan atas Chrome, tap ikon titik tiga",
    img: null,
  },
  {
    icon: "4",
    title: "Add to Home Screen",
    desc: "Gulir ke bawah, tap 'Add to Home Screen' atau 'Install App'",
    img: null,
  },
  {
    icon: "5",
    title: "Tap Install",
    desc: "Konfirmasi dengan tap 'Install' — icon Arena muncul di HP-mu!",
    img: null,
  },
]

export function InstallGuide({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState(0)
  const isDone = step >= steps.length

  if (isDone) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/60 flex items-end md:items-center justify-center p-0 md:p-6">
        <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-sm p-6 text-center animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Selesai! 🎉</h3>
          <p className="text-sm text-gray-500 mb-6">Sekarang buka Arena langsung dari home screen HP-mu!</p>
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-all">
            Mulai Belajar
          </button>
        </div>
      </div>
    )
  }

  const s = steps[step]

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-sm p-6 animate-slide-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 mb-6">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i === step ? "bg-violet-600" : i < step ? "bg-emerald-400" : "bg-gray-200"}`} />
          ))}
        </div>

        <div className="flex flex-col items-center text-center mb-8">
          <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white mb-5 shadow-xl`}>
            {s.icon}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{s.title}</h3>
          <p className="text-sm text-gray-500 max-w-xs">{s.desc}</p>
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-all">
              Kembali
            </button>
          )}
          <button onClick={() => setStep(step + 1)} className={`flex items-center justify-center gap-1.5 py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-all ${step === 0 ? "w-full" : "flex-1"}`}>
            {step < steps.length - 1 ? "Lanjut" : "Selesai"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

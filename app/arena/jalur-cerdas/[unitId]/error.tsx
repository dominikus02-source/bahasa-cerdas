"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react"

export default function UnitError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Unit page error:", error.message, error.digest, error.stack)
  }, [error])

  return (
    <div className="px-4 py-20 arena-page text-center">
      <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
      <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">Gagal Memuat Unit</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Terjadi kesalahan saat memuat halaman ini.</p>
      <div className="flex items-center justify-center gap-3">
        <Link href="/arena/jalur-cerdas" className="px-4 py-2.5 bg-gray-100 dark:bg-slate-800/80 text-gray-700 dark:text-slate-300 font-medium rounded-xl hover:bg-gray-200 transition-colors text-sm flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Link>
        <button onClick={reset} className="px-4 py-2.5 bg-violet-600 text-white font-medium rounded-xl hover:bg-violet-700 transition-colors text-sm flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4" />
          Coba Lagi
        </button>
      </div>
    </div>
  )
}

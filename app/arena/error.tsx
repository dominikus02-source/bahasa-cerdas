"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

// Localized error boundary for the Arena (games, Jalur Cerdas, latihan).
export default function ArenaError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
    console.error(error)
  }, [error])

  return (
    <div className="flex items-center justify-center py-20 px-4">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-14 h-14 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Ups, ada gangguan</h2>
        <p className="text-slate-500 mb-6">
          Halaman ini gagal dimuat. Coba lagi, atau kembali ke halaman sebelumnya.
        </p>
        <Button onClick={reset} className="bg-violet-600 hover:bg-violet-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Coba Lagi
        </Button>
      </div>
    </div>
  )
}

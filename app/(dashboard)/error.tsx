"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

// Localized error boundary for the dashboard (guru/murid/admin). Keeps the
// surrounding layout (sidebar/nav) intact and only replaces the content area,
// so one failing page doesn't take down the whole shell.
export default function DashboardError({
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
        <h2 className="text-xl font-bold text-slate-800 mb-2">Halaman ini bermasalah</h2>
        <p className="text-slate-500 mb-6">
          Terjadi kesalahan saat memuat bagian ini. Bagian lain tetap bisa kamu buka lewat menu.
        </p>
        <Button onClick={reset} className="bg-violet-600 hover:bg-violet-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Coba Muat Ulang
        </Button>
      </div>
    </div>
  )
}

"use client"

import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="id">
      <body className="antialiased">
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Kesalahan Sistem</h1>
            <p className="text-slate-500 mb-6">Maaf, terjadi kesalahan pada sistem. Silakan muat ulang halaman.</p>
            <Button onClick={() => reset()} className="bg-violet-600 hover:bg-violet-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Muat Ulang
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}

"use client"

import { useEffect, use, useCallback } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import { preloadCompetition } from "@/lib/competition-cache"

const DeviceCheck = dynamic(() => import("@/components/kompetensi/DeviceCheck"), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Memuat pengecekan perangkat...</p>
      </div>
    </div>
  ),
  ssr: false,
})

export default function DeviceCheckPage({ params }: { params: Promise<{ paketId: string }> }) {
  const { paketId } = use(params)
  const router = useRouter()

  // Pre-load soal di background saat user cek perangkat
  useEffect(() => {
    preloadCompetition(paketId)
  }, [paketId])

  const handleComplete = useCallback((micOk: boolean, speakerOk: boolean) => {
    const searchParams = new URLSearchParams()
    searchParams.set("mic", micOk ? "1" : "0")
    searchParams.set("speaker", speakerOk ? "1" : "0")
    router.push(`/kompetisi/${paketId}?${searchParams.toString()}`)
  }, [paketId, router])

  return <DeviceCheck paketId={paketId} onComplete={handleComplete} />
}

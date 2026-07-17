"use client"

import { use, useCallback } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

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

  const handleComplete = useCallback((micOk: boolean, speakerOk: boolean) => {
    const params = new URLSearchParams()
    params.set("mic", micOk ? "1" : "0")
    params.set("speaker", speakerOk ? "1" : "0")
    router.push(`/kompetisi/${paketId}?${params.toString()}`)
  }, [paketId, router])

  return <DeviceCheck paketId={paketId} onComplete={handleComplete} />
}

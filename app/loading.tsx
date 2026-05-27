import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Memuat...</p>
      </div>
    </div>
  )
}

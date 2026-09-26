"use client"

/**
 * LivePulseCard — Near-real-time platform presence for Founder Control Tower
 *
 * Fetches GET /api/analytics/live every 15 seconds.
 * Displays:
 *  - Online users count with pulsing green dot (when presenceAvailable)
 *  - Role breakdown (Guru / Murid / Admin)
 *  - Total Karya count (canonical from DB)
 *  - Near-real-time indicator
 *
 * When presenceAvailable=false:
 *  - Shows degraded state (no fake zeros)
 *  - Gray indicator instead of pulsing green
 *
 * Privacy: aggregate counts + coarse menu buckets only. No names, emails,
 * dynamic IDs, query strings, or full URLs.
 */
import { useEffect, useState, useCallback } from "react"
import { Users, BookOpen, Wifi, WifiOff, MapPin } from "lucide-react"

interface LivePulseData {
  onlineUsers: number
  onlineGuru: number
  onlineMurid: number
  onlineAdmin: number
  onlineLocations: Array<{
    key: string
    label: string
    total: number
    guru: number
    murid: number
    admin: number
  }>
  totalKarya: number
  generatedAt: string
  presenceWindowSeconds: number
  presenceAvailable: boolean
}

const POLL_INTERVAL_MS = 15_000

export function LivePulseCard() {
  const [data, setData] = useState<LivePulseData | null>(null)
  const [error, setError] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchLiveData = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics/live")
      if (!res.ok) {
        setError(true)
        return
      }
      const json = await res.json()
      setData(json)
      setError(false)
      setLastUpdate(new Date())
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    fetchLiveData()
    const interval = setInterval(fetchLiveData, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchLiveData])

  const timeAgo = lastUpdate
    ? `${Math.round((Date.now() - lastUpdate.getTime()) / 1000)} detik lalu`
    : "…"

  const presenceOk = data?.presenceAvailable === true

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Wifi size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Live Pulse
            </h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Near-real-time · {timeAgo}
            </p>
          </div>
        </div>
        {/* Indicator: green pulsing when available, gray static when unavailable */}
        {presenceOk ? (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
        ) : (
          <span className="relative flex h-3 w-3">
            <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-400" />
          </span>
        )}
      </div>

      {/* Error state */}
      {error && !data && (
        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
          Gagal memuat data live. Akan coba lagi…
        </div>
      )}

      {/* Loading skeleton */}
      {!data && !error && (
        <div className="space-y-3 animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-24" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          </div>
        </div>
      )}

      {/* Data available — presence healthy */}
      {data && presenceOk && (
        <div className="space-y-4">
          {/* Main metric: Online Users */}
          <div>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {data.onlineUsers}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pengguna Online
            </p>
          </div>

          {/* Role breakdown */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {data.onlineGuru}
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Guru</p>
            </div>
            <div className="bg-violet-50 dark:bg-violet-950/30 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-violet-700 dark:text-violet-300">
                {data.onlineMurid}
              </p>
              <p className="text-[10px] text-violet-600 dark:text-violet-400">Murid</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                {data.onlineAdmin}
              </p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400">Admin</p>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700/50" />

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <MapPin size={13} className="text-emerald-500" />
              Menu aktif
            </div>
            {data.onlineLocations.length === 0 ? (
              <p className="text-xs text-slate-400">Belum ada lokasi aktif.</p>
            ) : (
              <div className="space-y-1.5">
                {data.onlineLocations.slice(0, 5).map((location) => (
                  <div key={location.key} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-900/45">
                    <span className="min-w-0 truncate text-xs text-slate-600 dark:text-slate-300">
                      {location.label}
                    </span>
                    <span className="shrink-0 text-xs font-bold text-slate-900 dark:text-slate-100">
                      {location.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 dark:border-slate-700/50" />

          {/* Canonical Karya count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Total Karya
              </span>
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {data.totalKarya.toLocaleString("id-ID")}
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
            <Users size={10} />
            <span>
              TTL {data.presenceWindowSeconds} detik · Auto-refresh 15 detik
            </span>
          </div>
        </div>
      )}

      {/* Data available — presence unavailable (Redis not configured) */}
      {data && !presenceOk && (
        <div className="space-y-4">
          {/* Degraded indicator */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <WifiOff size={16} className="text-slate-400" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Live Pulse tidak tersedia
              </p>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Presence data belum aktif. Periksa konfigurasi Redis di Vercel.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 dark:border-slate-700/50" />

          {/* Canonical Karya count still shows */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Total Karya
              </span>
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {data.totalKarya.toLocaleString("id-ID")}
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
            <Users size={10} />
            <span>
              Presence offline · Auto-refresh 15 detik
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

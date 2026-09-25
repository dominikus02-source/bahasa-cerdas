"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ClipboardList, PenLine, Award, BarChart3 } from "lucide-react"
import { HasilSimulasiView } from "@/components/guru/simulasi/HasilSimulasiView"
import { TinjauSimulasiView } from "@/components/guru/simulasi/TinjauSimulasiView"
import { DokumenLatihanView } from "@/components/guru/simulasi/DokumenLatihanView"

const TABS = [
  { id: "hasil", label: "Hasil Simulasi", icon: ClipboardList },
  { id: "tinjau", label: "Tinjau Jawaban", icon: PenLine },
  { id: "dokumen", label: "Dokumen Latihan", icon: Award },
] as const

type TabId = (typeof TABS)[number]["id"]

function normalizeTab(value: string | null): TabId {
  return TABS.some((t) => t.id === value) ? (value as TabId) : "hasil"
}

/**
 * EvaluasiSimulasiTabs — hub "Laporan Simulasi".
 *
 * Satu halaman berisi 3 tab: Hasil Simulasi, Tinjau Jawaban, Dokumen Latihan.
 * State tab hidup di query string (?tab=hasil|tinjau|dokumen) agar bisa
 * di-deep-link dan aman saat refresh. Semua view dipakai dengan hub=true
 * sehingga hero besar tidak dirender ulang dan cross-link memakai ?tab=.
 */
export function EvaluasiSimulasiTabs({ guruName }: { guruName: string }) {
  const searchParams = useSearchParams()
  const active = normalizeTab(searchParams.get("tab"))

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      {/* Header hub */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center shadow-md shadow-blue-500/20">
            <BarChart3 size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Laporan Simulasi</h1>
            <p className="text-sm text-slate-500">
              Pusat evaluasi simulasi UKBI & TKA: pantau hasil, tinjau jawaban Menulis/Berbicara, dan kelola dokumen latihan murid. {guruName ? `Halo, ${guruName}!` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="guru-role-card bg-white rounded-2xl border border-blue-100 dark:bg-[#0b1d34] dark:border-blue-950/70 p-1.5 mb-6 shadow-sm flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const activeTab = active === tab.id
          return (
            <Link
              key={tab.id}
              href={`?tab=${tab.id}`}
              className={`flex flex-1 items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab
                  ? "guru-role-tab-active"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>

      {/* Konten tab aktif */}
      {active === "hasil" && <HasilSimulasiView guruName={guruName} hub />}
      {active === "tinjau" && <TinjauSimulasiView hub />}
      {active === "dokumen" && <DokumenLatihanView hub />}
    </div>
  )
}

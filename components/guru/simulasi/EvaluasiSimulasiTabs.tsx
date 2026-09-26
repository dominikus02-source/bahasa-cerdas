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
          <div className="bc-guru-icon flex h-11 w-11 items-center justify-center rounded-xl">
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
      <div className="bc-guru-surface mb-6 flex gap-1 overflow-x-auto rounded-2xl p-1.5">
        {TABS.map((tab) => {
          const activeTab = active === tab.id
          return (
            <Link
              key={tab.id}
              href={`?tab=${tab.id}`}
              className={`flex flex-1 items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab
                  ? "bc-guru-tab-active"
                  : "bc-guru-tab-idle"
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

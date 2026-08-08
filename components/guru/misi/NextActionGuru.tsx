"use client";

import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  PartyPopper,
  Zap,
  Users,
  PenLine,
  FileUp,
  GraduationCap,
  Send,
  Store,
  Database,
  type LucideIcon,
} from "lucide-react";
import { hitungNextActionGuru } from "@/lib/guru/next-action";
import type { MisiGuruStatus } from "@/lib/guru/misi-guru-status";

const ICONS: Record<string, LucideIcon> = {
  users: Users,
  pen: PenLine,
  fileUp: FileUp,
  kelas: GraduationCap,
  send: Send,
  store: Store,
  database: Database,
};

function Skeleton() {
  return (
    <div className="rounded-3xl bg-white border border-emerald-100 p-5 sm:p-6 shadow-lg shadow-emerald-100/50 animate-pulse">
      <div className="h-4 bg-emerald-100 rounded w-40 mb-3" />
      <div className="h-16 rounded-2xl bg-emerald-50" />
    </div>
  );
}

export function NextActionGuru({ status }: { status: MisiGuruStatus | null }) {
  if (!status) return <Skeleton />;

  const aksi = hitungNextActionGuru(status);
  const Icon = ICONS[aksi.icon] ?? Sparkles;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 shadow-lg ring-1 ${
        aksi.semuaSelesai
          ? "bg-gradient-to-br from-amber-50 via-white to-yellow-50 ring-amber-100 shadow-amber-100/50"
          : "bg-gradient-to-br from-emerald-50 via-white to-teal-50 ring-emerald-100 shadow-emerald-100/50"
      }`}
    >
      <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-emerald-100/40" />
      <div className="relative flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center shadow-md ${aksi.iconBg}`}
          >
            <Icon size={18} className="text-white" />
          </span>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            {aksi.semuaSelesai ? (
              <span className="inline-flex items-center gap-1">
                <PartyPopper size={12} className="text-amber-500" /> Semua misi minggu ini selesai
              </span>
            ) : (
              "Langkah Berikutnya"
            )}
          </p>
        </div>

        <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-snug">{aksi.label}</h3>
        <p className="text-sm text-gray-500 mt-1 leading-snug">{aksi.desc}</p>

        {aksi.xp > 0 && (
          <span className="inline-flex items-center gap-1.5 self-start mt-3 text-sm font-bold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full">
            <Zap size={14} className="text-amber-500" /> +{aksi.xp} XP
          </span>
        )}

        <Link
          href={aksi.href}
          aria-label={`${aksi.label} — kerjakan sekarang`}
          className={`mt-4 w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all ${
            aksi.semuaSelesai
              ? "bg-gradient-to-r from-amber-500 to-yellow-600 shadow-amber-500/20 hover:from-amber-600 hover:to-yellow-700"
              : "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/20 hover:from-emerald-600 hover:to-emerald-700"
          }`}
        >
          {aksi.semuaSelesai ? "Lanjut Berkarya" : "Kerjakan Sekarang"}
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}

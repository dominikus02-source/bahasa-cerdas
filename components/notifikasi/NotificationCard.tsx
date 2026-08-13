"use client";

import Link from "next/link";
import { Award, AlertTriangle, Bell, CheckCircle2, Info, Sparkles, Trash2, XCircle } from "lucide-react";

export interface NotifikasiItem {
  id: string;
  title: string;
  body: string;
  type?: string;
  isRead: boolean;
  createdAt: string;
  data?: { link?: string } | null;
}

// Satu sumber kebenaran tampilan kartu notifikasi di seluruh BahasaCerdas:
// latar SOLID (putih untuk dibaca, biru muda untuk belum dibaca), ikon jenis
// berwarna, teks gelap kontras tinggi — tidak ada transparansi/glass.
const TYPE_META: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  success: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100" },
  purchase: { icon: Sparkles, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100" },
  premium: { icon: Award, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100" },
  warning: { icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100" },
  withdrawal: { icon: Info, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100" },
  error: { icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-100" },
  info: { icon: Info, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100" },
};

export function waktuLalu(tanggal: string) {
  const diff = Date.now() - new Date(tanggal).getTime();
  const menit = Math.floor(diff / 60000);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit}m`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam}j`;
  return `${Math.floor(jam / 24)}h`;
}

export function NotificationCard({
  n,
  onDelete,
  dense = false,
}: {
  n: NotifikasiItem;
  onDelete?: (id: string) => void;
  dense?: boolean;
}) {
  const meta = TYPE_META[String(n.type || "info").toLowerCase()] || TYPE_META.info;
  const Icon = meta.icon;

  const card = (
    <div
      className={`group flex items-start gap-3 rounded-2xl border shadow-sm transition-colors ${
        dense ? "p-2.5" : "p-3.5"
      } ${n.isRead ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90" : "border-blue-300 bg-blue-50"}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.bg} ${meta.color}`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate font-semibold text-slate-900 dark:text-slate-100 ${dense ? "text-[13px]" : "text-sm"}`}>
            {n.title}
          </p>
          {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{n.body}</p>
        <p className="mt-1 text-[10px] font-medium text-slate-400">{waktuLalu(n.createdAt)}</p>
      </div>
      {onDelete && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(n.id);
          }}
          className="shrink-0 rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 dark:bg-red-950/40 hover:text-red-500 dark:text-red-400"
          aria-label="Hapus notifikasi"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );

  return n.data?.link ? (
    <Link href={n.data.link} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

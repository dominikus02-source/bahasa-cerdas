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

const TYPE_META: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  success: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-950/55" },
  purchase: { icon: Sparkles, color: "text-emerald-600 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-950/55" },
  premium: { icon: Award, color: "text-amber-600 dark:text-amber-300", bg: "bg-amber-100 dark:bg-amber-950/55" },
  warning: { icon: AlertTriangle, color: "text-amber-600 dark:text-amber-300", bg: "bg-amber-100 dark:bg-amber-950/55" },
  withdrawal: { icon: Info, color: "text-blue-600 dark:text-blue-300", bg: "bg-blue-100 dark:bg-blue-950/55" },
  error: { icon: XCircle, color: "text-red-600 dark:text-red-300", bg: "bg-red-100 dark:bg-red-950/55" },
  info: { icon: Info, color: "text-blue-600 dark:text-blue-300", bg: "bg-blue-100 dark:bg-blue-950/55" },
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
      className={`group flex min-w-0 items-start gap-3 rounded-2xl border shadow-sm transition-colors ${
        dense ? "p-2.5" : "p-3.5"
      } ${
        n.isRead
          ? "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/90"
          : "border-blue-300 bg-blue-50 dark:border-blue-800/70 dark:bg-blue-950/35"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.bg} ${meta.color}`}
      >
        <Icon size={18} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start gap-2">
          <p
            className={`min-w-0 flex-1 break-words font-semibold text-slate-900 dark:text-slate-100 ${
              dense ? "line-clamp-1 text-[13px]" : "text-sm"
            }`}
            style={{ overflowWrap: "anywhere" }}
          >
            {n.title}
          </p>
          {!n.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500 dark:bg-blue-400" />}
        </div>

        <p
          className={`mt-0.5 break-words text-xs leading-relaxed text-slate-600 dark:text-slate-300 ${
            dense ? "line-clamp-3" : ""
          }`}
          style={{ overflowWrap: "anywhere" }}
        >
          {n.body}
        </p>

        <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
          {waktuLalu(n.createdAt)}
        </p>
      </div>

      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(n.id);
          }}
          className="shrink-0 rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-slate-500 dark:hover:bg-red-950/40 dark:hover:text-red-300"
          aria-label="Hapus notifikasi"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );

  return n.data?.link ? (
    <Link href={n.data.link} className="block min-w-0">
      {card}
    </Link>
  ) : (
    card
  );
}

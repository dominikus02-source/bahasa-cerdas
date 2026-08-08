"use client";

import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import {
  Users,
  PenLine,
  FileUp,
  GraduationCap,
  Send,
  Store,
  Database,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  users: Users,
  pen: PenLine,
  fileUp: FileUp,
  kelas: GraduationCap,
  send: Send,
  store: Store,
  database: Database,
};

interface MissionItemProps {
  label: string;
  desc: string;
  xp: number;
  done: boolean;
  href: string;
  icon: string;
  iconBg: string;
}

export function MissionItem({ label, desc, xp, done, href, icon, iconBg }: MissionItemProps) {
  const Icon = ICONS[icon] ?? Sparkles;

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-2xl p-3 transition-all border ${
        done
          ? "bg-emerald-50 border-emerald-200"
          : "bg-white border-gray-100 hover:bg-emerald-50/60 hover:border-emerald-100"
      }`}
    >
      <div
        className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center shadow-sm ${iconBg}`}
      >
        <Icon size={18} className="text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold leading-snug line-clamp-2 ${
            done ? "text-emerald-500 line-through decoration-emerald-300/60" : "text-gray-800"
          }`}
        >
          {label}
        </p>
        <p className="text-[11px] leading-snug text-gray-400 line-clamp-2">{desc}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full whitespace-nowrap">
          +{xp} XP
        </span>
        {done ? (
          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 flex items-center justify-center shadow-md">
            <Check size={14} className="text-white" strokeWidth={3} />
          </span>
        ) : (
          <span className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center">
            <ChevronRight size={13} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
          </span>
        )}
      </div>
    </Link>
  );
}

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
      className={`group flex items-center gap-3 rounded-2xl p-3 transition-all ${
        done
          ? "bg-emerald-400/15 ring-1 ring-emerald-300/30"
          : "bg-white/10 hover:bg-white/15 ring-1 ring-white/5"
      }`}
    >
      <div
        className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center shadow-md ${iconBg}`}
      >
        <Icon size={18} className="text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold truncate ${
            done ? "text-emerald-100 line-through decoration-emerald-300/60" : "text-white"
          }`}
        >
          {label}
        </p>
        <p className="text-[11px] text-emerald-100/70 truncate">{desc}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-bold text-amber-300 bg-amber-400/15 px-2 py-1 rounded-full">
          +{xp} XP
        </span>
        {done ? (
          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 flex items-center justify-center shadow-md">
            <Check size={14} className="text-emerald-900" strokeWidth={3} />
          </span>
        ) : (
          <span className="w-6 h-6 rounded-full border-2 border-white/30 flex items-center justify-center">
            <ChevronRight size={13} className="text-white/50 group-hover:text-white/80 transition-colors" />
          </span>
        )}
      </div>
    </Link>
  );
}

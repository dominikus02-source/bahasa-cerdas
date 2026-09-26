import { Flame } from "lucide-react";

interface LevelCardProps {
  level: number;
  xpLevel: number;
  xpPerLevel: number;
  streak: number;
}

export function LevelCard({ level, xpLevel, xpPerLevel, streak }: LevelCardProps) {
  const persen = xpPerLevel > 0 ? Math.round((xpLevel / xpPerLevel) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="rounded-2xl bg-white border border-emerald-100 p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Level
          </span>
          <span className="text-xl font-black text-emerald-600">{level}</span>
        </div>
        <p className="text-xs text-gray-500 mb-1.5">Guru Cerdas</p>
        <div className="h-2 rounded-full bg-emerald-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-500 transition-all duration-700"
            style={{ width: `${persen}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">
          {xpLevel}/{xpPerLevel} XP
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-emerald-100 p-3.5 flex flex-col justify-between">
        <div className="flex items-center gap-2">
          <Flame size={18} className="text-orange-400" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Rentetan Harian
          </span>
        </div>
        <div className="mt-1 flex items-end gap-1.5">
          <span className="text-2xl font-black text-orange-500">{streak}</span>
          <span className="text-xs text-gray-400 mb-1">hari berturut-turut</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          {streak >= 7 ? "Misi bonus tercapai!" : "Aktif 7 hari untuk misi bonus"}
        </p>
      </div>
    </div>
  );
}

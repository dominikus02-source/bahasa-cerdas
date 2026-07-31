interface MissionProgressProps {
  selesai: number;
  total: number;
  xp: number;
  xpMax: number;
}

export function MissionProgress({ selesai, total, xp, xpMax }: MissionProgressProps) {
  const persen = total > 0 ? Math.round((selesai / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-emerald-100/90">
          Progress Minggu Ini · {selesai}/{total} Misi Selesai
        </p>
        <p className="text-xs font-bold text-amber-300">
          {xp}/{xpMax} XP
        </p>
      </div>
      <div className="h-2.5 rounded-full bg-white/15 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-400 transition-all duration-700"
          style={{ width: `${persen}%` }}
        />
      </div>
    </div>
  );
}

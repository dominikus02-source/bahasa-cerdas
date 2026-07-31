import { PartyPopper } from "lucide-react";

interface RewardCardProps {
  xp: number;
}

export function RewardCard({ xp }: RewardCardProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 p-4 text-amber-950 shadow-lg shadow-amber-500/30 ring-1 ring-amber-200">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white/40 flex items-center justify-center shrink-0">
          <PartyPopper size={22} />
        </div>
        <div>
          <p className="font-bold text-sm">Semua Misi Selesai!</p>
          <p className="text-xs font-medium text-amber-900/80">
            {xp} XP minggu ini. Jaga momentum — lanjutkan besok untuk streak.
          </p>
        </div>
      </div>
    </div>
  );
}

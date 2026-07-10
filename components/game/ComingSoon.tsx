import Link from "next/link";
import { Lock, Sparkles, ArrowLeft } from "lucide-react";

/**
 * Shown in place of multiplayer game screens while MULTIPLAYER_ENABLED is off.
 * Keeps the door open for players (teaser) instead of a broken/blank page.
 */
export default function ComingSoon({
  title = "Segera Hadir",
  desc = "Mode ini sedang kami siapkan agar bisa menampung banyak pemain sekaligus. Sementara itu, nikmati permainan solo yang seru di Arena Gim!",
  backHref = "/arena/game",
}: {
  title?: string;
  desc?: string;
  backHref?: string;
}) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl">
          <Lock className="w-9 h-9 text-white" />
        </div>
        <span className="absolute -top-2 -right-2 inline-flex items-center gap-1 bg-amber-400 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
          <Sparkles className="w-3 h-3" /> Segera
        </span>
      </div>

      <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2">{title}</h1>
      <p className="max-w-md text-sm text-slate-500 dark:text-slate-300 leading-relaxed mb-8">{desc}</p>

      <Link
        href={backHref}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 active:scale-95 transition-all"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Arena Gim
      </Link>
    </div>
  );
}

import { Sparkles } from "lucide-react";
import type { GameDefinition } from "@/lib/arena/game-registry";

export default function ArenaComingSoon({
  games,
}: {
  games: GameDefinition[];
}) {
  if (games.length === 0) return null;

  return (
    <section aria-labelledby="arena-coming-soon-heading">
      <div className="arena-coming-banner overflow-hidden rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
          {/* Left — teaser headline */}
          <div className="shrink-0 sm:max-w-[200px]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-fuchsia-300">
              Discover
            </p>
            <h2
              id="arena-coming-soon-heading"
              className="mt-1 text-xl font-black text-white"
            >
              Segera hadir
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-violet-200">
              Masih ada sesuatu yang akan datang.
            </p>
          </div>

          {/* Right — compact teaser chips */}
          <div className="flex flex-1 flex-wrap gap-2.5">
            {games.map((game) => (
              <div
                key={game.id}
                className="arena-coming-teaser flex items-center gap-3 text-white"
                style={{ "--accent": game.accentColor } as React.CSSProperties}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl opacity-80"
                  style={{
                    background: `linear-gradient(135deg, ${game.accentColor}, ${game.accentColor}cc)`,
                  }}
                >
                  <game.icon size={17} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold text-white">
                    {game.title}
                  </p>
                  <p className="text-[10px] text-violet-300">
                    {game.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom sparkle line */}
        <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-amber-300/80">
          <Sparkles size={12} /> Dalam pengembangan — nantikan pembaruan berikutnya
        </div>
      </div>
    </section>
  );
}

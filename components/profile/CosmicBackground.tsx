"use client";

/**
 * CosmicBackground — latar "universe BahasaCerdas" untuk hero profil.
 *
 * Galaksi redup (navy→ungu), nebula lembut, bintang kecil, planet jauh, dan
 * satu ring orbit yang sangat pelan. Semua animasi dimatikan saat
 * prefers-reduced-motion. Murni dekoratif: pointer-events-none, aria-hidden.
 */
const STARS = Array.from({ length: 48 }, (_, i) => {
  // PRNG deterministik sederhana supaya posisi stabil antar-render.
  const seed = (i * 9301 + 49297) % 233280;
  const rnd = seed / 233280;
  const seed2 = (i * 49297 + 233280) % 233280;
  const rnd2 = seed2 / 233280;
  const seed3 = (i * 233280 + 9301) % 2332801;
  const rnd3 = seed3 / 233280;
  return {
    left: `${Math.round(rnd * 100)}%`,
    top: `${Math.round(rnd2 * 100)}%`,
    size: 1 + Math.round(rnd3 * 2.2),
    delay: `${Math.round((i % 11) * 0.7)}s`,
    duration: `${3 + (i % 5)}s`,
    opacity: 0.35 + (i % 4) * 0.17,
  };
});

export default function CosmicBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes bc-cosmic-twinkle {
          0%, 100% { opacity: var(--tw-start, .5); transform: scale(1); }
          50% { opacity: .15; transform: scale(.6); }
        }
        @keyframes bc-cosmic-orbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes bc-cosmic-drift {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(3px, -4px); }
          66% { transform: translate(-3px, 3px); }
        }
        @keyframes bc-cosmic-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.035); opacity: .92; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bc-cosmic-star, .bc-cosmic-orbit, .bc-cosmic-nebula, .bc-cosmic-crest { animation: none !important; }
        }
      `}</style>

      {/* Nebula 1 (ungu lembut) */}
      <div
        className="bc-cosmic-nebula absolute -top-24 -right-24 w-[480px] h-[480px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(124,58,237,0.30), transparent 65%)",
          animation: "bc-cosmic-drift 14s ease-in-out infinite",
        }}
      />
      {/* Nebula 2 (merah muda jauh) */}
      <div
        className="bc-cosmic-nebula absolute -bottom-32 -left-20 w-[420px] h-[420px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(190,24,93,0.16), transparent 65%)",
          animation: "bc-cosmic-drift 18s ease-in-out infinite",
        }}
      />

      {/* Planet jauh (redup, kecil, dengan cincin tipis) */}
      <div
        className="absolute top-[18%] right-[8%] w-10 h-10 rounded-full"
        style={{ background: "radial-gradient(circle at 35% 30%, rgba(167,139,250,0.5), rgba(76,29,149,0.25) 70%)" }}
      />

      {/* Ring orbit sangat pelan (dekoratif di pojok kiri bawah) */}
      <div
        className="bc-cosmic-orbit absolute bottom-[-60px] left-1/2 -translate-x-1/2 w-[420px] h-[170px] rounded-[50%]"
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          animation: "bc-cosmic-orbit 60s linear infinite",
          transformOrigin: "center",
        }}
      />

      {/* Bintang-bintang kecil */}
      {STARS.map((s, i) => (
        <span
          key={i}
          className="bc-cosmic-star absolute rounded-full bg-white"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animation: `bc-cosmic-twinkle ${s.duration} ease-in-out ${s.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}
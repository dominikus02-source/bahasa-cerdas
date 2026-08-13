"use client";

/**
 * CosmicBackground — latar "universe BahasaCerdas" untuk hero profil.
 *
 * Galaksi redup (navy→ungu), nebula ungu/merah muda/biru, glow magenta,
 * debu bintang, planet dengan cincin, orbit pelan, dan satu meteor sesekali.
 * Semua animasi dimatikan saat prefers-reduced-motion. Murni dekoratif:
 * pointer-events-none, aria-hidden.
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

const DUST = Array.from({ length: 26 }, (_, i) => {
  const seed = (i * 7331 + 61921) % 233280;
  const rnd = seed / 233280;
  const seed2 = (i * 61921 + 7331) % 233280;
  const rnd2 = seed2 / 233280;
  return {
    left: `${Math.round(rnd * 100)}%`,
    top: `${Math.round(rnd2 * 100)}%`,
    size: 1 + (i % 2),
    delay: `${(i % 17) * 0.9}s`,
    duration: `${6 + (i % 7)}s`,
    opacity: 0.12 + (i % 4) * 0.08,
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
        @keyframes bc-cosmic-meteor {
          0% { transform: translate(0, 0) rotate(35deg); opacity: 0; }
          7% { opacity: .9; }
          22% { transform: translate(-280px, 196px) rotate(35deg); opacity: 0; }
          100% { transform: translate(-280px, 196px) rotate(35deg); opacity: 0; }
        }
        @keyframes bc-cosmic-shimmer {
          0%, 100% { opacity: .5; }
          50% { opacity: .9; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bc-cosmic-star, .bc-cosmic-dust, .bc-cosmic-orbit, .bc-cosmic-nebula,
          .bc-cosmic-crest, .bc-cosmic-meteor, .bc-cosmic-shimmer { animation: none !important; }
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
      {/* Nebula 3 (biru nebula — kontras dengan ungu) */}
      <div
        className="bc-cosmic-nebula absolute top-[8%] -left-24 w-[380px] h-[380px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(56,189,248,0.20), transparent 62%)",
          animation: "bc-cosmic-drift 16s ease-in-out infinite",
        }}
      />

      {/* Glow magenta di sisi kanan (aura tambahan di belakang crest rank) */}
      <div
        className="bc-cosmic-nebula absolute top-[40%] right-[2%] w-[300px] h-[300px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(236,72,153,0.18), transparent 60%)",
          animation: "bc-cosmic-drift 12s ease-in-out infinite",
        }}
      />

      {/* Planet jauh (redup, kecil, dengan cincin tipis) */}
      <div
        className="absolute top-[18%] right-[8%]"
        style={{ animation: "bc-cosmic-drift 20s ease-in-out infinite" }}
      >
        <div
          className="w-10 h-10 rounded-full"
          style={{ background: "radial-gradient(circle at 35% 30%, rgba(167,139,250,0.5), rgba(76,29,149,0.25) 70%)" }}
        />
        <div
          className="absolute left-1/2 top-1/2 w-[74px] h-[20px] rounded-[50%]"
          style={{
            border: "1px solid rgba(196,181,253,0.28)",
            transform: "translate(-50%, -50%) rotate(-18deg)",
          }}
        />
      </div>

      {/* Planet kedua (kecil, biru pucat di pojok kiri atas) */}
      <div
        className="absolute top-[6%] left-[22%] w-[14px] h-[14px] rounded-full"
        style={{
          background: "radial-gradient(circle at 32% 28%, rgba(186,230,253,0.6), rgba(56,189,248,0.2) 72%)",
          animation: "bc-cosmic-shimmer 7s ease-in-out infinite",
        }}
      />

      {/* Meteor sesekali (kanan atas → bawah kiri) */}
      <div
        className="bc-cosmic-meteor absolute top-[12%] right-[24%] h-[2px] w-[110px] rounded-full"
        style={{
          background: "linear-gradient(90deg, rgba(255,255,255,0.95), rgba(147,197,253,0.35), transparent)",
          boxShadow: "0 0 8px rgba(255,255,255,0.45)",
          animation: "bc-cosmic-meteor 9s ease-in-out 3s infinite",
        }}
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
          key={`star-${i}`}
          className="bc-cosmic-star absolute rounded-full bg-white dark:bg-slate-800/90"
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

      {/* Debu bintang — titik sangat kecil dengan kedip sangat pelan */}
      {DUST.map((d, i) => (
        <span
          key={`dust-${i}`}
          className="bc-cosmic-dust absolute rounded-full bg-white dark:bg-slate-800/90"
          style={{
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            opacity: d.opacity,
            animation: `bc-cosmic-twinkle ${d.duration} ease-in-out ${d.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}
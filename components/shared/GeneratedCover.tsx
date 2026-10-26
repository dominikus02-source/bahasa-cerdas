import { coverJenis, coverSeed, coverTitle, type CoverJenisInput, type CoverVariant } from "@/lib/media/generated-cover";

export interface GeneratedCoverProps extends CoverJenisInput {
  title: string | null | undefined;
  author?: string | null;
  className?: string;
}

/**
 * Sampul bermerek tanpa gambar. Warna dari token bc (gradien per jenis karya,
 * ikut mode terang/gelap lewat tokens.css), motif SVG deterministik dari judul.
 * Induk HARUS punya ukuran pasti (aspect-* / h-*): .bc-cover memakai
 * `container-type: size` agar teks menyesuaikan ukuran kartu.
 */
export default function GeneratedCover({ title, author, type, tags, fallback, className = "" }: GeneratedCoverProps) {
  const jenis = coverJenis({ type, tags, fallback });
  const judul = coverTitle(title);
  const seed = coverSeed(judul);
  const penulis = (author || "").trim();

  return (
    <div
      className={`bc-cover bc-cover--${jenis.variant} ${className}`}
      role="img"
      aria-label={`Sampul ${jenis.label}: ${judul}${penulis ? `, oleh ${penulis}` : ""}`}
      data-cover-variant={jenis.variant}
    >
      <CoverArt variant={jenis.variant} seed={seed} />
      <span className="bc-cover__brand" aria-hidden="true">BahasaCerdas</span>
      <div className="bc-cover__body" aria-hidden="true">
        <span className="bc-cover__chip">{jenis.label}</span>
        <p className="bc-cover__title">{judul}</p>
        {penulis && <p className="bc-cover__author">oleh {penulis}</p>}
      </div>
    </div>
  );
}

function CoverArt({ variant, seed }: { variant: CoverVariant; seed: number }) {
  const flip = seed & 1 ? -1 : 1;
  const shift = (seed >>> 1) % 60;
  const rot = ((seed >>> 7) % 24) - 12;
  const transform = `translate(${flip === -1 ? 400 : 0} 0) scale(${flip} 1) rotate(${rot} 300 60) translate(${shift - 30} 0)`;

  return (
    <svg className="bc-cover__art" viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <g transform={transform} fill="none" stroke="currentColor" strokeLinecap="round">
        {variant === "puisi" && (
          <>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <path key={i} strokeWidth={1.6} d={`M-20 ${40 + i * 26} C 80 ${10 + i * 26}, 160 ${80 + i * 26}, 260 ${40 + i * 26} S 420 ${10 + i * 26}, 460 ${44 + i * 26}`} opacity={1 - i * 0.12} />
            ))}
            <path strokeWidth={2.2} d="M318 24 C 360 40, 372 96, 330 150 C 322 120, 312 80, 318 24 Z" />
            <path strokeWidth={1.4} d="M318 24 L 330 150" />
          </>
        )}
        {variant === "sastra" && (
          <>
            {Array.from({ length: 6 }).map((_, r) =>
              Array.from({ length: 9 }).map((__, c) => (
                <path
                  key={`${r}-${c}`}
                  strokeWidth={1.3}
                  d={`M${c * 48 + (r % 2) * 24} ${r * 40 + 8} l14 14 l-14 14 l-14 -14 Z`}
                  opacity={0.35 + ((r + c) % 3) * 0.25}
                />
              )),
            )}
          </>
        )}
        {variant === "prosa" && (
          <>
            <path strokeWidth={2.2} d="M220 170 C 260 150, 300 150, 340 170 L 340 60 C 300 40, 260 40, 220 60 Z" />
            <path strokeWidth={2.2} d="M340 170 C 380 150, 420 150, 460 170 L 460 60 C 420 40, 380 40, 340 60" />
            {[0, 1, 2, 3, 4].map((i) => (
              <path key={i} strokeWidth={1.4} d={`M236 ${78 + i * 18} C 262 ${70 + i * 18}, 296 ${70 + i * 18}, 324 ${78 + i * 18}`} />
            ))}
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <path key={`l${i}`} strokeWidth={1.2} d={`M-10 ${24 + i * 28} H ${150 - (i % 3) * 30}`} opacity={0.6} />
            ))}
          </>
        )}
        {variant === "opini" && (
          <>
            <circle cx={310} cy={80} r={74} strokeWidth={2} />
            <circle cx={310} cy={80} r={104} strokeWidth={1.2} opacity={0.6} />
            <path strokeWidth={9} d="M278 66 q0 -22 20 -26 M318 66 q0 -22 20 -26" />
            <path strokeWidth={9} d="M282 70 v24 M322 70 v24" />
          </>
        )}
        {variant === "artikel" && (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <circle key={i} cx={330} cy={40} r={30 + i * 34} strokeWidth={1.5} opacity={1 - i * 0.15} />
            ))}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <path key={`g${i}`} strokeWidth={1} d={`M${i * 56} -10 V 240`} opacity={0.35} />
            ))}
          </>
        )}
        {variant === "karya" && (
          <>
            {[
              [300, 50, 26],
              [356, 120, 14],
              [250, 140, 10],
              [80, 40, 12],
              [140, 180, 8],
            ].map(([x, y, s], i) => (
              <path key={i} strokeWidth={1.8} d={`M${x} ${y - s} Q ${x} ${y}, ${x + s} ${y} Q ${x} ${y}, ${x} ${y + s} Q ${x} ${y}, ${x - s} ${y} Q ${x} ${y}, ${x} ${y - s} Z`} />
            ))}
            <path strokeWidth={1.2} d="M-10 200 C 100 150, 200 230, 420 160" opacity={0.6} />
          </>
        )}
      </g>
    </svg>
  );
}

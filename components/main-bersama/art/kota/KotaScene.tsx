"use client";

import { useId } from "react";

export type KotaMilestoneKey =
  | "garden"
  | "library"
  | "homes"
  | "town-center";

export const KOTA_MILESTONES: Array<{
  key: KotaMilestoneKey;
  label: string;
  at: number;
}> = [
  { key: "garden", label: "Taman", at: 25 },
  { key: "library", label: "Perpustakaan", at: 50 },
  { key: "homes", label: "Rumah", at: 75 },
  { key: "town-center", label: "Pusat Kota", at: 100 },
];

interface KotaSceneProps {
  unlocked: string[];
  mini?: boolean;
  /** Transient subset yang baru menyala pada putaran ini. */
  reveal?: string[];
}

const STARS: Array<[number, number, number, number]> = [
  [36, 45, 1.5, 0], [82, 82, 1.8, 1.3], [132, 34, 1.2, 2.2],
  [190, 112, 1.5, 0.6], [246, 61, 1.1, 3.1], [303, 29, 1.8, 1.9],
  [357, 95, 1.2, 2.8], [416, 48, 1.6, 0.9], [475, 126, 1.1, 3.6],
  [528, 66, 1.7, 1.5], [585, 34, 1.2, 2.4], [639, 103, 1.4, 0.4],
  [692, 52, 1.1, 3.4], [748, 118, 1.6, 1.1], [808, 29, 1.2, 2.9],
  [866, 88, 1.5, 0.7], [918, 41, 1.1, 2.2], [974, 113, 1.6, 1.7],
  [1030, 58, 1.2, 2.6], [1094, 32, 1.4, 0.2], [1156, 92, 1.2, 3.3],
  [95, 155, 1.1, 3.8], [220, 153, 1.5, 1.7], [343, 159, 1.2, 2.6],
  [545, 158, 1.3, 0.2], [720, 166, 1.1, 3.3], [892, 156, 1.6, 1.2],
];

const FIREFLIES: Array<[number, number, number, number]> = [
  [105, 455, 6.2, 0.4], [156, 482, 7.1, 2.3], [216, 446, 8.4, 1.1],
  [295, 474, 7.4, 3.2], [460, 470, 6.8, 2.8], [548, 448, 7.8, 0.9],
  [648, 486, 8.8, 3.2], [746, 454, 6.4, 1.6], [850, 480, 8.1, 2.1],
  [1002, 452, 7.2, 0.8], [1094, 472, 8.6, 3.5],
];

function RevealRings({
  x,
  y,
  active,
}: {
  x: number;
  y: number;
  active: boolean;
}) {
  if (!active) return null;
  return (
    <g aria-hidden>
      <circle
        className="mb-kota-reveal-ring"
        cx={x}
        cy={y}
        r={38}
        fill="none"
        stroke="var(--mb-kota-glow)"
        strokeWidth="4"
      />
      <circle
        className="mb-kota-reveal-ring mb-kota-reveal-ring-late"
        cx={x}
        cy={y}
        r={22}
        fill="none"
        stroke="#fff2b6"
        strokeWidth="2"
      />
    </g>
  );
}

function LitWindow({
  x,
  y,
  w,
  h,
  on,
  delay = 0,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  on: boolean;
  delay?: number;
}) {
  return (
    <rect
      className="mb-kota-window"
      data-lit={on}
      x={x}
      y={y}
      width={w}
      height={h}
      rx={2.5}
      fill={on ? "var(--mb-kota-glow)" : "#163653"}
      style={{ transitionDelay: on ? `${delay}ms` : "0ms" }}
    />
  );
}

function Lamp({
  x,
  y,
  on,
  glowId,
  scale = 1,
}: {
  x: number;
  y: number;
  on: boolean;
  glowId: string;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <line x1="0" y1="34" x2="0" y2="4" stroke="#244f70" strokeWidth="4" strokeLinecap="round" />
      {on ? <circle className="mb-kota-lamp-glow" cx="0" cy="0" r="29" fill={`url(#${glowId})`} /> : null}
      <circle className="mb-kota-lamp" cx="0" cy="0" r={on ? 7 : 5.5} fill={on ? "var(--mb-kota-glow)" : "#31516a"} />
      <path d="M-8 2 Q0 -7 8 2" fill="none" stroke="#406987" strokeWidth="2.4" />
    </g>
  );
}

function Tree({ x, y, on, scale = 1 }: { x: number; y: number; on: boolean; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-4" y="22" width="8" height="24" rx="3" fill="#173b44" />
      <circle cx="-10" cy="13" r="17" fill={on ? "#1f765d" : "#153a4c"} />
      <circle cx="8" cy="7" r="19" fill={on ? "#25856a" : "#173f52"} />
      <circle cx="2" cy="-8" r="18" fill={on ? "#2b9877" : "#19455a"} />
    </g>
  );
}

function House({
  x,
  y,
  on,
  scale = 1,
  variant = 0,
}: {
  x: number;
  y: number;
  on: boolean;
  scale?: number;
  variant?: number;
}) {
  const width = variant === 1 ? 94 : 82;
  const height = variant === 2 ? 88 : 70;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x={-width / 2} y={-height} width={width} height={height} rx="4" fill="#102b43" stroke="#245172" strokeWidth="2" />
      <path d={`M${-width / 2 - 9} ${-height} L0 ${-height - 42} L${width / 2 + 9} ${-height} Z`} fill="#173d5d" stroke="#285875" strokeWidth="2" />
      {variant === 1 ? <rect x="22" y={-height - 40} width="11" height="28" rx="2" fill="#16364f" /> : null}
      <LitWindow x={-width / 2 + 13} y={-height + 18} w={16} h={13} on={on} delay={70} />
      <LitWindow x={width / 2 - 29} y={-height + 18} w={16} h={13} on={on} delay={150} />
      {height > 76 ? <LitWindow x={-width / 2 + 13} y={-height + 43} w={16} h={13} on={on} delay={220} /> : null}
      <rect x="-11" y="-31" width="22" height="31" rx="3" fill="#0a2033" />
      {on && variant === 1 ? (
        <g className="mb-kota-smoke" opacity=".34">
          <circle cx="27" cy={-height - 53} r="7" fill="#a7bac9" />
          <circle cx="36" cy={-height - 65} r="10" fill="#a7bac9" />
        </g>
      ) : null}
    </g>
  );
}

export function KotaScene({
  unlocked,
  mini = false,
  reveal = [],
}: KotaSceneProps) {
  const rawId = useId();
  const uid = rawId.replace(/:/g, "");
  const id = (name: string) => `${uid}-${name}`;

  const litSet = new Set(unlocked);
  const revealSet = new Set(reveal);
  const lit = (key: KotaMilestoneKey) => litSet.has(key);
  const revealing = (key: KotaMilestoneKey) => revealSet.has(key);
  const litCount = KOTA_MILESTONES.filter((m) => lit(m.key)).length;
  const fireflyCount = mini ? 0 : Math.min(FIREFLIES.length, 3 + litCount * 2);

  return (
    <svg
      viewBox="0 0 1200 600"
      className="mb-kota-scene"
      data-mini={mini ? "true" : "false"}
      role="img"
      aria-label={`Kota Cahaya, ${litCount} dari 4 bagian kota telah menyala`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#061326" />
          <stop offset=".5" stopColor="#0a1f38" />
          <stop offset="1" stopColor="#12334c" />
        </linearGradient>
        <linearGradient id={id("aurora")} x1="0" y1="0" x2="1" y2=".15">
          <stop offset="0" stopColor="#38d5c7" stopOpacity="0" />
          <stop offset=".32" stopColor="#2ab6aa" stopOpacity=".23" />
          <stop offset=".62" stopColor="#7467d8" stopOpacity=".18" />
          <stop offset="1" stopColor="#38d5c7" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id("ground")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#153754" />
          <stop offset="1" stopColor="#081a2c" />
        </linearGradient>
        <linearGradient id={id("road")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0b2135" />
          <stop offset=".52" stopColor="#173951" />
          <stop offset="1" stopColor="#0a2033" />
        </linearGradient>
        <radialGradient id={id("moon")}>
          <stop offset="0" stopColor="#fff3cc" stopOpacity=".4" />
          <stop offset="1" stopColor="#fff3cc" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("warm")}>
          <stop offset="0" stopColor="#ffd25f" stopOpacity=".5" />
          <stop offset=".55" stopColor="#ffc94d" stopOpacity=".16" />
          <stop offset="1" stopColor="#ffc94d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("local-glow")}>
          <stop offset="0" stopColor="#ffd96d" stopOpacity=".52" />
          <stop offset="1" stopColor="#ffd96d" stopOpacity="0" />
        </radialGradient>
        <filter id={id("soft")} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* Langit: tetap tenang, tetapi punya depth panggung. */}
      <rect width="1200" height="600" rx="24" fill={`url(#${id("sky")})`} />
      {!mini ? (
        <>
          <path
            className="mb-kota-aurora"
            d="M-70 180 C150 35 390 165 610 78 C805 2 1010 114 1270 36 L1270 -30 L-70 -30 Z"
            fill={`url(#${id("aurora")})`}
          />
          <path
            className="mb-kota-cloud"
            d="M60 176 C145 142 217 153 290 184 C348 209 413 210 480 187"
            fill="none"
            stroke="#95a9bd"
            strokeOpacity=".08"
            strokeWidth="18"
            strokeLinecap="round"
          />
        </>
      ) : null}

      <g aria-hidden>
        {STARS.slice(0, mini ? 15 : STARS.length).map(([x, y, r, delay], i) => (
          <circle
            key={i}
            className="mb-kota-star"
            cx={x}
            cy={y}
            r={r}
            fill="#dce9f5"
            style={{ animationDelay: `-${delay}s` }}
          />
        ))}
      </g>

      <circle cx="1030" cy="98" r="94" fill={`url(#${id("moon")})`} />
      <circle cx="1030" cy="98" r="34" fill="#efe7cb" opacity=".98" />
      <circle cx="1019" cy="88" r="6" fill="#d9cfaf" opacity=".74" />
      <circle cx="1042" cy="109" r="4.5" fill="#d9cfaf" opacity=".67" />
      <circle cx="1038" cy="83" r="3" fill="#d9cfaf" opacity=".58" />

      {/* Pegunungan dua lapis dari purwarupa, diperdalam. */}
      <path d="M-30 382 L175 238 L352 346 L535 214 L720 334 L910 228 L1088 330 L1230 258 L1230 600 L-30 600 Z" fill="#0d2036" />
      <path d="M-30 438 L190 330 L405 410 L650 302 L884 402 L1098 330 L1230 382 L1230 600 L-30 600 Z" fill="#12304c" opacity=".92" />
      <path d="M0 508 C225 468 430 512 680 482 C900 454 1060 496 1200 466 L1200 600 L0 600 Z" fill={`url(#${id("ground")})`} />

      {/* Jalur kota / refleksi foreground. */}
      <path d="M0 528 C210 496 430 530 620 510 C815 490 1000 516 1200 486 L1200 600 L0 600 Z" fill={`url(#${id("road")})`} opacity=".86" />
      <path d="M0 528 C210 496 430 530 620 510 C815 490 1000 516 1200 486" fill="none" stroke="#2e5976" strokeWidth="2.2" opacity=".72" />
      {[lit("garden"), lit("library"), lit("homes"), lit("town-center")].map((on, i) =>
        on ? (
          <ellipse
            key={i}
            className="mb-kota-reflection"
            cx={[170, 440, 720, 1025][i]}
            cy={[555, 548, 556, 540][i]}
            rx={[58, 78, 72, 92][i]}
            ry="7"
            fill="#ffd46b"
            opacity=".18"
            style={{ animationDelay: `-${i * 0.8}s` }}
          />
        ) : null,
      )}

      {/* Taman — milestone 25. */}
      <g className="mb-kota-zone" data-lit={lit("garden")} data-reveal={revealing("garden")}>
        {lit("garden") ? <ellipse cx="180" cy="448" rx="178" ry="128" fill={`url(#${id("warm")})`} /> : null}
        <ellipse cx="178" cy="504" rx="118" ry="24" fill="#0b2539" />
        <Tree x={84} y={427} on={lit("garden")} scale={1.08} />
        <Tree x={132} y={446} on={lit("garden")} scale=".88" />
        <Tree x={264} y={438} on={lit("garden")} scale=".96" />
        <Tree x={320} y={455} on={lit("garden")} scale=".78" />
        <Lamp x={175} y={449} on={lit("garden")} glowId={id("local-glow")} scale="1.05" />
        <Lamp x={278} y={462} on={lit("garden")} glowId={id("local-glow")} scale=".9" />
        <rect x="210" y="493" width="62" height="8" rx="4" fill="#28516b" />
        <rect x="216" y="501" width="6" height="12" rx="2" fill="#24465f" />
        <rect x="260" y="501" width="6" height="12" rx="2" fill="#24465f" />
        {!mini ? <text x="182" y="534" textAnchor="middle" fill={lit("garden") ? "#ffd978" : "#7893a8"} fontSize="13" fontWeight="800" letterSpacing="2.2">TAMAN</text> : null}
        <RevealRings x={186} y={454} active={revealing("garden")} />
      </g>

      {/* Perpustakaan — milestone 50. */}
      <g className="mb-kota-zone" data-lit={lit("library")} data-reveal={revealing("library")}>
        {lit("library") ? <ellipse cx="470" cy="400" rx="190" ry="166" fill={`url(#${id("warm")})`} /> : null}
        <rect x="354" y="362" width="230" height="150" rx="6" fill="#102b45" stroke="#275575" strokeWidth="2" />
        <path d="M336 362 L469 292 L602 362 Z" fill="#173c5c" stroke="#2a5878" strokeWidth="2" />
        <circle cx="469" cy="279" r="23" fill="#173b58" stroke="#2b5977" strokeWidth="2" />
        <circle cx="469" cy="279" r="9" fill={lit("library") ? "#ffd76a" : "#1e4563"} className="mb-kota-window" data-lit={lit("library")} />
        <line x1="469" y1="279" x2="469" y2="272" stroke="#0d2940" strokeWidth="2" />
        <line x1="469" y1="279" x2="475" y2="283" stroke="#0d2940" strokeWidth="2" />
        {[382, 430, 478, 526].map((x, col) => (
          <g key={x}>
            <rect x={x} y="383" width="17" height="129" rx="4" fill="#173c58" />
            <LitWindow x={x + 21} y={391} w={23} h={28} on={lit("library")} delay={60 + col * 70} />
            <LitWindow x={x + 21} y={438} w={23} h={28} on={lit("library")} delay={110 + col * 70} />
          </g>
        ))}
        <rect x="439" y="466" width="60" height="46" rx="4" fill="#091f32" />
        <rect x="347" y="512" width="244" height="9" rx="4.5" fill="#14344f" />
        {!mini ? <text x="469" y="348" textAnchor="middle" fill={lit("library") ? "#ffe29a" : "#7894aa"} fontSize="13" fontWeight="800" letterSpacing="3.2">PERPUSTAKAAN</text> : null}
        <RevealRings x={469} y={386} active={revealing("library")} />
      </g>

      {/* Rumah — milestone 75. */}
      <g className="mb-kota-zone" data-lit={lit("homes")} data-reveal={revealing("homes")}>
        {lit("homes") ? <ellipse cx="735" cy="448" rx="204" ry="126" fill={`url(#${id("warm")})`} /> : null}
        <House x={646} y={514} on={lit("homes")} scale="1.02" />
        <House x={752} y={514} on={lit("homes")} scale="1.08" variant={1} />
        <House x={855} y={514} on={lit("homes")} scale=".92" variant={2} />
        {!mini ? <text x="750" y="548" textAnchor="middle" fill={lit("homes") ? "#ffe09a" : "#7894aa"} fontSize="13" fontWeight="800" letterSpacing="3">RUMAH</text> : null}
        <RevealRings x={754} y={433} active={revealing("homes")} />
      </g>

      {/* Pusat Kota — milestone 100, hero vertical. */}
      <g className="mb-kota-zone" data-lit={lit("town-center")} data-reveal={revealing("town-center")}>
        {lit("town-center") ? <ellipse cx="1040" cy="354" rx="182" ry="222" fill={`url(#${id("warm")})`} /> : null}
        {lit("town-center") ? (
          <path className="mb-kota-beacon" d="M1040 182 L972 26 L1108 26 Z" fill="#ffd66a" opacity=".09" filter={`url(#${id("soft")})`} />
        ) : null}
        <rect x="973" y="330" width="134" height="184" rx="6" fill="#112f4b" stroke="#2c5d7d" strokeWidth="2.2" />
        <path d="M956 330 L1040 255 L1124 330 Z" fill="#173f62" stroke="#2d5f7f" strokeWidth="2" />
        <rect x="920" y="392" width="65" height="122" rx="4" fill="#102a43" stroke="#275473" strokeWidth="2" />
        <rect x="1100" y="408" width="67" height="106" rx="4" fill="#102a43" stroke="#275473" strokeWidth="2" />
        <line x1="1040" y1="255" x2="1040" y2="199" stroke="#2a607f" strokeWidth="5" strokeLinecap="round" />
        {lit("town-center") ? <circle className="mb-kota-beacon-pulse" cx="1040" cy="188" r="39" fill={`url(#${id("warm")})`} /> : null}
        <circle className="mb-kota-lamp" cx="1040" cy="188" r={lit("town-center") ? 10 : 7} fill={lit("town-center") ? "var(--mb-kota-glow)" : "#31516a"} />
        <circle cx="1040" cy="302" r="22" fill="#0e2941" stroke="#2d5c78" strokeWidth="2" />
        <circle cx="1040" cy="302" r="10" fill={lit("town-center") ? "#ffd76a" : "#1c4461"} className="mb-kota-window" data-lit={lit("town-center")} />
        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2].map((col) => (
            <LitWindow
              key={`c-${row}-${col}`}
              x={994 + col * 31}
              y={350 + row * 32}
              w={17}
              h={17}
              on={lit("town-center")}
              delay={70 + (row * 3 + col) * 45}
            />
          )),
        )}
        {[0, 1, 2].map((row) => (
          <LitWindow key={`l-${row}`} x="936" y={410 + row * 30} w="14" h="14" on={lit("town-center")} delay={130 + row * 70} />
        ))}
        {[0, 1, 2].map((row) => (
          <LitWindow key={`r-${row}`} x="1120" y={426 + row * 27} w="14" h="13" on={lit("town-center")} delay={170 + row * 70} />
        ))}
        <rect x="1022" y="472" width="36" height="42" rx="3" fill="#091f31" />
        {!mini ? <text x="1042" y="548" textAnchor="middle" fill={lit("town-center") ? "#ffe3a0" : "#7894aa"} fontSize="13" fontWeight="800" letterSpacing="3">PUSAT KOTA</text> : null}
        <RevealRings x={1040} y={350} active={revealing("town-center")} />
      </g>

      {!mini ? (
        <g aria-hidden>
          {FIREFLIES.slice(0, fireflyCount).map(([x, y, duration, delay], i) => (
            <circle
              key={i}
              className="mb-kota-firefly"
              cx={x}
              cy={y}
              r="2.5"
              fill="#ffe9b0"
              style={{
                animationDuration: `${duration}s`,
                animationDelay: `-${delay}s`,
              }}
            />
          ))}
        </g>
      ) : null}
    </svg>
  );
}

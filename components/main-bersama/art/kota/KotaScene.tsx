"use client";

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
  [34, 34, 1.3, 0], [74, 65, 1.7, 1.3], [122, 28, 1.2, 2.2],
  [171, 82, 1.5, 0.6], [214, 46, 1.1, 3.1], [258, 26, 1.8, 1.9],
  [302, 72, 1.2, 2.8], [347, 38, 1.5, 0.9], [392, 92, 1.1, 3.6],
  [438, 52, 1.7, 1.5], [486, 30, 1.2, 2.4], [531, 78, 1.4, 0.4],
  [574, 42, 1.1, 3.4], [615, 92, 1.6, 1.1], [654, 24, 1.2, 2.9],
  [746, 88, 1.4, 0.7], [98, 116, 1.1, 3.8], [188, 124, 1.5, 1.7],
  [278, 112, 1.2, 2.6], [367, 132, 1.3, 0.2], [462, 116, 1.1, 3.3],
  [558, 134, 1.6, 1.2], [640, 124, 1.2, 2.1], [720, 138, 1.4, 3],
];

const FIREFLIES: Array<[number, number, number, number]> = [
  [96, 236, 6.2, 0.4],
  [142, 246, 7.1, 2.3],
  [202, 230, 8.4, 1.1],
  [466, 242, 6.8, 2.8],
  [523, 224, 7.8, 0.9],
  [592, 244, 8.8, 3.2],
];

function RevealRing({
  x,
  y,
  active,
}: {
  x: number;
  y: number;
  active: boolean;
}) {
  return active ? (
    <circle
      className="mb-kota-reveal-ring"
      cx={x}
      cy={y}
      r={28}
      fill="none"
      stroke="var(--mb-kota-glow)"
      strokeWidth="3"
    />
  ) : null;
}

function LitWindow({
  x,
  y,
  w,
  h,
  on,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  on: boolean;
}) {
  return (
    <rect
      className="mb-kota-window"
      data-lit={on}
      x={x}
      y={y}
      width={w}
      height={h}
      rx={2}
      fill={on ? "var(--mb-kota-glow)" : "#15304b"}
    />
  );
}

export function KotaScene({
  unlocked,
  mini = false,
  reveal = [],
}: KotaSceneProps) {
  const litSet = new Set(unlocked);
  const revealSet = new Set(reveal);
  const lit = (key: KotaMilestoneKey) => litSet.has(key);
  const revealing = (key: KotaMilestoneKey) => revealSet.has(key);

  return (
    <svg
      viewBox="0 0 800 300"
      className="mb-kota-scene"
      role="img"
      aria-label="Kota Cahaya"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="mb-kota-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#071426" />
          <stop offset="0.58" stopColor="#0b1d31" />
          <stop offset="1" stopColor="#123049" />
        </linearGradient>
        <linearGradient id="mb-kota-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12314e" />
          <stop offset="1" stopColor="#0a1c2e" />
        </linearGradient>
        <radialGradient id="mb-kota-moon-halo">
          <stop offset="0" stopColor="#efe6c8" stopOpacity="0.3" />
          <stop offset="1" stopColor="#efe6c8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mb-kota-warm">
          <stop offset="0" stopColor="#ffc94d" stopOpacity="0.38" />
          <stop offset="1" stopColor="#ffc94d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mb-kota-aurora" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1e5a54" stopOpacity="0" />
          <stop offset="0.5" stopColor="#1e5a54" stopOpacity="0.32" />
          <stop offset="1" stopColor="#1e5a54" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="800" height="300" rx="18" fill="url(#mb-kota-sky)" />

      {!mini ? (
        <path
          className="mb-kota-aurora"
          d="M-30 92 C 115 18, 275 100, 430 48 C 570 4, 690 68, 830 28 L830 -10 L-30 -10 Z"
          fill="url(#mb-kota-aurora)"
        />
      ) : null}

      <g aria-hidden>
        {STARS.slice(0, mini ? 14 : STARS.length).map(([x, y, r, delay], i) => (
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

      <circle cx="705" cy="54" r="48" fill="url(#mb-kota-moon-halo)" />
      <circle cx="705" cy="54" r="20" fill="#efe6c8" opacity="0.96" />
      <circle cx="699" cy="49" r="4" fill="#d8cda9" opacity="0.7" />
      <circle cx="713" cy="61" r="3" fill="#d8cda9" opacity="0.65" />

      <path
        d="M-20 188 L110 128 L220 177 L340 113 L472 174 L610 126 L820 166 L820 300 L-20 300 Z"
        fill="#0e2036"
      />
      <path
        d="M-20 222 L126 176 L260 211 L410 164 L564 215 L700 176 L820 204 L820 300 L-20 300 Z"
        fill="#102a44"
        opacity="0.92"
      />
      <path
        d="M0 248 C 150 232, 286 250, 425 238 C 585 224, 676 247, 800 232 L800 300 L0 300 Z"
        fill="url(#mb-kota-ground)"
      />

      {/* Taman */}
      <g
        className="mb-kota-zone"
        data-lit={lit("garden")}
        data-reveal={revealing("garden")}
      >
        {lit("garden") ? (
          <ellipse cx="142" cy="234" rx="88" ry="52" fill="url(#mb-kota-warm)" />
        ) : null}
        {[82, 122, 166].map((x, i) => (
          <g key={x}>
            <rect x={x - 3} y={224} width={6} height={26} rx={3} fill="#1e425f" />
            <circle
              cx={x}
              cy={212 - (i % 2) * 8}
              r={15}
              fill={lit("garden") ? "#2fb982" : "#14395a"}
            />
          </g>
        ))}
        <line x1="190" y1="246" x2="190" y2="215" stroke="#1e425f" strokeWidth="3" />
        <circle
          className="mb-kota-lamp"
          cx="190"
          cy="210"
          r={lit("garden") ? 5.5 : 4}
          fill={lit("garden") ? "var(--mb-kota-glow)" : "#24445f"}
        />
        <rect x="106" y="240" width="46" height="5" rx="2.5" fill="#24445f" />
        <rect x="110" y="245" width="4" height="8" fill="#24445f" />
        <rect x="144" y="245" width="4" height="8" fill="#24445f" />
        <RevealRing x={140} y={220} active={revealing("garden")} />
      </g>

      {/* Perpustakaan */}
      <g
        className="mb-kota-zone"
        data-lit={lit("library")}
        data-reveal={revealing("library")}
      >
        {lit("library") ? (
          <ellipse cx="330" cy="218" rx="92" ry="66" fill="url(#mb-kota-warm)" />
        ) : null}
        <rect x="268" y="190" width="128" height="60" rx="5" fill="#10283f" stroke="#1d436b" />
        <path d="M258 190 L332 151 L406 190 Z" fill="#143352" stroke="#1d436b" />
        <rect x="286" y="199" width="10" height="51" rx="2" fill="#183b5c" />
        <rect x="312" y="199" width="10" height="51" rx="2" fill="#183b5c" />
        <rect x="338" y="199" width="10" height="51" rx="2" fill="#183b5c" />
        <rect x="364" y="199" width="10" height="51" rx="2" fill="#183b5c" />
        <LitWindow x={304} y={173} w={15} h={10} on={lit("library")} />
        <LitWindow x={345} y={173} w={15} h={10} on={lit("library")} />
        <rect x="316" y="225" width="32" height="25" rx="3" fill="#0c2033" />
        {!mini ? (
          <text
            x="332"
            y="188"
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="800"
            letterSpacing="1.6"
            fill="#7e9db8"
          >
            PERPUSTAKAAN
          </text>
        ) : null}
        <RevealRing x={332} y={205} active={revealing("library")} />
      </g>

      {/* Rumah */}
      <g
        className="mb-kota-zone"
        data-lit={lit("homes")}
        data-reveal={revealing("homes")}
      >
        {lit("homes") ? (
          <ellipse cx="512" cy="226" rx="92" ry="54" fill="url(#mb-kota-warm)" />
        ) : null}
        <rect x="444" y="212" width="60" height="38" rx="4" fill="#10283f" stroke="#1d436b" />
        <path d="M438 213 L474 184 L510 213 Z" fill="#143352" />
        <LitWindow x={454} y={224} w={13} h={10} on={lit("homes")} />
        <LitWindow x={481} y={224} w={13} h={10} on={lit("homes")} />
        <rect x="516" y="201" width="56" height="49" rx="4" fill="#10283f" stroke="#1d436b" />
        <path d="M510 202 L544 174 L578 202 Z" fill="#143352" />
        <LitWindow x={527} y={214} w={12} h={10} on={lit("homes")} />
        <LitWindow x={550} y={214} w={12} h={10} on={lit("homes")} />
        <LitWindow x={527} y={232} w={12} h={10} on={lit("homes")} />
        <RevealRing x={510} y={218} active={revealing("homes")} />
      </g>

      {/* Pusat Kota */}
      <g
        className="mb-kota-zone"
        data-lit={lit("town-center")}
        data-reveal={revealing("town-center")}
      >
        {lit("town-center") ? (
          <ellipse cx="666" cy="180" rx="96" ry="100" fill="url(#mb-kota-warm)" />
        ) : null}
        <rect x="628" y="152" width="76" height="98" rx="4" fill="#112b45" stroke="#1d436b" />
        <path d="M619 153 L666 116 L713 153 Z" fill="#16395b" />
        <line x1="666" y1="116" x2="666" y2="91" stroke="#1e4a6e" strokeWidth="3" />
        <circle
          className="mb-kota-lamp"
          cx="666"
          cy="86"
          r={lit("town-center") ? 7 : 5}
          fill={lit("town-center") ? "var(--mb-kota-glow)" : "#1e4a6e"}
        />
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <LitWindow
              key={`${row}-${col}`}
              x={640 + col * 19}
              y={166 + row * 22}
              w={10}
              h={10}
              on={lit("town-center")}
            />
          )),
        )}
        <rect x="653" y="226" width="26" height="24" rx="2" fill="#0c2033" />
        <RevealRing x={666} y={170} active={revealing("town-center")} />
      </g>

      {!mini ? (
        <g aria-hidden>
          {FIREFLIES.map(([x, y, duration, delay], i) => (
            <circle
              key={i}
              className="mb-kota-firefly"
              cx={x}
              cy={y}
              r="2"
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

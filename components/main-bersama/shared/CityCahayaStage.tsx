"use client";

type CityCahayaStageProps = {
  progressPercent: number;
  unlockedMilestones: string[];
};

const normalizeMilestone = (value: string) => {
  const aliases: Record<string, string> = {
    garden: "garden",
    taman: "garden",
    library: "library",
    perpus: "library",
    perpustakaan: "library",
    homes: "homes",
    rumah: "homes",
    "town-center": "town-center",
    pusat: "town-center",
    "pusat-kota": "town-center",
  };

  const key = value.toLowerCase().trim();
  return aliases[key] ?? key;
};

export function CityCahayaStage({
  progressPercent,
  unlockedMilestones,
}: CityCahayaStageProps) {
  const unlocked = new Set(unlockedMilestones.map(normalizeMilestone));
  const value = Math.max(0, Math.min(100, Math.round(progressPercent)));
  const isOn = (key: string) => unlocked.has(key);

  return (
    <section
      aria-label={"Kota Cahaya " + value + " persen"}
      style={{
        width: "min(100%, 1100px)",
        margin: "18px auto 0",
        padding: "18px 20px 16px",
        borderRadius: 26,
        color: "#EAF2F9",
        background: "#081726",
        boxShadow: "0 24px 56px rgba(8,23,38,.2)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 18,
          padding: "2px 6px 12px",
        }}
      >
        <div>
          <span
            style={{
              color: "#0FA8A0",
              fontSize: ".68rem",
              fontWeight: 900,
              letterSpacing: ".14em",
            }}
          >
            KOTA CAHAYA
          </span>
          <h3 style={{ margin: "4px 0 0", fontSize: "clamp(1rem,2vw,1.35rem)" }}>
            Bangun kota bersama kelas
          </h3>
        </div>
        <strong style={{ color: "#FFD57A", fontSize: "clamp(1.45rem,3vw,2rem)" }}>
          {value}%
        </strong>
      </div>

      <div
        style={{
          width: "100%",
          borderRadius: 20,
          overflow: "hidden",
          background: "#0B1D31",
          border: "1px solid rgba(255,255,255,.07)",
        }}
      >
        <svg
          viewBox="0 0 1200 600"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Ilustrasi Kota Cahaya"
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          <defs>
            <linearGradient id="mbCitySky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#071426" />
              <stop offset=".55" stopColor="#0B1D31" />
              <stop offset="1" stopColor="#123049" />
            </linearGradient>
            <linearGradient id="mbCityGround" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#12314E" />
              <stop offset="1" stopColor="#0A1C2E" />
            </linearGradient>
            <radialGradient id="mbCityMoon">
              <stop offset="0" stopColor="#FFF4CE" stopOpacity=".42" />
              <stop offset="1" stopColor="#FFF4CE" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="mbCityGlow">
              <stop offset="0" stopColor="#FFD57A" stopOpacity=".58" />
              <stop offset="1" stopColor="#FFD57A" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="1200" height="600" fill="url(#mbCitySky)" />

          <path
            d="M-40 170 C200 70 460 150 700 90 C900 45 1080 110 1240 60 L1240 -20 L-40 -20 Z"
            fill="#1E5A54"
            opacity=".18"
          >
            <animate attributeName="opacity" values=".12;.28;.12" dur="11s" repeatCount="indefinite" />
          </path>

          {Array.from({ length: 46 }, (_, i) => (
            <circle
              key={i}
              cx={10 + ((i * 97) % 1180)}
              cy={8 + ((i * 53) % 282)}
              r={0.7 + ((i * 17) % 10) / 10}
              fill="#DCE9F5"
              opacity={0.3 + ((i * 13) % 55) / 100}
            />
          ))}

          <circle cx="150" cy="88" r="78" fill="url(#mbCityMoon)" />
          <circle cx="150" cy="88" r="27" fill="#EFE6C8" opacity=".94" />
          <circle cx="142" cy="81" r="5" fill="#E3D8B2" opacity=".8" />
          <circle cx="159" cy="96" r="3.4" fill="#E3D8B2" opacity=".7" />

          <path
            d="M-20 372 L190 292 L400 352 L640 278 L880 348 L1100 292 L1220 330 L1220 600 L-20 600 Z"
            fill="#0E2036"
          />

          <LandmarkGroup
            label="TAMAN"
            on={isOn("garden")}
            glow={{ x: 120, y: 400, width: 240, height: 120 }}
          >
            <ellipse cx="235" cy="512" rx="105" ry="16" fill="#0C2438" />
            <circle cx="120" cy="452" r="34" fill="#14395A" />
            <circle cx="172" cy="462" r="26" fill="#14395A" />
            <circle cx="300" cy="458" r="29" fill="#14395A" />
            <line x1="205" y1="512" x2="205" y2="470" stroke="#1E425F" strokeWidth="4" />
            <circle cx="205" cy="464" r="15" fill="url(#mbCityGlow)" opacity={isOn("garden") ? ".85" : ".08"} />
            <circle cx="205" cy="464" r="6" fill="#FFD57A" opacity={isOn("garden") ? "1" : ".12"} />
            <line x1="282" y1="514" x2="282" y2="482" stroke="#1E425F" strokeWidth="3.5" />
            <circle cx="282" cy="476" r="13" fill="url(#mbCityGlow)" opacity={isOn("garden") ? ".8" : ".08"} />
            <circle cx="282" cy="476" r="5" fill="#FFD57A" opacity={isOn("garden") ? "1" : ".12"} />
          </LandmarkGroup>

          <LandmarkGroup
            label="PERPUSTAKAAN"
            on={isOn("library")}
            glow={{ x: 360, y: 300, width: 240, height: 200 }}
          >
            <rect x="380" y="372" width="190" height="138" fill="#10283F" stroke="#1D436B" strokeWidth="1.5" />
            <path d="M366 372 L475 318 L584 372 Z" fill="#143352" stroke="#1D436B" strokeWidth="1.5" />
            <circle cx="475" cy="306" r="17" fill="#143352" />
            <rect x="467" y="330" width="16" height="14" fill={isOn("library") ? "#FFD57A" : "#1E3F60"} rx="2" />
            {Array.from({ length: 8 }, (_, i) => (
              <rect
                key={i}
                x={404 + (i % 4) * 44}
                y={396 + Math.floor(i / 4) * 50}
                width="26"
                height="32"
                rx="2"
                fill={isOn("library") ? "#FFD57A" : "#1E3F60"}
              />
            ))}
            <rect x="445" y="470" width="60" height="40" fill="#0C2033" />
          </LandmarkGroup>

          <LandmarkGroup
            label="RUMAH"
            on={isOn("homes")}
            glow={{ x: 600, y: 380, width: 290, height: 140 }}
          >
            <House x={620} y={438} w={86} h={72} on={isOn("homes")} />
            <House x={724} y={406} w={72} h={104} on={isOn("homes")} />
            <House x={812} y={446} w={72} h={64} on={isOn("homes")} />
          </LandmarkGroup>

          <LandmarkGroup
            label="PUSAT KOTA"
            on={isOn("town-center")}
            glow={{ x: 905, y: 150, width: 180, height: 330 }}
          >
            <rect x="980" y="252" width="110" height="250" fill="#112B45" stroke="#1D436B" strokeWidth="1.5" />
            <path d="M970 252 L1035 196 L1100 252 Z" fill="#16395B" />
            <line x1="1035" y1="196" x2="1035" y2="156" stroke="#1E4A6E" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="1035" cy="150" r="17" fill="url(#mbCityGlow)" opacity={isOn("town-center") ? ".9" : ".08"} />
            <circle cx="1035" cy="150" r="6.5" fill="#FFD57A" opacity={isOn("town-center") ? "1" : ".12"} />
            {Array.from({ length: 21 }, (_, i) => (
              <rect
                key={i}
                x={994 + (i % 3) * 27}
                y={266 + Math.floor(i / 3) * 31}
                width="17"
                height="17"
                rx="2"
                fill={isOn("town-center") ? "#FFD57A" : "#1E3F60"}
              />
            ))}
          </LandmarkGroup>

          <rect y="528" width="1200" height="72" fill="url(#mbCityGround)" />
          <line x1="0" y1="528" x2="1200" y2="528" stroke="#173A5B" strokeWidth="2" />
          <ellipse cx="150" cy="552" rx="60" ry="5" fill="#EFE6C8" opacity=".22" />
          <ellipse cx="920" cy="566" rx="44" ry="4" fill="#9CC8E8" opacity=".16" />
        </svg>
      </div>

      <div
        aria-hidden="true"
        style={{
          height: 7,
          margin: "12px 2px 0",
          borderRadius: 999,
          overflow: "hidden",
          background: "rgba(255,255,255,.08)",
        }}
      >
        <span
          style={{
            display: "block",
            height: "100%",
            width: value + "%",
            borderRadius: "inherit",
            background: "linear-gradient(90deg,#0FA8A0,#8CE4DE,#FFD57A)",
            transition: "width .55s ease",
          }}
        />
      </div>

      <p
        style={{
          margin: "8px 2px 0",
          color: "#9FB6CA",
          fontSize: ".76rem",
          fontWeight: 700,
        }}
      >
        {unlocked.size} dari 4 bagian kota menyala · setiap jawaban benar membantu membangun Kota Cahaya.
      </p>
    </section>
  );
}

function LandmarkGroup({
  label,
  on,
  glow,
  children,
}: {
  label: string;
  on: boolean;
  glow: { x: number; y: number; width: number; height: number };
  children: React.ReactNode;
}) {
  return (
    <g opacity={on ? 1 : 0.72}>
      <rect
        x={glow.x}
        y={glow.y}
        width={glow.width}
        height={glow.height}
        fill="url(#mbCityGlow)"
        opacity={on ? ".5" : ".035"}
      />
      {children}
      <text
        x={label === "TAMAN" ? 235 : label === "PERPUSTAKAAN" ? 475 : label === "RUMAH" ? 756 : 1035}
        y="548"
        textAnchor="middle"
        fill={on ? "#FFD57A" : "#6E8AA3"}
        fontSize="12"
        fontWeight="800"
        letterSpacing="2.2"
      >
        {label}
      </text>
    </g>
  );
}

function House({
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
  const roofY = y - h * 0.47;
  const cx = x + w / 2;

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#10283F" stroke="#1D436B" strokeWidth="1.4" />
      <path
        d={"M" + (x - 8) + " " + y + " L" + cx + " " + roofY + " L" + (x + w + 8) + " " + y + " Z"}
        fill="#143352"
      />
      <rect x={x + w * 0.2} y={y + h * 0.2} width={w * 0.18} height={h * 0.16} rx="2" fill={on ? "#FFD57A" : "#1E3F60"} />
      <rect x={x + w * 0.62} y={y + h * 0.2} width={w * 0.18} height={h * 0.16} rx="2" fill={on ? "#FFD57A" : "#1E3F60"} />
      <rect x={cx - w * 0.13} y={y + h * 0.56} width={w * 0.26} height={h * 0.44} rx="2" fill="#0C2033" />
    </g>
  );
}

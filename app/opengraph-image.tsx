import { ImageResponse } from "next/og"

export const runtime = "edge"
export const contentType = "image/png"
export const size = { width: 1200, height: 630 }

export default async function OGImage() {
  const inter = await fetch(
    "https://fonts.googleapis.com/css2?family=Inter:wght@700;800&display=swap"
  ).then((r) => r.text())
  const interUrl = inter.match(/url\(([^)]+)\)/)?.[1]

  if (!interUrl) {
    return new ImageResponse(
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#B91C1C",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 80, fontWeight: 800 }}>BahasaCerdas</div>
        <div style={{ fontSize: 28, opacity: 0.9, marginTop: 16 }}>
          Platform Edukasi Bahasa Indonesia
        </div>
        <div style={{ fontSize: 20, opacity: 0.7, marginTop: 32 }}>
          www.bahasacerdas.com
        </div>
      </div>,
      size
    )
  }

  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #B91C1C 0%, #991b1b 100%)",
        color: "white",
        fontFamily: "Inter",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          left: -100,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.03)",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginBottom: 8,
        }}
      >
        <img
          src="https://www.bahasacerdas.com/brand/bc2026-icon.png"
          alt=""
          width={100}
          height={100}
          style={{ borderRadius: 16 }}
        />
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          BahasaCerdas
        </div>
      </div>

      <div
        style={{
          fontSize: 28,
          opacity: 0.9,
          marginTop: 8,
          textAlign: "center",
          maxWidth: 600,
          lineHeight: 1.4,
        }}
      >
        Platform Edukasi Bahasa Indonesia
      </div>

      <div
        style={{
          marginTop: 40,
          padding: "12px 32px",
          borderRadius: 50,
          border: "1px solid rgba(255,255,255,0.3)",
          fontSize: 20,
          opacity: 0.8,
        }}
      >
        www.bahasacerdas.com
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Inter",
          data: await fetch(interUrl).then((r) => r.arrayBuffer()),
          weight: 800,
          style: "normal",
        },
      ],
    }
  )
}

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

export default function OGImage() {
  // No runtime font or external-image requests: social previews must still render during outages.
  return new ImageResponse(
    <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column",
      justifyContent: "center", padding: "80px 92px",
      background: "linear-gradient(135deg, #064E72 0%, #1D66B2 53%, #6354A6 100%)",
      color: "#FFFFFF", fontFamily: "sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -180, right: -120, width: 570, height: 570,
        display: "flex", borderRadius: "50%", background: "rgba(255,255,255,0.09)" }} />
      <div style={{ position: "absolute", bottom: -220, right: 140, width: 570, height: 570,
        display: "flex", borderRadius: "50%", background: "rgba(45,213,192,0.16)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 52 }}>
        <div style={{ width: 76, height: 76, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 22, background: "rgba(255,255,255,0.22)", border: "1px solid rgba(255,255,255,0.34)",
          fontSize: 31, fontWeight: 800 }}>BC</div>
        <span style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1.8 }}>BahasaCerdas</span>
      </div>
      <div style={{ display: "flex", maxWidth: 960, fontSize: 66, lineHeight: 1.15,
        fontWeight: 800, letterSpacing: -1.5 }}>
        Bahasa menghubungkan gagasan, manusia, dan masa depan.
      </div>
      <div style={{ marginTop: 28, display: "flex", fontSize: 25, color: "rgba(255,255,255,0.86)" }}>
        Belajar · Berlatih · Bermain · Berkarya
      </div>
      <div style={{ position: "absolute", left: 92, bottom: 48, display: "flex",
        fontSize: 18, letterSpacing: 1.3, color: "rgba(255,255,255,0.78)" }}>
        WWW.BAHASACERDAS.COM
      </div>
    </div>, size
  );
}

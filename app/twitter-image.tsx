import { ImageResponse } from "next/og";

export const alt = "BahasaCerdas — Platform Edukasi Bahasa Indonesia";
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 600,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: 60,
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            letterSpacing: -2,
            marginBottom: 16,
          }}
        >
          BahasaCerdas
        </div>
        <div
          style={{
            fontSize: 26,
            opacity: 0.9,
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          Platform Edukasi Bahasa Indonesia
        </div>
        <div
          style={{
            fontSize: 16,
            opacity: 0.7,
            marginTop: 36,
            textAlign: "center",
          }}
        >
          AI RPP Generator · Bank Soal · Kuis Game · UKBI · Toko Karya
        </div>
      </div>
    ),
    size,
  );
}

import { ImageResponse } from "next/og"
import { db } from "@/lib/db"

export const runtime = "edge"
export const contentType = "image/png"
export const size = { width: 1200, height: 630 }

const typeColors: Record<string, string> = {
  PUISI: "#8B5CF6",
  CERPEN: "#3B82F6",
  ARTIKEL: "#10B981",
  ANEKDOT: "#F59E0B",
  PANTUN: "#EC4899",
  OPINI: "#6366F1",
}

const typeLabels: Record<string, string> = {
  PUISI: "Puisi", CERPEN: "Cerpen", ARTIKEL: "Artikel",
  ANEKDOT: "Anekdot", PANTUN: "Pantun", OPINI: "Opini",
}

export default async function OGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const karya = await db.studentKarya.findUnique({
    where: { id },
    include: { user: { select: { fullName: true } } },
  })

  const jenis = karya?.type || "PUISI"
  const bgColor = typeColors[jenis] || "#8B5CF6"
  const label = typeLabels[jenis] || jenis
  const judul = karya?.title || "Karya Siswa"
  const penulis = karya?.user?.fullName || "Siswa BahasaCerdas"
  const konten = karya?.excerpt || karya?.content?.slice(0, 200) || ""

  const inter = await fetch(
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap"
  ).then((r) => r.text())
  const interUrl = inter.match(/url\(([^)]+)\)/)?.[1]

  if (!interUrl) {
    return new ImageResponse(
      <div style={{
        width: 1200, height: 630, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: bgColor, color: "white", fontFamily: "sans-serif",
      }}>
        <div style={{ fontSize: 64, fontWeight: 800 }}>{judul}</div>
        <div style={{ fontSize: 24, opacity: 0.9, marginTop: 16 }}>{penulis}</div>
        <div style={{ fontSize: 18, opacity: 0.7, marginTop: 24 }}>bahasacerdas.com</div>
      </div>,
      size
    )
  }

  return new ImageResponse(
    <div style={{
      width: 1200, height: 630, display: "flex",
      background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 100%)`,
      color: "white", fontFamily: "Inter", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -80, right: -80, width: 400, height: 400, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
      <div style={{ position: "absolute", bottom: -120, left: -100, width: 500, height: 500, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

      <div style={{ display: "flex", flexDirection: "column", padding: "60px 80px", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{
            padding: "8px 20px", borderRadius: 50, fontSize: 18, fontWeight: 700,
            background: "rgba(255,255,255,0.2)",
          }}>
            {label}
          </div>
          <div style={{ fontSize: 16, opacity: 0.8 }}>Karya Siswa</div>
        </div>

        <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 20, maxWidth: 700 }}>
          {judul.length > 60 ? judul.slice(0, 60) + "…" : judul}
        </div>

        <div style={{ fontSize: 24, fontWeight: 400, opacity: 0.9, marginBottom: 8 }}>
          Oleh {penulis}
        </div>

        {konten && (
          <div style={{ fontSize: 18, opacity: 0.75, lineHeight: 1.5, maxWidth: 650, marginTop: 12 }}>
            {konten.length > 120 ? konten.slice(0, 120) + "…" : konten}
          </div>
        )}

        <div style={{ marginTop: 32, fontSize: 18, opacity: 0.6, display: "flex", alignItems: "center", gap: 6 }}>
          <span>bahasacerdas.com</span>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [{
        name: "Inter",
        data: await fetch(interUrl).then((r) => r.arrayBuffer()),
        weight: 800,
        style: "normal",
      }],
    }
  )
}

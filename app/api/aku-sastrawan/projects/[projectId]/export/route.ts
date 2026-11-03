import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { bacaFormatEkspor } from "@/lib/aku-sastrawan/ekspor/format";
import { contentDisposition, MIME_EKSPOR, naskahSebagaiTeks, susunNaskah } from "@/lib/aku-sastrawan/ekspor/naskah";

export const runtime = "nodejs";

type Context = { params: Promise<{ projectId: string }> };

/**
 * Unduh naskah milik sendiri: .txt (bawaan), PDF (?format=pdf), atau Word
 * (?format=docx). READ action: tetap tersedia untuk pemilik setelah Premium
 * berakhir (keputusan founder: karya tidak pernah dikunci). Wajib login, dan
 * hanya karya dengan userId = pengguna yang masuk (milik orang lain → 404).
 */
export async function GET(request: NextRequest, context: Context) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  const format = bacaFormatEkspor(request.nextUrl.searchParams.get("format"));
  if (!format) return NextResponse.json({ error: "Format unduhan tidak dikenal. Pilih .txt, PDF, atau Word." }, { status: 400 });
  const { projectId } = await context.params;
  const project = await db.writingProject.findFirst({
    where: { id: projectId, userId: user.id },
    include: {
      chapters: { orderBy: { orderIndex: "asc" } },
      user: { select: { fullName: true, nickname: true } },
    },
  });
  if (!project) return NextResponse.json({ error: "Karya tidak ditemukan." }, { status: 404 });

  // Sinopsis + Peta Cerita (JSON berversi di kolom synopsis) → teks rapi, bukan JSON mentah.
  const naskah = susunNaskah(project, project.user?.fullName?.trim() || project.user?.nickname?.trim() || "");
  const headers = {
    "Content-Type": MIME_EKSPOR[format],
    "Content-Disposition": contentDisposition(naskah.judul, format),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };

  try {
    if (format === "pdf") {
      const { buatPdfNaskah } = await import("@/lib/aku-sastrawan/ekspor/pdf");
      return new NextResponse(new Uint8Array(await buatPdfNaskah(naskah)), { status: 200, headers });
    }
    if (format === "docx") {
      const { buatDocxNaskah } = await import("@/lib/aku-sastrawan/ekspor/docx");
      return new NextResponse(new Uint8Array(await buatDocxNaskah(naskah)), { status: 200, headers });
    }
  } catch (error) {
    console.error("AKU_SASTRAWAN_EXPORT_FAILED", format, error);
    return NextResponse.json({ error: "Berkas belum dapat dibuat. Naskahmu tetap aman — coba lagi, atau unduh .txt." }, { status: 500 });
  }
  return new NextResponse(naskahSebagaiTeks(naskah), { status: 200, headers });
}

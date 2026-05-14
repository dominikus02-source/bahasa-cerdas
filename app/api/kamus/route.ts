import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!q || q.length < 2) {
      return NextResponse.json({ data: [], total: 0, page: 1, totalPages: 0 });
    }

    // Try external API first
    try {
      const res = await fetch(`https://kbbi-api-zhirrr.vercel.app/api/kbbi?kata=${encodeURIComponent(q)}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const data = json.data.map((item: any, i: number) => ({
            id: `kbbi-${i}`,
            kata: q,
            jenisKata: item.kata_sambung || item.kelas || item.type || "",
            definisi: item.arti || item.definisi || "",
            contoh: item.contoh || "",
            sinonim: (item.sinonim || []).join(", "),
            antonim: (item.antonim || []).join(", "),
          }));
          return NextResponse.json({ data, total: data.length, page: 1, totalPages: 1 });
        }
      }
    } catch {}

    // Fallback: local DB
    const where = { kata: { contains: q, mode: "insensitive" as const } };
    const [data, total] = await Promise.all([
      db.kamusEntry.findMany({ where, orderBy: { kata: "asc" }, skip: (page - 1) * limit, take: limit }),
      db.kamusEntry.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    return NextResponse.json({ error: "Internal error", data: [] }, { status: 500 });
  }
}

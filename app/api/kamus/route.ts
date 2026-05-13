import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const API_URLS = [
  (q: string) => `https://new-kbbi-api.vercel.app/api/kbbi?kata=${encodeURIComponent(q)}`,
  (q: string) => `https://kbbi-api-zhirrr.vercel.app/api/kbbi?kata=${encodeURIComponent(q)}`,
];

async function fetchExternal(q: string): Promise<any[] | null> {
  for (const buildUrl of API_URLS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(buildUrl(q), { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) continue;

      const json = await res.json();
      const items = json?.data || json;
      if (Array.isArray(items) && items.length > 0) {
        return items.map((item: any, i: number) => ({
          id: `kbbi-${i}`,
          kata: q,
          jenisKata: item.kata_sambung || item.kelas || item.type || "",
          definisi: item.arti || item.definisi || item.description || item.definition || "",
          contoh: item.contoh || item.example || "",
          sinonim: (item.sinonim || item.synonyms || []).join(", "),
          antonim: (item.antonim || item.antonyms || []).join(", "),
        }));
      }
    } catch {}
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!q || q.length < 2) {
      return NextResponse.json({ data: [], total: 0, page: 1, totalPages: 0 });
    }

    const external = await fetchExternal(q);
    if (external) {
      return NextResponse.json({ data: external, total: external.length, page: 1, totalPages: 1 });
    }

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

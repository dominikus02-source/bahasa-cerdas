import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where = q
      ? { kata: { contains: q, mode: "insensitive" as const } }
      : {};

    const [data, total] = await Promise.all([
      db.kamusEntry.findMany({
        where,
        orderBy: { kata: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.kamusEntry.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

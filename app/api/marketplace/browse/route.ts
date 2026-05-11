import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const grade = searchParams.get("grade");
    const subject = searchParams.get("subject");
    const sort = searchParams.get("sort") || "newest";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "24");

    const where: any = { isPublished: true };
    if (type) where.type = type;
    if (grade) where.grade = grade;
    if (subject) where.subject = subject;

    const orderBy: any =
      sort === "popular" ? { downloads: "desc" } :
      sort === "price_asc" ? { price: "asc" } :
      sort === "price_desc" ? { price: "desc" } :
      { createdAt: "desc" };

    const [karyaList, total] = await Promise.all([
      db.karya.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          seller: { select: { id: true, fullName: true, avatar: true } },
          _count: { select: { purchases: true } },
        },
      }),
      db.karya.count({ where }),
    ]);

    return NextResponse.json({
      data: karyaList,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/marketplace/browse error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
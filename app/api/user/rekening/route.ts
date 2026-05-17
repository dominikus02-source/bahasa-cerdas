import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      select: { bank: true, bankHolder: true, bankNumber: true },
    });

    return NextResponse.json({
      bank: profile?.bank || "",
      holder: profile?.bankHolder || "",
      number: profile?.bankNumber || "",
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { bank, holder, number } = body;

    const existing = await db.profile.findUnique({ where: { userId: user.id } });
    if (existing) {
      await db.profile.update({
        where: { userId: user.id },
        data: { bank, bankHolder: holder, bankNumber: number },
      });
    } else {
      await db.profile.create({
        data: { userId: user.id, bank, bankHolder: holder, bankNumber: number },
      });
    }

    return NextResponse.json({ message: "Rekening berhasil disimpan" });
  } catch (error) {
    console.error("Rekening update error:", error);
    return NextResponse.json({ error: "Gagal menyimpan rekening" }, { status: 500 });
  }
}

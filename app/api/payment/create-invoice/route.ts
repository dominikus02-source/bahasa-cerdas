import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createTransaction } from "@/lib/midtrans";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { plan } = body;

    if (!["monthly", "yearly"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const { transactionToken, orderId } = await createTransaction({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      plan,
    });

    await db.transaksi.create({
      data: {
        userId: user.id,
        type: "PREMIUM_UPGRADE",
        amount: plan === "monthly" ? 49000 : 399000,
        status: "PENDING",
        reference: `premium_${plan}`,
        orderId,
      },
    });

    return NextResponse.json({ token: transactionToken, orderId });
  } catch (error) {
    console.error("Create transaction error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

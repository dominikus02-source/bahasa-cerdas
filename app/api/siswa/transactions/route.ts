import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getTransactions } from "@/lib/coins";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const transactions = await getTransactions(user.id);
    return NextResponse.json({ transactions });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

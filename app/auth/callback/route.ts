import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

async function syncUser(supabaseUserId: string, email: string, metadata: Record<string, unknown>) {
  let user = await db.user.findUnique({ where: { supabaseId: supabaseUserId } });
  if (!user) user = await db.user.findFirst({ where: { email: email.toLowerCase() } });

  if (!user) {
    const fullName = (metadata?.full_name as string) || email.split("@")[0];
    const role = metadata?.role === "GURU" ? "GURU" : "MURID";
    user = await db.user.create({
      data: {
        supabaseId: supabaseUserId,
        email: email.toLowerCase(),
        fullName,
        role,
      },
    });
    try { await db.profile.create({ data: { userId: user.id } }); } catch {}
  } else if (user.supabaseId !== supabaseUserId) {
    await db.user.update({ where: { id: user.id }, data: { supabaseId: supabaseUserId } });
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Sync Prisma User record for OAuth logins (Google, etc.)
    if (data?.user) {
      await syncUser(data.user.id, data.user.email || "", data.user.user_metadata || {});
    }
  }

  if (token_hash && type) {
    return NextResponse.redirect(`${requestUrl.origin}/confirm?token_hash=${token_hash}&type=${type}`);
  }

  return NextResponse.redirect(`${requestUrl.origin}${next}`);
}

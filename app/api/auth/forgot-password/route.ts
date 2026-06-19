import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email diperlukan" }, { status: 400 });

    // Check if user exists in our DB
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return NextResponse.json({ error: "Email tidak terdaftar" }, { status: 404 });

    // Generate reset link via Supabase Auth (this sends email through Supabase)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bahasacerdas.com";

    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (error?.message?.includes("rate limit")) {
      // Fallback: send email via Resend if Supabase rate-limited
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "BahasaCerdas <noreply@bahasacerdas.com>",
            to: email.toLowerCase(),
            subject: "Reset Password - BahasaCerdas",
            html: `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #dc2626, #1e3a8a); padding: 24px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 20px;">BahasaCerdas</h1>
                </div>
                <div style="padding: 24px;">
                  <h2>Reset Password</h2>
                  <p>Kami menerima permintaan reset password untuk akun <strong>${email.toLowerCase()}</strong>.</p>
                  <p>Silakan klik tombol di bawah untuk membuat password baru:</p>
                  <a href="${siteUrl}/reset-password" style="display: inline-block; margin: 16px 0; padding: 12px 32px; background: #dc2626; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Reset Password
                  </a>
                  <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
                    Jika kamu tidak meminta reset password, abaikan email ini.
                  </p>
                </div>
              </div>
            `,
          }),
        });

        if (res.ok) {
          return NextResponse.json({ message: "Email reset password terkirim. Cek inbox/spam." });
        }
      } catch {}

      return NextResponse.json({ error: "Gagal mengirim email. Coba lagi nanti." }, { status: 429 });
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ message: "Link reset password sudah dikirim ke email kamu" });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

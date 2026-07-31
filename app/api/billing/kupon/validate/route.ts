import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getPlan } from "@/lib/billing/plans";
import { validasiKupon } from "@/lib/billing/kupon";

// POST /api/billing/kupon/validate
// Body: { kode, planId }
// Memvalidasi kupon & menghitung harga akhir untuk plan terpilih.
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Silakan login terlebih dahulu." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const kode = typeof body.kode === "string" ? body.kode : "";
    const planId = typeof body.planId === "string" ? body.planId : "";
    const plan = getPlan(planId);
    if (!plan) {
      return NextResponse.json({ ok: false, error: "Paket tidak tersedia." }, { status: 400 });
    }

    let result;
    try {
      result = await validasiKupon(kode, user, { planId: plan.planId, price: plan.price });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message || "Kupon tidak valid." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      kupon: result.kupon,
      hargaAsli: result.hargaAsli,
      hargaDiskon: result.hargaDiskon,
      diskonPersen: result.kupon.diskonPersen,
      hemat: result.hargaAsli - result.hargaDiskon,
    });
  } catch (error) {
    console.error("POST /api/billing/kupon/validate error:", error);
    return NextResponse.json({ ok: false, error: "Terjadi kesalahan sistem." }, { status: 500 });
  }
}

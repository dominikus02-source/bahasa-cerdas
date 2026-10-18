import type { Metadata } from "next"
import { getUser } from "@/lib/supabase/server"
import { getPublicPaymentStatus } from "@/lib/payments/midtrans-reconcile"
import type { PanelView } from "@/components/billing/PaymentStatusPanel"
import PaymentFinishView from "@/components/billing/PaymentFinishView"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Hasil pembayaran · BahasaCerdas", robots: { index: false } }

const ORDER_ID_RE = /^[A-Za-z0-9._~-]{4,64}$/

/**
 * Tujuan redirect Snap (callbacks.finish). Query string TIDAK dipercaya:
 * status diambil dari database + Midtrans di server. Halaman ini publik
 * agar tetap berguna saat sesi habis; rincian akun hanya untuk pemilik.
 */
export default async function PaymentFinishPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>
}) {
  const { order_id } = await searchParams
  const orderId = order_id && ORDER_ID_RE.test(order_id) ? order_id : null
  const user = (await getUser().catch(() => null)) as { id: string } | null

  let view: PanelView = { orderId: orderId ?? "-", status: "NOT_FOUND", kind: "LAIN", planLabel: null, owner: null }
  if (orderId) {
    try {
      view = await getPublicPaymentStatus(orderId, user ? { id: user.id } : null)
    } catch (err) {
      console.error("[PaymentFinish] status failed", { orderId, message: (err as Error)?.message })
      view = { ...view, status: "PENDING" }
    }
  }

  return <PaymentFinishView view={view} loggedIn={Boolean(user)} />
}

import { CheckCircle, XCircle, ShoppingBag, ArrowLeft, Crown } from "lucide-react"
import Link from "next/link"

export default async function PaymentFinishPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string; transaction_status?: string; status_code?: string }>
}) {
  const { order_id, transaction_status } = await searchParams

  const isSuccess = transaction_status === "settlement" || transaction_status === "capture"
  const isPending = transaction_status === "pending"
  const isFailed =
    transaction_status === "deny" ||
    transaction_status === "cancel" ||
    transaction_status === "expire"

  // Determine context from order_id prefix
  const isGuruPro = order_id?.startsWith("PM-")
  const successLink = isGuruPro ? "/guru/berlangganan" : "/orders"
  const successLabel = isGuruPro ? "Ke Halaman Berlangganan" : "Lihat Pesanan Saya"
  const failLink = isGuruPro ? "/guru/berlangganan" : "/marketplace"
  const failLabel = isGuruPro ? "Coba Lagi" : "Kembali ke Marketplace"

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center">
        {isSuccess ? (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {isGuruPro ? <Crown className="w-10 h-10 text-green-600" /> : <CheckCircle className="w-10 h-10 text-green-600" />}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Berhasil!</h1>
            <p className="text-gray-500 mb-6">
              {isGuruPro ? "Akun Guru Pro kamu sudah aktif. Nikmati 500 kredit AI setiap bulan!" : "Terima kasih, pembayaran kamu sudah dikonfirmasi."}
            </p>
            {order_id && (
              <p className="text-xs text-gray-400 mb-6 bg-gray-50 rounded-lg px-4 py-2">
                Order ID: {order_id}
              </p>
            )}
            <div className="flex flex-col gap-3">
              <Link
                href={successLink}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition"
              >
                {isGuruPro ? <Crown className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                {successLabel}
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Ke Beranda
              </Link>
            </div>
          </div>
        ) : isPending ? (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin w-6 h-6 border-[3px] border-amber-500 border-t-transparent rounded-full" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Menunggu Konfirmasi</h1>
            <p className="text-gray-500 mb-6">Pembayaran sedang diproses. Cek status di halaman terkait.</p>
            <Link
              href={successLink}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition"
            >
              Kembali
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Gagal</h1>
            <p className="text-gray-500 mb-6">Silakan coba lagi atau gunakan metode pembayaran lain.</p>
            <Link
              href={failLink}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition"
            >
              {failLabel}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

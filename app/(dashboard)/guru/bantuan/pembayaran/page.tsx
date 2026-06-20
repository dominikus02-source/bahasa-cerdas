import { Card } from "@/components/ui/card";
import { Info, Mail, Clock, FileText, Camera, ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function BantuanPembayaranPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/guru/berlangganan" className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700">
        <ArrowLeft size={14} /> Kembali ke Berlangganan
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bantuan Pembayaran</h1>
        <p className="text-sm text-gray-500 mt-1">Panduan jika pembayaran berhasil tetapi akun PRO belum aktif.</p>
      </div>

      {/* Langkah-langkah */}
      <Card className="p-6">
        <h2 className="font-bold text-gray-900 mb-4">Langkah jika PRO belum aktif</h2>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">1. Tunggu 5 menit</p>
              <p className="text-xs text-gray-500 mt-0.5">Pembayaran perlu waktu untuk dikonfirmasi oleh sistem. Refresh halaman setelah 5 menit.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">2. Siapkan informasi</p>
              <p className="text-xs text-gray-500 mt-0.5">Jika setelah 5 menit masih belum aktif, siapkan data berikut:</p>
              <ul className="mt-2 space-y-1.5 text-xs text-gray-600">
                <li className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-gray-400" />
                  Email akun BahasaCerdas Anda
                </li>
                <li className="flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-gray-400" />
                  Nomor transaksi / Order ID
                </li>
                <li className="flex items-center gap-1.5">
                  <Camera className="w-3 h-3 text-gray-400" />
                  Screenshot bukti pembayaran
                </li>
                <li className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-gray-400" />
                  Perkiraan waktu pembayaran
                </li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <Info className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">3. Hubungi admin</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Sampaikan informasi di atas kepada admin BahasaCerdas. Tim kami akan memverifikasi dan mengaktifkan akun PRO Anda secara manual.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* FAQ */}
      <Card className="p-6">
        <h2 className="font-bold text-gray-900 mb-4">Pertanyaan Terkait</h2>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-semibold text-gray-700">Apakah pembayaran diperpanjang otomatis?</p>
            <p className="text-gray-500 mt-0.5">Tidak. Pembayaran bersifat sekali bayar. Anda perlu membeli lagi saat masa PRO habis.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Bagaimana jika saya sudah PRO dan beli lagi?</p>
            <p className="text-gray-500 mt-0.5">Masa aktif PRO akan diperpanjang dari tanggal berakhir saat ini, bukan dari tanggal pembelian baru.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Bagaimana cara melihat Order ID?</p>
            <p className="text-gray-500 mt-0.5">Order ID tercantum di halaman konfirmasi setelah pembayaran, atau di email/SMS notifikasi dari Midtrans.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Apakah bisa refund?</p>
            <p className="text-gray-500 mt-0.5">Kebijakan refund tersedia. Hubungi admin dengan menyertakan alasan dan bukti pembayaran.</p>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Link href="/guru/berlangganan" className="flex-1 text-center py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm hover:from-amber-600">
          Kembali ke Berlangganan
        </Link>
        <Link href="/guru/ai-tools" className="flex-1 text-center py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50">
          <ChevronRight className="w-4 h-4 inline mr-1" /> Alat AI
        </Link>
      </div>
    </div>
  );
}

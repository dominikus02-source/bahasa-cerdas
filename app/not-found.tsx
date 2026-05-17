import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-extrabold text-red-600 mb-4">404</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Halaman Tidak Ditemukan</h1>
        <p className="text-slate-500 mb-8">Halaman yang kamu cari tidak ada atau telah dipindahkan.</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors">
            Kembali ke Beranda
          </Link>
          <Link href="/artikel" className="px-6 py-2.5 text-slate-600 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
            Lihat Artikel
          </Link>
        </div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingBag, TrendingUp, Award, Users, ArrowRight, Star, Wallet } from "lucide-react"
import Link from "next/link"

export default function MarketplaceSection() {
  const topProducts = [
    {
      title: "Paket Lengkap RPP Kelas X Kurikulum Merdeka",
      author: "Bu Sari - SMA Negeri 1 Jakarta",
      price: 150000,
      sales: 342,
      rating: 4.9,
      image: "📚",
      category: "RPP",
    },
    {
      title: "Modul Ajar Teks Argumentasi + PPT Interaktif",
      author: "Pak Budi - SMP Negeri 5 Bandung",
      price: 85000,
      sales: 218,
      rating: 4.8,
      image: "📖",
      category: "Modul",
    },
    {
      title: "Bank Soal HOTS Bahasa Indonesia SMA",
      author: "Bu Dewi - SMA Negeri 3 Surabaya",
      price: 120000,
      sales: 189,
      rating: 5.0,
      image: "✍️",
      category: "Soal",
    },
  ]

  return (
    <section className="py-20 lg:py-32 bg-white" id="marketplace">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold mb-6">
            <ShoppingBag className="w-4 h-4" />
            Toko Karya Guru
          </div>

          <h2 className="text-3xl lg:text-5xl font-extrabold text-slate-900 mb-6">
            Monetisasi Karya,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-pink-600">
              Dukung Sesama Guru
            </span>
          </h2>

          <p className="text-lg text-slate-600 leading-relaxed mb-12">
            Jual RPP, modul, video, atau ebook karya Anda. Dapatkan royalti hingga 90%. Beli kebutuhan mengajar dengan harga terjangkau dari guru untuk guru.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-12 bg-gradient-to-r from-red-50 via-pink-50 to-orange-50 p-6 rounded-2xl border-2 border-red-100 shadow-lg">
            <div className="text-center border-r border-red-200">
              <Wallet className="w-5 h-5 text-red-600 mx-auto mb-1" />
              <p className="text-2xl lg:text-3xl font-extrabold text-red-600">Rp 127 Jt+</p>
              <p className="text-xs text-slate-600 font-semibold mt-1">Omzet Dibagikan</p>
            </div>
            <div className="text-center border-r border-red-200">
              <ShoppingBag className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl lg:text-3xl font-extrabold text-blue-600">500+</p>
              <p className="text-xs text-slate-600 font-semibold mt-1">Karya Terjual</p>
            </div>
            <div className="text-center">
              <Award className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
              <p className="text-2xl lg:text-3xl font-extrabold text-yellow-600">90%</p>
              <p className="text-xs text-slate-600 font-semibold mt-1">Komisi Kontributor</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/marketplace">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-lg px-8 py-6 rounded-2xl shadow-lg shadow-red-500/30 transition-all hover:scale-105 group">
                Jelajahi Toko Karya
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/guru/toko-karya">
              <Button variant="outline" className="w-full sm:w-auto border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-lg px-8 py-6 rounded-2xl transition-all">
                Mulai Jual Karya
              </Button>
            </Link>
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 mb-8 flex items-center justify-center gap-2">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            Karya Terpopuler Minggu Ini
          </h3>

          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <Link href="/guru/toko-karya" key={index} className="block">
                <div className="bg-white rounded-2xl p-6 border-2 border-slate-100 hover:border-red-300 shadow-md hover:shadow-xl transition-all cursor-pointer group">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-pink-100 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shrink-0">
                      {product.image}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <Badge className="bg-red-100 text-red-700 border-0 text-xs mb-2">{product.category}</Badge>
                          <h4 className="font-bold text-slate-900 group-hover:text-red-600 transition-colors line-clamp-1">{product.title}</h4>
                          <p className="text-sm text-slate-500 mt-1">{product.author}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold text-red-600">Rp {product.price.toLocaleString("id-ID")}</p>
                          <div className="flex items-center gap-1 mt-1 justify-end">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-semibold text-slate-700">{product.rating}</span>
                            <span className="text-xs text-slate-400">({product.sales})</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-8 text-center border border-red-100">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-xl text-slate-900 mb-3">Upload Mudah</h3>
            <p className="text-slate-600">Upload karya dalam 3 langkah. Support PDF, PPT, Video, dan format lainnya.</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 text-center border border-blue-100">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
              <TrendingUp className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-xl text-slate-900 mb-3">Komisi Tinggi</h3>
            <p className="text-slate-600">Dapatkan 85-90% dari setiap penjualan. Pencairan cepat ke rekening Anda.</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 text-center border border-yellow-100">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
              <Award className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-xl text-slate-900 mb-3">Dashboard Real-time</h3>
            <p className="text-slate-600">Pantau penjualan, pendapatan, dan review pembeli secara real-time.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

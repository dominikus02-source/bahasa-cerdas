import Link from "next/link";
import Image from "next/image";

export default function PageFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm">
                BC
              </div>
              <div>
                <span className="text-xl font-bold text-white">BahasaCerdas</span>
                <p className="text-xs text-slate-500">Platform Edukasi Bahasa Indonesia</p>
              </div>
            </div>
            <p className="text-sm">Platform Terlengkap untuk Guru Bahasa Indonesia. MGMP + AI + Marketplace.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Link href="/artikel" className="text-xs text-slate-500 hover:text-white transition-colors">Artikel</Link>
              <span className="text-slate-700">•</span>
              <Link href="/ai-bc" className="text-xs text-slate-500 hover:text-white transition-colors">AI BC</Link>
              <span className="text-slate-700">•</span>
              <Link href="/marketplace" className="text-xs text-slate-500 hover:text-white transition-colors">Toko Karya</Link>
              <span className="text-slate-700">•</span>
              <Link href="/video-belajar" className="text-xs text-slate-500 hover:text-white transition-colors">Video</Link>
            </div>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Fitur</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/ai-bc" className="hover:text-white transition-colors">AI Generator RPP</Link></li>
              <li><Link href="/guru/bank-soal" className="hover:text-white transition-colors">Bank Soal HOTS</Link></li>
              <li><Link href="/guru/game/lobby" className="hover:text-white transition-colors">Kuis Multiplayer</Link></li>
              <li><Link href="/marketplace" className="hover:text-white transition-colors">Toko Karya</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Komunitas</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/guru/komunitas" className="hover:text-white transition-colors">Forum Diskusi</Link></li>
              <li><Link href="/guru/komunitas" className="hover:text-white transition-colors">Webinar</Link></li>
              <li><Link href="/guru/komunitas" className="hover:text-white transition-colors">Mentoring</Link></li>
              <li><Link href="/artikel" className="hover:text-white transition-colors">Artikel Tips</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Tentang</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Tentang Kami</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Kebijakan Privasi</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Syarat & Ketentuan</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Hubungi Kami</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-8 text-center text-sm">
          <p>&copy; 2026 BahasaCerdas. Platform edukasi Bahasa Indonesia untuk bangsa.</p>
        </div>
      </div>
    </footer>
  );
}

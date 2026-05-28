import Link from "next/link";

const footerLinks = {
  Produk: [
    { href: "/ai-bc", label: "AI BC" },
    { href: "/marketplace", label: "Toko Karya" },
    { href: "/video-belajar", label: "Video Belajar" },
    { href: "/guru/game/lobby", label: "Kuis Multiplayer" },
    { href: "/guru/bank-soal", label: "Bank Soal" },
  ],
  Komunitas: [
    { href: "/guru/komunitas", label: "Forum Diskusi" },
    { href: "/artikel", label: "Artikel & Tips" },
    { href: "/guru/komunitas", label: "Webinar" },
    { href: "/loker", label: "Lowongan Kerja" },
  ],
  Perusahaan: [
    { href: "/tentang", label: "Tentang Kami" },
    { href: "/kebijakan-privasi", label: "Kebijakan Privasi" },
    { href: "/syarat-ketentuan", label: "Syarat & Ketentuan" },
  ],
};

export default function PageFooter() {
  return (
    <footer className="bg-zinc-900 text-zinc-400">
      <div className="section-container py-16 lg:py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12">
          <div className="sm:col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4" aria-label="BahasaCerdas - Beranda">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary/30">
                BC
              </div>
              <div>
                <span className="text-xl font-bold text-white">BahasaCerdas</span>
                <p className="text-xs text-zinc-500">Platform edukasi Bahasa Indonesia</p>
              </div>
            </Link>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6 max-w-sm">
              Platform edukasi Bahasa Indonesia terlengkap. MGMP + AI + Toko Karya dalam satu ekosistem.
            </p>
            <div className="flex gap-3">
              <a
                href="mailto:halo@bahasacerdas.com"
                className="text-xs text-zinc-500 hover:text-amber-400 transition-colors focus-ring rounded"
              >
                halo@bahasacerdas.com
              </a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-white text-sm mb-4">{title}</h4>
              <nav aria-label={`Tautan ${title}`}>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-zinc-400 hover:text-white transition-colors duration-200 focus-ring rounded"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-800">
        <div className="section-container py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-500">
            &copy; {new Date().getFullYear()} BahasaCerdas. Platform edukasi Bahasa Indonesia.
          </p>
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <Link href="/kebijakan-privasi" className="hover:text-zinc-400 transition-colors focus-ring rounded">
              Privasi
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link href="/syarat-ketentuan" className="hover:text-zinc-400 transition-colors focus-ring rounded">
              Ketentuan
            </Link>
            <span aria-hidden="true">&bull;</span>
            <span>Dibuat dengan cinta di Indonesia</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import Image from "next/image";
import { Instagram, Youtube, Mail } from "lucide-react";

const footerLinks = [
  {
    title: "Produk",
    links: [
      { href: "/ai-bc", label: "AI BC" },
      { href: "/marketplace", label: "Toko Karya" },
      { href: "/video-belajar", label: "Video Belajar" },
      { href: "/guru/game/lobby", label: "Kuis Multiplayer" },
      { href: "/guru/bank-soal", label: "Bank Soal" },
    ],
  },
  {
    title: "Komunitas",
    links: [
      { href: "/guru/komunitas", label: "Forum Diskusi" },
      { href: "/artikel", label: "Artikel & Tips" },
      { href: "/guru/komunitas", label: "Webinar" },
      { href: "/loker", label: "Lowongan Kerja" },
    ],
  },
  {
    title: "Perusahaan",
    links: [
      { href: "/tentang", label: "Tentang Kami" },
      { href: "/faq", label: "FAQ" },
      { href: "/kebijakan-privasi", label: "Kebijakan Privasi" },
      { href: "/syarat-ketentuan", label: "Syarat & Ketentuan" },
    ],
  },
];

const socialLinks = [
  { href: "https://instagram.com/bahasa_cerdas", label: "Instagram", icon: Instagram, hoverColor: "hover:text-pink-400" },
  { href: "https://www.youtube.com/@bahasacerdasdotcom", label: "YouTube", icon: Youtube, hoverColor: "hover:text-red-400" },
];

export default function PageFooter() {
  return (
    <footer className="bg-zinc-900 text-zinc-400">
      <div className="section-container py-16 lg:py-20">
        {/* Brand — satu kolom, rata tengah */}
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="flex items-center gap-3 mb-4" aria-label="BahasaCerdas - Beranda">
            <div className="relative w-10 h-10 shrink-0">
              <Image
                src="/BC-logo.png"
                alt="BahasaCerdas"
                fill
                sizes="40px"
                className="object-contain"
              />
            </div>
            <span className="text-2xl font-bold text-white">BahasaCerdas</span>
          </Link>
          <p className="text-sm text-zinc-300 leading-relaxed max-w-md mb-2">
            Platform edukasi Bahasa Indonesia lengkap.
          </p>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-md mb-6">
            MGMP, AI, dan Toko Karya dalam satu ekosistem untuk guru dan murid.
          </p>

          <div className="flex items-center gap-3">
            <a
              href="mailto:halo@bahasacerdas.com"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700 text-xs font-medium text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors focus-ring"
            >
              <Mail className="w-3.5 h-3.5" />
              halo@bahasacerdas.com
            </a>
            {socialLinks.map(({ href, label, icon: Icon, hoverColor }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className={`flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-800/80 border border-zinc-700 text-zinc-300 ${hoverColor} transition-colors focus-ring`}
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Navigasi — satu kolom panjang */}
        <div className="mt-14 border-t border-zinc-800 pt-12 flex flex-col items-center">
          {footerLinks.map((group, i) => (
            <div key={group.title} className={`w-full max-w-md text-center ${i > 0 ? "mt-10" : ""}`}>
              <h4 className="font-semibold text-white text-sm mb-4 tracking-wide">
                {group.title}
              </h4>
              <nav aria-label={`Tautan ${group.title}`}>
                <ul className="space-y-2.5">
                  {group.links.map((link) => (
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
        <div className="section-container py-6 flex flex-col items-center gap-3">
          <p className="text-xs text-zinc-500">
            &copy; {new Date().getFullYear()} BahasaCerdas. Platform edukasi Bahasa Indonesia.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-zinc-600">
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

import Link from "next/link";
import { School, ClipboardList, TrendingUp, BookOpenCheck, Award, MessageCircle } from "lucide-react";

const ITEMS = [
  { href: "/murid/gabung-kelas", label: "Kelas", description: "Gabung dan lihat kelasmu.", icon: School },
  { href: "/arena/tugas", label: "Tugas", description: "Kerjakan tugas dari guru.", icon: ClipboardList },
  { href: "/murid/progresku", label: "Progres", description: "Lihat perkembangan belajarmu.", icon: TrendingUp },
  { href: "/murid/simulasi/ukbi", label: "Simulasi UKBI", description: "Latihan dan ukur kemampuan Bahasa Indonesia.", icon: BookOpenCheck },
  { href: "/murid/simulasi/tka", label: "Simulasi TKA", description: "Persiapkan diri menghadapi TKA.", icon: BookOpenCheck },
  { href: "/murid/dokumen-latihan", label: "Hasil", description: "Lihat hasil latihan dan ujianmu.", icon: Award },
];

export default function BelajarPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-1 py-2 md:px-0">
      <header className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Belajar</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Mau belajar apa hari ini?</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">Semua aktivitas belajar murid ada di satu tempat.</p>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
        {ITEMS.map(({ href, label, description, icon: Icon }) => (
          <Link key={href} href={href} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"><Icon size={21} /></div>
            <h2 className="mt-4 text-sm font-extrabold text-slate-900 dark:text-white">{label}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
          </Link>
        ))}
      </div>
      <Link href="/arena/chat" className="mt-5 flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-sm font-bold text-violet-800 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200">
        <MessageCircle size={19} />
        <span><span className="block">Obrolan</span><span className="mt-0.5 block text-xs font-medium text-violet-700/80 dark:text-violet-300/80">Diskusi dengan guru dan teman.</span></span>
      </Link>
    </div>
  );
}
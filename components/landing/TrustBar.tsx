import { ScrollText, FileText, GraduationCap, Users } from "lucide-react";

// Sengaja tanpa angka spesifik (jumlah soal, jumlah pengguna, dst) — angka
// itu terus berubah dan akhirnya butuh dijelaskan/diperbarui terus-menerus.
// Ini hanya menunjukkan apa yang tersedia, bukan seberapa banyak.
const coverage = [
  { icon: ScrollText, label: "Bank Soal", sub: "Terus bertambah" },
  { icon: FileText, label: "Materi Ajar", sub: "Siap diunduh" },
  { icon: GraduationCap, label: "Kelas 1–12", sub: "SD, SMP, SMA/SMK" },
  { icon: Users, label: "Komunitas Guru", sub: "MGMP digital" },
];

export default function TrustBar() {
  return (
    <section className="relative py-12 lg:py-16 bg-white border-y border-zinc-100" aria-label="Yang tersedia di BahasaCerdas">
      <div className="section-container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-200 rounded-2xl overflow-hidden border border-zinc-200">
          {coverage.map((c) => (
            <div key={c.label} className="bg-white px-6 py-7 text-center flex flex-col items-center">
              <div className="w-11 h-11 rounded-xl bg-primary-light flex items-center justify-center mb-3">
                <c.icon size={20} className="text-primary" aria-hidden="true" />
              </div>
              <div className="text-zinc-900 font-semibold text-base leading-snug mb-1">
                {c.label}
              </div>
              <div className="text-xs font-bold tracking-wider uppercase text-primary/70">
                {c.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { BookOpen, Users, FileText, Award } from "lucide-react";

const stats = [
  { icon: Users, value: "10.000+", label: "Guru Terdaftar" },
  { icon: FileText, value: "5.000+", label: "Materi Ajar & RPP" },
  { icon: BookOpen, value: "1.200+", label: "Soal & Kuis Interaktif" },
  { icon: Award, value: "4.8/5", label: "Rating dari Pengguna" },
];

export default function TrustBar() {
  return (
    <section className="relative py-12 lg:py-16 bg-white">
      <div className="section-container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="relative group text-center p-6 rounded-2xl bg-zinc-50/50 hover:bg-zinc-50 transition-colors duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon size={22} className="text-primary" />
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-zinc-900 mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-zinc-500 font-medium">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

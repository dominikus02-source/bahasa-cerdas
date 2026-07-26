import { db } from "@/lib/db";

// Statistik nyata, dihitung langsung dari database saat halaman dirender —
// bukan angka target/aspirasi yang dipoles jadi terlihat seperti pencapaian.
// TrustBar sebelumnya menampilkan "57K+ baris kode" dan "350K+ guru yang
// bisa kami jangkau" (target pasar, bukan pengguna) lengkap dengan catatan
// kaki yang mengakui itu bukan angka pengguna — kredibilitas yang merusak
// dirinya sendiri. Sekarang hanya angka yang benar-benar bisa diperiksa.
async function getStats() {
  try {
    const [soalCount, materiCount, userCount] = await Promise.all([
      db.soal.count(),
      db.materi.count({ where: { isPublished: true } }),
      db.user.count({ where: { role: { in: ["GURU", "MURID"] } } }),
    ]);
    return { soalCount, materiCount, userCount };
  } catch {
    return { soalCount: 0, materiCount: 0, userCount: 0 };
  }
}

export default async function TrustBar() {
  const { soalCount, materiCount, userCount } = await getStats();

  const stats = [
    { value: soalCount.toLocaleString("id-ID") + "+", label: "Soal di bank soal", sub: "Bahasa Indonesia" },
    { value: materiCount.toLocaleString("id-ID") + "+", label: "Materi ajar tersedia", sub: "Siap diunduh" },
    { value: "Kelas 1–12", label: "Jenjang yang dicakup", sub: "SD, SMP, SMA/SMK" },
    { value: userCount.toLocaleString("id-ID") + "+", label: "Guru & siswa terdaftar", sub: "Dan terus bertambah" },
  ];

  return (
    <section className="relative py-12 lg:py-16 bg-white border-y border-zinc-100" aria-label="Statistik platform">
      <div className="section-container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-200 rounded-2xl overflow-hidden border border-zinc-200">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white px-6 py-7 text-center">
              <div className="font-display text-4xl font-normal leading-none mb-2 text-primary">
                {stat.value}
              </div>
              <div className="text-zinc-500 text-sm leading-snug mb-2">
                {stat.label}
              </div>
              <div className="text-xs font-bold tracking-wider uppercase text-primary/70">
                {stat.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

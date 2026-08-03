import Link from "next/link";
import { Check, Lock, Gift, Play } from "lucide-react";
import { UnitIcon } from "@/components/arena/UnitIcon";

export interface PetaUnit {
  id: string;
  title: string;
  subtitle?: string | null;
  emoji?: string | null;
}

/**
 * Peta Jalur Cerdas — simpul berkelok, bukan daftar.
 *
 * Kenapa bukan daftar: versi lama menampilkan 72 baris "Unit latihan · 10 soal",
 * yang terbaca sebagai silabus. Hanya 5 dari 157 murid pernah membukanya.
 * Daftar memberi tahu anak berapa banyak yang TERSISA ("4/72"), dan jarak
 * sejauh itu melumpuhkan. Peta hanya memperlihatkan langkah berikutnya.
 *
 * Tiga hal yang sengaja dirancang untuk membuat anak kembali:
 *
 * 1. HADIAH SELALU TERLIHAT DEKAT — peti muncul tiap 5 simpul, jadi yang
 *    dibaca anak bukan "68 lagi" melainkan "3 lagi sampai peti".
 * 2. SATU TITIK FOKUS — hanya simpul aktif yang berdenyut dan diberi label
 *    "Mulai". Simpul lain tenang, supaya tidak ada kebingungan memilih.
 * 3. RASA PENASARAN — simpul yang masih jauh diredupkan dan judulnya
 *    disembunyikan. Yang belum diketahui menarik anak untuk membukanya.
 */
export function JalurPeta({
  units,
  completedIds,
  questionCounts,
  sedangDipelajari,
}: {
  units: PetaUnit[];
  completedIds: Set<string>;
  questionCounts?: Map<string, number>;
  sedangDipelajari?: (unitId: string) => boolean;
}) {
  if (units.length === 0) {
    return <p className="ml-2 text-sm italic text-gray-400">Segera hadir…</p>;
  }

  // Simpul aktif = unit pertama yang belum selesai. Inilah satu-satunya yang
  // ditonjolkan; sisanya sengaja dibuat tenang.
  const indeksAktif = units.findIndex((u) => !completedIds.has(u.id));

  // Pergeseran berkelok. Pola 8 langkah supaya lekukannya terasa alami dan
  // tidak berulang terlalu cepat seperti zig-zag dua posisi.
  const geser = [0, 56, 84, 56, 0, -56, -84, -56];

  // Palet berputar — tiap simpul punya warnanya sendiri. Satu warna untuk
  // seluruh jalur membuat peta terasa seperti formulir; anak membaca warna
  // sebagai "tempat yang berbeda", dan itu yang membuatnya ingin maju.
  // Tiap warna punya pasangan gelap untuk bibir bawah tombol (kesan timbul).
  const PALET = [
    { atas: "#8b5cf6", bawah: "#6d28d9" }, // ungu
    { atas: "#06b6d4", bawah: "#0e7490" }, // toska
    { atas: "#f59e0b", bawah: "#b45309" }, // jingga
    { atas: "#ec4899", bawah: "#be185d" }, // merah muda
    { atas: "#22c55e", bawah: "#15803d" }, // hijau
    { atas: "#3b82f6", bawah: "#1d4ed8" }, // biru
  ];

  return (
    <div className="relative py-2">
      {units.map((unit, idx) => {
        const selesai = completedIds.has(unit.id);
        const aktif = idx === indeksAktif;
        // Lebih dari 2 langkah di depan simpul aktif → diredupkan.
        const jauh = indeksAktif >= 0 && idx > indeksAktif + 2;
        const x = geser[idx % geser.length];
        const jumlahSoal = questionCounts?.get(unit.id);
        const dipelajari = sedangDipelajari?.(unit.id) && !selesai;
        const warna = PALET[idx % PALET.length];

        // Peti tiap 5 simpul, ditaruh SESUDAH simpulnya.
        const adaPeti = (idx + 1) % 5 === 0 && idx !== units.length - 1;
        const petiTerbuka = units
          .slice(Math.max(0, idx - 4), idx + 1)
          .every((u) => completedIds.has(u.id));

        return (
          <div key={unit.id}>
            <div className="flex flex-col items-center" style={{ transform: `translateX(${x}px)` }}>
              <Link
                href={`/arena/jalur-cerdas/${unit.id}`}
                aria-label={unit.title}
                className="group relative flex flex-col items-center"
              >
                {/* Cincin denyut hanya pada simpul aktif. */}
                {aktif && (
                  <span className="absolute -inset-3 animate-ping rounded-full" style={{ background: `${warna.atas}44` }} />
                )}

                <span
                  className="relative flex items-center justify-center rounded-full text-white transition-transform duration-100 group-hover:-translate-y-0.5 group-active:translate-y-1"
                  style={{
                    width: aktif ? 78 : 64,
                    height: aktif ? 78 : 64,
                    background: selesai ? "#22c55e" : aktif ? warna.atas : jauh ? "#e5e7eb" : warna.atas,
                    // Bibir bawah gelap = kesan tombol timbul yang bisa dipencet.
                    boxShadow: jauh
                      ? "0 4px 0 0 #d1d5db"
                      : `0 6px 0 0 ${selesai ? "#15803d" : warna.bawah}, 0 10px 18px -6px ${selesai ? "#15803d" : warna.bawah}88`,
                    color: jauh ? "#9ca3af" : "#fff",
                  }}
                >
                  {selesai ? (
                    <Check className="h-8 w-8" strokeWidth={3} />
                  ) : aktif ? (
                    <Play className="h-7 w-7 fill-current" />
                  ) : jauh ? (
                    <Lock className="h-6 w-6" />
                  ) : (
                    <UnitIcon emoji={unit.emoji} className="h-7 w-7" />
                  )}
                </span>

                {aktif && (
                  <span
                    className="mt-3 animate-bounce rounded-full px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-lg"
                    style={{ background: warna.atas, boxShadow: `0 3px 0 0 ${warna.bawah}` }}
                  >
                    Ayo Mulai!
                  </span>
                )}

                {/* Judul disembunyikan pada simpul jauh — rasa penasaran itu
                    justru yang menarik anak membukanya besok. */}
                <span
                  className={`mt-1.5 max-w-[150px] text-center text-xs font-bold leading-tight ${
                    selesai ? "text-emerald-700" : jauh ? "text-gray-300" : "text-gray-800"
                  }`}
                >
                  {jauh ? "???" : unit.title}
                </span>

                {!jauh && jumlahSoal ? (
                  <span className="mt-0.5 text-[10px] font-semibold text-gray-400">
                    {jumlahSoal} soal
                  </span>
                ) : null}

                {dipelajari && (
                  <span className="mt-0.5 text-[10px] font-bold text-violet-500">Sedang dipelajari</span>
                )}
              </Link>
            </div>

            {/* Penghubung antar simpul. */}
            {idx !== units.length - 1 && !adaPeti && (
              <div className="flex justify-center gap-1.5 py-2.5">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="h-2 w-2 rounded-full"
                    style={{ background: selesai ? "#86efac" : "#e5e7eb" }}
                  />
                ))}
              </div>
            )}

            {adaPeti && (
              <div className="flex flex-col items-center py-2">
                <span className={`h-5 w-1.5 rounded-full ${petiTerbuka ? "bg-amber-300" : "bg-gray-200"}`} />
                <span
                  className={`my-1 flex h-14 w-14 items-center justify-center rounded-2xl border-4 ${
                    petiTerbuka
                      ? "border-amber-500 bg-amber-400 text-amber-900 shadow-lg shadow-amber-400/40"
                      : "border-gray-200 bg-gray-100 text-gray-300"
                  }`}
                >
                  <Gift className="h-7 w-7" />
                </span>
                <span
                  className={`text-[10px] font-black uppercase tracking-wide ${
                    petiTerbuka ? "text-amber-600" : "text-gray-300"
                  }`}
                >
                  {petiTerbuka ? "Peti terbuka!" : "Peti hadiah"}
                </span>
                <span className={`mt-1 h-5 w-1.5 rounded-full ${petiTerbuka ? "bg-amber-300" : "bg-gray-200"}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

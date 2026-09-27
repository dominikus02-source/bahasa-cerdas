import Image from "next/image";

/**
 * Pendamping Jalur Cerdas — Zelby.
 *
 * Satu karakter dipertahankan sepanjang latihan agar identitas visual tidak
 * terasa ramai. Keadaan Zelby mengikuti loop belajar:
 * berpikir → merayakan jawaban benar → menenangkan saat jawaban belum tepat.
 */

type Keadaan = "menunggu" | "benar" | "salah";

const POSE: Record<Keadaan, string> = {
  menunggu: "zelby_thinking",
  benar: "zelby_celebrate",
  salah: "zelby_idle",
};

const UCAPAN: Record<Keadaan, string[]> = {
  menunggu: ["Ayo pikirkan!", "Baca pelan-pelan ya…", "Aku temani, ya."],
  benar: ["Hebat!", "Tepat sekali!", "Keren!"],
  salah: ["Tidak apa-apa!", "Kita pelajari lagi, ya.", "Hampir benar!"],
};

export function PendampingBelajar({
  nomorSoal,
  keadaan = "menunggu",
  className = "",
}: {
  nomorSoal: number;
  keadaan?: Keadaan;
  className?: string;
}) {
  const pose = POSE[keadaan];
  const daftar = UCAPAN[keadaan];
  const ucapan = daftar[nomorSoal % daftar.length];

  const warna =
    keadaan === "benar" ? "#16a34a" : keadaan === "salah" ? "#ea580c" : "#7c3aed";

  return (
    <div className={`flex items-end gap-2 ${className}`}>
      <Image
        src={`/junior/karakter/${pose}.webp`}
        alt=""
        width={512}
        height={512}
        className="h-20 w-20 shrink-0 object-contain drop-shadow-md sm:h-24 sm:w-24"
        priority={nomorSoal === 0}
      />

      <div className="relative mb-3 max-w-[170px]">
        <div
          className="rounded-2xl border bg-white px-3 py-2 text-center text-xs font-bold shadow-[0_8px_24px_-12px_rgba(15,23,42,0.35)] dark:bg-slate-900"
          style={{ borderColor: `${warna}55`, color: warna }}
        >
          {ucapan}
        </div>
        <span
          className="absolute -left-1.5 bottom-3 h-3 w-3 rotate-45 border-b border-l bg-white dark:bg-slate-900"
          style={{ borderColor: `${warna}55` }}
        />
      </div>
    </div>
  );
}

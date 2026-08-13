import Image from "next/image";

/**
 * Pendamping belajar — Zelby, Hazel, atau Alby menemani murid saat mengerjakan
 * soal, dengan gelembung ucapan di sampingnya.
 *
 * Kenapa ada: layar soal sebelumnya hanya kartu putih berisi teks di atas latar
 * ungu. Tidak ada yang menemani anak, tidak ada yang bereaksi saat mereka
 * benar. Duolingo tidak pernah menampilkan soal tanpa karakter — kehadiran
 * tokoh itulah yang membuat latihan terasa seperti bermain, bukan ujian.
 *
 * Tokohnya BERGANTI mengikuti nomor soal supaya tidak membosankan sepanjang
 * 10 soal, dan posenya menyesuaikan keadaan: bertanya saat menunggu jawaban,
 * merayakan saat benar, menyemangati saat salah.
 */

type Keadaan = "menunggu" | "benar" | "salah";

const TOKOH = ["zelby", "hazel", "alby"] as const;

// Tiap tokoh punya pose berbeda untuk tiap keadaan. Nama berkas mengikuti
// aset di public/junior/karakter/.
const POSE: Record<(typeof TOKOH)[number], Record<Keadaan, string>> = {
  zelby: { menunggu: "zelby_thinking", benar: "zelby_celebrate", salah: "zelby_idle" },
  hazel: { menunggu: "hazel_thinking", benar: "hazel_celebrate", salah: "hazel_encouraging" },
  alby:  { menunggu: "alby_questioning", benar: "alby_celebrate", salah: "alby_idle" },
};

const UCAPAN: Record<Keadaan, string[]> = {
  menunggu: ["Kamu pasti bisa!", "Baca pelan-pelan ya…", "Ayo pikirkan!", "Aku temani, ya."],
  benar: ["Hebat!", "Keren banget!", "Tepat sekali!", "Wah, pintar!"],
  // Nada saat salah sengaja tidak menghakimi: anak yang merasa dimarahi
  // berhenti mencoba, dan itu justru lawan dari tujuan latihan ini.
  salah: ["Tidak apa-apa!", "Coba lagi, ya!", "Hampir benar!", "Belajar itu begini."],
};

export function PendampingBelajar({
  nomorSoal,
  keadaan = "menunggu",
  className = "",
}: {
  /** Dipakai memilih tokoh & kalimat, supaya berganti tiap soal. */
  nomorSoal: number;
  keadaan?: Keadaan;
  className?: string;
}) {
  const tokoh = TOKOH[nomorSoal % TOKOH.length];
  const pose = POSE[tokoh][keadaan];
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
        className="h-24 w-24 shrink-0 object-contain drop-shadow-md sm:h-28 sm:w-28"
        priority={nomorSoal === 0}
      />

      {/* Gelembung ucapan dengan ekor mengarah ke tokoh. */}
      <div className="relative mb-4 max-w-[150px]">
        <div
          className="rounded-2xl border-2 bg-white dark:bg-slate-800/90 px-3 py-2 text-center text-xs font-bold shadow-sm"
          style={{ borderColor: `${warna}55`, color: warna }}
        >
          {ucapan}
        </div>
        <span
          className="absolute -left-1.5 bottom-3 h-3 w-3 rotate-45 border-b-2 border-l-2 bg-white dark:bg-slate-800/90"
          style={{ borderColor: `${warna}55` }}
        />
      </div>
    </div>
  );
}

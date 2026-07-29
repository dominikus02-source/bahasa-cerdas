import Image from "next/image"
import { getFrameStyle } from "@/lib/cosmetics";

interface UserAvatarProps {
  /** Nama yang dipakai untuk inisial bila avatar kosong. */
  name?: string | null;
  avatar?: string | null;
  /** `User.equippedFrame` — null/undefined berarti tanpa bingkai. */
  frame?: string | null;
  /** Ukuran avatar dalam px (cincin digambar di luar ukuran ini). */
  size?: number;
  /** Teks inisial khusus — kalau kosong dihitung dari `name` (maks 2 huruf). */
  initials?: string;
  /** Kelas tambahan untuk lingkaran avatar (mis. border, ring liga). */
  className?: string;
  /** Kelas tambahan untuk pembungkus terluar. */
  wrapperClassName?: string;
  /** Gradasi latar saat memakai inisial. */
  gradient?: string;
  /** Kelas ukuran huruf inisial. */
  textClassName?: string;
}

function autoInitials(name?: string | null) {
  if (!name) return "?";
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

/**
 * Avatar murid + bingkai kosmetik dari toko koin.
 *
 * Tanpa `frame`, komponen ini tampil persis seperti lingkaran avatar biasa —
 * cincin digambar sebagai elemen absolut DI LUAR kotak avatar sehingga ukuran
 * dan tata letak tidak berubah sedikit pun saat murid belum memakai apa pun.
 */
export default function UserAvatar({
  name,
  avatar,
  frame,
  size = 40,
  initials,
  className = "",
  wrapperClassName = "",
  gradient = "from-violet-500 to-purple-600",
  textClassName = "text-xs",
}: UserAvatarProps) {
  const frameStyle = getFrameStyle(frame);
  const label = initials ?? autoInitials(name);

  return (
    <span
      className={`relative inline-flex shrink-0 align-middle ${wrapperClassName}`}
      style={{ width: size, height: size }}
    >
      {frameStyle && (
        <>
          {/* Cahaya di luar cincin. Elemen terpisah karena `mask` pada cincin
              ikut memotong box-shadow. */}
          {frameStyle.glow && (
            <span
              aria-hidden
              className="absolute rounded-full pointer-events-none"
              style={{ inset: -frameStyle.width, boxShadow: frameStyle.glow }}
            />
          )}
          {/* Cincin itu sendiri — bagian tengahnya dilubangi dengan mask supaya
              avatar transparan/berlatar tembus pandang tetap tampil normal. */}
          <span
            aria-hidden
            className={`absolute rounded-full pointer-events-none ${frameStyle.animationClass || ""}`}
            style={{
              inset: -frameStyle.width,
              background: frameStyle.background,
              maskImage: `radial-gradient(closest-side, transparent calc(100% - ${frameStyle.width}px), #000 calc(100% - ${frameStyle.width}px))`,
              WebkitMaskImage: `radial-gradient(closest-side, transparent calc(100% - ${frameStyle.width}px), #000 calc(100% - ${frameStyle.width}px))`,
            }}
          />
        </>
      )}
      <span
        className={`relative z-[1] w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br ${gradient} text-white font-bold ${textClassName} ${className}`}
      >
        {avatar ? (
          <Image src={avatar} alt="" fill className="object-cover" sizes="96px" />
        ) : (
          label
        )}
      </span>
    </span>
  );
}

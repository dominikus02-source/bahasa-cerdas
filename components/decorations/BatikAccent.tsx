import Image from "next/image";

/**
 * BatikAccent — nuansa batik BahasaCerdas yang SUBTLE & modern.
 *
 * Dekorasi latar (bukan konten): aria-hidden + pointer-events-none, opacity
 * sangat rendah (light ~5%, dark ~8%), memudar dengan mask gradient agar
 * headline/form tetap jadi focal point. Memakai aset batik existing yang
 * dioptimasi (public/brand/batik-accent.png) — tidak ada aset baru.
 */
export default function BatikAccent() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <Image
        src="/brand/batik-accent.webp"
        alt=""
        fill
        sizes="1200px"
        className="object-cover opacity-[0.05] mix-blend-multiply dark:opacity-[0.08] dark:mix-blend-screen"
        style={{
          maskImage: "linear-gradient(115deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.25) 55%, transparent 85%)",
          WebkitMaskImage: "linear-gradient(115deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.25) 55%, transparent 85%)",
        }}
      />
    </div>
  );
}

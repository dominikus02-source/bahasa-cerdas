"use client";

import { useMemo } from "react";

const WARNA = ["#a78bfa", "#f0abfc", "#fbbf24", "#34d399", "#60a5fa", "#f87171", "#fde047"];

/**
 * Efek kembang api (item "Efek Confetti" di Toko Koin).
 *
 * Murni CSS — tidak memakai pustaka luar sama sekali. Naikkan `trigger`
 * setiap kali murid menjawab benar; komponen tidak menampilkan apa pun
 * sebelum `trigger > 0`, dan induknya hanya merender komponen ini kalau murid
 * memang memasang efek confetti (User.equippedEffect === "confetti").
 *
 * Sepenuhnya dekoratif: tidak menangkap klik dan tidak mengubah tata letak.
 */
export default function ConfettiBurst({
  trigger,
  jumlah = 26,
}: {
  trigger: number;
  jumlah?: number;
}) {
  const kepingan = useMemo(() => {
    return Array.from({ length: jumlah }).map((_, i) => {
      const sudut = (Math.PI * 2 * i) / jumlah + Math.random() * 0.5;
      const jarak = 90 + Math.random() * 130;
      return {
        dx: Math.round(Math.cos(sudut) * jarak),
        dy: Math.round(Math.sin(sudut) * jarak - 40),
        warna: WARNA[i % WARNA.length],
        lebar: 5 + Math.round(Math.random() * 5),
        tinggi: 8 + Math.round(Math.random() * 6),
        delay: Math.round(Math.random() * 90),
        durasi: 900 + Math.round(Math.random() * 500),
        putar: Math.round((Math.random() - 0.5) * 540),
        bulat: i % 3 === 0,
      };
    });
    // Sengaja hanya bergantung pada `trigger`: satu ledakan = satu susunan acak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, jumlah]);

  if (!trigger) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes bc-confetti-terbang {
          0%   { opacity: 1; transform: translate3d(0,0,0) rotate(0deg) scale(1); }
          70%  { opacity: 1; }
          100% { opacity: 0; transform: translate3d(var(--dx), calc(var(--dy) + 90px), 0) rotate(var(--putar)) scale(.5); }
        }
        .bc-confetti-keping {
          position: absolute;
          left: 50%;
          top: 42%;
          animation-name: bc-confetti-terbang;
          animation-timing-function: cubic-bezier(.2,.7,.35,1);
          animation-fill-mode: forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .bc-confetti-keping { animation-duration: .4s !important; }
        }
      `}</style>
      {kepingan.map((k, i) => (
        <span
          key={`${trigger}-${i}`}
          className="bc-confetti-keping"
          style={{
            width: k.lebar,
            height: k.bulat ? k.lebar : k.tinggi,
            background: k.warna,
            borderRadius: k.bulat ? "50%" : 2,
            animationDelay: `${k.delay}ms`,
            animationDuration: `${k.durasi}ms`,
            // Nilai per-kepingan dipakai oleh keyframes di atas.
            ["--dx" as string]: `${k.dx}px`,
            ["--dy" as string]: `${k.dy}px`,
            ["--putar" as string]: `${k.putar}deg`,
          }}
        />
      ))}
    </div>
  );
}

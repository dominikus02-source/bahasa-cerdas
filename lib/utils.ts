import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Ukuran teks token (text-bc-h1, text-bc-small, …) didaftarkan sebagai
// font-size agar tidak dianggap warna dan saling menghapus dengan
// text-bc-text / text-bc-text-2 saat digabung lewat cn().
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["bc-hero", "bc-h1", "bc-h2", "bc-h3", "bc-body", "bc-small", "bc-eyebrow"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

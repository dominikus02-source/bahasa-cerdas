/**
 * Game Registry Arena — sumber tunggal data gim untuk Game Hub (/arena/game).
 *
 * Semua gim yang punya route nyata di app/arena/game/ didaftarkan di sini.
 * Halaman hub, murid, dan guru memakai daftar ini sebagai acuan (jangan buat
 * daftar gim kedua di JSX). Icon/gradient/xp/players/time diambil dari data
 * hub & dasbor yang sudah ada — tidak ada angka baru yang mengarang.
 */

import {
  Swords, Mountain, Clock, ThumbsUp, TreePine, BookOpen, Type, Grid3x3, Puzzle, Zap, Users, Gauge, Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type GameCategory = "Kata" | "Literasi" | "Tantangan" | "Cepat" | "Kompetitif";

export const GAME_CATEGORIES: GameCategory[] = ["Kata", "Literasi", "Tantangan", "Cepat", "Kompetitif"];

export interface GameDefinition {
  id: string;
  title: string;
  description: string;
  categories: GameCategory[];
  icon: LucideIcon;
  /** Kelas gradient Tailwind untuk ikon/latarbelakang kartu. */
  gradient: string;
  accentColor: string;
  href: string;
  xp: string;
  players: string;
  time: string;
  /** Gim yang butuh server pertandingan (Socket.io). Saat server mati tanpa
   *  mode solo, gim ditandai "Segera Hadir" dan ditenggelamkan di bawah. */
  multiplayer?: boolean;
  /** Gim multiplayer yang punya mode solo saat server mati. */
  soloSaatOffline?: { players: string; desc: string };
  badge?: { text: string; type: "hot" | "new" };
  /** Gim unggulan (hero). Dipakai untuk game terbaru / yang sedang dipromosikan. */
  featured?: boolean;
  /**
   * Publikasi gim — BATAS AKSES KANONIK.
   *
   * - `true` (UNPUBLISHED): gim TIDAK muncul di katalog/unggulan/baru/
   *   populer/terakhir-dimainkan mana pun, dan route langsungnya dialihkan
   *   (lihat app/arena/game/<id>/page.tsx). Berlaku untuk SEMUA user
   *   selama belum diluncurkan.
   * - tidak diisi/`false` (PUBLISHED): discovery normal.
   *
   * Status saat ini: Pendekar Suryakerta (`rpg`) = PUBLISHED + `premiumOnly`
   * (lihat field di bawah). Publikasi = VISIBEL; playable-nya dijaga
   * entitlement server-side, bukan flag ini.
    */
  unpublished?: boolean;
  /**
   * P2.8 — game khusus Premium (Early Access).
   *
   * - `true`: kartu menampilkan lencana Premium; route + API dijaga
   *   server-side via entitlement Premium (lib/premium-economy).
   *   Non-Premium melihat halaman terkunci, bukan gameplay.
   * - tidak diisi/`false`: terbuka untuk semua user arena.
   *
   * Ini BUKAN sistem langganan paralel — resolusi plan memakai
   * `resolvePlan` kanonik (MURID_PREMIUM / PRO / FOUNDER = boleh main).
   */
  premiumOnly?: boolean;
  /** Aset artwork gambar yang sudah ada (public/...). Optional — fallback ke gradient+ikon. */
  artwork?: string;
}

export const GAME_REGISTRY: GameDefinition[] = [
  {
    id: "rpg",
    title: "Pendekar Suryakerta",
    description: "Jelajahi dunia Nusantara! Gerakkan karakter, temukan harta, dan mulai petualangan epik.",
    categories: ["Tantangan"],
    icon: Shield,
    gradient: "from-amber-600 via-orange-600 to-amber-800",
    accentColor: "#D97706",
    href: "/arena/game/rpg",
    xp: "+100 XP",
    players: "Solo",
    time: "~10 menit",
    badge: { text: "Baru", type: "new" },
    featured: true,
    // P2.8 LAUNCH — PUBLISHED + KHUSUS PREMIUM (Early Access).
    // Terlihat di discovery; gameplay dijaga server-side via entitlement
    // Premium (route + API). Non-Premium melihat halaman terkunci.
    premiumOnly: true,
    // P2.10-FREEZE: Pendekar Suryakerta paused until next week.
    // Hidden from all discovery. Founder/admin bypass in RPG page.
    unpublished: true,
  },
  {
    id: "kuis-tempur",
    title: "Kuis Tempur",
    description: "Jawab benar untuk menyerang, salah kamu yang terluka. Bertahan di arena melawan bot!",
    categories: ["Kompetitif", "Tantangan"],
    icon: Swords,
    gradient: "from-red-500 via-rose-600 to-red-800",
    accentColor: "#EF4444",
    href: "/arena/game/kuis-tempur",
    xp: "+80 XP",
    players: "2-8 pemain",
    time: "~5 menit",
    multiplayer: true,
    soloSaatOffline: {
      players: "Solo vs bot",
      desc: "Bertahan di arena! Jawab benar untuk menyerang, salah kamu yang terluka.",
    },
    badge: { text: "Terpopuler", type: "hot" },
  },
  {
    id: "menara",
    title: "Menara Cerdas",
    description: "Panjat menara dengan menjawab soal dari pelajaranmu — makin tinggi makin seru!",
    categories: ["Tantangan"],
    icon: Mountain,
    gradient: "from-violet-500 via-purple-600 to-fuchsia-700",
    accentColor: "#8B5CF6",
    href: "/arena/game/menara",
    xp: "+60 XP",
    players: "Solo",
    time: "~3 menit",
    badge: { text: "Baru", type: "new" },
  },
  {
    id: "irama-kata",
    title: "Irama Kata",
    description: "Kata jatuh di 4 jalur mengikuti irama — ketuk hanya kata yang sesuai aturan!",
    categories: ["Kata", "Cepat"],
    icon: Clock,
    gradient: "from-orange-500 via-rose-500 to-red-600",
    accentColor: "#F97316",
    href: "/arena/game/irama-kata",
    xp: "+60 XP",
    players: "Solo",
    time: "~1 menit",
  },
  {
    id: "benar-salah",
    title: "Benar atau Salah",
    description: "Kuis kilat 60 detik! Tentukan pernyataan yang muncul benar atau salah.",
    categories: ["Cepat", "Tantangan"],
    icon: ThumbsUp,
    gradient: "from-emerald-400 via-teal-500 to-cyan-600",
    accentColor: "#14B8A6",
    href: "/arena/game/benar-salah",
    xp: "+50 XP",
    players: "Solo",
    time: "~1 menit",
  },
  {
    id: "petualangan-kata",
    title: "Petualangan Kata",
    description: "Bantu Si Cerdik Zelby menangkap kata yang benar di hutan ajaib!",
    categories: ["Kata"],
    icon: TreePine,
    gradient: "from-emerald-500 via-green-600 to-emerald-700",
    accentColor: "#10B981",
    href: "/arena/game/petualangan-kata",
    xp: "+90 XP",
    players: "Solo",
    time: "~1,5 menit",
    badge: { text: "Baru", type: "new" },
  },
  {
    id: "bermain-kata",
    title: "BERMAIN KATA",
    description: "Main kata, belajar bahasa, dan kumpulkan stiker bersama Zelby. Cocok untuk TK–SD.",
    categories: ["Kata", "Literasi"],
    icon: BookOpen,
    gradient: "from-sky-500 via-cyan-500 to-blue-600",
    accentColor: "#0EA5E9",
    href: "/arena/game/bermain-kata",
    xp: "+50 XP",
    players: "Solo",
    time: "~3 menit",
    badge: { text: "Baru", type: "new" },
    featured: true,
    artwork: "/banners/bermain-kata-final.jpg",
  },
  {
    id: "tebak-kata",
    title: "Tebak Kata",
    description: "Deskripsi muncul, tebak namanya! Semakin cepat, semakin tinggi skor.",
    categories: ["Kata", "Literasi"],
    icon: Type,
    gradient: "from-cyan-500 to-cyan-600",
    accentColor: "#06B6D4",
    href: "/arena/game/tebak-kata",
    xp: "+60 XP",
    players: "Solo",
    time: "~3 menit",
  },
  {
    id: "teka-teki-silang",
    title: "Teka-Teki Silang",
    description: "Pecahkan kata. Asah literasi. 12 level, soal baru tiap main!",
    categories: ["Literasi", "Kata"],
    icon: Grid3x3,
    gradient: "from-sky-500 via-cyan-600 to-sky-800",
    accentColor: "#38BDF8",
    href: "/arena/game/teka-teki-silang",
    xp: "+75 XP",
    players: "Solo",
    time: "~5 menit",
    badge: { text: "Baru", type: "new" },
  },
  {
    id: "susun-kata",
    title: "Susun Kata",
    description: "Huruf-huruf acak! Susun menjadi kata yang benar dalam waktu terbatas.",
    categories: ["Kata"],
    icon: Puzzle,
    gradient: "from-emerald-500 via-emerald-600 to-teal-700",
    accentColor: "#10B981",
    href: "/arena/game/susun-kata",
    xp: "+50 XP",
    players: "Solo",
    time: "~3 menit",
  },
  {
    id: "lari-kata",
    title: "Lari Kata",
    description: "60 detik, 20 soal. Jawab secepat kilat dan raih rentetan tinggi!",
    categories: ["Cepat", "Kata"],
    icon: Zap,
    gradient: "from-amber-500 via-amber-600 to-orange-700",
    accentColor: "#F59E0B",
    href: "/arena/game/lari-kata",
    xp: "+70 XP",
    players: "Solo",
    time: "~1 menit",
    badge: { text: "Baru", type: "new" },
  },
  {
    id: "tantang",
    title: "Tantang Teman",
    description: "Duel asinkron 10 soal! Siapa skornya lebih tinggi, dia juaranya.",
    categories: ["Kompetitif"],
    icon: Users,
    gradient: "from-fuchsia-500 via-pink-600 to-rose-600",
    accentColor: "#D946EF",
    href: "/arena/game/tantang",
    xp: "+60 XP",
    players: "2 pemain",
    time: "~3 menit",
  },
  {
    id: "adu-cepat",
    title: "Adu Cepat",
    description: "Cari lawan sepadan dan adu kecepatan menjawab secara real-time!",
    categories: ["Kompetitif", "Cepat"],
    icon: Gauge,
    gradient: "from-blue-500 via-indigo-600 to-violet-800",
    accentColor: "#3B82F6",
    href: "/arena/game/adu-cepat",
    xp: "+80 XP",
    players: "2-8 pemain",
    time: "~5 menit",
    multiplayer: true,
  },
];

export function gameById(id: string): GameDefinition | undefined {
  return GAME_REGISTRY.find((g) => g.id === id);
}

export function featuredGame(): GameDefinition {
  return (
    GAME_REGISTRY.find((g) => g.featured && !g.unpublished) ??
    GAME_REGISTRY.find((g) => !g.unpublished) ??
    GAME_REGISTRY[0]
  );
}

/**
 * GAME CARD ARTWORK — peta aset visual kartu gim (public/images/GIM Card).
 *
 * Khusus untuk kartu gim di Game Hub (/arena/game) — TIDAK menyentuh banner
 * hero (featuredGame().artwork tetap dipakai di sana). Setiap game dipetakan
 * ke artwork yang paling menggambarkan gameplay-nya (game identity first).
 *
 * Semua 11 game aktif punya artwork (11/11). Catatan rasio: 8 aset lama
 * 1448x1086 (4:3), 3 aset baru (menara/susun-kata/tantang) 1536x1024 (3:2) —
 * area kartu memakai aspect-[4/3] + object-cover, jadi aset 3:2 dipotong
 * ~11% vertikal (terpusat) agar konsisten dengan kartu lain.
 */
export const GAME_CARD_ARTWORK: Record<string, string> = {
  "rpg": "/images/GIM%20Card/RPG-card.png",
  "kuis-tempur": "/images/GIM%20Card/Kuis%20Tempur-card.png",
  "teka-teki-silang": "/images/GIM%20Card/TTS-card.png",
  "tebak-kata": "/images/GIM%20Card/tebak%20kata-card2.png",
  "lari-kata": "/images/GIM%20Card/lari%20kata-card2.png",
  "irama-kata": "/images/GIM%20Card/Irama%20Kata-card.png",
  "benar-salah": "/images/GIM%20Card/benar-salah-card.png",
  "petualangan-kata": "/images/GIM%20Card/petualangan%20kata-card.png",
  "bermain-kata": "/banners/bermain-kata-final.jpg",
  "menara": "/images/GIM%20Card/menara%20kata-card.png",
  "susun-kata": "/images/GIM%20Card/Susun%20kata-card.png",
  "tantang": "/images/GIM%20Card/Tantang%20teman%20card.png",
};

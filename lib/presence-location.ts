/**
 * Client-safe mapping from application pathname to a coarse Live Pulse location.
 *
 * We intentionally store only product/menu buckets, never dynamic IDs,
 * query strings, emails, or full URLs. This is enough for the founder to see
 * where concurrent users are spending time without turning presence into
 * detailed browsing-history storage.
 */
export interface PresenceLocation {
  key: string;
  label: string;
}

const LOCATION_RULES: Array<{ prefix: string; key: string; label: string }> = [
  // Guru
  { prefix: "/guru/game/main-bersama", key: "guru:main-bersama", label: "Guru · Main Bersama" },
  { prefix: "/guru/beranda", key: "guru:beranda", label: "Guru · Beranda" },
  { prefix: "/guru/feed-karya", key: "guru:literasi", label: "Guru · Pusat Literasi" },
  { prefix: "/guru/bank-soal", key: "guru:bank-soal", label: "Guru · Bank Soal" },
  { prefix: "/guru/perangkat-ajar", key: "guru:perangkat-ajar", label: "Guru · Perangkat Ajar" },
  { prefix: "/guru/materi-ajar", key: "guru:materi-ajar", label: "Guru · Materi Ajar" },
  { prefix: "/guru/panduan-guru", key: "guru:buku-ajar", label: "Guru · Buku Ajar" },
  { prefix: "/guru/media-pembelajaran", key: "guru:media", label: "Guru · Media Pembelajaran" },
  { prefix: "/guru/kelasku", key: "guru:kelasku", label: "Guru · Kelasku" },
  { prefix: "/guru/game", key: "guru:gim", label: "Guru · Gim" },
  { prefix: "/guru/toko-karya", key: "guru:toko-karya", label: "Guru · Toko Karya" },
  { prefix: "/guru/komisi", key: "guru:penghasilan", label: "Guru · Penghasilan" },
  { prefix: "/guru/simulasi", key: "guru:simulasi", label: "Guru · Simulasi & Tes" },
  { prefix: "/guru/evaluasi-simulasi", key: "guru:simulasi", label: "Guru · Simulasi & Tes" },
  { prefix: "/guru/bigt", key: "guru:simulasi", label: "Guru · Simulasi & Tes" },
  { prefix: "/guru/ai-bc", key: "guru:ai-bc", label: "Guru · AI BC" },
  { prefix: "/guru/ai-tools", key: "guru:alat-ai", label: "Guru · Alat AI" },
  { prefix: "/guru/komunitas", key: "guru:komunitas", label: "Guru · Komunitas" },
  { prefix: "/guru/olimpiade", key: "guru:kalender", label: "Guru · Kalender" },
  { prefix: "/guru/profile", key: "guru:profil", label: "Guru · Profil" },

  // Murid / Arena
  { prefix: "/murid/beranda", key: "murid:beranda", label: "Murid · Beranda" },
  { prefix: "/murid/karya", key: "murid:karya", label: "Murid · Karya" },
  { prefix: "/murid/profile", key: "murid:profil", label: "Murid · Profil" },
  { prefix: "/arena/chat", key: "murid:obrolan", label: "Murid · Obrolan" },
  { prefix: "/arena/tugas", key: "murid:tugas", label: "Murid · Ruang Tugas" },
  { prefix: "/arena/jalur-cerdas", key: "murid:jalur-cerdas", label: "Murid · Jalur Cerdas" },
  { prefix: "/arena/game", key: "murid:gim", label: "Murid · Gim" },
  { prefix: "/arena", key: "murid:arena", label: "Murid · Arena" },

  // Admin
  { prefix: "/admin/executive", key: "admin:control-tower", label: "Admin · Control Tower" },
  { prefix: "/admin/users", key: "admin:pengguna", label: "Admin · Pengguna" },
  { prefix: "/admin/premium", key: "admin:premium", label: "Admin · Premium" },
  { prefix: "/admin/payments", key: "admin:pembayaran", label: "Admin · Pembayaran" },
  { prefix: "/admin/teacher-payouts", key: "admin:payout", label: "Admin · Payout" },
  { prefix: "/admin/monitoring", key: "admin:live-pulse", label: "Admin · Live Pulse" },
  { prefix: "/admin/analytics", key: "admin:analytics", label: "Admin · Analytics" },
  { prefix: "/admin/ai-analytics", key: "admin:ai", label: "Admin · Analitik AI" },
  { prefix: "/admin/feature-usage", key: "admin:fitur", label: "Admin · Pemakaian Fitur" },
  { prefix: "/admin/bank-soal", key: "admin:bank-soal", label: "Admin · Bank Soal" },
  { prefix: "/admin/karya", key: "admin:karya", label: "Admin · Toko Karya" },
];

const BY_KEY = new Map(LOCATION_RULES.map((rule) => [rule.key, rule.label]));

function normalizePathname(pathname: string | null | undefined): string {
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) return "/";
  return pathname.split("?")[0]?.split("#")[0] || "/";
}

export function resolvePresenceLocation(pathname: string | null | undefined): PresenceLocation {
  const safePath = normalizePathname(pathname);
  const match = LOCATION_RULES.find(
    (rule) => safePath === rule.prefix || safePath.startsWith(rule.prefix + "/"),
  );
  if (match) return { key: match.key, label: match.label };

  if (safePath.startsWith("/guru")) return { key: "guru:lainnya", label: "Guru · Halaman lainnya" };
  if (safePath.startsWith("/murid")) return { key: "murid:lainnya", label: "Murid · Halaman lainnya" };
  if (safePath.startsWith("/arena")) return { key: "murid:arena", label: "Murid · Arena" };
  if (safePath.startsWith("/admin")) return { key: "admin:lainnya", label: "Admin · Halaman lainnya" };
  if (safePath === "/") return { key: "publik:beranda", label: "Website · Beranda" };
  return { key: "publik:lainnya", label: "Website · Halaman lainnya" };
}

export function labelForPresenceLocation(key: string | null | undefined): string {
  if (!key) return "Lokasi belum diketahui";
  return BY_KEY.get(key) ?? (
    key === "guru:lainnya" ? "Guru · Halaman lainnya" :
    key === "murid:lainnya" ? "Murid · Halaman lainnya" :
    key === "admin:lainnya" ? "Admin · Halaman lainnya" :
    key === "publik:beranda" ? "Website · Beranda" :
    key === "publik:lainnya" ? "Website · Halaman lainnya" :
    "Lokasi belum diketahui"
  );
}

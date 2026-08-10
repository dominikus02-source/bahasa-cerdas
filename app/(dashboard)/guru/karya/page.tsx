"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Feather,
  PenLine,
  BookOpen,
  Eye,
  Heart,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Flame,
  ArrowLeft,
} from "lucide-react";
import SafeMediaImage from "@/components/shared/safe-media-image";

type KaryaItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  articleType: string | null;
  coverImage: string | null;
  readCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  publishedAt: string | null;
  author: {
    id: string;
    fullName: string | null;
    avatar: string | null;
    profile: { school: string | null } | null;
  } | null;
};

type FilterType = "SEMUA" | "ARTIKEL" | "PUISI";

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "SEMUA", label: "Semua" },
  { value: "ARTIKEL", label: "Artikel" },
  { value: "PUISI", label: "Puisi" },
];

const LIMIT = 12;

const TYPE_STYLE: Record<string, { label: string; cls: string }> = {
  PUISI: { label: "Puisi", cls: "bg-purple-100 text-purple-700" },
  ARTIKEL: { label: "Artikel", cls: "bg-sky-100 text-sky-700" },
};

function waktuRelatif(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const detik = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (detik < 60) return "baru saja";
  const menit = Math.floor(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari === 1) return "kemarin";
  if (hari < 7) return `${hari} hari lalu`;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(t);
}

function inisial(nama: string | null | undefined): string {
  if (!nama) return "G";
  return nama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase() ?? "")
    .join("");
}

function KaryaCard({ a }: { a: KaryaItem }) {
  const isPuisi = (a.articleType || "").toUpperCase() === "PUISI";
  const style = TYPE_STYLE[isPuisi ? "PUISI" : "ARTIKEL"] ?? TYPE_STYLE.ARTIKEL;
  const penulis = a.author?.fullName || "Guru";

  return (
    <article className="group overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all hover:border-violet-200 hover:shadow-md">
      <Link href={`/artikel/${a.slug}`} className="block">
        {a.coverImage ? (
          <div className="h-28 overflow-hidden">
            <SafeMediaImage
              src={a.coverImage}
              alt={a.title}
              fallbackType="article"
              containerClassName="w-full h-28"
            />
          </div>
        ) : (
          <div className="h-10 flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50">
            {isPuisi ? <Feather size={16} className="text-violet-300" /> : <BookOpen size={16} className="text-violet-300" />}
          </div>
        )}
      </Link>

      <div className="p-4">
        <div className="flex items-center gap-3">
          {a.author?.avatar ? (
            <img
              src={a.author.avatar}
              alt={penulis}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-violet-100"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-600 text-sm font-bold text-white ring-2 ring-violet-100">
              {inisial(penulis)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-gray-900">{penulis}</p>
            <p className="truncate text-[11px] text-gray-500">
              {a.author?.profile?.school ? `${a.author.profile.school} · ` : ""}
              {waktuRelatif(a.publishedAt || a.createdAt)}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${style.cls}`}>
            {style.label}
          </span>
        </div>

        <Link href={`/artikel/${a.slug}`} className="mt-3 block">
          <h3 className="text-sm font-semibold leading-snug text-gray-900 transition-colors line-clamp-2 group-hover:text-violet-700">
            {a.title}
          </h3>
          <p className={`mt-1.5 text-xs leading-relaxed text-gray-500 ${isPuisi ? "whitespace-pre-line italic font-serif text-purple-700/80 line-clamp-4" : "line-clamp-2"}`}>
            {a.excerpt || ""}
          </p>
        </Link>

        <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <Eye size={12} /> {a.readCount} dibaca
          </span>
          <span className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1">
              <Heart size={12} /> {a.likeCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle size={12} /> {a.commentCount}
            </span>
          </span>
        </div>
      </div>
    </article>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="rounded-2xl bg-white border border-violet-100 p-4 animate-pulse">
          <div className="h-28 rounded-xl bg-violet-50" />
          <div className="h-4 bg-violet-100 rounded w-3/4 mt-4" />
          <div className="h-3 bg-violet-50 rounded w-full mt-3" />
          <div className="h-3 bg-violet-50 rounded w-2/3 mt-2" />
        </div>
      ))}
    </div>
  );
}

export default function PanggungKaryaGuruPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("SEMUA");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<KaryaItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchKarya = useCallback(async (f: FilterType, p: number) => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), page: String(p) });
      if (f && f !== "SEMUA") params.set("type", f);
      const res = await fetch(`/api/guru/berkarya?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setItems(Array.isArray(json?.data) ? json.data : []);
      setTotal(typeof json?.total === "number" ? json.total : 0);
      setTotalPages(typeof json?.totalPages === "number" ? Math.max(1, json.totalPages) : 1);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKarya(filter, page);
  }, [filter, page, fetchKarya]);

  function gantiFilter(f: FilterType) {
    setFilter(f);
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <button
        type="button"
        onClick={() => router.push("/guru/beranda")}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-violet-700 transition-colors"
      >
        <ArrowLeft size={14} /> Kembali ke Beranda
      </button>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Panggung Karya Guru</h1>
          <p className="mt-1.5 text-sm text-gray-500 max-w-xl">
            Temukan artikel dan puisi yang ditulis oleh para guru di ekosistem BahasaCerdas.
          </p>
        </div>
        <Link
          href="/guru/artikel"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors"
        >
          <PenLine size={15} /> Tulis Karya
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => gantiFilter(f.value)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
              filter === f.value
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:border-violet-300 hover:text-violet-700"
            }`}
          >
            {f.label}
          </button>
        ))}
        {!loading && items && (
          <span className="ml-auto text-xs text-gray-400">
            {total} karya {filter === "PUISI" ? "puisi" : filter === "ARTIKEL" ? "artikel" : ""} terbit
          </span>
        )}
      </div>

      <div className="mt-5">
        {error ? (
          <div className="rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/50 px-5 py-10 text-center">
            <p className="text-sm font-semibold text-gray-800">Gagal memuat karya guru.</p>
            <button
              type="button"
              onClick={() => fetchKarya(filter, page)}
              className="mt-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-semibold"
            >
              Muat Ulang
            </button>
          </div>
        ) : loading && !items ? (
          <Skeleton />
        ) : items && items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
              <Flame size={22} className="text-violet-400" />
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-800">
              {filter === "PUISI"
                ? "Belum ada puisi guru yang dipublikasikan."
                : filter === "ARTIKEL"
                  ? "Belum ada artikel guru yang dipublikasikan."
                  : "Belum ada karya guru yang dipublikasikan."}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Jadilah salah satu guru pertama yang berbagi karya di BahasaCerdas.
            </p>
            <Link
              href="/guru/artikel"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2 text-xs font-semibold shadow-sm transition-colors"
            >
              <PenLine size={13} /> Tulis Karya
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items?.map((a) => <KaryaCard key={a.id} a={a} />)}
          </div>
        )}
      </div>

      {!error && (!loading || items) && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 rounded-xl bg-white border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:border-violet-300 hover:text-violet-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft size={13} /> Sebelumnya
          </button>
          <span className="text-xs text-gray-500">
            Halaman {page} dari {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex items-center gap-1 rounded-xl bg-white border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:border-violet-300 hover:text-violet-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            Berikutnya <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
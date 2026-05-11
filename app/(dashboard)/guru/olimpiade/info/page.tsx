"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Trophy, Calendar, MapPin, Gift, ExternalLink, Search, Clock, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Lomba {
  id: string;
  title: string;
  description: string;
  type: string;
  level: string;
  date: string;
  registrationDeadline: string | null;
  prize: string | null;
  posterUrl: string | null;
  location: string | null;
  contact: string | null;
  registrationUrl: string | null;
  status: string;
}

const LEVEL_COLORS: Record<string, string> = {
  NASIONAL: "bg-red-100 text-red-700 border-red-200",
  PROVINSI: "bg-amber-100 text-amber-700 border-amber-200",
  KOTA: "bg-blue-100 text-blue-700 border-blue-200",
  SEKOLAH: "bg-green-100 text-green-700 border-green-200",
  DISTRICT: "bg-purple-100 text-purple-700 border-purple-200",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Pendaftaran Terbuka", color: "text-green-600" },
  UPCOMING: { label: "Segera Dibuka", color: "text-amber-600" },
  CLOSED: { label: "Ditutup", color: "text-red-600" },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function LombaInfoPage() {
  const [lombas, setLombas] = useState<Lomba[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchLombas = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/lomba");
        const data = await res.json();
        setLombas(data.lombas || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLombas();
  }, []);

  const filtered = lombas.filter((l) => {
    const matchesFilter = filter === "all" || l.status === filter;
    const matchesSearch = !search || l.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const upcoming = filtered.filter((l) => l.status === "UPCOMING" || l.status === "OPEN");
  const past = filtered.filter((l) => l.status === "CLOSED");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/guru" className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-orange-600" />
            Info Lomba
          </h1>
          <p className="text-sm text-slate-500">Lomba Bahasa Indonesia tingkat daerah hingga nasional</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari lomba..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="flex gap-2">
          {["all", "OPEN", "UPCOMING", "CLOSED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? "bg-orange-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f === "all" ? "Semua" : STATUS_LABELS[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Memuat lomba...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                Lomba Aktif & Mendatang
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {upcoming.map((lomba) => (
                  <Card key={lomba.id} className="p-5 border border-slate-100 hover:shadow-lg transition-all hover:border-orange-200">
                    <div className="flex items-start gap-3 mb-3">
                      {lomba.posterUrl && (
                        <img src={lomba.posterUrl} alt={lomba.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                      )}
                      {!lomba.posterUrl && (
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white shrink-0">
                          <Trophy className="w-8 h-8" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${LEVEL_COLORS[lomba.level] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                            {lomba.level}
                          </span>
                          <span className={`text-xs font-bold ${STATUS_LABELS[lomba.status]?.color || "text-slate-500"}`}>
                            {STATUS_LABELS[lomba.status]?.label || lomba.status}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm leading-tight">{lomba.title}</h3>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">{lomba.description}</p>

                    <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        Pelaksanaan: {formatDate(lomba.date)}
                      </div>
                      {lomba.registrationDeadline && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          Pendaftaran: sebelum {formatDate(lomba.registrationDeadline)}
                        </div>
                      )}
                      {lomba.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          {lomba.location}
                        </div>
                      )}
                      {lomba.prize && (
                        <div className="flex items-center gap-1.5">
                          <Gift className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                          <span className="truncate">{lomba.prize}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {lomba.registrationUrl ? (
                        <a
                          href={lomba.registrationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Daftar
                        </a>
                      ) : (
                        <Button className="flex-1 bg-orange-600 hover:bg-orange-700 text-sm" disabled>
                          Segera Hadir
                        </Button>
                      )}
                      {lomba.contact && (
                        <a
                          href={`https://wa.me/${lomba.contact.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 border-2 border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50"
                        >
                          Hubungi
                        </a>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-500 mb-4">Lomba yang Sudah Ditutup</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {past.map((lomba) => (
                  <Card key={lomba.id} className="p-4 border border-slate-100 opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Trophy className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-700 text-sm">{lomba.title}</h3>
                        <p className="text-xs text-slate-400">{formatDate(lomba.date)}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
              <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="font-bold text-slate-600 mb-2">Belum ada lomba</h3>
              <p className="text-sm text-slate-400">Info lomba akan segera ditambahkan oleh admin.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
"use client";

/**
 * Tantang Teman — duel asinkron 10 soal melawan teman sekelas.
 * Alur: daftar tantangan -> pilih teman -> main (soal sama utk keduanya,
 * dinilai server) -> hasil + review. Skor lawan baru terlihat saat keduanya selesai.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Swords, Trophy, Clock, Check, X, ChevronRight, Plus, Users,
  Sparkles, RefreshCw, Hourglass, Medal,
} from "lucide-react";

type Teman = { id: string; fullName: string; avatar: string | null; level: number };
type Tantangan = {
  id: string;
  createdAt: string;
  questionCount: number;
  akuPenantang: boolean;
  aku: { selesai: boolean; skor: number | null; benar: number | null };
  lawan: { nama: string; userId?: string; selesai: boolean; skor: number | null; benar: number | null };
  selesai: boolean;
  hasil: "MENANG" | "KALAH" | "SERI" | null;
};
type Soal = { id: string; text: string; options: string[]; orderIndex: number };
type Review = {
  text: string; options: string[]; correctAnswer: number; myAnswer: number | null;
  isCorrect: boolean; explanation: string | null;
};

function initials(name: string) {
  return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

export default function TantangTemanPage() {
  const [view, setView] = useState<"list" | "pilih" | "main" | "hasil">("list");
  const [loading, setLoading] = useState(true);
  const [tantangan, setTantangan] = useState<Tantangan[]>([]);
  const [teman, setTeman] = useState<Teman[]>([]);
  const [pesan, setPesan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);

  // state permainan
  const [aktif, setAktif] = useState<Tantangan | null>(null);
  const [soal, setSoal] = useState<Soal[]>([]);
  const [idx, setIdx] = useState(0);
  const [jawaban, setJawaban] = useState<(number | null)[]>([]);
  const [hasil, setHasil] = useState<{
    skor: number; benar: number; salah: number; xpEarned: number; review: Review[];
    lawan: { nama: string; selesai: boolean; skor: number | null } | null;
    selesai: boolean; hasil: "MENANG" | "KALAH" | "SERI" | null;
  } | null>(null);
  const mulaiRef = useRef(0);

  const muatDaftar = useCallback(async () => {
    try {
      const res = await fetch("/api/game/tantang");
      if (!res.ok) throw new Error();
      const d = await res.json().catch(() => ({}) as any);
      setTantangan(d.tantangan || []);
      setTeman(d.teman || []);
    } catch {
      setError("Gagal memuat tantangan. Coba muat ulang.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muatDaftar();
  }, [muatDaftar]);

  const kirimTantangan = async (opponentId: string) => {
    setMengirim(true);
    setError(null);
    try {
      const res = await fetch("/api/game/tantang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentId }),
      });
      const d = await res.json().catch(() => ({}) as any);
      if (!res.ok) throw new Error(d.error || "Gagal mengirim tantangan.");
      setPesan(d.message);
      setView("list");
      setLoading(true);
      muatDaftar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim tantangan.");
    } finally {
      setMengirim(false);
    }
  };

  const mulaiMain = async (t: Tantangan) => {
    setError(null);
    try {
      const res = await fetch(`/api/game/tantang/${t.id}`);
      const d = await res.json().catch(() => ({}) as any);
      if (!res.ok) throw new Error(d.error || "Gagal memuat soal.");
      setAktif(t);
      setSoal(d.questions || []);
      setIdx(0);
      setJawaban(new Array((d.questions || []).length).fill(null));
      setHasil(null);
      mulaiRef.current = Date.now();
      setView("main");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat soal.");
    }
  };

  const jawab = async (pilihan: number) => {
    const next = [...jawaban];
    next[idx] = pilihan;
    setJawaban(next);
    if (idx + 1 < soal.length) {
      setIdx(idx + 1);
      return;
    }
    // Soal habis -> submit semua, dinilai server.
    try {
      const res = await fetch(`/api/game/tantang/${aktif!.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: next, durationMs: Date.now() - mulaiRef.current }),
      });
      const d = await res.json().catch(() => ({}) as any);
      if (!res.ok) throw new Error(d.error || "Gagal mengirim jawaban.");
      setHasil(d);
      setView("hasil");
      setLoading(true);
      muatDaftar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim jawaban. Jawabanmu aman, coba kirim lagi.");
    }
  };

  const giliranku = tantangan.filter((t) => !t.aku.selesai);
  const menunggu = tantangan.filter((t) => t.aku.selesai && !t.selesai);
  const riwayat = tantangan.filter((t) => t.selesai);

  // ---------- VIEW: MAIN ----------
  if (view === "main" && soal.length > 0) {
    const s = soal[idx];
    return (
      <div className="game-env px-4 py-5 md:px-6 arena-page">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setView("list")} className="flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400">
            <ArrowLeft className="w-4 h-4" /> Keluar
          </button>
          <span className="text-sm font-bold text-violet-600 dark:text-violet-400">vs {aktif?.lawan.nama}</span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-slate-800/80 rounded-full overflow-hidden mb-5">
          <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500" style={{ width: `${((idx) / soal.length) * 100}%` }} />
        </div>
        <p className="text-xs font-semibold text-gray-400 mb-2">Soal {idx + 1} dari {soal.length}</p>
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-5 leading-snug">{s.text}</h2>
        <div className="space-y-3">
          {(s.options as string[]).map((op, i) => (
            <button
              key={i}
              onClick={() => jawab(i)}
              className="w-full text-left px-4 py-3.5 rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 font-medium text-gray-800 dark:text-slate-200 active:scale-[0.98] hover:border-violet-400 hover:bg-violet-50 transition-all"
            >
              {op}
            </button>
          ))}
        </div>
        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}
      </div>
    );
  }

  // ---------- VIEW: HASIL ----------
  if (view === "hasil" && hasil) {
    return (
      <div className="px-4 py-5 md:px-6 arena-page">
        <div className={`rounded-3xl p-6 text-center text-white mb-5 shadow-lg ${
          hasil.hasil === "MENANG" ? "bg-gradient-to-br from-emerald-500 to-teal-600"
          : hasil.hasil === "KALAH" ? "bg-gradient-to-br from-rose-500 to-red-600"
          : hasil.hasil === "SERI" ? "bg-gradient-to-br from-amber-500 to-orange-600"
          : "bg-gradient-to-br from-violet-500 to-purple-600"
        }`}>
          <div className="w-16 h-16 rounded-full bg-white/20 dark:bg-slate-900/20 flex items-center justify-center mx-auto mb-3">
            {hasil.hasil === "MENANG" ? <Trophy className="w-9 h-9" /> : hasil.hasil ? <Medal className="w-9 h-9" /> : <Hourglass className="w-9 h-9" />}
          </div>
          <h1 className="text-2xl font-extrabold">
            {hasil.hasil === "MENANG" ? "Kamu Menang!" : hasil.hasil === "KALAH" ? "Kali Ini Kalah" : hasil.hasil === "SERI" ? "Seri!" : "Skormu Terkirim!"}
          </h1>
          <p className="mt-1 text-white/85 text-sm">
            {hasil.selesai && hasil.lawan
              ? `${hasil.skor} - ${hasil.lawan.skor} melawan ${hasil.lawan.nama}`
              : `Menunggu ${hasil.lawan?.nama || "lawan"} menyelesaikan tantangan`}
          </p>
          <div className="flex justify-center gap-6 mt-4 text-sm font-semibold">
            <span className="flex items-center gap-1"><Check className="w-4 h-4" /> {hasil.benar} benar</span>
            <span className="flex items-center gap-1"><X className="w-4 h-4" /> {hasil.salah} salah</span>
            <span className="flex items-center gap-1"><Sparkles className="w-4 h-4" /> +{hasil.xpEarned} XP</span>
          </div>
        </div>

        <h2 className="font-bold text-gray-900 dark:text-slate-100 mb-3">Pembahasan</h2>
        <div className="space-y-3 mb-6">
          {hasil.review.map((r, i) => (
            <div key={i} className={`bg-white dark:bg-slate-800/90 rounded-2xl border p-4 ${r.isCorrect ? "border-emerald-200" : "border-rose-200"}`}>
              <div className="flex items-start gap-2">
                {r.isCorrect
                  ? <Check className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  : <X className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{r.text}</p>
                  <p className="text-sm mt-1.5 text-emerald-700 dark:text-emerald-300">Jawaban: {(r.options as string[])[r.correctAnswer]}</p>
                  {!r.isCorrect && r.myAnswer !== null && (
                    <p className="text-sm text-rose-600">Jawabanmu: {(r.options as string[])[r.myAnswer]}</p>
                  )}
                  {r.explanation && <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5">{r.explanation}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => { setView("list"); }} className="w-full py-3.5 rounded-2xl bg-violet-600 text-white font-bold active:scale-[0.98] transition-transform">
          Kembali ke Daftar
        </button>
      </div>
    );
  }

  // ---------- VIEW: PILIH TEMAN ----------
  if (view === "pilih") {
    return (
      <div className="px-4 py-5 md:px-6 arena-page">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setView("list")} className="p-2 rounded-xl bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-300" />
          </button>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-slate-100">Pilih Lawan</h1>
        </div>
        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {teman.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-100 dark:border-slate-800">
            <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-violet-500 dark:text-violet-400" />
            </div>
            <p className="font-semibold text-gray-700 dark:text-slate-300">Belum ada teman sekelas</p>
            <p className="text-sm text-gray-400 mt-1 px-8">Gabung kelas dulu untuk bisa menantang temanmu.</p>
            <Link href="/arena/kelasku" className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold">
              Gabung Kelas
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {teman.map((t) => (
              <button
                key={t.id}
                disabled={mengirim}
                onClick={() => kirimTantangan(t.id)}
                className="w-full flex items-center gap-3 bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-100 dark:border-slate-800 p-3.5 active:scale-[0.98] hover:border-violet-300 transition-all disabled:opacity-50"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {initials(t.fullName)}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-bold text-gray-900 dark:text-slate-100 truncate">{t.fullName}</p>
                  <p className="text-xs text-gray-400">Tingkat {t.level}</p>
                </div>
                <Swords className="w-5 h-5 text-violet-500 dark:text-violet-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---------- VIEW: LIST ----------
  return (
    <div className="px-4 py-5 md:px-6 arena-page">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/arena/game" className="p-2 rounded-xl bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-300" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-slate-100">Tantang Teman</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Duel 10 soal, soal sama, siapa lebih jago?</p>
        </div>
      </div>

      {pesan && (
        <div className="mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-sm font-semibold rounded-xl px-4 py-3">
          <Check className="w-4 h-4 shrink-0" /> {pesan}
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        onClick={() => { setPesan(null); setView("pilih"); }}
        className="mt-5 w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold shadow-lg shadow-violet-200/60 active:scale-[0.98] transition-transform"
      >
        <Plus className="w-5 h-5" /> Tantangan Baru
      </button>

      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
        </div>
      ) : (
        <>
          {giliranku.length > 0 && (
            <section className="mt-6">
              <h2 className="font-bold text-gray-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Swords className="w-4 h-4 text-violet-500 dark:text-violet-400" /> Giliranmu Main
              </h2>
              <div className="space-y-2.5">
                {giliranku.map((t) => (
                  <button key={t.id} onClick={() => mulaiMain(t)} className="w-full flex items-center gap-3 bg-white dark:bg-slate-800/90 rounded-2xl border-2 border-violet-200 p-4 active:scale-[0.98] transition-all">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {initials(t.lawan.nama)}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-bold text-gray-900 dark:text-slate-100 truncate">vs {t.lawan.nama}</p>
                      <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold">
                        {t.lawan.selesai ? "Lawan sudah main — susul skornya!" : t.akuPenantang ? "Kamu penantang — main duluan!" : "Menantangmu duel!"}
                      </p>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold shrink-0">Main</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {menunggu.length > 0 && (
            <section className="mt-6">
              <h2 className="font-bold text-gray-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" /> Menunggu Lawan
              </h2>
              <div className="space-y-2.5">
                {menunggu.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {initials(t.lawan.nama)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-slate-100 truncate">vs {t.lawan.nama}</p>
                      <p className="text-xs text-gray-400">Skormu {t.aku.skor} — menunggu lawan main</p>
                    </div>
                    <Hourglass className="w-5 h-5 text-amber-400 shrink-0" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {riwayat.length > 0 && (
            <section className="mt-6">
              <h2 className="font-bold text-gray-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Riwayat
              </h2>
              <div className="space-y-2.5">
                {riwayat.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold shrink-0 ${
                      t.hasil === "MENANG" ? "bg-emerald-100 text-emerald-700 dark:text-emerald-300" : t.hasil === "KALAH" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-700 dark:text-amber-300"
                    }`}>
                      {t.hasil === "MENANG" ? "W" : t.hasil === "KALAH" ? "L" : "S"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-slate-100 truncate">vs {t.lawan.nama}</p>
                      <p className="text-xs text-gray-400">{t.aku.skor} - {t.lawan.skor}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {tantangan.length === 0 && (
            <div className="text-center py-16 mt-4 bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-100 dark:border-slate-800">
              <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
                <Swords className="w-7 h-7 text-violet-500 dark:text-violet-400" />
              </div>
              <p className="font-semibold text-gray-700 dark:text-slate-300">Belum ada tantangan</p>
              <p className="text-sm text-gray-400 mt-1 px-8">Tantang teman sekelasmu dan buktikan siapa paling jago Bahasa Indonesia!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

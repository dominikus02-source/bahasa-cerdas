"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Feather, LoaderCircle, Sparkles } from "lucide-react";
import { BATAS_PETA, type PetaCerita } from "@/lib/aku-sastrawan/peta-cerita";
import { IsianAlur, IsianGenre, IsianLatar, IsianSudut, IsianTeks, IsianTokoh } from "./PetaFields";
import { tanyaNara, type HasilNara } from "./nara";
import { NaraMarkdown } from "./NaraMarkdown";

export type JenisKarya = "CERPEN" | "NOVEL";

type IdLangkah = "jenis" | "tokoh" | "latar" | "konflik" | "alur" | "sudut" | "amanat";

export const LANGKAH: { id: IdLangkah; nama: string; tanya: string; petunjuk: string; ide: string }[] = [
  { id: "jenis", nama: "Jenis karya", tanya: "Cerita seperti apa yang ingin kamu tulis?", petunjuk: "Pilih bentuk dan nuansanya. Semua bisa diubah nanti.", ide: "Berikan 3 premis cerita yang segar, masing-masing satu kalimat, sesuai jenis dan genre di konteks." },
  { id: "tokoh", nama: "Tokoh", tanya: "Siapa yang menggerakkan ceritamu?", petunjuk: "Tokoh hidup karena keinginannya — dan apa yang menghalanginya.", ide: "Usulkan 2 tokoh untuk cerita ini. Untuk tiap tokoh tulis nama, watak, dan keinginannya secara singkat." },
  { id: "latar", nama: "Latar", tanya: "Di mana dan kapan semuanya terjadi?", petunjuk: "Satu detail yang spesifik lebih hidup daripada banyak yang umum.", ide: "Usulkan 2 latar yang hidup untuk cerita ini: tempat, waktu, dan suasana, masing-masing ringkas." },
  { id: "konflik", nama: "Konflik", tanya: "Apa yang dipertaruhkan?", petunjuk: "Konflik lahir saat keinginan tokoh bertemu rintangan.", ide: "Usulkan 3 konflik yang kuat untuk cerita ini, masing-masing satu kalimat." },
  { id: "alur", nama: "Alur", tanya: "Bagaimana ceritamu bergerak?", petunjuk: "Cukup satu kalimat untuk tiap bagian.", ide: "Susun usulan alur singkat untuk cerita ini: awal, tengah, dan akhir, masing-masing satu kalimat." },
  { id: "sudut", nama: "Sudut pandang", tanya: "Dari mata siapa cerita ini dituturkan?", petunjuk: "Sudut pandang menentukan seberapa dekat pembaca dengan tokohmu.", ide: "Sudut pandang apa yang paling cocok untuk cerita ini, dan mengapa? Jawab dalam tiga kalimat." },
  { id: "amanat", nama: "Amanat", tanya: "Apa yang ingin tertinggal di benak pembaca?", petunjuk: "Tema terasa lewat cerita, bukan lewat nasihat.", ide: "Usulkan 3 kemungkinan amanat atau tema untuk cerita ini, masing-masing satu kalimat." },
];

export function RancangCerita({
  terbuka, jenis, peta, ubah, hanyaBaca, konteks, langkahAwal = 0, onPilihJenis, onSelesai, onBatal,
}: {
  terbuka: boolean;
  /** null = karya belum dibuat; langkah pertama meminta jenis karya. */
  jenis: JenisKarya | null;
  peta: PetaCerita;
  ubah: (fn: (p: PetaCerita) => PetaCerita) => void;
  hanyaBaca: boolean;
  konteks: () => string;
  langkahAwal?: number;
  /** Membuat karya. Mengembalikan false bila gagal. */
  onPilihJenis: (j: JenisKarya) => Promise<boolean>;
  /** Tutup perancang dan masuk ke naskah. */
  onSelesai: () => void;
  /** Batal sebelum karya dibuat (kembali ke daftar karya). */
  onBatal?: () => void;
}) {
  const [i, setI] = useState(langkahAwal);
  const [pilihan, setPilihan] = useState<JenisKarya>(jenis ?? "CERPEN");
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState("");
  const [ide, setIde] = useState<Partial<Record<IdLangkah, HasilNara>>>({});
  const [ideSibuk, setIdeSibuk] = useState(false);

  // Langkah awal hanya dipakai saat perancang dibuka.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (terbuka) { setI(langkahAwal); setGalat(""); } }, [terbuka]);
  useEffect(() => { if (jenis) setPilihan(jenis); }, [jenis]);
  useEffect(() => {
    if (!terbuka) return;
    const tombol = (e: KeyboardEvent) => { if (e.key !== "Escape") return; if (jenis) onSelesai(); else onBatal?.(); };
    window.addEventListener("keydown", tombol);
    return () => window.removeEventListener("keydown", tombol);
  }, [terbuka, jenis, onSelesai, onBatal]);

  if (!terbuka) return null;
  const langkah = LANGKAH[i];
  const terakhir = i === LANGKAH.length - 1;
  const track = (jenis ?? pilihan) === "NOVEL" ? "novel" : "cerpen";

  const pastikanKarya = async () => {
    if (jenis) return true;
    setSibuk(true); setGalat("");
    const ok = await onPilihJenis(pilihan);
    setSibuk(false);
    if (!ok) setGalat("Karya belum dapat dibuat. Periksa koneksi, lalu coba lagi.");
    return ok;
  };
  const lanjut = async () => {
    if (!(await pastikanKarya())) return;
    if (terakhir) onSelesai(); else setI((n) => n + 1);
  };
  const lewati = async () => { if (await pastikanKarya()) onSelesai(); };
  const mintaIde = async () => {
    if (ideSibuk) return;
    setIdeSibuk(true);
    const hasil = await tanyaNara({ prompt: `${langkah.ide} Jawab dalam Bahasa Indonesia, maksimal 90 kata, tanpa pengantar.`, track, task: `Rancang cerita: ${langkah.nama}`, context: konteks() });
    setIde((s) => ({ ...s, [langkah.id]: hasil }));
    setIdeSibuk(false);
  };
  const hasilIde = ide[langkah.id];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background text-foreground" role="dialog" aria-modal="true" aria-labelledby="rancang-tanya">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-4 px-5 pt-5 sm:px-8 sm:pt-8">
        <div className="flex flex-1 gap-1.5" aria-label={`Langkah ${i + 1} dari ${LANGKAH.length}`}>
          {LANGKAH.map((l, n) => (
            <span key={l.id} className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${n <= i ? "bg-foreground" : "bg-border"}`} />
          ))}
        </div>
        <button onClick={() => void lewati()} disabled={sibuk} className="text-sm text-muted-foreground transition hover:text-foreground">Lewati</button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div key={langkah.id} className="mx-auto w-full max-w-2xl animate-fade-in px-5 pb-10 pt-10 sm:px-8 sm:pt-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{i + 1} / {LANGKAH.length} · {langkah.nama}</p>
          <h1 id="rancang-tanya" className="mt-3 font-display text-[28px] leading-tight tracking-tight sm:text-4xl">{langkah.tanya}</h1>
          <p className="mt-3 text-[15px] leading-7 text-muted-foreground">{langkah.petunjuk}</p>

          <div className="mt-8">
            {langkah.id === "jenis" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  {([["CERPEN", "Cerpen", "Satu kisah utuh", Feather], ["NOVEL", "Novel", "Kisah panjang per bab", BookOpen]] as const).map(([k, nama, ket, Ikon]) => {
                    const aktif = pilihan === k;
                    const kunci = !!jenis && jenis !== k;
                    return (
                      <button key={k} type="button" disabled={!!jenis || hanyaBaca} aria-pressed={aktif} onClick={() => setPilihan(k)}
                        className={`rounded-2xl border p-4 text-left transition disabled:cursor-default ${aktif ? "border-foreground shadow-sm" : "border-border hover:border-foreground/30"} ${kunci ? "opacity-40" : ""}`}>
                        <Ikon size={18} className="text-muted-foreground" />
                        <span className="mt-3 block font-display text-lg">{nama}</span>
                        <span className="block text-xs text-muted-foreground">{ket}</span>
                      </button>
                    );
                  })}
                </div>
                <IsianGenre peta={peta} ubah={ubah} hanyaBaca={hanyaBaca} />
              </div>
            )}
            {langkah.id === "tokoh" && <IsianTokoh peta={peta} ubah={ubah} hanyaBaca={hanyaBaca} />}
            {langkah.id === "latar" && <IsianLatar peta={peta} ubah={ubah} hanyaBaca={hanyaBaca} />}
            {langkah.id === "konflik" && <IsianTeks label="Konflik" nilai={peta.konflik} batas={BATAS_PETA.konflik} hanyaBaca={hanyaBaca} onUbah={(v) => ubah((p) => ({ ...p, konflik: v }))} placeholder="Rani ingin kuliah di kota, tapi ayahnya sakit dan warung keluarga terancam tutup." />}
            {langkah.id === "alur" && <IsianAlur peta={peta} ubah={ubah} hanyaBaca={hanyaBaca} />}
            {langkah.id === "sudut" && <IsianSudut peta={peta} ubah={ubah} hanyaBaca={hanyaBaca} />}
            {langkah.id === "amanat" && <IsianTeks label="Amanat atau tema" nilai={peta.amanat} batas={BATAS_PETA.amanat} hanyaBaca={hanyaBaca} onUbah={(v) => ubah((p) => ({ ...p, amanat: v }))} placeholder="Pulang tidak selalu berarti kalah." baris={3} />}
          </div>

          {!hanyaBaca && (
            <div className="mt-8">
              <button type="button" onClick={() => void mintaIde()} disabled={ideSibuk}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-foreground/80 transition hover:border-foreground/40 hover:text-foreground disabled:opacity-60">
                {ideSibuk ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} className="text-bc-violet" />}
                {ideSibuk ? "NARA sedang berpikir…" : "Minta ide ke NARA"}
              </button>
              {hasilIde && (
                <div data-testid="nara-ide" className={`mt-4 animate-fade-in rounded-2xl border p-4 text-sm leading-7 ${hasilIde.ok ? "border-border bg-muted/40" : "border-bc-warning/30 bg-bc-warning-soft text-bc-text"}`} role="status">
                  {hasilIde.ok ? <NaraMarkdown teks={hasilIde.teks} /> : <p>{hasilIde.pesan}</p>}
                  {hasilIde.ok && <p className="mt-2 text-xs text-muted-foreground">Ide hanya usulan — pakai yang cocok dengan suaramu.</p>}
                </div>
              )}
            </div>
          )}
          {galat && <p className="mt-6 text-sm text-destructive" role="alert">{galat}</p>}
        </div>
      </div>

      <div className="border-t border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          {i === 0 && !jenis && onBatal ? (
            <button onClick={onBatal} disabled={sibuk} className="inline-flex min-h-11 items-center rounded-full px-3 text-sm text-muted-foreground transition hover:text-foreground">Batal</button>
          ) : (
            <button onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0 || sibuk}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition hover:text-foreground disabled:invisible"><ArrowLeft size={16} /> Kembali</button>
          )}
          <button onClick={() => void lanjut()} disabled={sibuk}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background shadow-sm transition hover:opacity-90 disabled:opacity-60">
            {sibuk && <LoaderCircle size={16} className="animate-spin" />}
            {terakhir ? "Mulai menulis" : "Lanjut"} {!terakhir && !sibuk && <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { setQuiet } from "@/lib/notif-quiet"
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Heart, Star, Trophy, Zap, Shuffle, Check, RotateCcw, Lock,
  ChevronRight, Play, Volume2, VolumeX, Loader2, Sparkles, Timer,
} from "lucide-react";
import { sfx, haptic, isSoundOn, toggleSound, startBGM, stopBGM } from "@/lib/game/sound";

const SCRAMBLE_WORDS = [
  { word: "BAHASA", meaning: "Sistem lambang bunyi yang arbitrer" },
  { word: "KATA", meaning: "Unsur bahasa yang diucapkan atau ditulis" },
  { word: "KALIMAT", meaning: "Satuan bahasa yang relatif berdiri sendiri" },
  { word: "HURUF", meaning: "Tanda aksara dalam sistem tulisan" },
  { word: "BACA", meaning: "Melihat serta memahami isi dari apa yang tertulis" },
  { word: "TULIS", meaning: "Membuat huruf (angka dan sebagainya) dengan pena" },
  { word: "BUNYI", meaning: "Sesuatu yang didengar atau ditangkap oleh telinga" },
  { word: "MAKNA", meaning: "Pengertian yang diberikan pada suatu bentuk bahasa" },
  { word: "KARANG", meaning: "Menggubah (mengarang) cerita, buku, dan sebagainya" },
  { word: "PUISI", meaning: "Ragam sastra yang bahasanya terikat oleh irama" },
  { word: "PROSA", meaning: "Karangan bebas yang tidak terikat oleh kaidah yang ada" },
  { word: "NOVEL", meaning: "Karangan prosa yang panjang mengandung rangkaian cerita" },
  { word: "CERPEN", meaning: "Cerita pendek yang habis dibaca dalam sekali duduk" },
  { word: "DONGENG", meaning: "Cerita yang tidak benar-benar terjadi" },
  { word: "LEGENDA", meaning: "Cerita rakyat yang dianggap benar-benar terjadi" },
  { word: "FABEL", meaning: "Cerita yang menggambarkan watak dan perilaku manusia" },
  { word: "MITOS", meaning: "Cerita rakyat yang berhubungan dengan terjadinya tempat" },
  { word: "SASTRA", meaning: "Karya tulis yang memiliki nilai estetika" },
  { word: "FONEM", meaning: "Satuan bunyi bahasa yang terkecil yang membedakan kata" },
  { word: "MORFEM", meaning: "Satuan bahasa terkecil yang mempunyai makna" },
  { word: "KAMUS", meaning: "Buku yang memuat kata dan maknanya" },
  { word: "EJAAN", meaning: "Aturan penulisan kata dalam bahasa" },
  { word: "DIKSI", meaning: "Pilihan kata yang tepat dan selaras" },
  { word: "RIMA", meaning: "Persamaan bunyi dalam puisi" },
  { word: "IRAMA", meaning: "Alunan yang teratur dan berirama" },
  { word: "ALUR", meaning: "Rangkaian peristiwa dalam cerita" },
  { word: "LATAR", meaning: "Tempat, waktu, dan suasana dalam cerita" },
  { word: "TOKOH", meaning: "Pelaku dalam cerita" },
  { word: "AMANAT", meaning: "Pesan yang ingin disampaikan pengarang" },
  { word: "TEMA", meaning: "Gagasan pokok yang mendasari suatu cerita" },
  { word: "PLOT", meaning: "Rangkaian peristiwa dalam karya fiksi" },
  { word: "KONFLIK", meaning: "Pertentangan dalam cerita" },
  { word: "DIALOG", meaning: "Percakapan antara dua tokoh atau lebih" },
  { word: "NARATOR", meaning: "Pencerita dalam karya sastra" },
  { word: "GAYA", meaning: "Cara pengarang mengungkapkan gagasan" },
  { word: "SIMBOL", meaning: "Lambang yang mewakili sesuatu" },
  { word: "IRONI", meaning: "Makna yang berlawanan dengan yang diucapkan" },
  { word: "SATIRE", meaning: "Sindiran terhadap kebiasaan atau keadaan" },
  { word: "PARODI", meaning: "Tiruan lucu dari karya serius" },
  { word: "HIPERBOLA", meaning: "Majas yang melebih-lebihkan" },
  { word: "PARADOKS", meaning: "Pernyataan yang bertentangan dengan opini umum" },
  { word: "LITOTES", meaning: "Majas yang mengecilkan kenyataan" },
  { word: "SINISME", meaning: "Sindiran yang tajam dan mengejek" },
  { word: "PERSONIFIKASI", meaning: "Majas yang memberi sifat manusia pada benda mati" },
  { word: "METAFORA", meaning: "Perbandingan tanpa kata pembanding" },
  { word: "ASOSIASI", meaning: "Perbandingan dengan menggunakan kata bagaikan" },
  { word: "EPONIM", meaning: "Nama orang yang dipakai sebagai nama sesuatu" },
  { word: "AKRONIM", meaning: "Singkatan yang dilafalkan sebagai kata" },
  { word: "SINGKATAN", meaning: "Bentuk pendek dari suatu kata" },
  { word: "ABREVIASI", meaning: "Proses pemendekan kata" },
  { word: "ADAPTASI", meaning: "Penyesuaian diri terhadap lingkungan" },
  { word: "ASIMILASI", meaning: "Pembauran dua budaya yang berbeda" },
  { word: "AKULTURASI", meaning: "Percampuran dua kebudayaan" },
  { word: "INTEGRASI", meaning: "Pembauran hingga menjadi kesatuan yang utuh" },
  { word: "DISINTEGRASI", meaning: "Perpecahan atau tidak bersatu" },
  { word: "KOHERENSI", meaning: "Hubungan logis antarbagian karangan" },
  { word: "KOHESI", meaning: "Kepaduan bentuk dalam wacana" },
  { word: "REFERENSI", meaning: "Sumber acuan yang digunakan" },
  { word: "KONTEKS", meaning: "Situasi yang melatarbelakangi komunikasi" },
  { word: "PRAANGGAPAN", meaning: "Anggapan dasar sebelum berkomunikasi" },
  { word: "INFERENSI", meaning: "Simpulan yang ditarik dari bukti" },
  { word: "PRESUPOSISI", meaning: "Anggapan yang mendasari ujaran" },
  { word: "IMPLIKATUR", meaning: "Makna tersirat dalam percakapan" },
  { word: "DEIKSIS", meaning: "Kata yang rujukannya berpindah-pindah" },
  { word: "ANAFORA", meaning: "Pengacuan kembali pada unsur yang telah disebut" },
  { word: "KATAFORA", meaning: "Pengacuan pada unsur yang akan disebut" },
  { word: "ELIPSIS", meaning: "Penghilangan unsur kalimat yang telah diketahui" },
  { word: "REMEDIASI", meaning: "Perbaikan atau pengobatan" },
  { word: "KONSELING", meaning: "Pemberian bimbingan oleh ahli" },
  { word: "MEDIASI", meaning: "Proses penyelesaian sengketa dengan pihak ketiga" },
  { word: "ARBITRASE", meaning: "Penyelesaian sengketa di luar pengadilan" },
  { word: "NEGOSIASI", meaning: "Perundingan untuk mencapai kesepakatan" },
  { word: "PERSUASI", meaning: "Ajakan atau bujukan secara halus" },
  { word: "ARGUMENTASI", meaning: "Alasan yang digunakan untuk memperkuat pendapat" },
  { word: "EKSPOSISI", meaning: "Karangan yang memaparkan informasi" },
  { word: "DESKRIPSI", meaning: "Karangan yang melukiskan sesuatu" },
  { word: "NARASI", meaning: "Karangan yang menceritakan peristiwa" },
  { word: "EKSPERIMEN", meaning: "Percobaan ilmiah untuk menguji hipotesis" },
  { word: "OBSERVASI", meaning: "Pengamatan secara sistematis" },
  { word: "KUESIONER", meaning: "Daftar pertanyaan untuk penelitian" },
  { word: "WAWANCARA", meaning: "Percakapan untuk memperoleh keterangan" },
  { word: "SAMPEL", meaning: "Bagian dari populasi yang diteliti" },
  { word: "VARIABEL", meaning: "Faktor yang dapat berubah dalam penelitian" },
  { word: "HIPOTESIS", meaning: "Dugaan sementara dalam penelitian" },
  { word: "DATA", meaning: "Informasi yang dikumpulkan untuk dianalisis" },
  { word: "ANALISIS", meaning: "Penguraian suatu pokok untuk dikaji" },
  { word: "SINTESIS", meaning: "Paduan dari berbagai pengertian" },
  { word: "KLASIFIKASI", meaning: "Pengelompokan berdasarkan persamaan" },
  { word: "PREPOSISI", meaning: "Kata depan yang menandai hubungan" },
  { word: "KONJUNGSI", meaning: "Kata penghubung antar klausa" },
  { word: "NUMERALIA", meaning: "Kata yang menyatakan jumlah atau urutan" },
  { word: "INTERJEKSI", meaning: "Kata seru untuk mengungkapkan perasaan" },
  { word: "PARTIKEL", meaning: "Kata yang tidak dapat diubah bentuknya" },
  { word: "AFIKSASI", meaning: "Proses pembubuhan imbuhan pada kata" },
  { word: "PREFIKS", meaning: "Imbuhan yang diletakkan di awal kata" },
  { word: "SUFIKS", meaning: "Imbuhan yang diletakkan di akhir kata" },
  { word: "KONFIKS", meaning: "Imbuhan di awal dan akhir kata secara bersamaan" },
  { word: "INFLEKSI", meaning: "Perubahan bentuk kata sesuai fungsi gramatikal" },
  { word: "DERIVASI", meaning: "Pembentukan kata baru dari kata dasar" },
  { word: "REDUPLIKASI", meaning: "Pengulangan kata untuk membentuk makna baru" },
  { word: "KOMPOSISI", meaning: "Penggabungan dua kata menjadi satu" },
  { word: "TIPOGRAFI", meaning: "Tata letak dan gaya huruf dalam tulisan" },
  { word: "SINOPSIS", meaning: "Ringkasan singkat suatu cerita" },
  { word: "RESENSI", meaning: "Ulasan atau penilaian terhadap suatu karya" },
  { word: "EDITORIAL", meaning: "Artikel opini resmi dari media" },
  { word: "BIOGRAFI", meaning: "Riwayat hidup seseorang yang ditulis orang lain" },
  { word: "OTOBIOGRAFI", meaning: "Riwayat hidup yang ditulis sendiri" },
  { word: "DIALEK", meaning: "Variasi bahasa menurut daerah atau kelompok pemakainya" },
  { word: "MONOLOG", meaning: "Percakapan seorang diri di atas panggung" },
  { word: "PROLOG", meaning: "Bagian pembuka dalam sebuah karya sastra" },
  { word: "EPILOG", meaning: "Bagian penutup dalam sebuah karya sastra" },
  { word: "KLIMAKS", meaning: "Puncak ketegangan dalam cerita" },
  { word: "ANTAGONIS", meaning: "Tokoh yang melawan tokoh utama" },
  { word: "PROTAGONIS", meaning: "Tokoh utama dalam cerita" },
  { word: "FIGURAN", meaning: "Pemeran pembantu dalam film atau drama" },
  { word: "KAMERA", meaning: "Alat untuk merekam gambar" },
  { word: "SUARA", meaning: "Getaran yang sampai ke telinga" },
  { word: "LAYAR", meaning: "Permukaan tempat gambar ditampilkan" },
  { word: "PENULIS", meaning: "Orang yang menghasilkan karya tulis" },
  { word: "PEMBACA", meaning: "Orang yang membaca karya tulis" },
  { word: "ARTI", meaning: "Maksud yang terkandung dalam suatu kata" },
  { word: "BAIT", meaning: "Satu kesatuan larik dalam puisi" },
  { word: "BAKU", meaning: "Sesuai dengan kaidah bahasa yang resmi" },
  { word: "NADA", meaning: "Tinggi rendahnya bunyi atau sikap dalam tulisan" },
  { word: "TEKS", meaning: "Naskah berupa kata-kata asli dari pengarang" },
  { word: "FAKTA", meaning: "Hal yang benar-benar terjadi" },
  { word: "FRASA", meaning: "Gabungan dua kata atau lebih yang tidak melampaui batas fungsi" },
  { word: "IDIOM", meaning: "Ungkapan yang maknanya tidak sama dengan gabungan makna unsurnya" },
  { word: "JUDUL", meaning: "Nama yang dipakai untuk buku atau karangan" },
  { word: "KISAH", meaning: "Cerita tentang kejadian dalam kehidupan" },
  { word: "LARIK", meaning: "Baris dalam puisi" },
  { word: "OPINI", meaning: "Pendapat atau pikiran seseorang" },
  { word: "SAJAK", meaning: "Persamaan bunyi dalam puisi" },
  { word: "TANDA", meaning: "Sesuatu yang menyatakan maksud tertentu" },
  { word: "WARTA", meaning: "Berita atau kabar" },
  { word: "ALINEA", meaning: "Bagian wacana yang mengandung satu ide pokok" },
  { word: "PANTUN", meaning: "Puisi lama bersajak a-b-a-b" },
  { word: "PIDATO", meaning: "Pengungkapan pikiran dalam bentuk kata-kata kepada orang banyak" },
  { word: "ANTONIM", meaning: "Kata yang berlawanan makna dengan kata lain" },
  { word: "SINONIM", meaning: "Kata yang sama atau mirip maknanya dengan kata lain" },
  { word: "HOMONIM", meaning: "Kata yang sama lafal dan ejaannya tetapi berbeda makna" },
  { word: "IMBUHAN", meaning: "Bubuhan pada kata dasar untuk membentuk kata baru" },
  { word: "GAGASAN", meaning: "Ide atau hasil pemikiran" },
  { word: "KUTIPAN", meaning: "Pengambilalihan kalimat dari buku atau ucapan orang lain" },
  { word: "MAJALAH", meaning: "Terbitan berkala yang berisi beragam artikel" },
  { word: "RUJUKAN", meaning: "Sumber yang dipakai untuk mendukung tulisan" },
  { word: "WAWASAN", meaning: "Cara pandang atau pengetahuan yang luas" },
  { word: "CITRAAN", meaning: "Gambaran yang ditimbulkan kata-kata dalam puisi" },
  { word: "AFORISME", meaning: "Pernyataan padat yang mengandung kebenaran umum" },
  { word: "GURINDAM", meaning: "Puisi lama dua baris berisi nasihat" },
  { word: "KHAYALAN", meaning: "Hasil imajinasi yang tidak nyata" },
  { word: "LAMPIRAN", meaning: "Dokumen tambahan yang disertakan pada dokumen utama" },
  { word: "UNGKAPAN", meaning: "Kelompok kata yang menyatakan makna khusus" },
  { word: "SEMANTIK", meaning: "Cabang linguistik tentang makna kata" },
  { word: "ANTOLOGI", meaning: "Kumpulan karya tulis pilihan dari beberapa pengarang" },
  { word: "DEKLAMASI", meaning: "Pembacaan puisi disertai gerak dan mimik" },
  { word: "ETIMOLOGI", meaning: "Ilmu tentang asal-usul kata" },
  { word: "GLOSARIUM", meaning: "Daftar kata dengan penjelasannya di bidang tertentu" },
  { word: "MORFOLOGI", meaning: "Cabang linguistik tentang pembentukan kata" },
  { word: "LOKAKARYA", meaning: "Pertemuan untuk membahas dan berlatih suatu keterampilan" },
  { word: "MANUSKRIP", meaning: "Naskah tulisan tangan yang belum diterbitkan" },
  { word: "SIMPOSIUM", meaning: "Pertemuan membahas suatu topik dengan beberapa ahli" },
  { word: "PERIBAHASA", meaning: "Kalimat kiasan turun-temurun yang berisi nasihat" },
  { word: "PUSTAKAWAN", meaning: "Orang yang mengelola perpustakaan" },
  { word: "DRAMATURGI", meaning: "Seni dan teknik penyusunan naskah drama" },
  { word: "JURNALISTIK", meaning: "Kegiatan menghimpun dan menyebarkan berita" },
  { word: "BIBLIOGRAFI", meaning: "Daftar buku atau sumber yang dipakai dalam karangan" },
  { word: "PLAGIARISME", meaning: "Penjiplakan karya orang lain tanpa izin" },
  { word: "TRANSKRIPSI", meaning: "Pengalihan tuturan lisan ke bentuk tulisan" },
  { word: "INTERPRETASI", meaning: "Pemberian kesan atau tafsiran terhadap sesuatu" },
  { word: "ENSIKLOPEDIA", meaning: "Buku rujukan berisi keterangan berbagai ilmu" },
  { word: "LEKSIKOGRAFI", meaning: "Ilmu tentang penyusunan kamus" },
  { word: "KORESPONDENSI", meaning: "Kegiatan surat-menyurat" },
];

type Word = (typeof SCRAMBLE_WORDS)[number];
type Screen = "start" | "levels" | "playing" | "result";

type Level = { id: number; name: string; rounds: number; min: number; max: number; time: number; color: string };
const LEVELS: Level[] = [
  { id: 1, name: "Pemula", rounds: 6, min: 0, max: 5, time: 30, color: "#FF6B6B" },
  { id: 2, name: "Siaga", rounds: 7, min: 4, max: 6, time: 30, color: "#F59E0B" },
  { id: 3, name: "Petarung", rounds: 8, min: 5, max: 7, time: 28, color: "#10B981" },
  { id: 4, name: "Jawara", rounds: 9, min: 6, max: 8, time: 28, color: "#38BDF8" },
  { id: 5, name: "Pahlawan", rounds: 10, min: 6, max: 9, time: 26, color: "#8B5CF6" },
  { id: 6, name: "Legenda", rounds: 11, min: 7, max: 10, time: 26, color: "#EC4899" },
  { id: 7, name: "Dewa", rounds: 12, min: 7, max: 11, time: 24, color: "#F43F5E" },
  { id: 8, name: "Naga", rounds: 13, min: 8, max: 12, time: 24, color: "#14B8A6" },
  { id: 9, name: "Maha Guru", rounds: 15, min: 8, max: 99, time: 22, color: "#6366F1" },
];

type Saved = { unlocked: number[]; best: Record<number, number>; stars: Record<number, number> };
function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem("susun-kata-progress");
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d.unlocked)) return { unlocked: d.unlocked, best: d.best || {}, stars: d.stars || {} };
    }
  } catch { /* abaikan */ }
  return { unlocked: [1], best: {}, stars: {} };
}
function saveSaved(s: Saved) {
  try { localStorage.setItem("susun-kata-progress", JSON.stringify(s)); } catch { /* abaikan */ }
}

// Sama seperti TebakKata: hindari kata yang baru saja muncul supaya replay
// level yang sama terasa lebih segar meski bank katanya tetap sama.
const RECENT_WORDS_KEY = "susun-kata-recent";
const RECENT_WORDS_LIMIT = 60;
function loadRecentWords(): string[] {
  try { const raw = localStorage.getItem(RECENT_WORDS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function rememberWords(used: string[]) {
  try {
    const prev = loadRecentWords();
    const next = [...used, ...prev].slice(0, RECENT_WORDS_LIMIT);
    localStorage.setItem(RECENT_WORDS_KEY, JSON.stringify(next));
  } catch { /* abaikan */ }
}
function preferFresh(candidates: Word[], recent: string[], need: number): Word[] {
  const fresh = candidates.filter((w) => !recent.includes(w.word));
  return fresh.length >= need ? fresh : candidates;
}
function starsFor(score: number, rounds: number): number {
  const perRound = rounds > 0 ? score / rounds : 0;
  if (perRound >= 260) return 3;
  if (perRound >= 170) return 2;
  if (perRound >= 60) return 1;
  return 0;
}
function scrambleWord(word: string): string {
  const letters = word.split("");
  let scrambled = [...letters];
  let attempts = 0;
  do {
    for (let i = scrambled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
    }
    attempts++;
  } while (scrambled.join("") === word && attempts < 20);
  return scrambled.join("");
}

export default function SusunKataGame({ hideBackButton, backHref = "/arena/game" }: { hideBackButton?: boolean; backHref?: string }) {
  const [screen, setScreen] = useState<Screen>("start");
  const [saved, setSaved] = useState<Saved>({ unlocked: [1], best: {}, stars: {} });
  const [soundOn, setSoundOn] = useState(true);
  const [levelId, setLevelId] = useState(1);
  const [pool, setPool] = useState<Word[]>([]);
  const [round, setRound] = useState(0);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const [result, setResult] = useState<null | { score: number; stars: number; bestStreak: number; xpEarned: number; gameOver: boolean }>(null);
  const xpSentRef = useRef(false);
  const supabaseIdRef = useRef("");

  const level = LEVELS.find((l) => l.id === levelId) || LEVELS[0];

  // NOTIFICATION 1.0 — game quiet mode: reward global tidak menutupi gameplay;
  // reset otomatis saat keluar game/unmount (tidak ada quiet tersisa).
  useEffect(() => {
    setQuiet(screen === "playing")
    return () => setQuiet(false)
  }, [screen]);

  useEffect(() => {
    setSaved(loadSaved());
    try { setSoundOn(isSoundOn()); } catch { /* abaikan */ }
    const stored = localStorage.getItem("bc-user");
    if (stored) { try { supabaseIdRef.current = JSON.parse(stored).state?.supabaseId || ""; } catch { /* abaikan */ } }
  }, []);
  useEffect(() => () => stopBGM(), []);

  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    if (timeLeft <= 5) sfx.tick();
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) { setTimerActive(false); handleTimeUpRef.current(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [timerActive, timeLeft]);

  const finish = useCallback((finalScore: number, finalBestStreak: number, gameOver: boolean) => {
    stopBGM();
    const stars = starsFor(finalScore, level.rounds);
    const xpEarned = Math.min(Math.floor(finalScore / 40), 60);
    if (!gameOver && finalScore > 0) { sfx.win(); haptic([40, 40, 80]); } else if (gameOver) { sfx.gameover(); haptic(120); }

    setResult({ score: finalScore, stars, bestStreak: finalBestStreak, xpEarned, gameOver });
    setScreen("result");

    setSaved((prev) => {
      const next: Saved = { unlocked: [...prev.unlocked], best: { ...prev.best }, stars: { ...prev.stars } };
      if (!gameOver) {
        if (!next.best[levelId] || finalScore > next.best[levelId]) next.best[levelId] = finalScore;
        if (!next.stars[levelId] || stars > next.stars[levelId]) next.stars[levelId] = stars;
        const nid = levelId + 1;
        if (nid <= LEVELS.length && !next.unlocked.includes(nid)) next.unlocked.push(nid);
      }
      saveSaved(next);
      return next;
    });

    if (!xpSentRef.current && finalScore > 0) {
      xpSentRef.current = true;
      fetch("/api/game/xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: finalScore, correct: 0, wrong: 0, maxStreak: finalBestStreak, xpEarned, gameType: "SUSUN_KATA", supabaseId: supabaseIdRef.current }),
      }).catch(() => { /* abaikan */ });
    }
  }, [level.rounds, levelId]);

  const goToRound = useCallback((currentPool: Word[], idx: number, lv: Level) => {
    const w = currentPool[idx];
    const scrambled = scrambleWord(w.word);
    setCurrentWord(w);
    setAvailableLetters(scrambled.split(""));
    setSelectedLetters([]);
    setFeedback(null);
    setTimeLeft(lv.time);
    setTimerActive(true);
  }, []);

  const scoreRef = useRef(0);
  const bestStreakRef = useRef(0);
  const roundRef = useRef(0);
  const poolRef = useRef<Word[]>([]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { bestStreakRef.current = bestStreak; }, [bestStreak]);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { poolRef.current = pool; }, [pool]);

  const handleTimeUpRef = useRef(() => {});
  handleTimeUpRef.current = () => {
    setLives((prevLives) => {
      const newLives = prevLives - 1;
      setStreak(0);
      setFeedback({ correct: false, message: currentWord?.word || "" });
      if (newLives <= 0) {
        setTimeout(() => finish(scoreRef.current, bestStreakRef.current, true), 1600);
      } else {
        setTimeout(() => {
          const nextRound = roundRef.current + 1;
          setRound(nextRound);
          if (nextRound >= poolRef.current.length) finish(scoreRef.current, bestStreakRef.current, false);
          else goToRound(poolRef.current, nextRound, level);
        }, 1600);
      }
      return newLives;
    });
  };

  const startLevel = (id: number) => {
    sfx.start(); setSoundOn(isSoundOn()); startBGM();
    const lv = LEVELS.find((l) => l.id === id) || LEVELS[0];
    let candidates = SCRAMBLE_WORDS.filter((w) => w.word.length >= lv.min && w.word.length <= lv.max);
    if (candidates.length < lv.rounds) candidates = SCRAMBLE_WORDS;
    candidates = preferFresh(candidates, loadRecentWords(), lv.rounds);
    const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, lv.rounds);
    rememberWords(shuffled.map((w) => w.word));

    setLevelId(id);
    setPool(shuffled);
    setRound(0);
    setScore(0);
    setLives(3);
    setStreak(0);
    setBestStreak(0);
    setResult(null);
    xpSentRef.current = false;
    setScreen("playing");
    goToRound(shuffled, 0, lv);
  };

  const selectLetter = (index: number) => {
    const letter = availableLetters[index];
    const next = [...availableLetters];
    next.splice(index, 1);
    setAvailableLetters(next);
    setSelectedLetters((s) => [...s, letter]);
  };
  const deselectLetter = (index: number) => {
    const letter = selectedLetters[index];
    const next = [...selectedLetters];
    next.splice(index, 1);
    setSelectedLetters(next);
    setAvailableLetters((a) => [...a, letter]);
  };
  const clearSelection = () => {
    if (!currentWord) return;
    setAvailableLetters(scrambleWord(currentWord.word).split(""));
    setSelectedLetters([]);
  };
  const reshuffle = () => {
    setAvailableLetters((prev) => {
      const all = [...prev, ...selectedLetters];
      setSelectedLetters([]);
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      return all;
    });
  };

  const checkAnswer = () => {
    if (!currentWord || selectedLetters.length === 0 || feedback) return;
    const answer = selectedLetters.join("");
    const isCorrect = answer === currentWord.word;
    if (isCorrect) { sfx.correct(); haptic(25); } else { sfx.wrong(); haptic([60, 40, 60]); }
    setTimerActive(false);

    if (isCorrect) {
      const timeBonus = timeLeft * 5;
      const streakBonus = streak * 15;
      const totalPoints = 150 + timeBonus + streakBonus;
      const newStreak = streak + 1;
      const newScore = score + totalPoints;
      const newBest = Math.max(bestStreak, newStreak);
      setScore(newScore);
      setStreak(newStreak);
      setBestStreak(newBest);
      setFeedback({ correct: true, message: `+${totalPoints}` });

      setTimeout(() => {
        const nextRound = round + 1;
        setRound(nextRound);
        if (nextRound >= pool.length) finish(newScore, newBest, false);
        else goToRound(pool, nextRound, level);
      }, 1100);
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      setStreak(0);
      setFeedback({ correct: false, message: `${newLives} nyawa tersisa` });
      if (newLives <= 0) {
        setTimeout(() => finish(score, bestStreak, true), 1600);
      } else {
        setTimeout(() => {
          setSelectedLetters([]);
          if (currentWord) setAvailableLetters(scrambleWord(currentWord.word).split(""));
          setFeedback(null);
          setTimerActive(true);
        }, 1000);
      }
    }
  };

  const chunky = "border-4 border-[#161B3A] shadow-[6px_6px_0_#D97706]";
  const btnBase = `inline-flex items-center justify-center gap-2 font-extrabold rounded-2xl ${chunky} transition-transform active:translate-x-1.5 active:translate-y-1.5 active:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5`;
  const timePct = level.time > 0 ? (timeLeft / level.time) * 100 : 0;

  /* ---------- START ---------- */
  if (screen === "start") {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#12100A] dark:to-[#1C1810] text-[#161B3A] dark:text-[#F1EDFF]">
        <style>{`@keyframes sk-float1{0%,100%{transform:translate(0,0) rotate(6deg)}50%{transform:translate(16px,-22px) rotate(18deg)}}
        @keyframes sk-float2{0%,100%{transform:translate(0,0) rotate(0)}50%{transform:translate(-18px,16px) rotate(-12deg)}}
        @keyframes sk-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sk-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        .sk-screen{animation:sk-fade .35s ease}
        .sk-logo{animation:sk-pulse 1.4s ease-in-out infinite}`}</style>
        <div className="pointer-events-none fixed top-[8%] left-[3%] w-16 h-16 bg-[#10B981] border-4 border-[#161B3A] rounded-3xl" style={{ animation: "sk-float1 9s ease-in-out infinite" }} />
        <div className="pointer-events-none fixed top-[16%] right-[5%] w-12 h-12 bg-[#38BDF8] border-4 border-[#161B3A] rounded-full" style={{ animation: "sk-float2 10s ease-in-out infinite" }} />
        <div className="pointer-events-none fixed bottom-[14%] left-[2%] w-14 h-14 bg-[#FBBF24] border-4 border-[#161B3A] rounded-2xl" style={{ animation: "sk-float1 11s ease-in-out infinite" }} />
        <div className="pointer-events-none fixed bottom-[10%] right-[4%] w-11 h-11 bg-[#EC4899] border-4 border-[#161B3A] rounded-[30%_70%_70%_30%]" style={{ animation: "sk-float2 8s ease-in-out infinite" }} />

        <div className="relative max-w-xl mx-auto px-4 py-5 min-h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className={`sk-logo w-11 h-11 bg-[#10B981] rounded-2xl ${chunky} !shadow-[4px_4px_0_#D97706] flex items-center justify-center`}>
                <Shuffle className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-extrabold text-xl leading-none">Susun Kata</div>
                <div className="text-[11px] font-semibold opacity-60 mt-0.5">Rakit huruf jadi kata sebelum waktu habis</div>
              </div>
            </div>
            <button onClick={() => setSoundOn((m) => { toggleSound(); return !m; })} className={`${btnBase} w-11 h-11 bg-white dark:bg-[#1E1A14]`} aria-label={soundOn ? "Matikan suara" : "Nyalakan suara"}>
              {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>

          <div className="sk-screen bg-white dark:bg-gradient-to-br dark:from-[#1E1A14] dark:to-[#28241E] rounded-3xl p-6 text-center flex-1 flex flex-col items-center justify-center">
            <span className="inline-block px-4 py-1.5 bg-[#FBBF24] border-[3px] border-[#161B3A] rounded-full font-extrabold text-xs shadow-[3px_3px_0_#D97706] mb-4">9 Level • 3 Nyawa</span>
            <h1 className="font-extrabold text-4xl mb-2">Susun <span className="text-[#10B981]">Kata!</span></h1>
            <p className="opacity-70 text-sm max-w-sm mb-1">Huruf teracak muncul lengkap dengan artinya. Susun jadi kata yang benar sebelum waktu habis!</p>
            <p className="text-xs opacity-50 mb-6">Makin cepat kamu susun, makin besar bonus skornya.</p>

            <div className="grid grid-cols-3 gap-2.5 mb-6 w-full max-w-xs">
              <div className="bg-[#4ADE80] border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[3px_3px_0_#D97706]">
                <div className="text-[10px] font-extrabold uppercase opacity-70">Benar</div>
                <div className="font-extrabold text-lg">+150</div>
              </div>
              <div className="bg-[#FBBF24] border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[3px_3px_0_#D97706]">
                <div className="text-[10px] font-extrabold uppercase opacity-70">Sisa Waktu</div>
                <div className="font-extrabold text-lg">Bonus</div>
              </div>
              <div className="bg-[#FF6B6B] text-white border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[3px_3px_0_#D97706]">
                <div className="text-[10px] font-extrabold uppercase opacity-70">Salah</div>
                <div className="font-extrabold text-lg">-1 ❤️</div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mb-2">
              <button className={`${btnBase} px-6 py-3.5 bg-[#10B981] text-white text-lg`} onClick={() => setScreen("levels")}>
                <Play className="w-5 h-5" /> Pilih Tingkat
              </button>
              <button className={`${btnBase} px-5 py-3.5 bg-white dark:bg-[#1E1A14]`} onClick={() => startLevel(1)}>
                Langsung Level 1
              </button>
            </div>
          </div>
          <p className="text-center text-[11px] opacity-50 mt-4 pb-4">Kumpulkan ⭐ di setiap level untuk buka level berikutnya!</p>
        </div>
      </div>
    );
  }

  /* ---------- LEVELS ---------- */
  if (screen === "levels") {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#12100A] dark:to-[#1C1810] text-[#161B3A] dark:text-[#F1EDFF]">
        <style>{`.sk-screen{animation:sk-fade .35s ease}@keyframes sk-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div className="relative max-w-xl mx-auto px-4 py-5 min-h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <button className={`${btnBase} w-12 h-12 bg-white/90 dark:bg-white/15 border-2 dark:border-white/20 hover:bg-white dark:hover:bg-white/25`} onClick={() => setScreen("start")} aria-label="Kembali">
              <X className="w-5 h-5 text-[#161B3A] dark:text-white" />
            </button>
            <h2 className="font-extrabold text-2xl">Pilih Tingkat</h2>
            <div className="w-11" />
          </div>
          <div className="sk-screen bg-white dark:bg-gradient-to-br dark:from-[#1E1A14] dark:to-[#28241E] rounded-3xl p-5 shadow-[6px_6px_0_#D97706] border-4 border-[#161B3A]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {LEVELS.map((lv) => {
                const unlocked = saved.unlocked.includes(lv.id);
                const best = saved.best[lv.id] || 0;
                const st = saved.stars[lv.id] || 0;
                return (
                  <button
                    key={lv.id}
                    disabled={!unlocked}
                    onClick={() => unlocked && startLevel(lv.id)}
                    className={`text-left rounded-2xl border-4 border-[#161B3A] p-3.5 transition-transform ${
                      unlocked ? "shadow-[5px_5px_0_#D97706] hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer" : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-[5px_5px_0_#9CA3AF] dark:bg-slate-700/60 dark:text-[#4A3A18]"
                    }`}
                    style={unlocked ? { background: lv.color, color: ["#FBBF24", "#F59E0B", "#4ADE80", "#38BDF8"].includes(lv.color) ? "#161B3A" : "#fff" } : undefined}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="font-extrabold text-2xl leading-none">#{lv.id}</span>
                      {unlocked ? <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-black/15">{lv.time}dtk</span> : <Lock className="w-4 h-4" />}
                    </div>
                    <div className="font-extrabold text-sm leading-tight mb-0.5">{lv.name}</div>
                    <div className="text-[10px] font-semibold opacity-75 mb-1.5">{lv.rounds} kata</div>
                    {unlocked ? (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3].map((i) => (
                          <Star key={i} className="w-4 h-4" fill={i <= st ? "currentColor" : "none"} style={{ opacity: i <= st ? 1 : 0.35 }} />
                        ))}
                        {best > 0 && <span className="text-[10px] font-extrabold ml-1.5 opacity-80">{best}</span>}
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold">Selesaikan tingkat sebelumnya</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- PLAYING ---------- */
  if (screen === "playing" && currentWord) {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#12100A] dark:to-[#1C1810] text-[#161B3A] dark:text-[#F1EDFF]">
        <div className="relative max-w-lg mx-auto px-5 pt-4 pb-8 min-h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <button className={`${btnBase} w-10 h-10 bg-white dark:bg-[#1E1A14]`} onClick={() => { stopBGM(); setScreen("levels"); }} aria-label="Keluar">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              {streak > 0 && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-500/15 border border-orange-300 dark:border-orange-500/30">
                  <Zap className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                  <span className="text-orange-700 dark:text-orange-300 font-bold text-xs">{streak}</span>
                </div>
              )}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1E1A14] border-2 border-[#161B3A]">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-sm font-bold">{score}</span>
              </div>
              <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white dark:bg-[#1E1A14] border-2 border-[#161B3A]">
                {[...Array(3)].map((_, i) => (
                  <Heart key={i} className={`w-4 h-4 ${i < lives ? "text-rose-500 fill-rose-500" : "text-gray-300 dark:text-[#4A3A18]"}`} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold opacity-50">{round + 1} / {pool.length}</span>
            <div className="flex items-center gap-1.5">
              <Timer className={`w-3.5 h-3.5 ${timeLeft <= 5 ? "text-rose-500" : "opacity-50"}`} />
              <span className={`text-xs font-bold tabular-nums ${timeLeft <= 5 ? "text-rose-600" : "opacity-70"}`}>{timeLeft}s</span>
            </div>
          </div>
          <div className="h-2.5 rounded-full bg-white dark:bg-[#1E1A14] border-2 border-[#161B3A] overflow-hidden mb-5">
            <motion.div className={`h-full rounded-full ${timeLeft <= 5 ? "bg-rose-500" : "bg-gradient-to-r from-emerald-400 to-teal-500"}`} animate={{ width: `${timePct}%` }} transition={{ ease: "linear", duration: 1 }} />
          </div>

          <div className="bg-white dark:bg-[#1E1A14] rounded-2xl p-4 mb-5 text-center border-4 border-[#161B3A] shadow-[4px_4px_0_#D97706]">
            <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-50 mb-1">Arti Kata</p>
            <p className="text-sm font-semibold leading-relaxed">{currentWord.meaning}</p>
          </div>

          <div className="bg-white dark:bg-[#1E1A14] rounded-2xl p-5 mb-5 border-4 border-[#161B3A] shadow-[5px_5px_0_#D97706] min-h-[92px]">
            <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-50 mb-3">Jawaban</p>
            <div className="flex items-center justify-center gap-2 flex-wrap min-h-[52px]">
              {selectedLetters.length === 0 ? (
                <span className="opacity-30 text-sm font-semibold">Ketuk huruf di bawah</span>
              ) : (
                selectedLetters.map((letter, i) => (
                  <motion.button key={i} initial={{ scale: 0, y: 16 }} animate={{ scale: 1, y: 0 }} onClick={() => deselectLetter(i)}
                    className="w-11 h-12 rounded-xl bg-[#10B981] text-white font-extrabold text-lg border-[3px] border-[#161B3A] shadow-[3px_3px_0_#D97706] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-transform">
                    {letter}
                  </motion.button>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
            {availableLetters.map((letter, i) => (
              <motion.button key={i} initial={{ scale: 0, y: 16 }} animate={{ scale: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => selectLetter(i)}
                className="w-11 h-12 rounded-xl bg-white dark:bg-[#2E2618] text-[#161B3A] dark:text-[#F1EDFF] font-extrabold text-lg border-[3px] border-[#161B3A] shadow-[3px_3px_0_#D97706] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-transform">
                {letter}
              </motion.button>
            ))}
          </div>

          <div className="flex gap-3 mb-5">
            <button onClick={clearSelection} className={`${btnBase} flex-1 py-3.5 bg-white dark:bg-[#1E1A14]`}>
              <X className="w-4 h-4" /> Hapus
            </button>
            <button onClick={reshuffle} className={`${btnBase} flex-1 py-3.5 bg-white dark:bg-[#1E1A14]`}>
              <Shuffle className="w-4 h-4" /> Acak
            </button>
            <button onClick={checkAnswer} disabled={selectedLetters.length === 0} className={`${btnBase} flex-1 py-3.5 bg-[#10B981] text-white disabled:opacity-40`}>
              <Check className="w-4 h-4" /> Cek
            </button>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }} className={`p-4 rounded-2xl text-center border-[3px] border-[#161B3A] shadow-[3px_3px_0_#D97706] ${feedback.correct ? "bg-emerald-100 dark:bg-emerald-500/15" : "bg-rose-100 dark:bg-rose-500/15"}`}>
                <p className={`text-lg font-extrabold ${feedback.correct ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>{feedback.message}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  /* ---------- RESULT ---------- */
  if (screen === "result" && result) {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#12100A] dark:to-[#1C1810] text-[#161B3A] dark:text-[#F1EDFF]">
        <style>{`@keyframes sk-pop{0%{transform:scale(0) rotate(-30deg)}60%{transform:scale(1.3) rotate(8deg)}100%{transform:scale(1) rotate(0)}}.sk-star{animation:sk-pop .5s ease}`}</style>
        <div className="relative max-w-xl mx-auto px-4 py-5 min-h-full flex flex-col items-center justify-center text-center">
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180 }} className={`w-24 h-24 rounded-[28px] bg-gradient-to-br ${result.gameOver ? "from-rose-400 to-red-600" : result.stars >= 2 ? "from-emerald-400 to-teal-600" : "from-amber-400 to-orange-600"} flex items-center justify-center shadow-2xl mb-5`}>
            {result.gameOver ? <X className="w-12 h-12 text-white" /> : <Trophy className="w-12 h-12 text-white" />}
          </motion.div>
          <h1 className="text-2xl font-extrabold mb-1">{result.gameOver ? "Nyawa Habis!" : result.stars === 3 ? "Sempurna!" : "Level Selesai!"}</h1>
          <p className="text-sm opacity-60 mb-6">{result.gameOver ? "Jangan menyerah, coba lagi!" : "Kerja bagus! Kejar skor lebih tinggi?"}</p>

          <div className="flex justify-center gap-1.5 mb-4">
            {[1, 2, 3].map((i) => (
              <Star key={i} className={`w-12 h-12 ${i <= result.stars ? "sk-star" : ""}`} style={{ animationDelay: `${i * 0.15}s` }} fill={i <= result.stars ? "#FBBF24" : "none"} stroke={i <= result.stars ? "#F59E0B" : "#D1D5DB"} strokeWidth={2} />
            ))}
          </div>

          <div className="inline-block bg-[#161B3A] text-white rounded-2xl px-7 py-3 mb-4 shadow-[5px_5px_0_#10B981]">
            <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">Skor Akhir</div>
            <div className="font-extrabold text-4xl leading-none">{result.score}</div>
          </div>

          <div className="flex justify-center gap-3 mb-5 text-sm">
            <div className="bg-white dark:bg-[#1E1A14] border-[3px] border-[#161B3A] rounded-xl px-3 py-1.5 shadow-[2px_2px_0_#D97706]">
              <Zap className="w-4 h-4 inline mr-1 text-amber-500" /> Rentetan maks <b>{result.bestStreak}</b>
            </div>
          </div>

          {result.xpEarned > 0 && (
            <div className="mb-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> +{result.xpEarned} XP
            </div>
          )}

          <div className="w-full max-w-xs flex flex-col gap-2.5">
            <button onClick={() => startLevel(levelId)} className={`${btnBase} w-full py-3.5 bg-gradient-to-r from-emerald-400 to-teal-600 text-white`}>
              <RotateCcw className="w-4 h-4" /> Ulangi Level
            </button>
            {!result.gameOver && levelId < LEVELS.length && (
              <button onClick={() => startLevel(levelId + 1)} className={`${btnBase} w-full py-3.5 bg-[#FF6B6B] text-white`}>
                Level Berikutnya <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => setScreen("levels")} className={`${btnBase} w-full py-3.5 bg-[#FBBF24]`}>
              Pilih Tingkat
            </button>
            {!hideBackButton && (
              <a href={backHref} className={`${btnBase} w-full py-3.5 bg-white/80 dark:bg-white/15 dark:border-white/20 text-center`}>
                Kembali ke Arena
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#12100A] dark:to-[#1C1810] text-[#161B3A] dark:text-[#F1EDFF]">
      <Loader2 className="w-10 h-10 animate-spin" />
    </div>
  );
}

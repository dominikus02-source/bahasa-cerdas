"use client";

import { useEffect, useState } from "react";
import { Heart, Volume2, VolumeX, Sparkles, RotateCcw, Star, Trophy, BookOpen, Flame, Check, ArrowRight } from "lucide-react";
import GameBackButton from "@/components/game/GameBackButton";
import { setQuiet } from "@/lib/notif-quiet";

type Mode = "susun" | "rumpang" | "pasangan" | "makna";
type Difficulty = "mudah" | "seru" | "hebat";
type Item = { word: string; image: string; category: "buah" | "hewan"; clue?: string };
type Round = { item: Item; answer: string; options: string[]; matchItems?: Item[] };

const DIFFICULTY: Record<Difficulty, { label: string; rounds: number; lives: number }> = {
  mudah: { label: "Santai", rounds: 8, lives: 4 },
  seru: { label: "Seru", rounds: 10, lives: 3 },
  hebat: { label: "Hebat", rounds: 12, lives: 3 },
};

const ASSET = "https://raw.githubusercontent.com/dominikus02-source/kataplay-assets/main/images";
const items: Item[] = [
  { word: "MANGGA", image: `${ASSET}/Fruits/mangga.png`, category: "buah" },
  { word: "STROBERI", image: `${ASSET}/Fruits/stroberi.png`, category: "buah" },
  { word: "SEMANGKA", image: `${ASSET}/Fruits/semangka.png`, category: "buah" },
  { word: "PEPAYA", image: `${ASSET}/Fruits/pepaya.png`, category: "buah" },
  { word: "JERUK", image: `${ASSET}/Fruits/jeruk.png`, category: "buah" },
  { word: "MELON", image: `${ASSET}/Fruits/melon.png`, category: "buah" },
  { word: "KUCING", image: `${ASSET}/Binatang%20Kataplay/Kucing.png`, category: "hewan" },
  { word: "GAJAH", image: `${ASSET}/Binatang%20Kataplay/Gajah.png`, category: "hewan" },
  { word: "KELINCI", image: `${ASSET}/Binatang%20Kataplay/Kelinci.png`, category: "hewan" },
  { word: "SINGA", image: `${ASSET}/Binatang%20Kataplay/Singa.png`, category: "hewan" },
  { word: "MONYET", image: `${ASSET}/Binatang%20Kataplay/Monyet.png`, category: "hewan" },
  { word: "ZEBRA", image: `${ASSET}/Binatang%20Kataplay/Zebra.png`, category: "hewan" },
];

const meaningPairs = [
  ["BESAR", "KECIL"],
  ["PANAS", "DINGIN"],
  ["TINGGI", "RENDAH"],
  ["CEPAT", "LAMBAT"],
  ["RAJIN", "MALAS"],
  ["TERANG", "GELAP"],
];

const zelby = {
  idle: "/junior/karakter/zelby_idle.webp",
  happy: "/junior/karakter/zelby_happy.webp",
  thinking: "/junior/karakter/zelby_thinking.webp",
  celebrate: "/junior/karakter/zelby_celebrate.webp",
  wave: "/junior/karakter/zelby_wave.webp",
};

function shuffle<T>(a: T[]) {
  return [...a].sort(() => Math.random() - 0.5);
}

function playGameTone(muted: boolean, kind: "tap" | "good" | "great" | "bad" | "finish") {
  if (muted || typeof window === "undefined") return;
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const notes: Record<typeof kind, number[]> = {
      tap: [440], good: [523, 659], great: [523, 659, 784], bad: [220], finish: [523, 659, 784, 1047],
    };
    const ctx = new AudioContextCtor();
    notes[kind].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + index * 0.06;
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(kind === "bad" ? 0.035 : 0.05, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.15);
    });
    window.setTimeout(() => void ctx.close(), 500);
  } catch {
    // Audio is an enhancement only.
  }
}

function difficultyPool(difficulty: Difficulty) {
  if (difficulty === "mudah") return items.filter((item) => item.word.length <= 6);
  if (difficulty === "seru") return items.filter((item) => item.word.length <= 8);
  return items;
}

function makeRound(mode: Mode, difficulty: Difficulty = "seru"): Round {
  const pool = difficultyPool(difficulty);
  const item = pool[Math.floor(Math.random() * pool.length)];

  if (mode === "rumpang") {
    const missingCount = difficulty === "mudah" ? 1 : difficulty === "seru" ? 2 : 3;
    const positions = shuffle([...Array(item.word.length).keys()])
      .slice(0, Math.min(missingCount, item.word.length - 2))
      .sort((a, b) => a - b);
    const answer = positions.map((index) => item.word[index]).join("");
    const shown = item.word.split("").map((letter, index) => positions.includes(index) ? "＿" : letter).join(" ");
    return {
      item: { ...item, clue: shown },
      answer,
      options: shuffle([
        answer,
        ...shuffle(pool.filter((x) => x.word !== item.word).map((x) => x.word.slice(0, answer.length))).slice(0, 3),
      ]),
    };
  }

  if (mode === "makna") {
    const pair = meaningPairs[Math.floor(Math.random() * meaningPairs.length)];
    const prompt = Math.random() > 0.5 ? pair[0] : pair[1];
    const answer = prompt === pair[0] ? pair[1] : pair[0];
    return {
      item: { ...item, word: prompt, clue: prompt },
      answer,
      options: shuffle([answer, ...shuffle(meaningPairs.flat().filter((x) => x !== answer && x !== prompt)).slice(0, 3)]),
    };
  }

  if (mode === "pasangan") {
    const matchItems = shuffle([item, ...shuffle(pool.filter((x) => x.word !== item.word)).slice(0, 3)]);
    return { item, answer: item.word, options: matchItems.map((x) => x.word), matchItems };
  }

  return {
    item,
    answer: item.word,
    options: shuffle([item.word, ...shuffle(pool.filter((x) => x.word !== item.word).map((x) => x.word)).slice(0, 3)]),
  };
}

export default function ZelbyDash() {
  const [mode, setMode] = useState<Mode>("susun");
  const [difficulty, setDifficulty] = useState<Difficulty>("seru");
  const [screen, setScreen] = useState<"start" | "game" | "over">("start");
  const [showGuide, setShowGuide] = useState(false);
  const [round, setRound] = useState<Round>(() => makeRound("susun", "seru"));
  const [letters, setLetters] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [answered, setAnswered] = useState(0);
  const [stars, setStars] = useState(0);
  const [muted, setMuted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [collectedWords, setCollectedWords] = useState<string[]>([]);
  const [bestScore, setBestScore] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [message, setMessage] = useState("Ayo, bermain kata bersama Zelby!");
  const [zelbyPose, setZelbyPose] = useState(zelby.wave);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [locked, setLocked] = useState(false);
  const [bestCombo, setBestCombo] = useState(0);

  useEffect(() => {
    setQuiet(screen === "game");
    return () => setQuiet(false);
  }, [screen]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    try {
      setBestScore(Number(localStorage.getItem("bermain-kata-best") || 0));
      setGamesPlayed(Number(localStorage.getItem("bermain-kata-played") || 0));
      setBestCombo(Number(localStorage.getItem("bermain-kata-best-combo") || 0));
    } catch {
      // Local progress is optional.
    }
  }, []);

  const next = (nextMode = mode, nextDifficulty = difficulty) => {
    const r = makeRound(nextMode, nextDifficulty);
    setRound(r);
    setSelected([]);
    setSelectedMatch(null);
    setLetters(nextMode === "susun" ? shuffle(r.answer.split("")) : []);
    setAnswered((n) => n + 1);
    setFeedback(null);
    setLocked(false);
  };

  const start = (m: Mode) => {
    setMode(m);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setLives(DIFFICULTY[difficulty].lives);
    setAnswered(1);
    setStars(0);
    setCollectedWords([]);
    setMessage("Zelby siap! Yuk mulai!");
    setZelbyPose(zelby.wave);
    setFeedback(null);
    setLocked(false);
    setScreen("game");
    const first = makeRound(m, difficulty);
    setRound(first);
    setSelected([]);
    setSelectedMatch(null);
    setLetters(m === "susun" ? shuffle(first.answer.split("")) : []);
  };

  const finish = (finalScore = score) => {
    const finalStars = Math.max(1, Math.min(3, Math.floor(finalScore / 70) + 1));
    const nextBest = Math.max(bestScore, finalScore);
    const nextPlayed = gamesPlayed + 1;
    const nextBestCombo = Math.max(bestCombo, maxCombo);
    setStars(finalStars);
    setBestScore(nextBest);
    setGamesPlayed(nextPlayed);
    setBestCombo(nextBestCombo);
    setZelbyPose(zelby.celebrate);
    playGameTone(muted, "finish");
    try {
      localStorage.setItem("bermain-kata-best", String(nextBest));
      localStorage.setItem("bermain-kata-played", String(nextPlayed));
      localStorage.setItem("bermain-kata-best-combo", String(nextBestCombo));
    } catch {
      // Local progress is optional.
    }
    setScreen("over");
  };

  const correct = () => {
    if (locked) return;
    setLocked(true);
    setFeedback("correct");
    const newCombo = combo + 1;
    const gained = 10 * Math.min(3, 1 + Math.floor(combo / 3));
    const newScore = score + gained;
    setScore(newScore);
    setCombo(newCombo);
    setMaxCombo((value) => Math.max(value, newCombo));
    setCollectedWords((words) => Array.from(new Set([...words, round.item.word])).slice(-8));
    setStars(Math.min(3, Math.floor(newScore / 50)));
    setZelbyPose(newCombo >= 3 ? zelby.celebrate : zelby.happy);
    setMessage(newCombo >= 3 ? `${newCombo} kombo! Zelby ikut senang! ✨` : "Tepat! Kamu menemukan jawabannya! ⭐");
    playGameTone(muted, newCombo >= 3 ? "great" : "good");
    if (typeof navigator !== "undefined" && "vibrate" in navigator && !reducedMotion) navigator.vibrate?.(18);

    if (answered >= DIFFICULTY[difficulty].rounds) {
      window.setTimeout(() => finish(newScore), reducedMotion ? 80 : 550);
      return;
    }
    window.setTimeout(() => next(), reducedMotion ? 80 : 550);
  };

  const wrong = () => {
    if (locked) return;
    setLocked(true);
    setFeedback("wrong");
    const nextLives = lives - 1;
    setLives(nextLives);
    setCombo(0);
    setZelbyPose(zelby.thinking);
    setMessage("Belum tepat. Coba lihat petunjuknya lagi. 💪");
    playGameTone(muted, "bad");
    if (typeof navigator !== "undefined" && "vibrate" in navigator && !reducedMotion) navigator.vibrate?.([18, 35, 18]);
    if (nextLives <= 0) window.setTimeout(() => finish(score), reducedMotion ? 80 : 500);
  };

  const check = (answer: string) => {
    if (locked) return;
    if (answer === round.answer) correct();
    else wrong();
  };

  const chooseLetter = (letter: string, index: number) => {
    playGameTone(muted, "tap");
    const nextSelected = [...selected, letter];
    setSelected(nextSelected);
    setLetters((ls) => ls.filter((_, i) => i !== index));
    if (nextSelected.length === round.answer.length) check(nextSelected.join(""));
  };

  const modeMeta: Record<Mode, { icon: string; tone: string; description: string }> = {
    susun: { icon: "🔤", tone: "#FFE8A6", description: "Rangkai huruf sampai menjadi kata yang tepat." },
    rumpang: { icon: "🧩", tone: "#DDF4E7", description: "Lengkapi bagian kata yang hilang." },
    pasangan: { icon: "🖼️", tone: "#E5F0FF", description: "Temukan gambar dan kata yang cocok." },
    makna: { icon: "💡", tone: "#F3E8FF", description: "Cari pasangan kata dengan makna berlawanan." },
  };

  const modeLabel: Record<Mode, string> = {
    susun: "Susun Kata",
    rumpang: "Kata Rumpang",
    pasangan: "Cari Pasangan",
    makna: "Lawan Kata",
  };
  const progress = Math.min(100, ((Math.max(1, answered) - 1) / DIFFICULTY[difficulty].rounds) * 100);
  const comboProgress = Math.min(100, (combo / 5) * 100);


  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#FFF8EA] text-[#241B36]">
      <style>{`
        @keyframes bk-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes bk-pop{0%{transform:scale(.75);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
        @keyframes bk-bounce{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-12px) rotate(-2deg)}}
        @keyframes bk-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes bk-star{0%{transform:scale(0) rotate(-25deg)}70%{transform:scale(1.15) rotate(8deg)}100%{transform:scale(1)}}
        @keyframes bk-letter{0%{transform:translateY(16px) scale(.8);opacity:0}100%{transform:none;opacity:1}}
        @keyframes bk-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}
        @keyframes bk-glow{0%{box-shadow:0 0 0 0 rgba(95,191,131,.4)}100%{box-shadow:0 0 0 18px rgba(95,191,131,0)}}
        .bk-pop{animation:bk-pop .38s cubic-bezier(.2,.8,.2,1)}
        .bk-float{animation:bk-float 2.6s ease-in-out infinite}
        .bk-bounce{animation:bk-bounce 1.8s ease-in-out infinite}
        .bk-star{animation:bk-star .5s cubic-bezier(.2,.8,.2,1) both}
        .bk-letter{animation:bk-letter .25s cubic-bezier(.2,.8,.2,1) both}
        .bk-shake{animation:bk-shake .32s ease-in-out}
        .bk-glow{animation:bk-glow .7s ease-out}
        @media (prefers-reduced-motion: reduce){.bk-pop,.bk-float,.bk-bounce,.bk-star,.bk-letter,.bk-shake,.bk-glow{animation:none!important;transition:none!important}}
      `}</style>

      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-70" style={{ background: "radial-gradient(circle at 15% 15%, #FFE4B8 0 8%, transparent 25%), radial-gradient(circle at 85% 20%, #D8F6E5 0 9%, transparent 28%), linear-gradient(180deg,#FFF9EE,#E9F8EF)" }} />
        <div className="relative max-w-5xl mx-auto px-4 py-4 md:py-7">
          <header className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <GameBackButton href="/arena/game" label="Kembali" title="Kembali ke Arena" />
              <div className="w-12 h-12 rounded-2xl bg-white border-4 border-[#241B36] shadow-[4px_4px_0_#F5B82E] overflow-hidden">
                <img src={zelby.happy} alt="Zelby" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="font-black text-xl md:text-2xl tracking-tight">Bermain Kata</div>
                <div className="text-xs md:text-sm font-bold text-[#6B6078]">Dunia kata bersama Zelby ✨</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
            <button onClick={() => setShowGuide(true)} className="hidden sm:inline-flex rounded-2xl bg-white border-3 border-[#241B36] shadow-[3px_3px_0_#F5B82E] px-4 py-2 text-sm font-black">Cara bermain</button>
            <button onClick={() => setMuted((v) => !v)} className="w-11 h-11 rounded-2xl bg-white border-3 border-[#241B36] shadow-[3px_3px_0_#F5B82E] flex items-center justify-center" aria-label={muted ? "Nyalakan suara" : "Matikan suara"}>
              {muted ? <VolumeX size={19}/> : <Volume2 size={19}/>}
            </button>
            </div>
          </header>

          {screen === "start" && (
            <main className="grid lg:grid-cols-[1.15fr_.85fr] gap-5 items-stretch bk-pop">
              <section className="relative overflow-hidden rounded-[32px] bg-white border-4 border-[#241B36] shadow-[8px_8px_0_#241B36] p-6 md:p-9">
                <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-[#FFE3A1]" />
                <div className="relative z-10">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#E8F7EE] border-2 border-[#3C9C69] px-3 py-1 text-xs font-black text-[#28744B]"><Sparkles size={14}/> PETUALANGAN KATA</span>
                  <h1 className="mt-4 text-4xl md:text-6xl font-black tracking-tight leading-[.95]">Main kata.<br/><span className="text-[#F2A900]">Kumpulkan bintang.</span></h1>
                  <p className="mt-4 max-w-xl text-base md:text-lg font-semibold text-[#675D70]">Bukan sekadar menjawab soal. Pilih tantangan, bangun kombo, temukan kata baru, dan lihat Zelby ikut bereaksi.</p>
                  <div className="grid grid-cols-3 gap-2 mt-5 max-w-xl">
                    <div className="rounded-2xl bg-[#FFF8E7] border-2 border-[#E8CC78] p-3"><Trophy size={17}/><div className="text-[10px] font-black text-[#89701A] mt-2">REKOR</div><div className="font-black text-lg">{bestScore}</div></div>
                    <div className="rounded-2xl bg-[#EEF9F2] border-2 border-[#B9DCC6] p-3"><Flame size={17}/><div className="text-[10px] font-black text-[#4F8D68] mt-2">KOMBO</div><div className="font-black text-lg">{bestCombo}×</div></div>
                    <div className="rounded-2xl bg-[#F3EEFF] border-2 border-[#D7C8F0] p-3"><BookOpen size={17}/><div className="text-[10px] font-black text-[#705B91] mt-2">MAIN</div><div className="font-black text-lg">{gamesPlayed}</div></div>
                  </div>
                  <div className="mt-7 grid grid-cols-2 gap-3">
                    {([
                      ["susun","Susun Kata","🔤"],
                      ["rumpang","Kata Rumpang","🧩"],
                      ["pasangan","Cari Pasangan","🖼️"],
                      ["makna","Lawan Kata","💡"],
                    ] as const).map(([m,label,icon]) => (
                      <button key={m} onClick={() => setMode(m)} className={`group rounded-2xl border-3 border-[#241B36] p-4 text-left transition-transform hover:-translate-y-1 ${mode === m ? "bg-[#FFF1BA] shadow-[4px_4px_0_#F5B82E]" : "bg-[#FAFAF8] shadow-[3px_3px_0_#D9D2C6]"}`}>
                        <div className="text-2xl mb-2">{icon}</div>
                        <div className="font-black">{label}</div>
                        <div className="text-xs font-bold text-[#7B7182] mt-1">Pilih petualangan →</div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl bg-[#F6FBF7] border-2 border-[#B9DCC6] p-4">
                    <div className="text-xs font-black tracking-widest text-[#5E9F72]">PILIH TINGKAT PETUALANGAN</div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
                        <button key={d} onClick={() => setDifficulty(d)} className={`rounded-xl border-2 border-[#241B36] py-2 px-2 text-sm font-black ${difficulty === d ? "bg-[#5FBF83] text-white shadow-[2px_2px_0_#241B36]" : "bg-white"}`}>{DIFFICULTY[d].label}</button>
                      ))}
                    </div>
                    <div className="text-xs font-bold text-[#746A7B] mt-2">{DIFFICULTY[difficulty].rounds} tantangan · {DIFFICULTY[difficulty].lives} kesempatan</div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => start(mode)} className="flex-1 rounded-2xl bg-[#F5B82E] border-3 border-[#241B36] shadow-[4px_4px_0_#241B36] py-3 font-black">Mulai petualangan 🚀</button>
                    <button onClick={() => setShowGuide(true)} className="rounded-2xl bg-white border-3 border-[#241B36] shadow-[3px_3px_0_#241B36] px-5 py-3 font-black">Cara bermain</button>
                  </div>
                </div>
              </section>

              <section className="relative rounded-[32px] bg-[#DFF4E8] border-4 border-[#241B36] shadow-[8px_8px_0_#241B36] overflow-hidden flex flex-col justify-end min-h-[360px]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,.9),transparent_24%),linear-gradient(160deg,#BCEAD1,#EAF9D8)]" />
                <div className="absolute left-5 top-5 text-4xl">🌿</div>
                <div className="absolute right-8 top-12 text-3xl">🍃</div>
                <img src={zelby.wave} alt="Zelby" className={`relative z-10 w-64 md:w-72 mx-auto ${reducedMotion ? "" : "bk-bounce"} drop-shadow-[0_18px_16px_rgba(36,27,54,.16)]`} />
                <div className="relative z-20 m-5 rounded-2xl bg-white/95 border-3 border-[#241B36] p-4 text-center shadow-[4px_4px_0_#F5B82E]">
                  <div className="font-black text-lg">“Ayo, kita main!”</div>
                  <div className="text-xs font-bold text-[#756B7D] mt-1">Zelby siap menemanimu.</div>
                </div>
              </section>
            </main>
          )}

          {showGuide && (
            <div className="fixed inset-0 z-[80] bg-[#241B36]/55 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
              <section className="w-full max-w-xl rounded-[32px] bg-white border-4 border-[#241B36] shadow-[10px_10px_0_#F5B82E] p-6 md:p-8 bk-pop">
                <div className="flex items-center gap-4"><img src={zelby.happy} alt="Zelby" className="w-20 h-20 object-contain bk-bounce"/><div><div className="text-xs font-black text-[#5E9F72] tracking-widest">PANDUAN BERMAIN</div><h2 className="text-3xl font-black">Main bersama Zelby</h2></div></div>
                <div className="grid md:grid-cols-3 gap-3 mt-6">
                  {[["1","Pilih permainan","Mulai dari mode yang kamu suka."],["2","Lihat gambar","Gunakan gambar dan petunjuk untuk menemukan jawaban."],["3","Kumpulkan bintang","Jawab dengan tepat dan bangun kombo."]].map(([n,t,d]) => <div key={n} className="rounded-2xl bg-[#F7FBF8] border-2 border-[#B9DCC6] p-4"><div className="w-9 h-9 rounded-xl bg-[#F5B82E] border-2 border-[#241B36] flex items-center justify-center font-black">{n}</div><div className="font-black mt-3">{t}</div><div className="text-sm font-semibold text-[#716778] mt-1">{d}</div></div>)}
                </div>
                <div className="mt-5 rounded-2xl bg-[#FFF7D9] border-2 border-[#E7C76B] p-4 text-sm font-semibold"><b>Ingat:</b> kalau belum tepat, tidak apa-apa. Coba lagi dan pelajari petunjuknya. Di sini kita bermain sambil belajar.</div>
                <button onClick={() => setShowGuide(false)} className="w-full mt-5 rounded-2xl bg-[#5FBF83] border-3 border-[#241B36] shadow-[4px_4px_0_#241B36] py-3 font-black text-white">Aku siap bermain!</button>
              </section>
            </div>
          )}

          {screen === "game" && (
            <main className="max-w-3xl mx-auto bk-pop">
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[["Skor",score],["Kombo",combo],["Nyawa",lives],["Petualangan",`${Math.min(answered, DIFFICULTY[difficulty].rounds)}/${DIFFICULTY[difficulty].rounds}`]].map(([label,value]) => (
                  <div key={String(label)} className="rounded-2xl bg-white border-3 border-[#241B36] shadow-[3px_3px_0_#F5B82E] px-3 py-2">
                    <div className="text-[10px] font-black text-[#7C7182]">{label}</div>
                    <div className="font-black text-xl leading-none mt-1">{value}</div>
                  </div>
                ))}
              </div>

              <section className="relative overflow-hidden rounded-[32px] bg-white border-4 border-[#241B36] shadow-[8px_8px_0_#241B36]">
                <div className="h-2 bg-[#F5B82E]">
                  <div className="h-full bg-[#5FBF83] transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <div className="p-5 md:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-[#8A7F90]">{modeLabel[mode]} · {DIFFICULTY[difficulty].label}</div>
                      <h2 className="text-2xl md:text-4xl font-black mt-1">Tantangan untukmu!</h2>
                      <p className="font-bold text-[#716778] mt-1 pr-24">{message}</p>
                      <div className="mt-3 flex items-center gap-2 max-w-xs"><div className="flex-1 h-2 rounded-full bg-[#EEE8EF] overflow-hidden"><div className="h-full bg-[#F5B82E] transition-all duration-300" style={{ width: `${comboProgress}%` }} /></div><span className="text-[10px] font-black text-[#8A7F90]">KOMBO</span></div>
                    </div>
                    <img src={zelbyPose} alt="Zelby" className={`w-20 md:w-28 shrink-0 ${reducedMotion ? "" : "bk-bounce"}`} />
                  </div>

                  <div className="mt-6 grid md:grid-cols-[.8fr_1.2fr] gap-5 items-center">
                    <div className={`rounded-[28px] bg-[#F2FAF5] border-3 p-4 min-h-52 flex items-center justify-center relative overflow-hidden ${feedback === "wrong" ? "border-[#E38A8A] bk-shake" : feedback === "correct" ? "border-[#5FBF83] bk-glow" : "border-[#B9DCC6]"}`}>
                      <img src={round.item.image} alt={round.item.word} className={`max-h-44 max-w-full object-contain drop-shadow-[0_12px_10px_rgba(36,27,54,.13)] ${reducedMotion ? "" : "bk-float"}`} />
                      {feedback && <div className={`absolute inset-0 flex items-center justify-center bg-white/55 ${reducedMotion ? "" : "bk-pop"}`}><div className={`rounded-full px-5 py-2.5 border-3 border-[#241B36] shadow-[4px_4px_0_#241B36] font-black text-lg ${feedback === "correct" ? "bg-[#8FE0A9]" : "bg-[#FFB3B3]"}`}>{feedback === "correct" ? "Benar! ✨" : "Coba lagi 💪"}</div></div>}
                    </div>

                    <div>
                      {mode === "susun" && (
                        <>
                          <div className="text-center text-3xl md:text-5xl font-black tracking-[.18em] min-h-16 flex items-center justify-center rounded-2xl bg-[#FFF7D9] border-3 border-[#241B36]">
                            {selected.length ? selected.join("") : "— — —"}
                          </div>
                          <div className="grid grid-cols-4 gap-2 mt-4">
                            {letters.map((l,i) => <button key={`${l}-${i}`} onClick={() => chooseLetter(l,i)} disabled={locked} className="bk-letter aspect-square rounded-2xl bg-white border-3 border-[#241B36] shadow-[3px_3px_0_#F5B82E] font-black text-2xl hover:-translate-y-1 transition-transform">{l}</button>)}
                          </div>
                        </>
                      )}

                      {(mode === "rumpang" || mode === "makna") && (
                        <>
                          <div className="text-center rounded-2xl bg-[#FFF7D9] border-3 border-[#241B36] p-5 text-3xl md:text-5xl font-black tracking-[.16em]">{round.item.clue || round.item.word}</div>
                          <div className="grid grid-cols-2 gap-3 mt-4">
                            {round.options.map((o,i) => <button key={`${o}-${i}`} onClick={() => check(o)} disabled={locked} className="rounded-2xl bg-white border-3 border-[#241B36] shadow-[4px_4px_0_#F5B82E] py-4 px-3 font-black text-lg hover:-translate-y-1 transition-transform">{o}</button>)}
                          </div>
                        </>
                      )}

                      {mode === "pasangan" && (
                        <>
                          <div className="font-black text-center text-lg mb-3">Pilih gambar, lalu pilih pasangannya.</div>
                          <div className="grid grid-cols-2 gap-3">
                            {(round.matchItems ?? []).map((matchItem) => <button key={matchItem.word} onClick={() => setSelectedMatch(matchItem.word)} disabled={locked} className={`rounded-2xl bg-white border-3 border-[#241B36] p-2 transition-transform ${selectedMatch === matchItem.word ? "ring-4 ring-[#5FBF83] -translate-y-1" : "hover:-translate-y-1"}`}><img src={matchItem.image} alt={matchItem.word} className="h-20 w-full object-contain"/><span className="block text-xs font-black mt-1">Gambar</span></button>)}
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            {(round.matchItems ?? []).map((matchItem) => <button key={`word-${matchItem.word}`} disabled={!selectedMatch} onClick={() => { if (selectedMatch && !locked) { if (selectedMatch === round.answer && matchItem.word === round.answer) correct(); else wrong(); } }} className={`rounded-2xl border-3 border-[#241B36] py-3 font-black ${selectedMatch ? "bg-[#FFF7D9] shadow-[3px_3px_0_#F5B82E]" : "bg-[#F1EEF2] text-[#A69CAA]"}`}>{matchItem.word}</button>)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </main>
          )}

          {screen === "over" && (
            <main className="max-w-lg mx-auto bk-pop">
              <section className="rounded-[34px] bg-white border-4 border-[#241B36] shadow-[9px_9px_0_#241B36] p-7 md:p-10 text-center">
                <img src={zelby.celebrate} alt="Zelby merayakan hasil" className={`w-44 mx-auto ${reducedMotion ? "" : "bk-bounce"}`} />
                <div className="text-sm font-black text-[#6D6275] mt-3">Permainan selesai</div>
                <h1 className="text-4xl md:text-5xl font-black mt-1">Kamu keren! 🎉</h1>
                <div className="flex justify-center gap-2 my-6">
                  {[1,2,3].map((s) => <Star key={s} size={48} className={`bk-star ${s <= stars ? "text-[#F5B82E] fill-[#F5B82E]" : "text-[#D9D4DD]"}`} />)}
                </div>
                <div className="rounded-3xl bg-[#241B36] text-white p-5 shadow-[5px_5px_0_#F5B82E]">
                  <div className="text-xs font-black opacity-60">TOTAL SKOR</div>
                  <div className="text-6xl font-black mt-1">{score}</div>
                </div>
                <p className="font-bold text-[#6E6475] mt-5">Zelby bangga karena kamu terus mencoba.</p>
                <div className="mt-5 text-left rounded-2xl bg-[#F6FBF7] border-2 border-[#B9DCC6] p-4">
                  <div className="text-xs font-black tracking-widest text-[#5E9F72]">KATA YANG KAMU TEMUKAN</div>
                  <div className="flex flex-wrap gap-2 mt-3">{collectedWords.length ? collectedWords.map((word) => <span key={word} className="rounded-full bg-white border-2 border-[#B9DCC6] px-3 py-1.5 text-sm font-black">{word}</span>) : <span className="text-sm font-bold text-[#746A7B]">Coba lagi untuk mengumpulkan kata.</span>}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 text-left">
                  <div className="rounded-2xl bg-[#FFF7D9] border-2 border-[#E7C76B] p-4"><div className="text-xs font-black text-[#8B761D]">REKOR</div><div className="text-2xl font-black mt-1">{bestScore}</div></div>
                  <div className="rounded-2xl bg-[#EEF7FF] border-2 border-[#B7D9F4] p-4"><div className="text-xs font-black text-[#4D7394]">KOMBO TERBAIK</div><div className="text-2xl font-black mt-1">{maxCombo}×</div></div>
                </div>
                <div className="flex gap-3 justify-center mt-6">
                  <button onClick={() => start(mode)} className="rounded-2xl border-3 border-[#241B36] bg-[#F5B82E] px-5 py-3 font-black shadow-[4px_4px_0_#241B36]"><RotateCcw size={17} className="inline mr-2"/>Main lagi</button>
                  <button onClick={() => setScreen("start")} className="rounded-2xl border-3 border-[#241B36] bg-white px-5 py-3 font-black shadow-[4px_4px_0_#241B36]">Pilih permainan</button>
                </div>
              </section>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}

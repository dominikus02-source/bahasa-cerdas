"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, Volume2, VolumeX, Sparkles, Trophy, RotateCcw, ArrowLeft, Star } from "lucide-react";
import GameBackButton from "@/components/game/GameBackButton";
import { setQuiet } from "@/lib/notif-quiet";

type Mode = "susun" | "rumpang" | "pasangan" | "makna";
type Item = { word: string; image: string; category: "buah" | "hewan"; clue?: string };
type Round = { item: Item; answer: string; options: string[] };

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

function makeRound(mode: Mode): Round {
  const item = items[Math.floor(Math.random() * items.length)];
  if (mode === "rumpang") {
    const index = Math.floor(Math.random() * item.word.length);
    const answer = item.word[index];
    const shown = item.word.slice(0, index) + "＿" + item.word.slice(index + 1);
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter((x) => x !== answer);
    return { item: { ...item, clue: shown }, answer, options: shuffle([answer, ...shuffle(alphabet).slice(0, 3)]) };
  }
  if (mode === "makna") {
    const pair = meaningPairs[Math.floor(Math.random() * meaningPairs.length)];
    const answer = Math.random() > 0.5 ? pair[1] : pair[0];
    const prompt = answer === pair[0] ? pair[1] : pair[0];
    return { item: { ...item, word: prompt, clue: "Pilih lawan katanya" }, answer, options: shuffle([answer, ...shuffle(meaningPairs.flat().filter((x) => x !== answer && x !== prompt)).slice(0, 3)]) };
  }
  return { item, answer: item.word, options: shuffle([item.word, ...shuffle(items.filter((x) => x.word !== item.word).map((x) => x.word)).slice(0, 3)]) };
}

export default function ZelbyDash() {
  const [mode, setMode] = useState<Mode>("susun");
  const [screen, setScreen] = useState<"start" | "game" | "over">("start");
  const [round, setRound] = useState<Round>(() => makeRound("susun"));
  const [letters, setLetters] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [pairs, setPairs] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [answered, setAnswered] = useState(0);
  const [stars, setStars] = useState(0);
  const [muted, setMuted] = useState(false);
  const [message, setMessage] = useState("Ayo, bermain kata bersama Zelby!");
  const [zelbyPose, setZelbyPose] = useState(zelby.wave);

  useEffect(() => {
    setQuiet(screen === "game");
    return () => setQuiet(false);
  }, [screen]);

  const next = (nextMode = mode) => {
    const r = makeRound(nextMode);
    setRound(r);
    setSelected([]);
    setLetters(shuffle(r.answer.split("")));
    setPairs([]);
    setAnswered((n) => n + 1);
  };

  const start = (m: Mode) => {
    setMode(m);
    setScore(0);
    setCombo(0);
    setLives(3);
    setAnswered(0);
    setStars(0);
    setMessage("Zelby siap! Yuk mulai!");
    setZelbyPose(zelby.wave);
    setScreen("game");
    next(m);
  };

  const correct = () => {
    const gained = 10 + Math.min(combo, 5) * 2;
    const newCombo = combo + 1;
    setScore((s) => s + gained);
    setCombo(newCombo);
    setStars((s) => Math.min(3, Math.floor((score + gained) / 50)));
    setZelbyPose(newCombo >= 3 ? zelby.celebrate : zelby.happy);
    setMessage(newCombo >= 3 ? `Hebat! ${newCombo} kali berturut-turut! ✨` : "Benar! Kamu hebat! ⭐");
    window.setTimeout(() => next(), 650);
  };

  const wrong = () => {
    const nextLives = lives - 1;
    setLives(nextLives);
    setCombo(0);
    setZelbyPose(zelby.thinking);
    setMessage("Belum tepat. Coba lagi, kamu pasti bisa! 💪");
    if (nextLives <= 0) {
      setStars(Math.max(1, Math.min(3, Math.floor(score / 50))));
      setScreen("over");
    }
  };

  const check = (answer: string) => {
    if (answer === round.answer) correct();
    else wrong();
  };

  const modeLabel: Record<Mode, string> = {
    susun: "Susun Kata",
    rumpang: "Kata Rumpang",
    pasangan: "Cari Pasangan",
    makna: "Lawan Kata",
  };

  const pairChoices = useMemo(() => {
    if (mode !== "pasangan") return [];
    return shuffle([round.item.word, ...items.filter((x) => x.word !== round.item.word).slice(0, 3).map((x) => x.word)]);
  }, [mode, round]);

  const chooseLetter = (letter: string, index: number) => {
    const nextSelected = [...selected, letter];
    setSelected(nextSelected);
    setLetters((ls) => ls.filter((_, i) => i !== index));
    if (nextSelected.length === round.answer.length) check(nextSelected.join(""));
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#FFF8EA] text-[#241B36]">
      <style>{`
        @keyframes bk-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes bk-pop{0%{transform:scale(.75);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
        @keyframes bk-bounce{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-12px) rotate(-2deg)}}
        @keyframes bk-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes bk-star{0%{transform:scale(0) rotate(-25deg)}70%{transform:scale(1.15) rotate(8deg)}100%{transform:scale(1)}}
        @keyframes bk-letter{0%{transform:translateY(16px) scale(.8);opacity:0}100%{transform:none;opacity:1}}
        .bk-pop{animation:bk-pop .38s cubic-bezier(.2,.8,.2,1)}
        .bk-float{animation:bk-float 2.6s ease-in-out infinite}
        .bk-bounce{animation:bk-bounce 1.8s ease-in-out infinite}
        .bk-star{animation:bk-star .5s cubic-bezier(.2,.8,.2,1) both}
        .bk-letter{animation:bk-letter .25s cubic-bezier(.2,.8,.2,1) both}
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
            <button onClick={() => setMuted((v) => !v)} className="w-11 h-11 rounded-2xl bg-white border-3 border-[#241B36] shadow-[3px_3px_0_#F5B82E] flex items-center justify-center" aria-label={muted ? "Nyalakan suara" : "Matikan suara"}>
              {muted ? <VolumeX size={19}/> : <Volume2 size={19}/>}
            </button>
          </header>

          {screen === "start" && (
            <main className="grid lg:grid-cols-[1.15fr_.85fr] gap-5 items-stretch bk-pop">
              <section className="relative overflow-hidden rounded-[32px] bg-white border-4 border-[#241B36] shadow-[8px_8px_0_#241B36] p-6 md:p-9">
                <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-[#FFE3A1]" />
                <div className="relative z-10">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#E8F7EE] border-2 border-[#3C9C69] px-3 py-1 text-xs font-black text-[#28744B]"><Sparkles size={14}/> PETUALANGAN KATA</span>
                  <h1 className="mt-4 text-4xl md:text-6xl font-black tracking-tight leading-[.95]">Main kata.<br/><span className="text-[#F2A900]">Kumpulkan bintang.</span></h1>
                  <p className="mt-4 max-w-xl text-base md:text-lg font-semibold text-[#675D70]">Belajar kosakata dengan gambar, gerakan, suara, dan tantangan singkat yang seru.</p>
                  <div className="mt-7 grid grid-cols-2 gap-3">
                    {([
                      ["susun","Susun Kata","🔤"],
                      ["rumpang","Kata Rumpang","🧩"],
                      ["pasangan","Cari Pasangan","🖼️"],
                      ["makna","Lawan Kata","💡"],
                    ] as const).map(([m,label,icon]) => (
                      <button key={m} onClick={() => start(m)} className="group rounded-2xl bg-[#FFF7D9] border-3 border-[#241B36] p-4 text-left shadow-[4px_4px_0_#F5B82E] hover:-translate-y-1 transition-transform">
                        <div className="text-2xl mb-2">{icon}</div>
                        <div className="font-black">{label}</div>
                        <div className="text-xs font-bold text-[#7B7182] mt-1">Mulai bermain →</div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="relative rounded-[32px] bg-[#DFF4E8] border-4 border-[#241B36] shadow-[8px_8px_0_#241B36] overflow-hidden flex flex-col justify-end min-h-[360px]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,.9),transparent_24%),linear-gradient(160deg,#BCEAD1,#EAF9D8)]" />
                <div className="absolute left-5 top-5 text-4xl">🌿</div>
                <div className="absolute right-8 top-12 text-3xl">🍃</div>
                <img src={zelby.wave} alt="Zelby" className="relative z-10 w-64 md:w-72 mx-auto bk-bounce drop-shadow-[0_18px_16px_rgba(36,27,54,.16)]" />
                <div className="relative z-20 m-5 rounded-2xl bg-white/95 border-3 border-[#241B36] p-4 text-center shadow-[4px_4px_0_#F5B82E]">
                  <div className="font-black text-lg">“Ayo, kita main!”</div>
                  <div className="text-xs font-bold text-[#756B7D] mt-1">Zelby siap menemanimu.</div>
                </div>
              </section>
            </main>
          )}

          {screen === "game" && (
            <main className="max-w-3xl mx-auto bk-pop">
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[["Skor",score],["Kombo",combo],["Nyawa",lives],["Bintang",stars]].map(([label,value]) => (
                  <div key={String(label)} className="rounded-2xl bg-white border-3 border-[#241B36] shadow-[3px_3px_0_#F5B82E] px-3 py-2">
                    <div className="text-[10px] font-black text-[#7C7182]">{label}</div>
                    <div className="font-black text-xl leading-none mt-1">{value}</div>
                  </div>
                ))}
              </div>

              <section className="relative overflow-hidden rounded-[32px] bg-white border-4 border-[#241B36] shadow-[8px_8px_0_#241B36]">
                <div className="h-2 bg-[#F5B82E]">
                  <div className="h-full bg-[#5FBF83] transition-all duration-500" style={{ width: `${Math.min(100, answered * 10)}%` }} />
                </div>
                <div className="p-5 md:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-[#8A7F90]">{modeLabel[mode]}</div>
                      <h2 className="text-2xl md:text-4xl font-black mt-1">Tantangan untukmu!</h2>
                      <p className="font-bold text-[#716778] mt-1">{message}</p>
                    </div>
                    <img src={zelbyPose} alt="Zelby" className="w-20 md:w-28 shrink-0 bk-bounce" />
                  </div>

                  <div className="mt-6 grid md:grid-cols-[.8fr_1.2fr] gap-5 items-center">
                    <div className="rounded-[28px] bg-[#F2FAF5] border-3 border-[#B9DCC6] p-4 min-h-52 flex items-center justify-center">
                      <img src={round.item.image} alt={round.item.word} className="max-h-44 max-w-full object-contain drop-shadow-[0_12px_10px_rgba(36,27,54,.13)] bk-float" />
                    </div>

                    <div>
                      {mode === "susun" && (
                        <>
                          <div className="text-center text-3xl md:text-5xl font-black tracking-[.18em] min-h-16 flex items-center justify-center rounded-2xl bg-[#FFF7D9] border-3 border-[#241B36]">
                            {selected.length ? selected.join("") : "— — —"}
                          </div>
                          <div className="grid grid-cols-4 gap-2 mt-4">
                            {letters.map((l,i) => <button key={`${l}-${i}`} onClick={() => chooseLetter(l,i)} className="bk-letter aspect-square rounded-2xl bg-white border-3 border-[#241B36] shadow-[3px_3px_0_#F5B82E] font-black text-2xl hover:-translate-y-1 transition-transform">{l}</button>)}
                          </div>
                        </>
                      )}

                      {(mode === "rumpang" || mode === "makna") && (
                        <>
                          <div className="text-center rounded-2xl bg-[#FFF7D9] border-3 border-[#241B36] p-5 text-3xl md:text-5xl font-black tracking-[.16em]">{round.item.clue || round.item.word}</div>
                          <div className="grid grid-cols-2 gap-3 mt-4">
                            {round.options.map((o,i) => <button key={`${o}-${i}`} onClick={() => check(o)} className="rounded-2xl bg-white border-3 border-[#241B36] shadow-[4px_4px_0_#F5B82E] py-4 px-3 font-black text-lg hover:-translate-y-1 transition-transform">{o}</button>)}
                          </div>
                        </>
                      )}

                      {mode === "pasangan" && (
                        <>
                          <div className="font-black text-center text-lg mb-3">Pasangkan gambar dengan kata yang tepat</div>
                          <div className="grid grid-cols-2 gap-3">
                            {pairChoices.map((o,i) => <button key={`${o}-${i}`} onClick={() => check(o)} className="rounded-2xl bg-white border-3 border-[#241B36] shadow-[4px_4px_0_#F5B82E] py-4 font-black hover:-translate-y-1 transition-transform">{o}</button>)}
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
                <img src={zelby.celebrate} alt="Zelby merayakan hasil" className="w-44 mx-auto bk-bounce" />
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

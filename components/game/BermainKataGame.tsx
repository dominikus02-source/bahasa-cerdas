"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Brain, Check, CheckCircle2, ChevronRight, Cloud, Heart, Lightbulb, Palette, Pencil, Play, Puzzle, RotateCcw, Sparkles, Sprout, Star, Trophy, Waves, X } from "lucide-react"
import { useRouter } from "next/navigation"

type Mode = "susun" | "rumpang" | "pasangan" | "makna"
type Level = "mudah" | "sedang" | "tantangan"
type Theme = "langit" | "taman" | "laut"

type Word = {
  word: string
  hint: string
  category: string
  synonym?: string
  antonym?: string
}

type GameSummary = {
  score: number
  earnedSticker?: string
  mode: Mode
}

const WORDS: Word[] = [
  ["API","Panas dan menyala","Alam"],["AIR","Untuk minum dan mandi","Alam"],["AYAM","Hewan yang bertelur","Hewan"],["BOLA","Benda untuk bermain","Benda"],["BUKU","Tempat membaca cerita","Sekolah"],["BURUNG","Hewan yang bisa terbang","Hewan"],["DAUN","Bagian tumbuhan yang hijau","Alam"],["GULA","Rasanya manis","Makanan"],["HUJAN","Air yang turun dari langit","Alam"],["IKAN","Hidup di air","Hewan"],["JAM","Menunjukkan waktu","Benda"],["KAKI","Untuk berjalan","Tubuh"],["KAPAL","Kendaraan di air","Kendaraan"],["KUCING","Hewan yang suka mengeong","Hewan"],["LAPAR","Ingin makan","Perasaan"],["LILIN","Bisa menyala saat gelap","Benda"],["MATA","Untuk melihat","Tubuh"],["MEJA","Tempat meletakkan barang","Benda"],["NASI","Makanan pokok","Makanan"],["OBAT","Dipakai saat sakit","Kesehatan"],["PAGI","Waktu setelah malam","Waktu"],["PENA","Untuk menulis","Sekolah"],["PISANG","Buah berwarna kuning","Makanan"],["ROTI","Makanan dari tepung","Makanan"],["SAPU","Untuk membersihkan lantai","Benda"],["SEPATU","Dipakai di kaki","Pakaian"],["SENANG","Perasaan gembira","Perasaan"],["SIANG","Saat matahari terang","Waktu"],["SUSU","Minuman putih","Makanan"],["TAS","Tempat membawa buku","Sekolah"],["TELUR","Bisa dimasak atau direbus","Makanan"],["TOPI","Dipakai di kepala","Pakaian"],["ULAT","Hewan kecil yang bisa jadi kupu-kupu","Hewan"],["WAKTU","Terus berjalan setiap hari","Waktu"],["BESAR","Lawan kata kecil","Sifat"],["CEPAT","Lawan kata lambat","Sifat"],["CERDAS","Pandai memahami sesuatu","Sifat"],["GELAP","Lawan kata terang","Sifat"],["HALUS","Tidak kasar","Sifat"],["KECIL","Tidak besar","Sifat"],["KOTOR","Lawan kata bersih","Sifat"],["KUAT","Tidak mudah menyerah","Sifat"],["LAMBAT","Bergerak tidak cepat","Sifat"],["MANIS","Rasa seperti gula","Sifat"],["RAJIN","Suka belajar dan bekerja","Sifat"],["RAMAI","Banyak orang atau suara","Sifat"],["SEDIH","Perasaan saat ingin menangis","Perasaan"],["TINGGI","Lawan kata rendah","Sifat"],["TERANG","Banyak cahaya","Sifat"],["TENANG","Tidak gaduh","Sifat"],["BERSIH","Tidak kotor","Sifat"],["BERANI","Tidak takut menghadapi tantangan","Sifat"],["BUNGA","Bagian tumbuhan yang indah","Alam"],["CERI","Buah kecil berwarna merah","Makanan"],["DURIAN","Buah berduri dengan aroma kuat","Makanan"],["GAJAH","Hewan besar dengan belalai","Hewan"],["HUTAN","Tempat banyak pohon","Alam"],["JERUK","Buah yang kaya vitamin C","Makanan"],["KELINCI","Hewan yang suka melompat","Hewan"],["MELATI","Bunga kecil yang harum","Alam"],["MOBIL","Kendaraan beroda empat","Kendaraan"],["MOTOR","Kendaraan roda dua","Kendaraan"],["PAYUNG","Dipakai saat hujan","Benda"],["PELANGI","Muncul dengan banyak warna setelah hujan","Alam"],["PERAHU","Kendaraan kecil di air","Kendaraan"],["SEKOLAH","Tempat belajar","Sekolah"],["SEPEDA","Kendaraan yang dikayuh","Kendaraan"],["TEMAN","Orang yang kita sukai untuk bermain","Sosial"],["TAMAN","Tempat dengan banyak tanaman","Tempat"],["BINTANG","Terlihat di langit malam","Alam"],["BULAN","Terlihat di langit pada malam hari","Alam"],["MATAHARI","Terbit pada pagi hari","Alam"],["KUPU-KUPU","Serangga bersayap indah","Hewan"],["LAPANGAN","Tempat luas untuk bermain","Tempat"],["PERPUSTAKAAN","Tempat meminjam buku","Sekolah"],["PETUALANG","Orang yang suka menjelajah","Orang"],["PELANGGAN","Orang yang membeli barang","Orang"],["PERMAINAN","Kegiatan yang dilakukan untuk bersenang-senang","Kegiatan"],
].map(([word,hint,category]) => ({word,hint,category}))

type MeaningKind = "sinonim" | "lawan"

type MeaningPair = {
  source: string
  answer: string
  kind: MeaningKind
}

const MEANING_PAIRS: MeaningPair[] = [
  { source:"BESAR", answer:"KECIL", kind:"lawan" },
  { source:"CEPAT", answer:"LAMBAT", kind:"lawan" },
  { source:"TERANG", answer:"GELAP", kind:"lawan" },
  { source:"BERSIH", answer:"KOTOR", kind:"lawan" },
  { source:"TINGGI", answer:"RENDAH", kind:"lawan" },
  { source:"SENANG", answer:"GEMBIRA", kind:"sinonim" },
  { source:"CERDAS", answer:"PINTAR", kind:"sinonim" },
  { source:"RAJIN", answer:"TEKUN", kind:"sinonim" },
  { source:"TENANG", answer:"DAMAI", kind:"sinonim" },
  { source:"SEDIH", answer:"GEMBIRA", kind:"lawan" },
  { source:"KUAT", answer:"LEMAH", kind:"lawan" },
  { source:"RAMAI", answer:"SEPI", kind:"lawan" },
  { source:"MANIS", answer:"PAHIT", kind:"lawan" },
  { source:"HALUS", answer:"KASAR", kind:"lawan" },
  { source:"BERANI", answer:"PENAKUT", kind:"lawan" },
]

const PAIRS = MEANING_PAIRS.filter((p) => p.kind === "lawan").map((p) => [p.source, p.answer] as const)

const LEVELS: Record<Level, { label:string; audience:string; desc:string; max:number }> = {
  mudah: { label:"Pemula", audience:"TK", desc:"Kata pendek yang akrab setiap hari", max:5 },
  sedang: { label:"Pintar", audience:"SD 1–3", desc:"Kata sehari-hari dengan tantangan ringan", max:7 },
  tantangan: { label:"Jagoan", audience:"SD 4–6", desc:"Kata lebih panjang untuk penjelajah kata", max:12 },
}

const THEMES: Record<Theme, { bg:string; accent:string; soft:string }> = {
  langit: { bg:"from-sky-50 via-white to-cyan-50", accent:"bg-sky-500", soft:"bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200" },
  taman: { bg:"from-emerald-50 via-white to-lime-50", accent:"bg-emerald-500", soft:"bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200" },
  laut: { bg:"from-cyan-50 via-white to-blue-50", accent:"bg-cyan-500", soft:"bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-200" },
}

const MODE_META: Record<Mode, { title:string; desc:string; icon: typeof Puzzle }> = {
  susun: { title:"Susun Kata", desc:"Susun huruf menjadi kata yang benar", icon:Puzzle },
  rumpang: { title:"Kata Rumpang", desc:"Lengkapi huruf yang hilang", icon:Pencil },
  pasangan: { title:"Cari Pasangan", desc:"Temukan kata yang punya hubungan", icon:Brain },
  makna: { title:"Makna Kata", desc:"Kenali sinonim dan lawan kata sederhana", icon:Lightbulb },
}

const THEME_META: Record<Theme, { label:string; icon: typeof Cloud }> = {
  langit: { label:"Langit", icon:Cloud },
  taman: { label:"Taman", icon:Sprout },
  laut: { label:"Laut", icon:Waves },
}


const ZELBY_STATE_ASSETS={
  idle:"/junior/karakter/zelby_idle.webp",
  thinking:"/junior/karakter/zelby_thinking.webp",
  correct:"/junior/karakter/zelby_celebrate.webp",
  wrong:"/junior/karakter/zelby_thinking.webp",
} as const

const shuffle = <T,>(items:T[]) => {
  const a=[...items]
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a
}

function levelWords(level:Level) {
  const max=LEVELS[level].max
  return WORDS.filter(w => w.word.replace(/[^A-Z]/g,"").length <= max && (level === "mudah" ? w.word.length <= 5 : true))
}

export default function BermainKataGame() {
  const router=useRouter()
  const [mode,setMode]=useState<Mode|null>(null)
  const [level,setLevel]=useState<Level>("mudah")
  const [theme,setTheme]=useState<Theme>("langit")
  const [round,setRound]=useState(0)
  const [score,setScore]=useState(0)
  const [streak,setStreak]=useState(0)
  const [hearts,setHearts]=useState(3)
  const [current,setCurrent]=useState<Word|null>(null)
  const [letters,setLetters]=useState<string[]>([])
  const [answer,setAnswer]=useState<string[]>([])
  const [options,setOptions]=useState<string[]>([])
  const [feedback,setFeedback]=useState<"correct"|"wrong"|null>(null)
  const [message,setMessage]=useState("")
  const [best,setBest]=useState(0)
  const [stickers,setStickers]=useState<string[]>([])
  const [showTheme,setShowTheme]=useState(false)
  const [usedWords,setUsedWords]=useState<string[]>([])
  const [usedPairs,setUsedPairs]=useState<string[]>([])
  const [summary,setSummary]=useState<GameSummary|null>(null)
  const roundTimer=useRef<number|null>(null)

  const pool=useMemo(()=>levelWords(level),[level])
  const maxRounds=8
  const t=THEMES[theme]
  const activeMode = mode ? MODE_META[mode] : MODE_META.susun
  const ModeIcon = activeMode.icon
  const categoryEmoji: Record<string,string> = { Alam:"🌿", Hewan:"🐾", Makanan:"🍎", Sekolah:"📚", Benda:"🧸", Tubuh:"👀", Waktu:"☀️", Perasaan:"💛", Sifat:"✨", Kendaraan:"🚲", Sosial:"🤝", Tempat:"🏡", Kegiatan:"🎮", Orang:"🧭", Pakaian:"🎒", Kesehatan:"🩹" }
  const categoryIcon = current ? (categoryEmoji[current.category] || "✨") : "✨"
  const progress = Math.min(100,(round/maxRounds)*100)

  useEffect(()=>{
    try {
      setBest(Number(localStorage.getItem("bk_best")||0))
      setStickers(JSON.parse(localStorage.getItem("bk_stickers")||"[]"))
      setTheme((localStorage.getItem("bk_theme") as Theme)||"langit")
    } catch {}
  },[])


  useEffect(()=>{
    try {
      localStorage.setItem("bk_theme",theme)
      localStorage.setItem("bk_stickers",JSON.stringify(stickers))
      localStorage.setItem("bk_best",String(best))
    } catch {}
  },[theme,stickers,best])

  useEffect(()=>()=>{
    if(roundTimer.current!==null) window.clearTimeout(roundTimer.current)
  },[])

  const nextQuestion=(nextRound:number, nextMode:Mode=mode!)=>{
    const available=pool.filter((item)=>!usedWords.includes(item.word))
    const w=shuffle(available.length ? available : pool)[0] || WORDS[0]
    setUsedWords((prev)=>prev.includes(w.word) ? prev : [...prev,w.word])
    setCurrent(w); setRound(nextRound); setFeedback(null); setMessage("")

    if(nextMode==="susun"){
      setLetters(shuffle(w.word.split("")))
      setAnswer([])
      return
    }

    if(nextMode==="rumpang"){
      const chars=w.word.split("")
      const idx=Math.min(chars.length-1,Math.max(0,Math.floor(chars.length/2)))
      const correct=w.word[idx]
      chars[idx]="_"
      const distractorPool=(/[AEIOU]/.test(correct) ? ["A","E","I","O","U"] : ["B","C","D","F","G","H","J","K","L","M","N","P","R","S","T"])
        .filter((letter)=>letter!==correct)
      const distractors=shuffle(distractorPool).slice(0,3)
      setLetters(chars)
      setOptions(shuffle([correct,...distractors]))
      return
    }

    if(nextMode==="pasangan"){
      const availablePairs=PAIRS.filter(([source])=>!usedPairs.includes(source))
      const pair=shuffle(availablePairs.length ? availablePairs : PAIRS)[0]
      const target=pair[0]
      const answer=pair[1]
      setUsedPairs((prev)=>prev.includes(target) ? prev : [...prev,target])
      const distractors=shuffle(PAIRS.filter(([source])=>source!==target).map(([,value])=>value))
        .filter((value)=>value!==answer)
        .slice(0,3)
      setCurrent(WORDS.find(x=>x.word===target)||w)
      setOptions(shuffle([answer,...distractors]))
      return
    }

    const availableMeaning=MEANING_PAIRS.filter((pair)=>!usedPairs.includes(pair.source))
    const pair=shuffle(availableMeaning.length ? availableMeaning : MEANING_PAIRS)[0]
    setUsedPairs((prev)=>prev.includes(pair.source) ? prev : [...prev,pair.source])
    const distractors=shuffle(
      MEANING_PAIRS.filter((item)=>item.source!==pair.source && item.kind===pair.kind)
        .map((item)=>item.answer)
    ).filter((value)=>value!==pair.answer)
    const fallback=["BUKU","KUCING","BOLA","MEJA"].filter((value)=>value!==pair.answer)
    const options=shuffle([pair.answer,...[...distractors,...fallback].slice(0,3)])
    const source=WORDS.find((item)=>item.word===pair.source) || w
    setCurrent({...source, synonym:pair.kind==="sinonim" ? pair.answer : undefined, antonym:pair.kind==="lawan" ? pair.answer : undefined})
    setOptions(options)
  }

  const start=(m:Mode)=>{
    if(roundTimer.current!==null) window.clearTimeout(roundTimer.current)
    setSummary(null);setMode(m);setScore(0);setStreak(0);setHearts(3);setRound(0);setAnswer([]);setFeedback(null);setUsedWords([]);setUsedPairs([]);nextQuestion(1,m)
  }

  const leaveGame=()=>{
    if(roundTimer.current!==null) window.clearTimeout(roundTimer.current)
    roundTimer.current=null
    setFeedback(null)
    setCurrent(null)
    setMode(null)
  }

  const finish=(finalScore:number)=>{
    const final=Math.max(0,finalScore)
    setBest(v=>Math.max(v,final))
    const earnedSticker = final>=60 && current && !stickers.includes(current.word) ? current.word : undefined
    if(earnedSticker) setStickers(v=>[...v,earnedSticker].slice(-30))
    setSummary({score:final,earnedSticker,mode:mode ?? "susun"})
    setMode(null);setCurrent(null);setMessage("")
  }

  const resolve=(ok:boolean)=>{
    setFeedback(ok?"correct":"wrong")
    if(ok){setScore(v=>v+10+Math.min(streak,5)*2);setStreak(v=>v+1);setMessage("Hebat! Jawabanmu tepat.")}
    else {setHearts(v=>Math.max(0,v-1));setStreak(0);setMessage("Belum tepat. Coba lagi di soal berikutnya.")}
    if(roundTimer.current!==null) window.clearTimeout(roundTimer.current)
    roundTimer.current=window.setTimeout(()=>{
      roundTimer.current=null
      const nextScore=score+(ok?10+Math.min(streak,5)*2:0)
      const nextHearts=ok?hearts:hearts-1
      if(round>=maxRounds || nextHearts<=0) finish(nextScore)
      else nextQuestion(round+1)
    },1000)
  }

  const checkSusun=()=>{
    if(!current || answer.length!==current.word.length || feedback) return
    resolve(answer.join("")===current.word)
  }

  const chooseRumpang=(letter:string)=>{
    if(!current || feedback) return
    const idx=Math.min(current.word.length-1,Math.max(0,Math.floor(current.word.length/2)))
    resolve(letter===current.word[idx])
  }

  const choose=(value:string)=>{
    if(!current || feedback) return
    if(mode==="pasangan") resolve(value===(PAIRS.find(p=>p[0]===current.word)?.[1] || ""))
    else resolve(value===current.synonym || value===current.antonym)
  }

  if(!mode){
    return <main className={`min-h-screen bg-gradient-to-br ${t.bg} text-slate-900 dark:from-[#060b18] dark:via-[#0b1120] dark:to-[#10182d] dark:text-white overflow-auto`}>
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
        <header className="flex items-center justify-between gap-3">
          <button onClick={()=>router.push("/arena/game")} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm font-bold shadow-sm hover:bg-white dark:border-[#31415f] dark:bg-[#10182d] dark:text-white dark:hover:bg-[#1c2947]" aria-label="Kembali ke Arena"><ArrowLeft size={17}/> Arena</button>
          <button onClick={()=>setShowTheme(v=>!v)} className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm dark:border-[#31415f] dark:bg-[#10182d] dark:text-white" aria-label="Ganti tema"><Palette size={18}/></button>
        </header>

        {showTheme && <div className="mt-3 flex justify-end"><div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-[#31415f] dark:bg-[#10182d]">{(Object.keys(THEMES) as Theme[]).map(k=><button key={k} onClick={()=>{setTheme(k);setShowTheme(false)}} className={`rounded-xl px-3 py-2 text-sm font-bold ${theme===k?t.soft:"hover:bg-slate-50 dark:hover:bg-[#1c2947]"}`}>{(() => { const Icon = THEME_META[k].icon; return <Icon size={15}/> })()} {THEME_META[k].label}</button>)}</div></div>}

        <section className="mx-auto mt-6 max-w-3xl">
          <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,.10)] dark:border-[#263452] dark:bg-[#10182d] dark:shadow-[0_18px_50px_rgba(0,0,0,.42)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(125,211,252,.28),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(167,243,208,.35),transparent_28%),linear-gradient(135deg,#F0F9FF,#FFFFFF_48%,#F0FDFA)] dark:bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,.12),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(52,211,153,.10),transparent_28%),linear-gradient(135deg,#111d34,#0d1527_48%,#10252a)]" />
            <div className="absolute -left-8 -bottom-10 h-32 w-32 rounded-full bg-sky-100/80 dark:bg-sky-500/10" />
            <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-emerald-100/80 dark:bg-emerald-500/10" />
            <div className="absolute right-[14%] top-12 h-3 w-3 rounded-full bg-amber-300/80 shadow-sm" />
            <div className="absolute left-[17%] top-20 h-2 w-2 rounded-full bg-sky-300/80 shadow-sm" />
            <div className="absolute left-[23%] bottom-12 h-2.5 w-2.5 rounded-full bg-emerald-300/80 shadow-sm" />
            <div className="relative z-10 flex min-h-[250px] items-center justify-center px-6 pt-5 sm:min-h-[290px]">
              <div className="relative flex h-[230px] w-full max-w-md items-end justify-center sm:h-[265px]">
                <div className="absolute bottom-2 h-8 w-56 rounded-full bg-slate-900/10 blur-xl" />
                <div className="relative h-[225px] w-[225px] sm:h-[255px] sm:w-[255px] bk-zelby-float">
                  <div className="absolute inset-x-8 bottom-1 h-3 rounded-full bg-sky-200/35 blur-lg bk-zelby-shadow" />
                  <img
                    src={ZELBY_STATE_ASSETS.idle}
                    alt="Zelby menemani permainan"
                    className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_18px_14px_rgba(15,23,42,.14)]"
                  />
                </div>
                <div className="absolute bottom-4 left-1/2 ml-[92px] whitespace-nowrap rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-black text-slate-700 shadow-md bk-zelby-bubble dark:border-[#31415f] dark:bg-[#17213b]/95 dark:text-slate-100 sm:ml-[118px]">
                  Ayo bermain! ✨
                </div>
              </div>
            </div>
            <div className="relative z-20 border-t border-slate-100 bg-white/80 px-5 py-4 dark:border-[#263452] dark:bg-[#0a1020]/90 text-center backdrop-blur">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-black tracking-wide text-white dark:bg-white dark:text-slate-950"><Sparkles size={14}/> EKOSISTEM PEMBELAJARAN BAHASA INDONESIA</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">BERMAIN <span className="text-sky-600">KATA</span></h1>
              <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-200">Main, belajar, dan kumpulkan kata baru bersama Zelby.</p>
            </div>
          </div>
          <style>{`
            @media (prefers-reduced-motion: no-preference){
              .bk-zelby-float{
                animation:bkZelbyFloat 3.8s ease-in-out infinite;
                transform-origin:50% 92%;
              }
              .bk-zelby-shadow{
                animation:bkZelbyShadow 3.8s ease-in-out infinite;
              }
              .bk-zelby-bubble{
                animation:bkZelbyBubble 3.8s ease-in-out infinite;
              }
              @keyframes bkZelbyFloat{
                0%,100%{transform:translate3d(0,0,0) rotate(0deg) scale(1)}
                25%{transform:translate3d(0,-2px,0) rotate(-.35deg) scale(1.004)}
                50%{transform:translate3d(0,-5px,0) rotate(0deg) scale(1.008)}
                75%{transform:translate3d(0,-2px,0) rotate(.35deg) scale(1.004)}
              }
              @keyframes bkZelbyShadow{
                0%,100%{transform:scaleX(1);opacity:.34}
                50%{transform:scaleX(.82);opacity:.22}
              }
              @keyframes bkZelbyBubble{
                0%,100%{transform:translate3d(0,0,0)}
                50%{transform:translate3d(0,-3px,0)}
              }
            }
            @media (prefers-reduced-motion: reduce){
              .bk-zelby-float,.bk-zelby-shadow,.bk-zelby-bubble{
                animation:none !important;
              }
            }
          `}</style>
        </section>

        <section className="mx-auto mt-7 max-w-3xl rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-[#263452] dark:bg-[#10182d]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Pilih levelmu</p><p className="mt-1 font-bold text-slate-800 dark:text-white">{LEVELS[level].desc}</p></div>
            <div className="flex w-full gap-2 sm:w-auto">{(Object.keys(LEVELS) as Level[]).map(k=><button key={k} onClick={()=>setLevel(k)} className={`min-h-12 flex-1 rounded-2xl px-3 py-2 text-left text-xs font-black transition sm:min-w-24 ${level===k?"bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-white dark:text-slate-950":"bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#17213b] dark:text-slate-200 dark:hover:bg-[#253456]"}`}><span className="block">{LEVELS[k].label}</span><span className={`mt-0.5 block text-[10px] ${level===k?"text-white/70 dark:text-slate-500":"text-slate-400"}`}>{LEVELS[k].audience}</span></button>)}</div>
          </div>
        </section>

        <section className="mx-auto mt-5 grid max-w-3xl gap-3 sm:grid-cols-2">
          {(Object.keys(MODE_META) as Mode[]).map((m)=>{
            const meta=MODE_META[m]
            const Icon=meta.icon
            return <button key={m} onClick={()=>start(m)} className="group min-h-28 rounded-[26px] border border-slate-200 bg-white p-4 text-left shadow-sm dark:border-[#263452] dark:bg-[#10182d] transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-500 active:translate-y-0"><div className="flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300"><Icon size={28}/></div><div className="min-w-0 flex-1"><h2 className="font-black text-slate-900 dark:text-white">{meta.title}</h2><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">{meta.desc}</p><span className="mt-2 inline-flex items-center gap-1 text-xs font-black text-sky-600 dark:text-sky-300">Main sekarang <Play size={12} fill="currentColor"/></span></div><ChevronRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-sky-500 dark:text-slate-500"/></div></button>
          })}
        </section>

        <section className="mx-auto mt-5 grid max-w-3xl gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#263452] dark:bg-[#10182d]"><div className="flex items-center gap-3"><Trophy className="text-amber-500"/><div><p className="text-xs font-bold text-slate-400">Skor terbaik</p><p className="text-xl font-black dark:text-white">{best}</p></div></div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#263452] dark:bg-[#10182d]"><div className="flex items-center gap-3"><Star className="text-sky-500" fill="currentColor"/><div><p className="text-xs font-bold text-slate-400">Koleksi stiker</p><p className="text-xl font-black text-slate-900 dark:text-white">{stickers.length}/30</p></div>{stickers.length>0&&<span className="ml-auto rounded-xl bg-sky-50 px-2 py-1 text-xs font-black text-sky-700 dark:bg-sky-400/15 dark:text-sky-200">{stickers[stickers.length - 1]}</span>}</div></div>
        </section>

        <p className="mt-6 text-center text-xs font-medium text-slate-400">BERMAIN KATA berdiri sendiri. Jalur Cerdas tetap menjadi jalur pembelajaran terstruktur.</p>

        {summary && <div className="fixed inset-0 z-[70] flex items-end bg-slate-950/35 p-3 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Hasil bermain"><div className="w-full max-w-sm overflow-hidden rounded-[32px] border border-white/60 bg-white p-6 text-center shadow-2xl dark:border-[#31415f] dark:bg-[#17213b]"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-amber-100 text-4xl">🎉</div><h2 className="mt-4 text-2xl font-black text-slate-900 dark:text-white">Hebat, kamu selesai!</h2><p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">Kamu mengumpulkan <span className="font-black text-sky-600 dark:text-sky-300">{summary.score} poin</span>.</p>{summary.earnedSticker&&<div className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-black text-sky-700 dark:bg-sky-400/15 dark:text-sky-200">Stiker baru: ⭐ {summary.earnedSticker}</div>}<div className="mt-5 grid grid-cols-2 gap-3"><button onClick={()=>start(summary.mode)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sky-500 px-3 text-sm font-black text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-600"><RotateCcw size={16}/> Main lagi</button><button onClick={()=>setSummary(null)} className="min-h-12 rounded-2xl bg-slate-100 px-3 text-sm font-black text-slate-700 transition hover:bg-slate-200 dark:bg-[#263452] dark:text-slate-100 dark:hover:bg-[#31415f]">Pilih permainan</button></div></div></div>}
      </div>
    </main>
  }

  return <main className={`min-h-screen bg-gradient-to-br ${t.bg} text-slate-900 dark:from-[#060b18] dark:via-[#0b1120] dark:to-[#10182d] dark:text-white`}>
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-7">
      <header className="flex items-center gap-3">
        <button onClick={leaveGame} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-[#31415f] dark:bg-[#10182d] transition hover:-translate-y-0.5 hover:shadow-md" aria-label="Keluar permainan"><X size={19}/></button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"><ModeIcon size={17}/></span>
              <div className="min-w-0"><p className="truncate text-sm font-black">{activeMode.title}</p><p className="text-[11px] font-bold text-slate-400">{LEVELS[level].label} · Petualangan kata</p></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-white px-3 py-2 text-xs font-black shadow-sm dark:bg-[#17213b]"><span className="text-slate-400">SKOR</span> <span className="ml-1 text-slate-900 dark:text-white">{score}</span></div>
              <div className="flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-black shadow-sm dark:bg-[#17213b]"><Heart size={14} className="text-rose-500" fill="currentColor"/> {hearts}</div>
            </div>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/80 shadow-inner dark:bg-[#17213b]/80"><div className={`h-full rounded-full ${t.accent} transition-[width] duration-700 ease-out`} style={{width:progress + "%"}}/></div>
        </div>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,.55fr)]">
        <section className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,.10)] dark:border-[#263452] dark:bg-[#10182d] dark:shadow-[0_24px_70px_rgba(0,0,0,.48)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(125,211,252,.18),transparent_24%),radial-gradient(circle_at_88%_8%,rgba(167,243,208,.20),transparent_22%)]"/>
          <div className="relative px-5 pb-6 pt-5 sm:px-7 sm:pb-8 sm:pt-6">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[11px] font-black uppercase tracking-[.18em] text-slate-400">TANTANGAN {round}</p><h1 className="mt-1 text-xl font-black sm:text-2xl">{activeMode.desc}</h1></div>
              <div className="hidden items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 sm:flex"><Sparkles size={14}/> {streak>1 ? `${streak} kombo` : "Mulai kombo"}</div>
            </div>

            {current && <div className="mt-6">
              <div className="relative mx-auto max-w-xl overflow-hidden rounded-[30px] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-5 shadow-inner dark:border-sky-300/15 dark:from-[#172a46] dark:via-[#10182d] dark:to-[#12352f] sm:p-6">
                <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-sky-100/70 dark:bg-sky-400/10"/>
                <div className="absolute -bottom-12 -right-5 h-32 w-32 rounded-full bg-emerald-100/70 dark:bg-emerald-400/10"/>
                <div className="relative z-10 flex items-center gap-4 sm:gap-6">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-white text-5xl shadow-md dark:bg-[#17213b] sm:h-24 sm:w-24">{categoryIcon}</div>
                  <div className="min-w-0"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{current.category}</div><p className="mt-1 text-sm font-bold leading-6 text-slate-600 dark:text-slate-200">{current.hint}</p><div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-black dark:bg-[#17213b] text-slate-400 shadow-sm">Zelby memberi petunjuk</div></div>
                </div>
              </div>

              {mode==="susun" && <div className="mt-5">
                <div className="min-h-[62px] rounded-[22px] border border-sky-100 bg-sky-50/70 p-2 dark:border-sky-300/15 dark:bg-sky-400/10"><div className="flex min-h-12 flex-wrap justify-center gap-2">{answer.map((x,i)=><button key={i} onClick={()=>{setAnswer(a=>{const n=[...a];n.splice(i,1);return n});setLetters(l=>[...l,x])}} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-xl font-black text-white shadow-[0_5px_0_rgba(14,165,233,.25)] transition hover:-translate-y-0.5">{x}</button>)}</div></div>
                <div className="mt-3 flex min-h-14 flex-wrap justify-center gap-2">{letters.map((x,i)=><button key={i} disabled={answer.length>=current.word.length||!!feedback} onClick={()=>{setAnswer(a=>[...a,x]);setLetters(a=>a.filter((_,idx)=>idx!==i))}} className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white text-xl font-black shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:bg-sky-50 disabled:opacity-40 dark:border-[#31415f] dark:bg-[#17213b] dark:hover:bg-sky-400/10">{x}</button>)}</div>
                <button disabled={answer.length!==current.word.length||!!feedback} onClick={checkSusun} className={`mx-auto mt-5 flex min-h-12 items-center gap-2 rounded-2xl px-7 py-3.5 font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 ${t.accent}`}>Periksa jawaban <Check size={17}/></button>
              </div>}

              {mode==="rumpang" && <div className="mt-5"><div className="flex justify-center"><div className="rounded-[24px] border-2 border-dashed border-sky-200 bg-sky-50/70 px-7 py-4 text-4xl font-black tracking-[.32em] dark:border-sky-300/25 dark:bg-sky-400/10">{letters.join("")}</div></div><div className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-3">{options.map((x,i)=><button key={i} disabled={!!feedback} onClick={()=>chooseRumpang(x)} className="min-h-16 rounded-[20px] border-2 border-slate-200 bg-white py-4 text-xl font-black shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:bg-sky-50 disabled:opacity-50 dark:border-[#31415f] dark:bg-[#17213b] dark:hover:bg-sky-400/10">{x}</button>)}</div></div>}

              {mode==="pasangan" && <div className="mt-5"><div className="mx-auto max-w-sm rounded-[26px] border-2 border-dashed border-violet-200 bg-violet-50/60 p-5 text-center dark:border-violet-300/25 dark:bg-violet-400/10"><div className="text-5xl">{categoryIcon}</div><div className="mt-2 text-3xl font-black">{current.word}</div><div className="mt-1 text-xs font-bold text-slate-400">Cari kata yang berpasangan</div></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{options.map((x,i)=><button key={i} disabled={!!feedback} onClick={()=>choose(x)} className="group min-h-16 rounded-[22px] border-2 border-slate-200 bg-white px-5 py-4 text-left font-black shadow-sm transition hover:-translate-y-1 hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50 dark:border-[#31415f] dark:bg-[#17213b] dark:hover:bg-violet-400/10"><span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-400/15 dark:text-violet-200">{i+1}</span>{x}<ChevronRight className="float-right mt-1 text-slate-300 group-hover:text-violet-500 dark:text-slate-500"/></button>)}</div></div>}

              {mode==="makna" && <div className="mt-5"><div className="mx-auto max-w-sm rounded-[26px] border-2 border-dashed border-amber-200 bg-amber-50/60 p-5 text-center dark:border-amber-300/25 dark:bg-amber-400/10"><div className="text-5xl">{categoryIcon}</div><div className="mt-2 text-3xl font-black">{current.word}</div><div className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm dark:bg-[#17213b] dark:text-slate-300">{current.synonym?"Cari sinonim":"Cari lawan kata"}</div></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{options.map((x,i)=><button key={i} disabled={!!feedback} onClick={()=>choose(x)} className="group min-h-16 rounded-[22px] border-2 border-slate-200 bg-white px-5 py-4 text-left font-black shadow-sm transition hover:-translate-y-1 hover:border-amber-300 hover:bg-amber-50 disabled:opacity-50 dark:border-[#31415f] dark:bg-[#17213b] dark:hover:bg-amber-400/10"><span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-400/15 dark:text-amber-200">{i+1}</span>{x}<ChevronRight className="float-right mt-1 text-slate-300 group-hover:text-amber-500 dark:text-slate-500"/></button>)}</div></div>}

              {feedback && <div aria-live="polite" className={`mt-5 flex items-center justify-center gap-3 rounded-[22px] px-4 py-3.5 text-center font-black ${feedback==="correct"?"bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200":"bg-rose-50 text-rose-700 dark:bg-rose-400/15 dark:text-rose-200"}`}>{feedback==="correct"?<CheckCircle2 className="shrink-0" size={22}/>:<span className="text-2xl">💪</span>}<span>{message}</span></div>}
            </div>}
          </div>
        </section>

        <aside className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,.08)] dark:border-[#263452] dark:bg-[#10182d] dark:shadow-[0_24px_70px_rgba(0,0,0,.48)]">
          <div className="absolute inset-0 bg-gradient-to-b from-sky-50 via-white to-emerald-50 dark:from-[#172a46] dark:via-[#10182d] dark:to-[#12352f]"/>
          <div className="relative flex min-h-[390px] flex-col items-center justify-between p-5 sm:min-h-[500px] sm:p-6">
            <div className="flex w-full items-center justify-between"><span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black dark:bg-[#17213b] tracking-widest text-slate-400 shadow-sm">TEMAN BERMAIN</span>{streak>0&&<span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">🔥 {streak}</span>}</div>
            <div className="relative flex flex-1 items-center justify-center py-5 bk-zelby-stage">
              <div className="absolute h-52 w-52 rounded-full bg-white/80 blur-xl dark:bg-cyan-400/10"/>
              <div className={`relative h-60 w-60 bk-zelby-game-motion ${feedback==="correct"?"bk-zelby-celebrate":feedback==="wrong"?"bk-zelby-sad":"bk-zelby-thinking"}`}>
                <img
                  src={feedback==="correct" ? ZELBY_STATE_ASSETS.correct : feedback==="wrong" ? ZELBY_STATE_ASSETS.wrong : ZELBY_STATE_ASSETS.thinking}
                  alt="Zelby menemanimu bermain"
                  className="h-full w-full object-contain drop-shadow-[0_20px_18px_rgba(15,23,42,.16)]"
                />
              </div>
              <div className="absolute bottom-3 right-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-md dark:border-[#31415f] dark:bg-[#17213b] dark:text-slate-100">{feedback==="correct"?"Hebat! ⭐":feedback==="wrong"?"Belum tepat. Coba lagi 💪":"Coba pikirkan dulu 🤔"}</div>
            </div>
            <div className="w-full rounded-[22px] bg-white/85 p-4 text-center shadow-sm dark:bg-[#17213b]/90"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">KEMAJUAN</div><div className="mt-1 text-2xl font-black">{round}<span className="text-slate-300 dark:text-slate-500">/{maxRounds}</span></div><div className="mt-2 flex justify-center gap-1.5">{Array.from({length:maxRounds}).map((_,i)=><span key={i} className={`h-2 w-5 rounded-full ${i<round?t.accent:"bg-slate-200 dark:bg-slate-700"}`}/>)}</div></div>
          </div>
        </aside>
      </div>

      <div className="mt-4 flex items-center justify-between px-1 text-xs font-bold text-slate-400"><span>Skor {score}</span><span>{streak>1?`🔥 ${streak} kombo`:"Terus bermain!"}</span><span>{round}/{maxRounds}</span></div>
    <style>{`
      @media (prefers-reduced-motion: no-preference){
        .bk-zelby-game-motion{
          transform-origin:50% 88%;
          will-change:transform;
        }
        .bk-zelby-thinking{animation:bkZelbyThinking 2.8s ease-in-out infinite}
        .bk-zelby-sad{animation:bkZelbySad 1.8s ease-in-out infinite}
        .bk-zelby-stage::before{
          content:"";
          position:absolute;
          width:190px;height:42px;
          bottom:34px;left:50%;
          transform:translateX(-50%);
          border-radius:999px;
          background:rgba(14,165,233,.16);
          filter:blur(16px);
          animation:bkZelbyGlow 2.8s ease-in-out infinite;
        }
        .bk-zelby-celebrate{animation:bkZelbyCelebrate .7s cubic-bezier(.2,.8,.2,1) 2 !important}
        .bk-zelby-wiggle{animation:bkZelbyWiggle .45s ease-in-out 2 !important}
        @keyframes bkZelbyThinking{
          0%,100%{transform:translate3d(0,2px,0) rotate(-.5deg) scale(1)}
          35%{transform:translate3d(-2px,-4px,0) rotate(.3deg) scale(1.012)}
          65%{transform:translate3d(2px,-7px,0) rotate(.6deg) scale(1.018)}
        }
        @keyframes bkZelbySad{
          0%,100%{transform:translate3d(0,4px,0) rotate(0) scale(.985)}
          50%{transform:translate3d(0,8px,0) rotate(-1deg) scale(.97)}
        }
        @keyframes bkZelbyGlow{
          0%,100%{transform:translateX(-50%) scaleX(1);opacity:.34}
          35%{transform:translateX(-50%) scaleX(.86);opacity:.22}
          60%{transform:translateX(-50%) scaleX(.68);opacity:.14}
          82%{transform:translateX(-50%) scaleX(.9);opacity:.25}
        }
        @keyframes bkZelbyCelebrate{
          0%{transform:translateY(6px) scale(1) rotate(0)}
          35%{transform:translateY(-24px) scale(1.08) rotate(-3deg)}
          70%{transform:translateY(-12px) scale(1.04) rotate(3deg)}
          100%{transform:translateY(0) scale(1) rotate(0)}
        }
        @keyframes bkZelbyWiggle{
          0%,100%{transform:translateX(0) rotate(0)}
          25%{transform:translateX(-7px) rotate(-4deg)}
          75%{transform:translateX(7px) rotate(4deg)}
        }
      }
      @media (prefers-reduced-motion: reduce){
        .bk-zelby-game-motion,.bk-zelby-stage::before{animation:none !important}
      }
    `}</style>
    </div>
  </main>
}

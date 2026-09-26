"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, BookOpen, Brain, Check, ChevronRight, Cloud, Heart, Lightbulb, Palette, Pencil, Puzzle, Sparkles, Sprout, Star, Trophy, Waves, X } from "lucide-react"
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

const LEVELS: Record<Level, { label:string; desc:string; max:number }> = {
  mudah: { label:"Mudah", desc:"Kata pendek dan dekat dengan keseharian", max:5 },
  sedang: { label:"Sedang", desc:"Kata sehari-hari dengan tantangan ringan", max:7 },
  tantangan: { label:"Tantangan", desc:"Kata lebih panjang untuk anak SD", max:12 },
}

const THEMES: Record<Theme, { bg:string; accent:string; soft:string }> = {
  langit: { bg:"from-sky-50 via-white to-cyan-50", accent:"bg-sky-500", soft:"bg-sky-100 text-sky-700" },
  taman: { bg:"from-emerald-50 via-white to-lime-50", accent:"bg-emerald-500", soft:"bg-emerald-100 text-emerald-700" },
  laut: { bg:"from-cyan-50 via-white to-blue-50", accent:"bg-cyan-500", soft:"bg-cyan-100 text-cyan-700" },
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
  const [selected,setSelected]=useState<string|null>(null)
  const [feedback,setFeedback]=useState<"correct"|"wrong"|null>(null)
  const [message,setMessage]=useState("")
  const [best,setBest]=useState(0)
  const [stickers,setStickers]=useState<string[]>([])
  const [showTheme,setShowTheme]=useState(false)
  const [usedWords,setUsedWords]=useState<string[]>([])
  const [usedPairs,setUsedPairs]=useState<string[]>([])

  const pool=useMemo(()=>levelWords(level),[level])
  const maxRounds=8
  const t=THEMES[theme]

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

  const nextQuestion=(nextRound:number, nextMode:Mode=mode!)=>{
    const available=pool.filter((item)=>!usedWords.includes(item.word))
    const w=shuffle(available.length ? available : pool)[0] || WORDS[0]
    setUsedWords((prev)=>prev.includes(w.word) ? prev : [...prev,w.word])
    setCurrent(w); setRound(nextRound); setSelected(null); setFeedback(null); setMessage("")

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
    setMode(m);setScore(0);setStreak(0);setHearts(3);setRound(0);setAnswer([]);setFeedback(null);setUsedWords([]);setUsedPairs([]);nextQuestion(1,m)
  }

  const finish=(finalScore:number)=>{
    const final=Math.max(0,finalScore)
    setBest(v=>Math.max(v,final))
    if(final>=60 && current && !stickers.includes(current.word)) setStickers(v=>[...v,current.word].slice(-30))
    setMode(null);setCurrent(null);setMessage("")
  }

  const resolve=(ok:boolean)=>{
    setFeedback(ok?"correct":"wrong")
    if(ok){setScore(v=>v+10+Math.min(streak,5)*2);setStreak(v=>v+1);setMessage("Hebat! Jawabanmu tepat.")}
    else {setHearts(v=>Math.max(0,v-1));setStreak(0);setMessage("Belum tepat. Coba lagi di soal berikutnya.")}
    window.setTimeout(()=>{
      const nextScore=score+(ok?10+Math.min(streak,5)*2:0)
      const nextHearts=ok?hearts:hearts-1
      if(round>=maxRounds || nextHearts<=0) finish(nextScore)
      else nextQuestion(round+1)
    },650)
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
    return <main className={`min-h-screen bg-gradient-to-br ${t.bg} text-slate-900 overflow-auto`}>
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
        <header className="flex items-center justify-between gap-3">
          <button onClick={()=>router.push("/arena/game")} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm font-bold shadow-sm hover:bg-white" aria-label="Kembali ke Arena"><ArrowLeft size={17}/> Arena</button>
          <button onClick={()=>setShowTheme(v=>!v)} className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm" aria-label="Ganti tema"><Palette size={18}/></button>
        </header>

        {showTheme && <div className="mt-3 flex justify-end"><div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">{(Object.keys(THEMES) as Theme[]).map(k=><button key={k} onClick={()=>{setTheme(k);setShowTheme(false)}} className={`rounded-xl px-3 py-2 text-sm font-bold ${theme===k?t.soft:"hover:bg-slate-50"}`}>{(() => { const Icon = THEME_META[k].icon; return <Icon size={15}/> })()} {THEME_META[k].label}</button>)}</div></div>}

        <section className="mx-auto mt-6 max-w-3xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-[28px] bg-white shadow-[0_12px_30px_rgba(15,23,42,.10)]">
  <img src="/images/zelby.svg" alt="Zelby" className="h-full w-full object-contain p-2" />
</div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-black tracking-wide text-white"><Sparkles size={14}/> EKOSISTEM PEMBELAJARAN BAHASA INDONESIA</div>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">BERMAIN <span className="text-sky-600">KATA</span></h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">Main, belajar, dan kumpulkan kata baru bersama Zelby. Dibuat ringan untuk TK–SD, tetapi tetap seru dimainkan berulang.</p>
        </section>

        <section className="mx-auto mt-7 max-w-3xl rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Pilih tingkat</p><p className="mt-1 font-bold">{LEVELS[level].desc}</p></div>
            <div className="flex gap-2">{(Object.keys(LEVELS) as Level[]).map(k=><button key={k} onClick={()=>setLevel(k)} className={`rounded-xl px-3 py-2 text-sm font-black transition ${level===k?"bg-slate-900 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{LEVELS[k].label}</button>)}</div>
          </div>
        </section>

        <section className="mx-auto mt-5 grid max-w-3xl gap-3 sm:grid-cols-2">
          {(Object.keys(MODE_META) as Mode[]).map((m)=>{
            const meta=MODE_META[m]
            const Icon=meta.icon
            return <button key={m} onClick={()=>start(m)} className="group rounded-[26px] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl active:translate-y-0"><div className="flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600"><Icon size={28}/></div><div className="min-w-0 flex-1"><h2 className="font-black text-slate-900">{meta.title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{meta.desc}</p></div><ChevronRight className="text-slate-300 transition group-hover:text-sky-500"/></div></button>
          })}
        </section>

        <section className="mx-auto mt-5 grid max-w-3xl gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-3"><Trophy className="text-amber-500"/><div><p className="text-xs font-bold text-slate-400">Skor terbaik</p><p className="text-xl font-black">{best}</p></div></div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-3"><Star className="text-sky-500" fill="currentColor"/><div><p className="text-xs font-bold text-slate-400">Koleksi stiker</p><p className="text-xl font-black">{stickers.length}/30</p></div></div></div>
        </section>

        <p className="mt-6 text-center text-xs font-medium text-slate-400">BERMAIN KATA berdiri sendiri. Jalur Cerdas tetap menjadi jalur pembelajaran terstruktur.</p>
      </div>
    </main>
  }

  return <main className={`min-h-screen bg-gradient-to-br ${t.bg} text-slate-900`}>
    <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="flex items-center gap-3">
        <button onClick={()=>setMode(null)} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" aria-label="Keluar permainan"><X size={18}/></button>
        <div className="min-w-0 flex-1"><div className="flex justify-between text-xs font-black text-slate-500"><span>{LEVELS[level].label} · {round}/{maxRounds}</span><span className="flex items-center gap-1"><Heart size={14} className="text-rose-500" fill="currentColor"/> {hearts}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${t.accent} transition-all`} style={{width:`${(round/maxRounds)*100}%`}}/></div></div>
        <div className="hidden items-center gap-1 rounded-xl bg-white px-3 py-2 text-sm font-black shadow-sm sm:flex"><Sparkles size={15} className="text-amber-500"/> {score}</div>
      </div>

      <section className="mt-6 rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_15px_45px_rgba(15,23,42,.08)] sm:p-7">
        <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600"><BookOpen size={25}/></div><div><p className="text-xs font-black uppercase tracking-wider text-slate-400">BERMAIN KATA</p><p className="font-black">{mode==="susun"?"Susun Kata":mode==="rumpang"?"Kata Rumpang":mode==="pasangan"?"Cari Pasangan":"Makna Kata"}</p></div></div>

        {mode==="susun" && current && <div className="mt-7"><p className="text-center text-sm font-bold text-slate-500">{current.hint}</p><div className="mt-5 flex min-h-14 flex-wrap justify-center gap-2">{answer.map((x,i)=><button key={i} onClick={()=>{
  setAnswer((a)=>{
    const next=[...a]
    next.splice(i,1)
    return next
  })
  setLetters((l)=>[...l,x])
}} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-xl font-black text-white shadow-sm">{x}</button>)}</div><div className="mt-4 flex flex-wrap justify-center gap-2">{letters.map((x,i)=><button key={i} disabled={answer.length>=current.word.length} onClick={()=>{setAnswer(a=>[...a,x]);setLetters(a=>a.filter((_,idx)=>idx!==i))}} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xl font-black hover:bg-sky-50">{x}</button>)}</div><button disabled={answer.length!==current.word.length||!!feedback} onClick={checkSusun} className={`mx-auto mt-6 flex items-center gap-2 rounded-2xl px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40 ${t.accent}`}>Periksa <Check size={17}/></button></div>}

        {mode==="rumpang" && current && <div className="mt-7 text-center"><p className="text-sm font-bold text-slate-500">{current.hint}</p><div className="mt-6 text-4xl font-black tracking-[.35em]">{letters.join("")}</div><div className="mx-auto mt-7 max-w-xs grid grid-cols-3 gap-2">{options.map((x,i)=><button key={i} disabled={!!feedback} onClick={()=>chooseRumpang(x)} className="rounded-2xl border border-slate-200 bg-slate-50 py-3 text-lg font-black hover:bg-sky-50">{x}</button>)}</div></div>}

        {mode==="pasangan" && current && <div className="mt-7 text-center"><p className="text-sm font-bold text-slate-500">Cari pasangan yang tepat untuk kata ini</p><div className="mt-4 text-3xl font-black">{current.word}</div><div className="mt-6 grid gap-2 sm:grid-cols-2">{shuffle([...(PAIRS.find(p=>p[0]===current.word)?.slice(1) || []), "BUKU", "KUCING", "BOLA"].filter((x,i,a)=>a.indexOf(x)===i).slice(0,4)).map((x,i)=><button key={i} disabled={!!feedback} onClick={()=>choose(x)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left font-black hover:border-sky-300 hover:bg-sky-50">{x}</button>)}</div></div>}

        {mode==="makna" && current && <div className="mt-7 text-center"><p className="text-sm font-bold text-slate-500">Pilih <b>{current.synonym ? "sinonim" : "lawan kata"}</b> dari <b>{current.word}</b></p><div className="mt-6 grid gap-2 sm:grid-cols-2">{options.map((x,i)=><button key={i} disabled={!!feedback} onClick={()=>choose(x)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-black hover:border-sky-300 hover:bg-sky-50">{x}</button>)}</div></div>}

        {feedback && <div className={`mt-6 rounded-2xl p-4 text-center font-black ${feedback==="correct"?"bg-emerald-50 text-emerald-700":"bg-rose-50 text-rose-700"}`}>{message}</div>}
      </section>

      <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-400"><span>Skor {score}</span><span>Streak {streak}</span><span>Target bermain: {maxRounds} soal</span></div>
    </div>
  </main>
}

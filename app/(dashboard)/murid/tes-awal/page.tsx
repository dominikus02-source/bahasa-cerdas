"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, Loader2, PenLine, Sparkles } from "lucide-react";

type Question = { id:string; text:string; options:string[]; questionType:string; skill:string; difficulty:string|null };
type State = {
 status:string; sessionId?:string; answeredCount?:number; totalQuestions?:number; question?:Question|null;
 writing?: {id:string;title:string;prompt:string;minWords:number;maxWords:number}|null;
 message?:string;
};

export default function TesAwalPage(){
 const [state,setState]=useState<State|null>(null);
 const [loading,setLoading]=useState(true);
 const [starting,setStarting]=useState(false);
 const [selected,setSelected]=useState("");
 const [writing,setWriting]=useState("");
 const [busy,setBusy]=useState(false);
 const [feedback,setFeedback]=useState<string|null>(null);

 async function load(){
   try{ const r=await fetch("/api/player/diagnostic/daily"); const d=await r.json(); setState(d); }catch{setState({status:"ERROR"})}finally{setLoading(false)}
 }
 useEffect(()=>{load()},[]);

 async function start(){
   setStarting(true); setFeedback(null);
   try{const r=await fetch("/api/player/diagnostic/daily",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"start"})}); const d=await r.json(); if(!r.ok) throw new Error(d.message||d.error||"Quest belum tersedia"); setState(d)}catch(e){setFeedback(e instanceof Error?e.message:"Quest belum tersedia")}finally{setStarting(false)}
 }

 async function answer(){
   if(!state?.sessionId||!state.question||!selected||busy)return;
   setBusy(true);setFeedback(null);
   try{const r=await fetch("/api/player/diagnostic/daily",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"answer",sessionId:state.sessionId,questionId:state.question.id,answer:selected})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Jawaban belum tersimpan");setSelected("");setState(d)}catch(e){setFeedback(e instanceof Error?e.message:"Jawaban belum tersimpan")}finally{setBusy(false)}
 }

 async function submitWriting(){
   if(!state?.sessionId||!state.writing||busy)return;
   setBusy(true);setFeedback(null);
   try{const r=await fetch("/api/player/diagnostic/daily",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"writing",sessionId:state.sessionId,text:writing})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Tulisan belum tersimpan");setState(d)}catch(e){setFeedback(e instanceof Error?e.message:"Tulisan belum tersimpan")}finally{setBusy(false)}
 }

 if(loading)return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-violet-600"/></div>;

 if(state?.status==="AVAILABLE")return <main className="mx-auto max-w-4xl px-5 py-8 sm:py-12">
   <Link href="/murid/beranda" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"><ArrowLeft className="h-4 w-4"/>Beranda</Link>
   <section className="relative mt-5 overflow-hidden rounded-[2rem] bg-[#07152f] px-6 py-10 text-white shadow-[0_30px_90px_-42px_rgba(79,70,229,.85)] sm:px-10 lg:px-14 lg:py-14">
     <div className="pointer-events-none absolute inset-0"><div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl"/><div className="absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl"/></div>
     <div className="relative max-w-2xl">
       <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-cyan-100"><Sparkles className="h-3.5 w-3.5 text-[#ffd24a]"/>Quest Kemampuan</div>
       <h1 className="mt-5 text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl">Kenali kemampuanmu.<span className="block bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-transparent">Main sebentar. Tumbuh terus.</span></h1>
       <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100/75 sm:text-base">Ini bukan ujian panjang. Kamu akan mendapat beberapa tantangan bahasa singkat, lalu satu tantangan menulis. Besok perjalananmu lanjut lagi.</p>
       <div className="mt-6 flex flex-wrap gap-2"><span className="rounded-full border border-white/10 bg-white/[.08] px-3 py-2 text-[11px] font-bold">4 tantangan cepat</span><span className="rounded-full border border-white/10 bg-white/[.08] px-3 py-2 text-[11px] font-bold">✍️ 1 tantangan menulis</span><span className="rounded-full border border-white/10 bg-white/[.08] px-3 py-2 text-[11px] font-bold">±7 menit</span></div>
       <button onClick={start} disabled={starting} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-[#18255b] shadow-xl disabled:opacity-60">{starting?<Loader2 className="h-4 w-4 animate-spin"/>:<Brain className="h-4 w-4"/>}Mulai quest<ArrowRight className="h-4 w-4"/></button>
     </div>
   </section>
 </main>;

 if(state?.status==="QUIZ"&&state.question)return <main className="mx-auto max-w-3xl px-5 py-6 sm:py-10">
   <div className="flex items-center justify-between"><Link href="/murid/beranda" className="p-2 text-slate-500"><ArrowLeft className="h-5 w-5"/></Link><span className="text-[10px] font-black uppercase tracking-[.18em] text-violet-600 dark:text-violet-300">Quest Kemampuan</span><span className="text-xs font-bold text-slate-500 dark:text-slate-400">{state.answeredCount??0}/{state.totalQuestions??4}</span></div>
   <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[.08]"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all" style={{width:`${Math.min(100,((state.answeredCount??0)/(state.totalQuestions??4))*100)}%`}}/></div>
   <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#10182d] sm:p-8">
     <p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-600 dark:text-violet-300">{state.question.skill} · {state.question.difficulty??"Tantangan"}</p>
     <h1 className="mt-4 text-2xl font-black leading-tight text-slate-950 dark:text-white sm:text-3xl">{state.question.text}</h1>
     <div className="mt-7 space-y-3">{state.question.options.map((opt,i)=><button key={i} onClick={()=>setSelected(String(i))} className={`w-full rounded-2xl border p-4 text-left text-sm font-semibold transition ${selected===String(i)?"border-violet-500 bg-violet-50 text-violet-900 dark:bg-violet-500/15 dark:text-violet-100":"border-slate-200 bg-slate-50 text-slate-700 hover:border-violet-300 dark:border-white/10 dark:bg-white/[.04] dark:text-slate-200 dark:hover:border-violet-400/40"}`}><span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs shadow-sm dark:bg-white/10">{String.fromCharCode(65+i)}</span>{opt}</button>)}</div>
     {feedback&&<p className="mt-4 text-sm text-rose-600 dark:text-rose-300">{feedback}</p>}
     <button onClick={answer} disabled={!selected||busy} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#18255b] px-5 py-3.5 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-[#18255b]">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:"Lanjut"}<ArrowRight className="h-4 w-4"/></button>
   </section>
 </main>;

 if(state?.status==="WRITING"&&state.writing)return <main className="mx-auto max-w-3xl px-5 py-6 sm:py-10">
   <div className="flex items-center justify-between"><Link href="/murid/beranda" className="p-2 text-slate-500"><ArrowLeft className="h-5 w-5"/></Link><span className="text-[10px] font-black uppercase tracking-[.18em] text-fuchsia-600 dark:text-fuchsia-300">Tantangan Menulis</span><span className="text-xs font-bold text-slate-500 dark:text-slate-400">Final Quest</span></div>
   <section className="relative mt-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#17123b] via-[#251553] to-[#09263b] p-6 text-white shadow-xl sm:p-8">
     <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-fuchsia-400/15 blur-3xl"/>
     <div className="relative"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-cyan-400"><PenLine className="h-6 w-6"/></div><h1 className="mt-5 text-3xl font-black">{state.writing.title}</h1><p className="mt-3 text-sm leading-6 text-blue-100/80">{state.writing.prompt}</p><p className="mt-3 text-xs font-bold text-cyan-200">Tulis {state.writing.minWords}–{state.writing.maxWords} kata.</p><textarea value={writing} onChange={e=>setWriting(e.target.value)} rows={9} placeholder="Tulis dengan bahasamu sendiri..." className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[.08] p-4 text-sm leading-6 text-white placeholder:text-white/35 outline-none focus:border-cyan-300/60"/>{feedback&&<p className="mt-3 text-sm text-rose-200">{feedback}</p>}<button onClick={submitWriting} disabled={!writing.trim()||busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-[#18255b] disabled:opacity-50">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:"Kirim tulisan"}<CheckCircle2 className="h-4 w-4"/></button></div>
   </section>
 </main>;

 if(state?.status==="DONE")return <main className="mx-auto max-w-3xl px-5 py-10"><section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-400/15 dark:bg-emerald-400/[.07]"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500"/><h1 className="mt-4 text-3xl font-black text-slate-950 dark:text-white">Quest hari ini selesai.</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">Bukti kemampuanmu sudah tersimpan. Besok kita lanjut lagi dengan tantangan berbeda.</p><div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row"><Link href="/murid/progresku" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#18255b] px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-[#18255b]">Lihat Perkembanganmu<ArrowRight className="h-4 w-4"/></Link><Link href="/murid/beranda" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200">Kembali ke Beranda</Link></div></section></main>;

 return <main className="mx-auto max-w-2xl px-5 py-16 text-center"><p className="text-sm text-slate-600 dark:text-slate-300">Quest belum bisa dimuat.</p></main>;
}

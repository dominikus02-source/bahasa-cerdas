"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, Loader2, PenLine, Sparkles } from "lucide-react";

type Question = { id:string; text:string; options:string[]; questionType:string; skill:string; difficulty:string|null };
type ProfileSkill = { skill:string; label:string; attempts:number; correct:number; accuracy:number|null; confidence:string; abilityBand:string|null };
type State = {
  status:"AVAILABLE"|"QUIZ"|"WRITING"|"DONE";
  sessionId?:string;
  answeredCount?:number;
  totalQuestions?:number;
  question?:Question|null;
  writing?:{id:string;title:string;prompt:string;minWords:number;maxWords:number;rubric:string[]}|null;
  result?:{
    objectiveAccuracy:number|null;
    profile:{overallConfidence:string;strongest:string[];focus:string[];insufficient:string[];placement:{label:string;band:string;minLevel:number;maxLevel:number;provisional:boolean;note:string}|null;skills:ProfileSkill[]};
    writing:{score:number;level:string;wordCount:number;dimensions:Record<string,number>}|null;
  };
  estimatedMinutes?:number;
  message?:string;
};

const labels:Record<string,string>={READING:"Membaca",GRAMMAR:"Tata Bahasa",VOCABULARY:"Kosakata",LITERATURE:"Sastra",WRITING:"Menulis"};

export default function TesAwalPage(){
  const [state,setState]=useState<State|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [selected,setSelected]=useState("");
  const [writing,setWriting]=useState("");
  const [feedback,setFeedback]=useState<string|null>(null);

  async function load(){
    try{
      const r=await fetch("/api/player/diagnostic/baseline");
      const d=await r.json();
      if(!r.ok) throw new Error(d.message||d.error||"Tes awal belum tersedia.");
      setState(d);
    }catch(e){setFeedback(e instanceof Error?e.message:"Tes awal belum bisa dimuat.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{load();},[]);

  async function post(body:Record<string,unknown>){
    setBusy(true);setFeedback(null);
    try{
      const r=await fetch("/api/player/diagnostic/baseline",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const d=await r.json();
      if(!r.ok) throw new Error(d.message||d.error||"Permintaan belum berhasil.");
      setState(d);setSelected("");
      return d;
    }catch(e){setFeedback(e instanceof Error?e.message:"Permintaan belum berhasil.");return null;}
    finally{setBusy(false);}
  }

  if(loading)return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-violet-600"/></div>;
  if(!state)return <main className="mx-auto max-w-2xl px-5 py-16 text-center"><p className="text-sm text-slate-600 dark:text-slate-300">{feedback}</p></main>;

  if(state.status==="AVAILABLE")return <main className="mx-auto max-w-4xl px-5 py-8 sm:py-12">
    <Link href="/murid/beranda" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500"><ArrowLeft className="h-4 w-4"/>Beranda</Link>
    <section className="relative mt-5 overflow-hidden rounded-[2rem] bg-[#07152f] px-6 py-10 text-white shadow-xl sm:px-10 lg:px-14 lg:py-14">
      <div className="pointer-events-none absolute inset-0"><div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl"/><div className="absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl"/></div>
      <div className="relative max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-cyan-100"><Sparkles className="h-3.5 w-3.5 text-[#ffd24a]"/>Baseline Assessment</div>
        <h1 className="mt-5 text-4xl font-black leading-[1.02] sm:text-5xl">Kenali kemampuanmu.</h1>
        <p className="mt-4 text-sm leading-6 text-blue-100/75 sm:text-base">10 tantangan terarah dan 1 tugas menulis untuk membangun gambaran awal kemampuanmu. Ini bukan tes Jalur Cerdas dan tidak mengunci kamu ke satu jalur belajar.</p>
        <div className="mt-6 flex flex-wrap gap-2"><span className="rounded-full border border-white/10 bg-white/[.08] px-3 py-2 text-[11px] font-bold">5 kompetensi</span><span className="rounded-full border border-white/10 bg-white/[.08] px-3 py-2 text-[11px] font-bold">3 tingkat kesulitan</span><span className="rounded-full border border-white/10 bg-white/[.08] px-3 py-2 text-[11px] font-bold">✍️ Menulis</span><span className="rounded-full border border-white/10 bg-white/[.08] px-3 py-2 text-[11px] font-bold">±15 menit</span></div>
        <button onClick={()=>post({action:"start"})} disabled={busy} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-[#18255b] disabled:opacity-60">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Brain className="h-4 w-4"/>}Mulai Tes Awal<ArrowRight className="h-4 w-4"/></button>
      </div>
    </section>
  </main>;

  if(state.status==="QUIZ"&&state.question)return <main className="mx-auto max-w-3xl px-5 py-6 sm:py-10">
    <div className="flex items-center justify-between"><Link href="/murid/beranda" className="p-2 text-slate-500"><ArrowLeft className="h-5 w-5"/></Link><span className="text-[10px] font-black uppercase tracking-[.18em] text-violet-600">Baseline Assessment</span><span className="text-xs font-bold text-slate-500">{state.answeredCount??0}/{state.totalQuestions??15}</span></div>
    <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[.08]"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{width:`${Math.min(100,((state.answeredCount??0)/(state.totalQuestions??15))*100)}%`}}/></div>
    <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#10182d] sm:p-8">
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-600 dark:text-violet-300">{labels[state.question.skill]??state.question.skill} · {state.question.difficulty??"Tantangan"}</p>
      <h1 className="mt-4 text-2xl font-black leading-tight text-slate-950 dark:text-white sm:text-3xl">{state.question.text}</h1>
      <div className="mt-7 space-y-3">{state.question.options.map((opt,i)=><button key={i} onClick={()=>setSelected(String(i))} className={`w-full rounded-2xl border p-4 text-left text-sm font-semibold transition ${selected===String(i)?"border-violet-500 bg-violet-50 text-violet-900 dark:bg-violet-500/15 dark:text-violet-100":"border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[.04] dark:text-slate-200"}`}><span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs shadow-sm dark:bg-white/10">{String.fromCharCode(65+i)}</span>{opt}</button>)}</div>
      {feedback&&<p className="mt-4 text-sm text-rose-600">{feedback}</p>}
      <button onClick={()=>state.sessionId&&state.question&&post({action:"answer",sessionId:state.sessionId,questionId:state.question.id,answer:selected})} disabled={!selected||busy} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#18255b] px-5 py-3.5 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-[#18255b]">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:"Simpan jawaban"}<ArrowRight className="h-4 w-4"/></button>
    </section>
  </main>;

  if(state.status==="WRITING"&&state.writing)return <main className="mx-auto max-w-3xl px-5 py-6 sm:py-10">
    <div className="flex items-center justify-between"><Link href="/murid/beranda" className="p-2 text-slate-500"><ArrowLeft className="h-5 w-5"/></Link><span className="text-[10px] font-black uppercase tracking-[.18em] text-fuchsia-600">Bagian Menulis</span><span className="text-xs font-bold text-slate-500">16/16</span></div>
    <section className="mt-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#17123b] via-[#251553] to-[#09263b] p-6 text-white shadow-xl sm:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-cyan-400"><PenLine className="h-6 w-6"/></div>
      <h1 className="mt-5 text-3xl font-black">{state.writing.title}</h1><p className="mt-3 text-sm leading-6 text-blue-100/80">{state.writing.prompt}</p>
      <p className="mt-3 text-xs font-bold text-cyan-200">Tulis {state.writing.minWords}–{state.writing.maxWords} kata.</p>
      <textarea value={writing} onChange={e=>setWriting(e.target.value)} rows={11} placeholder="Tulis dengan bahasamu sendiri..." className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[.08] p-4 text-sm leading-6 text-white placeholder:text-white/35 outline-none focus:border-cyan-300/60"/>
      <p className="mt-2 text-[11px] text-blue-100/60">{writing.trim()?writing.trim().split(/\s+/).filter(Boolean).length:0} kata</p>
      {feedback&&<p className="mt-3 text-sm text-rose-200">{feedback}</p>}
      <button onClick={()=>state.sessionId&&post({action:"writing",sessionId:state.sessionId,text:writing})} disabled={!writing.trim()||busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-[#18255b] disabled:opacity-50">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:"Kirim tulisan"}<CheckCircle2 className="h-4 w-4"/></button>
    </section>
  </main>;

  if(state.status==="DONE"&&state.result)return <main className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#10182d] sm:p-8">
      <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600"><Sparkles className="h-6 w-6"/></div><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-600">Profil Baseline</p><h1 className="text-2xl font-black text-slate-950 dark:text-white">BC mulai mengenal kemampuanmu.</h1></div></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">{state.result.profile.skills.map(skill=><div key={skill.skill} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[.04]"><div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-slate-800 dark:text-slate-100">{skill.label||labels[skill.skill]||skill.skill}</span><span className="text-xs font-black text-violet-600">{skill.accuracy===null?"Belum terukur":`${Math.round(skill.accuracy*100)}%`}</span></div><p className="mt-1 text-[11px] text-slate-500">{skill.attempts} bukti · {skill.confidence==="LOW"?"keyakinan awal":skill.confidence==="MEDIUM"?"cukup terukur":skill.confidence==="HIGH"?"keyakinan tinggi":"belum cukup bukti"}</p></div>)}</div>
      {state.result.writing&&<div className="mt-4 rounded-2xl border border-fuchsia-100 bg-fuchsia-50 p-4 dark:border-fuchsia-400/10 dark:bg-fuchsia-400/[.06]"><div className="flex items-center gap-2 text-sm font-black text-fuchsia-700 dark:text-fuchsia-200"><PenLine className="h-4 w-4"/>Menulis</div><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Sinyal awal: {state.result.writing.level.toLowerCase()} · {Math.round(state.result.writing.score*100)}% · {state.result.writing.wordCount} kata.</p><p className="mt-2 text-[11px] text-slate-500">Sinyal ini bersifat awal dan akan diperbarui dari karya serta latihan berikutnya.</p></div>}
      {state.result.profile.placement&&<div className="mt-4 rounded-2xl bg-violet-50 p-4 dark:bg-violet-400/[.06]"><p className="text-xs font-bold text-violet-700">Tingkat awal sementara</p><p className="mt-1 text-xl font-black text-slate-950 dark:text-white">{state.result.profile.placement.label} <span className="text-sm text-violet-600">L{state.result.profile.placement.minLevel}–L{state.result.profile.placement.maxLevel}</span></p><p className="mt-1 text-[11px] leading-5 text-slate-600">{state.result.profile.placement.note}</p></div>}
      <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-white/10"><p className="text-sm font-black text-slate-900 dark:text-white">Apa yang terjadi setelah ini?</p><p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">Profil ini tidak mengunci kamu ke satu fitur. Mentor AI akan memakai bukti ini untuk menentukan bantuan dan latihan berikutnya. Jalur Cerdas hanya salah satu tempat belajar; bila kemampuan atau minatmu kuat di sastra, Mentor dapat mengarahkanmu ke Aku Sastrawan Premium.</p></div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row"><Link href="/murid/beranda" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#18255b] px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-[#18255b]">Kembali ke Beranda<ArrowRight className="h-4 w-4"/></Link><Link href="/murid/progresku" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200">Lihat Perkembanganmu</Link></div>
    </section>
  </main>;

  if(state.status==="DONE")return <main className="mx-auto max-w-2xl px-5 py-16 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500"/><h1 className="mt-4 text-3xl font-black">Tes awal selesai.</h1></main>;
  return <main className="mx-auto max-w-2xl px-5 py-16 text-center"><p className="text-sm text-slate-600 dark:text-slate-300">{feedback??"Tes awal belum bisa dimuat."}</p></main>;
}

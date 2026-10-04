"use client";
import { useEffect, useState } from "react";

type Incident = {
  id:string; title:string; severity:string; status:string; description:string|null;
  dataCategories:string[]; affectedChildren:boolean; detectedAt:string;
  confirmedAt:string|null; notificationDeadlineAt:string|null;
  notificationRequired:boolean|null; notifiedAt:string|null; containment:string|null;
};

export default function IncidentPanel(){
 const [items,setItems]=useState<Incident[]>([]);
 const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
 async function load(){
  const r=await fetch("/api/admin/compliance/incidents",{cache:"no-store"});
  const d=await r.json(); if(r.ok)setItems(d.incidents||[]); else setMessage(d.error||"Insiden belum dapat dimuat.");
 }
 useEffect(()=>{void load();},[]);
 async function send(body:Record<string,unknown>){
  setBusy(true);setMessage("");
  try{
   const r=await fetch("/api/admin/compliance/incidents",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
   const d=await r.json();setMessage(r.ok?"Catatan insiden diperbarui.":d.error||"Perubahan gagal.");if(r.ok)await load();
  }finally{setBusy(false);}
 }
 return <section className="space-y-4">
  <h2 className="text-2xl font-semibold">Insiden privasi & keamanan</h2>
  <p className="text-sm text-muted-foreground">Catat insiden sejak terdeteksi. Untuk insiden yang ditetapkan wajib notifikasi, sistem menampilkan batas konservatif 72 jam sejak waktu deteksi. Penetapan kewajiban notifikasi tetap memerlukan penilaian fakta dan hukum.</p>
  <form className="space-y-3 rounded-2xl border border-border bg-card p-5" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void send({action:"create",title:f.get("title"),severity:f.get("severity"),description:f.get("description")||undefined,dataCategories:String(f.get("categories")||"").split(",").map(x=>x.trim()).filter(Boolean),affectedChildren:f.get("children")==="on"});e.currentTarget.reset();}}>
   <h3 className="font-semibold">Buat catatan insiden</h3>
   <input name="title" required minLength={5} maxLength={200} placeholder="Ringkasan insiden" className="w-full rounded-xl border border-input bg-background p-3"/>
   <textarea name="description" maxLength={4000} placeholder="Fakta awal, sistem terdampak, dan ruang lingkup sementara" className="min-h-24 w-full rounded-xl border border-input bg-background p-3"/>
   <input name="categories" placeholder="Kategori data, pisahkan dengan koma" className="w-full rounded-xl border border-input bg-background p-3"/>
   <div className="flex flex-wrap gap-3 items-center"><select name="severity" className="rounded-xl border border-input bg-background p-3"><option>ASSESS</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select><label className="flex gap-2"><input type="checkbox" name="children"/> Melibatkan anak</label><button disabled={busy} className="rounded-xl bg-primary px-4 py-3 text-primary-foreground">Catat insiden</button></div>
  </form>
  {items.map(i=><div key={i.id} className="space-y-3 rounded-2xl border border-border bg-card p-5">
   <div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold">{i.title}</p><p className="text-sm text-muted-foreground">{i.severity} · {i.status} · terdeteksi {new Date(i.detectedAt).toLocaleString("id-ID")}</p></div>{i.affectedChildren&&<span className="rounded-full border px-3 py-1 text-sm">Melibatkan anak</span>}</div>
   {i.description&&<p className="whitespace-pre-wrap text-sm">{i.description}</p>}
   {i.notificationDeadlineAt&&<p className={new Date(i.notificationDeadlineAt).getTime()-Date.now()<24*3600000?"font-semibold text-destructive":"font-semibold"}>Batas notifikasi tercatat: {new Date(i.notificationDeadlineAt).toLocaleString("id-ID")}</p>}
   {!i.confirmedAt&&<form className="flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void send({action:"confirm",id:i.id,notificationRequired:f.get("required")==="yes",evidenceRef:f.get("evidence")});}}><select name="required" className="rounded-xl border border-input bg-background p-2"><option value="no">Tidak wajib notifikasi</option><option value="yes">Wajib notifikasi</option></select><input name="evidence" required minLength={6} maxLength={300} placeholder="Referensi assessment" className="min-w-64 rounded-xl border border-input bg-background p-2"/><button disabled={busy} className="rounded-xl border px-3 py-2">Tetapkan assessment</button></form>}
   <form className="space-y-2" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void send({action:"contain",id:i.id,containment:f.get("containment"),evidenceRef:f.get("evidence")||undefined});}}><textarea name="containment" required minLength={10} maxLength={4000} defaultValue={i.containment||""} placeholder="Langkah containment/pemulihan" className="w-full rounded-xl border border-input bg-background p-2"/><input name="evidence" maxLength={300} placeholder="Referensi bukti containment" className="w-full rounded-xl border border-input bg-background p-2"/><button disabled={busy} className="rounded-xl border px-3 py-2">Simpan containment</button></form>
   {i.notificationRequired===true&&!i.notifiedAt&&<form className="flex gap-2" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void send({action:"notify",id:i.id,evidenceRef:f.get("evidence")});}}><input name="evidence" required minLength={6} maxLength={300} placeholder="Referensi bukti notifikasi" className="min-w-64 rounded-xl border border-input bg-background p-2"/><button disabled={busy} className="rounded-xl border px-3 py-2">Catat notifikasi</button></form>}
   {i.status!=="CLOSED"&&<form className="flex gap-2" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void send({action:"close",id:i.id,evidenceRef:f.get("evidence")});}}><input name="evidence" required minLength={6} maxLength={300} placeholder="Referensi postmortem/penutupan" className="min-w-64 rounded-xl border border-input bg-background p-2"/><button disabled={busy} className="rounded-xl border px-3 py-2">Tutup insiden</button></form>}
  </div>)}
  <p role="status" aria-live="polite">{message}</p>
 </section>;
}

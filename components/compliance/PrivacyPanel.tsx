"use client";
import { useEffect, useState } from "react";
import {ageLabel,statusLabel,purposeLabel} from "@/lib/compliance/labels";
import Link from "next/link";
type Settings = { birthDate: string | null; ageBand: string; guardianStatus: string; publicProfile: boolean; publicWorks: boolean; analytics: boolean; aiAssistance: boolean };
type Consent = { purpose: string; action: string; noticeVersion: string; createdAt: string };
export default function PrivacyPanel() {
 const [settings,setSettings] = useState<Settings | null>(null);
 const [birth,setBirth] = useState(""); const [accepted,setAccepted] = useState(false);
 const [choices,setChoices] = useState({publicProfile:false,publicWorks:false,analytics:false,aiAssistance:false});
 const [email,setEmail] = useState(""); const [invitation,setInvitation] = useState("");
 const [message,setMessage] = useState(""); const [busy,setBusy] = useState(false); const [ready,setReady] = useState(false);
 const [events,setEvents] = useState<Consent[]>([]);
 const [requests,setRequests] = useState<{id:string;childId:string;status:string}[]>([]);
 const [risk,setRisk] = useState(false);
 const [requestType,setRequestType]=useState("ACCESS"); const [requestDetail,setRequestDetail]=useState("");
 const [privacyRequests,setPrivacyRequests]=useState<{id:string;type:string;status:string;deadlineAt:string;createdAt:string}[]>([]);
 async function load() {
  try {
   const res=await fetch("/api/privacy/account",{cache:"no-store"}); const data=await res.json();
   if(!res.ok) {setMessage(data.error); return;}
   setSettings(data.privacy);setEvents(data.events);setRisk(data.childRiskApproved);setReady(true);
   if(data.privacy) {setBirth(data.privacy.birthDate?.slice(0,10)||"");setChoices({publicProfile:data.privacy.publicProfile,publicWorks:data.privacy.publicWorks,analytics:data.privacy.analytics,aiAssistance:data.privacy.aiAssistance});}
   const r=await fetch("/api/privacy/guardian",{cache:"no-store"});if(r.ok) setRequests((await r.json()).requests);
   const pr=await fetch("/api/privacy/requests",{cache:"no-store"});if(pr.ok) setPrivacyRequests((await pr.json()).requests||[]);
  } catch {setMessage("Pengaturan belum dapat dimuat. Coba lagi.");}
 }
 useEffect(()=>{void load();},[]);
 const child=!!settings && settings.ageBand!=="ADULT";
 async function send(url:string,body:Record<string,unknown>) {
  setBusy(true);setMessage("");
  try { const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const data=await res.json(); if(!res.ok) {setMessage(data.error);return;} if(data.invitation)setInvitation(data.invitation);setMessage(data.message||"Pengaturan tersimpan.");await load(); }
  catch {setMessage("Belum tersimpan. Coba lagi.");} finally {setBusy(false);}
 }
 return <div className="space-y-6">
  <p className="text-muted-foreground">Atur siapa yang dapat melihat profil dan karya kamu. Akun di bawah 18 tahun membutuhkan persetujuan dan verifikasi orang tua/wali. Belajar tidak memerlukan profil publik.</p>
  {!ready && <button className="rounded-xl border border-border px-4 py-2" onClick={()=>void load()}>Muat pengaturan</button>}
  <form className="space-y-4 rounded-2xl border border-border bg-card p-5" onSubmit={e=>{e.preventDefault();void send("/api/privacy/account",{birthDate:birth,acceptedNotice:accepted,...choices});}}>
   <label className="block">Tanggal lahir <input className="mt-2 block w-full rounded-xl border border-input bg-background p-3" type="date" value={birth} onChange={e=>setBirth(e.target.value)} required disabled={!!settings?.birthDate} /></label>
   <p className="text-sm text-muted-foreground">Dipakai untuk perlindungan usia dan tidak ditampilkan di profil. Untuk koreksi tanggal lahir, hubungi halo@bahasacerdas.com; jangan membuat akun baru untuk melewati pembatasan.</p>
   {settings && <p className="text-sm">Kelompok usia: {ageLabel(settings.ageBand)}. Persetujuan wali: {statusLabel(settings.guardianStatus)}.</p>}
   {([['publicProfile','Profil dapat dilihat publik'],['publicWorks','Karya dapat ditemukan publik'],['analytics','Izinkan analitik produk opsional'],['aiAssistance','Izinkan bantuan AI untuk data saya']] as const).map(([key,label])=><label className="flex gap-3 items-start" key={key}><input type="checkbox" checked={choices[key]} disabled={child} onChange={e=>setChoices({...choices,[key]:e.target.checked})}/><span>{label}</span></label>)}
   {child && <p className="text-sm text-muted-foreground">Profil, karya, dan analitik opsional tetap privat untuk anak. Pilihan bantuan AI dikelola oleh wali.</p>}
   <label className="flex gap-3"><input type="checkbox" required checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span>Saya telah membaca <Link className="underline" href="/kebijakan-privasi">Kebijakan Privasi</Link> dan <Link className="underline" href="/syarat-ketentuan">Ketentuan</Link>. Pilihan opsional di atas tidak wajib.</span></label>
   <button disabled={busy||!ready} className="rounded-xl bg-primary text-primary-foreground px-5 py-3">Simpan pilihan</button>
  </form>
  {child && <form className="space-y-4 rounded-2xl border border-border bg-card p-5" onSubmit={e=>{e.preventDefault();void send("/api/privacy/guardian",{action:"request",guardianEmail:email});}}>
   <h2 className="font-semibold text-xl">Undang orang tua atau wali</h2>
   <p className="text-muted-foreground">Wali membuka undangan dengan akun dan email mereka sendiri. Guru tidak otomatis menjadi wali.</p>
   <label className="block">Email wali<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-input bg-background p-3"/></label>
   <button disabled={busy} className="rounded-xl bg-primary text-primary-foreground px-5 py-3">Buat undangan</button>
   {invitation&&<p className="break-all">Bagikan tautan ini hanya kepada wali: <a className="underline" href={invitation}>{invitation}</a></p>}
   {!risk&&<p className="text-sm text-muted-foreground">Akses anak belum diaktifkan sampai pengelola menyelesaikan penilaian risiko layanan dan verifikasi wali. Status ini tidak dapat dilewati melalui pilihan pengguna.</p>}
  </form>}
  {requests.map(r=><div key={r.id} className="rounded-xl border border-border p-4 space-y-2"><p>Permintaan {r.id}: {statusLabel(r.status)}</p>{["VERIFIED","AWAITING_REVIEW"].includes(r.status)&&<button disabled={busy} className="underline" onClick={()=>void send("/api/privacy/guardian",{action:"withdraw",childId:r.childId})}>Cabut persetujuan</button>}{r.status==="VERIFIED"&&<button disabled={busy} className="ml-4 underline" onClick={()=>void send("/api/privacy/requests",{type:"DELETE_ACCOUNT",subjectId:r.childId,detail:"Permintaan penghapusan akun anak oleh wali terverifikasi."})}>Ajukan penghapusan akun anak</button>}</div>)}
  <p role="status" aria-live="polite">{message}</p>
  <Link className="underline" href="/arena">Lanjut ke beranda</Link>
  <h2 className="text-xl font-semibold">Riwayat pilihan</h2>
  <ul className="space-y-2 text-sm">{events.map((e,i)=><li key={i}>{purposeLabel(e.purpose)}: {statusLabel(e.action)} · versi {e.noticeVersion} · {new Date(e.createdAt).toLocaleString("id-ID")}</li>)}</ul>
  <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
   <h2 className="text-xl font-semibold">Permintaan terkait Data Pribadi</h2>
   <p className="text-sm text-muted-foreground">Ajukan akses, salinan, koreksi, pembatasan, atau permintaan lain. Status dan batas waktu penanganan akan tercatat di sistem.</p>
   <form className="space-y-3" onSubmit={e=>{e.preventDefault();void send("/api/privacy/requests",{type:requestType,detail:requestDetail||undefined});setRequestDetail("");}}>
    <select aria-label="Jenis permintaan" value={requestType} onChange={e=>setRequestType(e.target.value)} className="w-full rounded-xl border border-input bg-background p-3">
     <option value="ACCESS">Akses data</option><option value="COPY">Salinan data</option><option value="CORRECTION">Koreksi data</option><option value="RESTRICT">Pembatasan pemrosesan opsional</option><option value="DELETE_ACCOUNT">Ajukan penghapusan akun</option><option value="OTHER">Permintaan lain</option>
    </select>
    <textarea value={requestDetail} onChange={e=>setRequestDetail(e.target.value)} minLength={3} maxLength={2000} placeholder="Jelaskan permintaanmu bila diperlukan" className="min-h-24 w-full rounded-xl border border-input bg-background p-3"/>
    <button disabled={busy} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground">Ajukan permintaan</button>
   </form>
   {privacyRequests.length>0&&<div className="space-y-2 text-sm">{privacyRequests.map(p=><div key={p.id} className="rounded-xl border border-border p-3"><p className="font-medium">{p.type} · {statusLabel(p.status)}</p><p className="text-muted-foreground">Diajukan {new Date(p.createdAt).toLocaleString("id-ID")} · target penyelesaian {new Date(p.deadlineAt).toLocaleString("id-ID")}</p></div>)}</div>}
  </section>
  <p className="text-sm text-muted-foreground">Untuk bantuan tambahan: halo@bahasacerdas.com. Penghapusan akun tersedia di pengaturan akun.</p>
 </div>;
}

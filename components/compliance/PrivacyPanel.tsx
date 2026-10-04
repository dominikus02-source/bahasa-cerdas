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
 async function load() {
  try {
   const res=await fetch("/api/privacy/account",{cache:"no-store"}); const data=await res.json();
   if(!res.ok) {setMessage(data.error); return;}
   setSettings(data.privacy);setEvents(data.events);setRisk(data.childRiskApproved);setReady(true);
   if(data.privacy) {setBirth(data.privacy.birthDate?.slice(0,10)||"");setChoices({publicProfile:data.privacy.publicProfile,publicWorks:data.privacy.publicWorks,analytics:data.privacy.analytics,aiAssistance:data.privacy.aiAssistance});}
   const r=await fetch("/api/privacy/guardian",{cache:"no-store"});if(r.ok) setRequests((await r.json()).requests);
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
  {requests.map(r=><div key={r.id} className="rounded-xl border border-border p-4"><p>Permintaan {r.id}: {statusLabel(r.status)}</p>{["VERIFIED","AWAITING_REVIEW"].includes(r.status)&&<button disabled={busy} className="mt-2 underline" onClick={()=>void send("/api/privacy/guardian",{action:"withdraw",childId:r.childId})}>Cabut persetujuan</button>}</div>)}
  <p role="status" aria-live="polite">{message}</p>
  <Link className="underline" href="/arena">Lanjut ke beranda</Link>
  <h2 className="text-xl font-semibold">Riwayat pilihan</h2>
  <ul className="space-y-2 text-sm">{events.map((e,i)=><li key={i}>{purposeLabel(e.purpose)}: {statusLabel(e.action)} · versi {e.noticeVersion} · {new Date(e.createdAt).toLocaleString("id-ID")}</li>)}</ul>
  <p className="text-sm text-muted-foreground">Hak akses, salinan, koreksi, pembatasan, keberatan, dan penghapusan: halo@bahasacerdas.com. Penghapusan akun tersedia di pengaturan akun.</p>
 </div>;
}

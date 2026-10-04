"use client";
import { useState, useEffect } from "react";
import {ageLabel} from "@/lib/compliance/labels";
import Link from "next/link";
export default function GuardianPanel({token}:{token:string}) {
 const [child,setChild]=useState<{childName:string;birthDate:string;ageBand:string}|null>(null);
 useEffect(()=>{fetch(`/api/privacy/guardian?token=${encodeURIComponent(token)}`,{cache:"no-store"}).then(async r=>{const d=await r.json();if(r.ok)setChild(d);else setMessage(d.error);}).catch(()=>setMessage("Undangan belum dapat dimuat."));},[token]);
 const [agree,setAgree]=useState(false);const [ai,setAi]=useState(false);const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 return <form className="space-y-5" onSubmit={async e=>{e.preventDefault();setBusy(true);try {const r=await fetch("/api/privacy/guardian",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"agree",token,attestation:agree,aiAssistance:ai})});const d=await r.json();setMessage(d.message||d.error);}catch {setMessage("Belum berhasil. Coba lagi.");}finally {setBusy(false);}}}>
 {child&&<p className="rounded-xl border border-border bg-card p-4">Persetujuan untuk: {child.childName} · tanggal lahir {child.birthDate?.slice(0,10)} · kelompok usia {ageLabel(child.ageBand)}. Jika data tidak benar, jangan setujui; hubungi pengelola untuk koreksi.</p>}
 <p>Masuk dengan email yang menerima undangan. Lengkapi <Link className="underline" href="/privasi-akun">pengaturan usia akun wali</Link> terlebih dahulu. Tautan berlaku tujuh hari dan hanya dapat digunakan sekali.</p>
 <p>Data anak dipakai untuk akun, kelas, latihan, karya privat, dan keamanan. Profil dan karya anak tidak ditampilkan publik. AI opsional menghasilkan saran yang perlu diperiksa guru; jangan unggah identitas atau informasi sensitif dalam jawaban.</p>
 <label className="flex gap-3"><input type="checkbox" required checked={agree} onChange={e=>setAgree(e.target.checked)}/><span>Saya berusia 18 tahun atau lebih dan berwenang sebagai orang tua/wali anak ini. Saya membaca <Link className="underline" href="/pemberitahuan-wali">Pemberitahuan Wali</Link> dan menyetujui pemrosesan data untuk layanan belajar. Hubungan wali akan diverifikasi pengelola.</span></label>
 <label className="flex gap-3"><input type="checkbox" checked={ai} onChange={e=>setAi(e.target.checked)}/><span>Opsional: izinkan bantuan AI untuk data anak, dengan penyedia yang diungkap dalam Kebijakan Privasi. Saya dapat mencabut pilihan ini.</span></label>
 <button disabled={busy||!child} className="rounded-xl bg-primary text-primary-foreground px-5 py-3">Catat persetujuan</button><p role="status">{message}</p><Link href={`/login?next=${encodeURIComponent(`/persetujuan-wali?token=${token}`)}`} className="underline">Masuk sebagai wali</Link>
 </form>;
}

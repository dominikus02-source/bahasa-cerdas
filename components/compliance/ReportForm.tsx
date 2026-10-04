"use client";
import {useState} from "react";
export default function ReportForm() {
 const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 return <form className="space-y-4" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);try {const r=await fetch("/api/safety/reports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({targetType:f.get("type"),targetId:f.get("target"),category:f.get("category"),detail:f.get("detail"),...(f.get("contact")?{contact:f.get("contact")}: {})})});const d=await r.json();setMessage(d.message?`${d.message} Nomor: ${d.reference}`:d.error);}catch {setMessage("Laporan belum terkirim. Coba lagi atau hubungi halo@bahasacerdas.com.");}finally {setBusy(false);}}}>
 <p>Laporan dapat dikirim tanpa akun. Jangan sertakan kata sandi, nomor identitas, atau salinan konten eksploitasi anak. Untuk bahaya langsung, hubungi layanan darurat atau aparat setempat.</p>
 <label className="block">Jenis konten<select name="type" className="mt-2 w-full rounded-xl border border-input bg-background p-3"><option value="KARYA">Karya</option><option value="COMMENT">Komentar</option><option value="COMMUNITY_POST">Kiriman komunitas</option><option value="CHAT">Obrolan kelas</option><option value="PROFILE">Profil</option><option value="OTHER">Lainnya / permintaan privasi</option></select></label>
 <label className="block">ID atau tautan konten<input name="target" required maxLength={500} className="mt-2 w-full rounded-xl border border-input bg-background p-3"/></label>
 <label className="block">Kategori<select name="category" className="mt-2 w-full rounded-xl border border-input bg-background p-3"><option value="CHILD_SAFETY">Keselamatan anak</option><option value="PRIVACY">Data pribadi / hak privasi</option><option value="BULLYING">Perundungan</option><option value="ILLEGAL">Konten melanggar hukum</option><option value="COPYRIGHT">Hak cipta</option><option value="OTHER">Lainnya</option></select></label>
 <label className="block">Penjelasan<textarea name="detail" required minLength={10} maxLength={3000} className="mt-2 w-full rounded-xl border border-input bg-background p-3"/></label>
 <label className="block">Email untuk tindak lanjut (opsional)<input name="contact" type="email" className="mt-2 w-full rounded-xl border border-input bg-background p-3"/></label>
 <button disabled={busy} className="rounded-xl bg-primary text-primary-foreground px-5 py-3">Kirim laporan</button><p role="status">{message}</p>
 </form>;
}

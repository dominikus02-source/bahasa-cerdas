"use client";
import { useEffect, useState } from "react";
import { Shield, LockKeyhole, Trash2, Loader2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store";

type VerificationMode = "password" | "email" | "google";
export default function AccountSecurityPanel() {
  const [mode, setMode] = useState<VerificationMode>("password");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [emailReauth, setEmailReauth] = useState(false);
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [google, setGoogle] = useState(false);
  useEffect(() => {
    let mounted = true;
    void createClient().auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const providers = data.user?.identities?.map(i => i.provider) ?? [];
      setGoogle(providers.includes("google"));
      if (providers.includes("google") && !providers.includes("email")) setMode("google");
    });
    return () => { mounted = false; };
  }, []);
  const input = "mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  async function leave() {
    await createClient().auth.signOut({ scope: "local" });
    useUserStore.getState().clearUser();
    window.location.assign("/login");
  }
  async function sendCode() {
    setBusy(true); setMessage(""); setError("");
    try {
      const res = await fetch("/api/user/account/verify", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
    } catch (e) { setError(e instanceof Error ? e.message : "Kode gagal dikirim."); }
    finally { setBusy(false); }
  }
  async function googleReauth() {
    setBusy(true); setError("");
    const next = window.location.pathname;
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: {
      redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: "select_account", max_age: "0" },
    } });
    if (error) setError("Verifikasi Google belum berhasil. Coba lagi.");
    setBusy(false);
  }
  async function submit(action: "password" | "delete") {
    setError(""); setMessage("");
    if (action === "password" && nextPassword !== confirmPassword) { setError("Konfirmasi password tidak cocok."); return; }
    setBusy(true);
    try {
      const res = await fetch(action === "password" ? "/api/user/password" : "/api/user/account", {
        method: action === "password" ? "POST" : "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: mode === "password" ? password : undefined, verificationCode: mode === "email" ? code : undefined,
          oauthReauth: mode === "google", emailReauth: mode === "email" && emailReauth, newPassword: nextPassword, confirmation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message); setPassword(""); setCode(""); setNextPassword(""); setConfirmPassword("");
      if (data.signOut) {
        if (data.revocationPending) { setError(data.message); return; }
        await leave();
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Permintaan gagal. Silakan coba lagi."); }
    finally { setBusy(false); }
  }
  return <section id="akun-keamanan" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7">
    <div className="flex items-center gap-3"><span className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/15"><Shield size={23} /></span><div><h2 className="text-lg font-bold text-slate-900 dark:text-white">Akun & Keamanan</h2><p className="text-sm text-slate-500 dark:text-slate-400">Lindungi akses dan kelola akunmu.</p></div></div>
    <fieldset disabled={busy} className="mt-6 space-y-4">
      <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">Verifikasi identitas</legend>
      <div className="mt-2 flex flex-wrap gap-2">{(["password", "email", ...(google ? ["google"] : [])] as VerificationMode[]).map(v => <button key={v} type="button" aria-pressed={mode === v} onClick={() => { setMode(v); setPassword(""); setCode(""); setEmailReauth(false); setError(""); }} className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === v ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{v === "password" ? "Password lama" : v === "email" ? "Kode email" : "Google"}</button>)}</div>
      {mode === "password" && <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Password saat ini<input type="password" autoComplete="current-password" maxLength={128} value={password} onChange={e => setPassword(e.target.value)} className={input} /></label>}
      {mode === "email" && <div><button type="button" onClick={sendCode} className="text-sm font-semibold text-blue-600 dark:text-blue-400">Kirim kode ke email akun</button><label className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-200">Kode verifikasi<input inputMode="numeric" autoComplete="one-time-code" maxLength={10} disabled={emailReauth} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} className={input} /></label><label className="mt-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" checked={emailReauth} onChange={e => { setEmailReauth(e.target.checked); setCode(""); }} />Sudah membuka tautan email</label><p className="mt-2 text-xs text-slate-500">Tautan yang baru dibuka berlaku untuk tindakan ini selama 5 menit.</p></div>}
      {mode === "google" && <div><button type="button" onClick={googleReauth} className="rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200">Verifikasi dengan Google</button><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Setelah kembali ke halaman ini, lanjutkan dalam 5 menit.</p></div>}
    </fieldset>
    <form onSubmit={e => { e.preventDefault(); void submit("password"); }} className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-700">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><LockKeyhole size={18} /> Ganti password</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">8–128 karakter. Setelah berhasil, masuk kembali dengan password baru.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm text-slate-700 dark:text-slate-200">Password baru<input required minLength={8} maxLength={128} disabled={busy} type="password" autoComplete="new-password" value={nextPassword} onChange={e => setNextPassword(e.target.value)} className={input} /></label><label className="text-sm text-slate-700 dark:text-slate-200">Ulangi password baru<input required disabled={busy} type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={input} /></label></div>
      <button disabled={busy} className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy && <Loader2 size={16} className="animate-spin" />}Simpan password</button>
    </form>
    <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-700"><button disabled={busy} type="button" onClick={async () => { setBusy(true); const { error } = await createClient().auth.signOut({ scope: "global" }); if (error) { setError("Sesi belum berhasil dicabut. Coba lagi."); setBusy(false); } else await leave(); }} className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><LogOut size={18} /> Keluar dari semua perangkat</button><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Sesi tidak dapat diperpanjang lagi. Akses yang sudah terbit berakhir saat masa berlakunya habis.</p></div>
    <div className="mt-6 rounded-2xl border border-red-200 bg-red-50/60 p-4 dark:border-red-900 dark:bg-red-950/20">
      <h3 className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-300"><Trash2 size={18} /> Hapus akun</h3><p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Akses akun, profil pribadi, karya murid, pesan, dan hasil AI pribadi dihapus. Catatan transaksi serta materi kelas bersama dapat dipertahankan tanpa identitas profilmu. Selesaikan saldo dan penarikan dahulu. Karya yang sudah dibeli perlu dialihkan melalui pengelola agar akses pembeli tetap terjaga. Tindakan ini tidak dapat dibatalkan.</p>
      {!deleting ? <button type="button" disabled={busy} onClick={() => setDeleting(true)} className="mt-4 text-sm font-bold text-red-700 dark:text-red-300">Lanjutkan hapus akun</button> : <form onSubmit={e => { e.preventDefault(); void submit("delete"); }} className="mt-4"><label className="block text-sm font-semibold text-red-700 dark:text-red-300">Ketik HAPUS AKUN<input required disabled={busy} autoComplete="off" value={confirmation} onChange={e => setConfirmation(e.target.value)} className={input} /></label><div className="mt-3 flex flex-wrap gap-3"><button disabled={busy || confirmation !== "HAPUS AKUN"} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Hapus akun permanen</button><button type="button" disabled={busy} onClick={() => { setDeleting(false); setConfirmation(""); }} className="px-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Batal</button></div></form>}
    </div>
    {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-300">{error}</p>}{message && <p role="status" className="mt-4 text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
  </section>;
}

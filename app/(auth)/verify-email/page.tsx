"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, ArrowRight, Loader2, CheckCircle2, AlertCircle, BookOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleResend = async () => {
    setResending(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setError("Tidak dapat menemukan email Anda. Silakan login ulang.");
      setResending(false);
      return;
    }
    const { error: err } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
    });
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
    setResending(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 mb-4 shadow-lg">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">BahasaCerdas</h1>
          <p className="text-sm text-slate-500 mt-1">Platform Belajar Bahasa Indonesia</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Verifikasi Email Anda</h2>
          <p className="text-sm text-slate-500 mb-6">
            Kami telah mengirimkan email konfirmasi. Silakan cek inbox Anda dan klik link verifikasi.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-amber-800 font-medium">Tidak menerima email?</p>
            <ul className="text-xs text-amber-700 mt-2 space-y-1">
              <li>• Cek folder spam/junk</li>
              <li>• Pastikan alamat email sudah benar</li>
              <li>• Link verifikasi berlaku 24 jam</li>
            </ul>
          </div>

          {sent && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mb-4 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Email verifikasi telah dikirim ulang!
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleResend}
            disabled={resending || sent}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-3"
          >
            {resending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</>
            ) : sent ? (
              <>Email Terkirim <CheckCircle2 className="w-4 h-4" /></>
            ) : (
              <><Mail className="w-4 h-4" /> Kirim Ulang Email Verifikasi</>
            )}
          </button>

          <button
            onClick={() => router.refresh()}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Saya Sudah Verifikasi <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © 2026 BahasaCerdas
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";

type Status = "loading" | "success" | "error";

function ConfirmContent() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const handleConfirm = async () => {
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (!token_hash || !type) {
        setStatus("error");
        setMessage("Link konfirmasi tidak valid. Silakan cek email Anda kembali.");
        return;
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as "email" | "signup" | "recovery" | "invite",
        });

        if (error) {
          setStatus("error");
          setMessage(error.message || "Gagal memverifikasi email. Silakan coba lagi.");
          return;
        }

        setStatus("success");
        setMessage("Email berhasil dikonfirmasi! Anda sekarang bisa login.");

        setTimeout(() => {
          router.push("/login?confirmed=true");
        }, 3000);
      } catch (err) {
        setStatus("error");
        setMessage("Terjadi kesalahan. Silakan coba lagi.");
      }
    };

    handleConfirm();
  }, [searchParams, supabase.auth, router]);

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
          {status === "loading" && (
            <>
              <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Memverifikasi Email...</h2>
              <p className="text-sm text-slate-500">Mohon tunggu sebentar</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Email Berhasil Dikonfirmasi! 🎉</h2>
              <p className="text-sm text-slate-500 mb-6">{message}</p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-left">
                <p className="text-sm text-green-800 font-medium">Selamat bergabung di BahasaCerdas!</p>
                <p className="text-xs text-green-600 mt-1">
                  Anda akan diarahkan ke halaman login dalam beberapa detik...
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
              >
                Login Sekarang <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Gagal Memverifikasi</h2>
              <p className="text-sm text-slate-500 mb-6">{message}</p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-800 font-medium">Tips:</p>
                    <ul className="text-xs text-amber-700 mt-1 space-y-1">
                      <li>• Pastikan link konfirmasi belum kadaluarsa (berlaku 24 jam)</li>
                      <li>• Cek folder spam/junk di email Anda</li>
                      <li>• Jika masih bermasalah, coba daftar ulang</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/register"
                  className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-center"
                >
                  Daftar Ulang
                </Link>
                <Link
                  href="/login"
                  className="flex-1 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors text-center"
                >
                  Login
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © 2026 BahasaCerdas. Platform belajar Bahasa Indonesia untuk guru & siswa.
        </p>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}

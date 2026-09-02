"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import BatikDecoration from "@/components/shared/BatikDecoration";
import { Eye, EyeOff, KeyRound, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";

/**
 * Reset Password Page
 *
 * Reached via recovery link: /reset-password#access_token=...&type=recovery
 *
 * Flow:
 * 1. User arrives with hash fragment containing recovery token
 * 2. Supabase client processes PKCE exchange automatically
 * 3. onAuthStateChange fires with "PASSWORD_RECOVERY" event
 * 4. We show the password reset form
 * 5. User submits new password
 * 6. supabase.auth.updateUser({ password }) updates it
 * 7. Success state → redirect to /login
 *
 * If recovery link is invalid/expired:
 * - onAuthStateChange never fires PASSWORD_RECOVERY
 * - Timeout after 10s shows "link tidak valid" error
 */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryFailed, setRecoveryFailed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Listen for auth state changes — the recovery link triggers
    // PASSWORD_RECOVERY event after PKCE exchange completes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          setRecoveryReady(true);
        }
      }
    );

    // Also check if session already exists (e.g., page refresh after successful recovery)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setRecoveryReady(true);
      }
    });

    // Timeout: if recovery session not established in 10s, link is likely invalid
    const timeout = setTimeout(() => {
      setRecoveryFailed(true);
    }, 10_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }
    if (password !== confirm) {
      setError("Password tidak cocok");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // Redirect to login after 2s success state
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    }
    setLoading(false);
  };

  // ── EXPIRED / INVALID RECOVERY LINK ──
  if (recoveryFailed && !recoveryReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 via-red-700 to-blue-900 relative overflow-hidden px-4">
        <BatikDecoration />
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Tidak Valid</h1>
              <p className="text-sm text-gray-500 mb-6">
                Link reset password sudah tidak valid atau sudah kedaluwarsa.
              </p>
              <Button
                onClick={() => router.push("/login")}
                className="w-full h-12 rounded-xl font-bold"
                variant="outline"
              >
                <ArrowLeft size={16} className="mr-2" />
                Kembali ke Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── LOADING RECOVERY SESSION ──
  if (!recoveryReady && !recoveryFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 via-red-700 to-blue-900 relative overflow-hidden px-4">
        <BatikDecoration />
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <KeyRound size={32} className="text-violet-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Memverifikasi Link...</h1>
              <p className="text-sm text-gray-500">Mohon tunggu sebentar.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SUCCESS STATE ──
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 via-red-700 to-blue-900 relative overflow-hidden px-4">
        <BatikDecoration />
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Berhasil Diubah!</h1>
              <p className="text-sm text-gray-500 mb-6">
                Silakan login kembali dengan password baru.
              </p>
              <Button
                onClick={() => router.push("/login")}
                className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-red-600 to-red-700"
              >
                Masuk ke BahasaCerdas
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── PASSWORD RESET FORM ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 via-red-700 to-blue-900 relative overflow-hidden px-4">
      <BatikDecoration />
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
              <KeyRound size={32} className="text-violet-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Atur Password Baru</h1>
            <p className="text-sm text-gray-500">Masukkan password baru untuk akun kamu</p>
          </div>

          <form onSubmit={handleReset} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password Baru
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 pr-11 text-sm focus:border-violet-500 focus:outline-none transition-colors"
                  placeholder="Minimal 8 karakter"
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Konfirmasi Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-violet-500 focus:outline-none transition-colors"
                placeholder="Ketik ulang password"
                required
                autoComplete="new-password"
              />
              {confirm && password !== confirm && (
                <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !password || !confirm}
              className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all"
            >
              {loading ? "Menyimpan..." : "Ubah Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, KeyRound, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";

/**
 * Reset Kata Sandi Page
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
    // Check for exchange failure from callback
    const params = new URLSearchParams(window.location.search);
    if (params.has("error") || new URLSearchParams(window.location.hash.slice(1)).has("error")) {
      setRecoveryFailed(true);
      return;
    }

    // The server's resetPasswordForEmail uses implicit recovery, while the
    // shared SSR browser client uses PKCE for Google/password login. Import the
    // recovery session explicitly so the SDK does not reject a flow mismatch.
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get("access_token");
    const refreshToken = fragment.get("refresh_token");
    const hasRecoveryTokens = fragment.get("type") === "recovery" && !!accessToken && !!refreshToken;
    if (fragment.has("access_token") || fragment.has("refresh_token")) {
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
      if (!hasRecoveryTokens) { setRecoveryFailed(true); return; }
    }
    const supabase = createClient();
    let cancelled = false;
    if (hasRecoveryTokens) {
      void supabase.auth.setSession({ access_token: accessToken!, refresh_token: refreshToken! }).then(({ error }) => {
        if (cancelled) return;
        if (error) setRecoveryFailed(true);
        else setRecoveryReady(true);
      }).catch(() => { if (!cancelled) setRecoveryFailed(true); });
    }

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
    // A regular signed-in session is not evidence of password recovery.

    // Timeout: if recovery session not established in 15s, link is likely invalid
    const timeout = setTimeout(() => {
      setRecoveryFailed(true);
    }, 15_000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Kata Sandi minimal 8 karakter");
      return;
    }
    if (password !== confirm) {
      setError("Kata Sandi tidak cocok");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError("Gagal mengubah kata sandi. Minta tautan baru atau coba lagi.");
      } else {
        await supabase.auth.signOut({ scope: "global" });
        setSuccess(true);
        // Redirect to login after 2s success state
        setTimeout(() => router.push("/login?reset=success"), 2000);
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    }
    setLoading(false);
  };

  // ── EXPIRED / INVALID RECOVERY LINK ──
  if (recoveryFailed && !recoveryReady) {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const isExchangeFailed = params?.get("error") === "exchange_failed";

    return (
      <div className="min-h-screen flex items-center justify-center bg-bc-bg text-bc-text relative overflow-hidden px-4">

        <div className="relative z-10 w-full max-w-md">
          <Card variant="surface" className="p-6 md:p-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-bc-danger-soft flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-bc-danger" />
              </div>
              <h1 className="text-2xl font-bold text-bc-text mb-2">Tautan Tidak Valid</h1>
              <p className="text-sm text-bc-text-2 mb-2">
                {isExchangeFailed
                  ? "Gagal memverifikasi link reset. Tautan mungkin sudah kedaluwarsa."
                  : "Tautan reset password sudah tidak valid atau sudah kedaluwarsa."}
              </p>
              <p className="text-xs text-bc-text-3 mb-6">
                Silakan minta tautan pemulihan kata sandi baru dari halaman login.
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => router.push("/login")}
                  variant="primary" className="w-full h-12"
                >
                  Minta Tautan Reset Baru
                </Button>
                <Button
                  onClick={() => router.push("/login")}
                  className="w-full h-10 rounded-xl"
                  variant="legacy-ghost"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Kembali ke halaman masuk
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── LOADING RECOVERY SESSION ──
  if (!recoveryReady && !recoveryFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bc-bg text-bc-text relative overflow-hidden px-4">

        <div className="relative z-10 w-full max-w-md">
          <Card variant="surface" className="p-6 md:p-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-bc-violet-soft flex items-center justify-center mx-auto mb-4 animate-pulse">
                <KeyRound size={32} className="text-bc-violet" />
              </div>
              <h1 className="text-2xl font-bold text-bc-text mb-2">Memverifikasi Tautan...</h1>
              <p className="text-sm text-bc-text-2">Mohon tunggu sebentar.</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── SUCCESS STATE ──
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bc-bg text-bc-text relative overflow-hidden px-4">

        <div className="relative z-10 w-full max-w-md">
          <Card variant="surface" className="p-6 md:p-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-bc-success-soft flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-bc-success" />
              </div>
              <h1 className="text-2xl font-bold text-bc-text mb-2">Kata Sandi Berhasil Diubah!</h1>
              <p className="text-sm text-bc-text-2 mb-6">
                Silakan login kembali dengan kata sandi baru.
              </p>
              <Button
                onClick={() => router.push("/login")}
                variant="primary" className="w-full h-12"
              >
                Masuk ke BahasaCerdas
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── PASSWORD RESET FORM ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-bc-bg text-bc-text relative overflow-hidden px-4">

      <div className="relative z-10 w-full max-w-md">
        <Card variant="surface" className="p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-bc-violet-soft flex items-center justify-center mx-auto mb-4">
              <KeyRound size={32} className="text-bc-violet" />
            </div>
            <h1 className="text-2xl font-bold text-bc-text mb-1">Atur Kata Sandi Baru</h1>
            <p className="text-sm text-bc-text-2">Masukkan kata sandi baru untuk akun kamu</p>
          </div>

          <form onSubmit={handleReset} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-bc-danger-soft border border-bc-danger p-3 text-sm text-bc-danger flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-bc-text mb-1.5">
                Kata Sandi Baru
              </label>
              <div className="relative">
                <Input variant="bc"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-bc-line px-4 py-3 pr-11 text-sm focus:border-bc-focus focus:outline-none transition-colors"
                  placeholder="Minimal 8 karakter"
                  aria-describedby="password-hint"
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bc-text-3 hover:text-bc-text transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <p id="password-hint" className="text-sm text-bc-text-2">Gunakan minimal 8 karakter. Gabungkan kata, angka, dan simbol agar lebih kuat.</p>
            <div>
              <label className="block text-sm font-semibold text-bc-text mb-1.5">
                Konfirmasi Kata Sandi
              </label>
              <Input variant="bc"
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-bc-line px-4 py-3 text-sm focus:border-bc-focus focus:outline-none transition-colors"
                placeholder="Ketik ulang password"
                required
                autoComplete="new-password"
              />
              {confirm && password !== confirm && (
                <p className="text-xs text-bc-danger mt-1">Kata Sandi tidak cocok</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !password || !confirm}
              variant="primary" className="w-full h-12"
            >
              {loading ? "Menyimpan..." : "Ubah Kata Sandi"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

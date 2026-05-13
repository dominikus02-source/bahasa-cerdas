"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import BatikDecoration from "@/components/shared/BatikDecoration";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/login");
      }
    });
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password minimal 8 karakter"); return; }
    if (password !== confirm) { setError("Password tidak cocok"); return; }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setError(error.message);
      else {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch {
      setError("Terjadi kesalahan");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 via-red-700 to-blue-900 relative overflow-hidden px-4">
      <BatikDecoration />
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Reset Password</h1>
            <p className="text-sm text-gray-500">Buat password baru untuk akun kamu</p>
          </div>

          {success ? (
            <div className="text-center">
              <p className="text-emerald-600 font-semibold mb-4">✓ Password berhasil diubah!</p>
              <Button onClick={() => router.push("/login")} className="w-full">Masuk Sekarang</Button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password Baru</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-red-500 focus:outline-none"
                  placeholder="Minimal 8 karakter" minLength={8} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Konfirmasi Password</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-red-500 focus:outline-none"
                  placeholder="Ketik ulang password" required />
              </div>
              <Button type="submit" disabled={loading}
                className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-red-600 to-red-700">
                {loading ? "Memproses..." : "Ubah Password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

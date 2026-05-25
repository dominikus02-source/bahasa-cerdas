"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, Sparkles, Users, Gamepad2, GraduationCap, ArrowRight, Loader2, Check } from "lucide-react";

const steps = [
  {
    icon: BookOpen,
    title: "Belajar Bahasa Indonesia",
    desc: "Akses ribuan materi belajar, video interaktif, dan bank soal untuk guru dan murid.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: Users,
    title: "Bergabung dengan Komunitas",
    desc: "Ikuti MGMP, KKG, dan komunitas guru lainnya. Berbagi dan belajar bersama.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Gamepad2,
    title: "Kuis Battle Seru",
    desc: "Tantang teman-temanmu dalam Kuis Battle real-time! Tebak kata, kata seru, dan banyak lagi.",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: GraduationCap,
    title: "UKBI & TKA Simulation",
    desc: "Latihan soal UKBI dan TKA dengan simulasi mirip ujian sesungguhnya.",
    color: "from-rose-500 to-pink-600",
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkOnboarded = async () => {
      try {
        const res = await fetch("/api/user/me");
        const data = await res.json();
        if (data.user?.onboarded) {
          router.replace(data.user.role === "GURU" ? "/guru/beranda" : "/arena");
          return;
        }
      } catch {}
      setLoading(false);
    };
    checkOnboarded();
  }, [router]);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await fetch("/api/user/onboarded", { method: "POST" });

      // get fresh user data from DB for correct role
      const me = await fetch("/api/user/me").then(r => r.json());
      const role = me.user?.role || "murid";
      const dest = role === "GURU" ? "/guru/beranda" : role === "ADMIN" ? "/admin" : "/arena";

      // also try to update supabase metadata (non-blocking)
      supabase.auth.updateUser({ data: { onboarded: true } }).catch(() => {});

      // hard redirect to prevent middleware race condition
      window.location.href = dest;
    } catch {
      window.location.href = "/guru/beranda";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
        <div className="flex gap-1.5 mb-12">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-emerald-500" : i < step ? "w-2 bg-emerald-300" : "w-2 bg-slate-200"
              }`}
            />
          ))}
        </div>

        <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center shadow-lg mb-8`}>
          <current.icon className="w-12 h-12 text-white" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">
          {current.title}
        </h2>
        <p className="text-slate-500 text-center leading-relaxed mb-12">
          {current.desc}
        </p>

        {isLast ? (
          <button
            onClick={handleFinish}
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-200"
          >
            {saving ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Menyiapkan...</>
            ) : (
              <><Check className="w-5 h-5" /> Mulai Belajar!</>
            )}
          </button>
        ) : (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Lanjut <ArrowRight className="w-5 h-5" />
          </button>
        )}

        {!isLast && (
          <button
            onClick={handleFinish}
            className="mt-4 text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Lewati
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import TestResultPanel from "@/components/kompetensi/TestResultPanel";

interface Result {
  id: string;
  paketId: string;
  paketTitle?: string;
  paket?: { title: string; type: string };
  attemptNumber: number;
  totalScore: number;
  rawScore: number;
  maxScore: number;
  percentage: number;
  predikat: string;
  status: string;
  sectionScores?: any;
  startedAt: string;
  finishedAt: string;
  timeSpent: number;
  certificate?: {
    id: string;
    certificateNo: string;
    pdfUrl?: string;
  };
}

// Return the user to the simulation list they actually came from — a UKBI/TKA
// list inside their own dashboard shell — instead of the bare /kompetisi/latihan.
function computeBackHref(role: string, isFounder: boolean, paketType?: string): string {
  const type = (paketType || "").toUpperCase();
  const isTKA = type.startsWith("TKA");
  const kind = isTKA ? "tka" : "ukbi"; // default to UKBI when type is unknown
  const isGuru = role === "GURU" && !isFounder;
  return isGuru ? `/guru/simulasi/${kind}` : `/murid/simulasi/${kind}`;
}

// The "Dokumen Hasil Latihan" button lives in the guru dashboard shell too,
// so route there for gurus instead of the murid page.
function computeCertHref(role: string, isFounder: boolean): string {
  const isGuru = role === "GURU" && !isFounder;
  return isGuru ? "/guru/dokumen-latihan" : "/murid/dokumen-latihan";
}

export default function HasilPage({ params }: { params: Promise<{ paketId: string }> }) {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [paketId, setPaketId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [backHref, setBackHref] = useState("/kompetisi/latihan");
  const [certHref, setCertHref] = useState("/murid/dokumen-latihan");

  useEffect(() => {
    params.then((p) => setPaketId(p.paketId));
  }, [params]);

  // Resolve the correct "back to list" destination from the user's role.
  useEffect(() => {
    let active = true;
    fetch("/api/user/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active) return;
        const u = d?.user;
        const type = result?.paket?.type || result?.paketTitle;
        setBackHref(computeBackHref(u?.role || "MURID", !!u?.isFounder, type));
        setCertHref(computeCertHref(u?.role || "MURID", !!u?.isFounder));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [result?.paket?.type, result?.paketTitle]);

  useEffect(() => {
    if (!paketId) return;
    const fetchResult = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/kompetensi/${paketId}/hasil`);
        const data = await res.json();
        // Respons sukses dibungkus ok() → { success, data:{ result } }.
        const body = data.data ?? data;
        if (body.result) {
          setResult(body.result);
        } else if (data.error) {
          setError(data.error);
        }
      } catch {
        setError("Gagal memuat hasil");
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [paketId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Memuat hasil...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl p-8 shadow-sm max-w-md border border-slate-200">
          <XCircle className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <h2 className="font-bold text-lg mb-2 text-slate-800">
            {error || "Hasil tidak ditemukan"}
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Anda belum menyelesaikan tes ini atau hasil belum tersimpan.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push(`/kompetisi/${paketId}?retry=1`)}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
            >
              Mulai Ulang Latihan
            </button>
            <button
              onClick={() => router.push(backHref)}
              className="px-6 py-2.5 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <TestResultPanel result={result} paketId={paketId} backHref={backHref} certHref={certHref} />;
}

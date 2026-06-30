"use client";

import { useRef } from "react";
import html2canvas from "html2canvas";
import { Download, Award, Calendar, BookOpen, User } from "lucide-react";

interface CertificateProps {
  certificate: {
    id: string;
    certificateNo: string;
    predikat: string;
    score: number;
    percentage: number;
    issuedAt: string;
    paket?: {
      title: string;
      type: string;
    };
    user?: {
      fullName: string;
    };
  };
}

const PREDIKAT_STYLES: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  "Istimewa": { bg: "from-amber-400 to-yellow-500", border: "border-amber-400", text: "text-amber-600", glow: "shadow-amber-400/30" },
  "Sangat Unggul": { bg: "from-orange-400 to-amber-500", border: "border-orange-400", text: "text-orange-600", glow: "shadow-orange-400/30" },
  "Unggul": { bg: "from-blue-400 to-indigo-500", border: "border-blue-400", text: "text-blue-600", glow: "shadow-blue-400/30" },
  "Madya": { bg: "from-violet-400 to-purple-500", border: "border-violet-400", text: "text-violet-600", glow: "shadow-violet-400/30" },
  "Semenjana": { bg: "from-slate-400 to-slate-500", border: "border-slate-400", text: "text-slate-600", glow: "shadow-slate-400/30" },
  "Marginal": { bg: "from-rose-400 to-red-500", border: "border-rose-400", text: "text-rose-600", glow: "shadow-rose-400/30" },
  "Terbatas": { bg: "from-red-400 to-red-600", border: "border-red-400", text: "text-red-600", glow: "shadow-red-400/30" },
  "A": { bg: "from-emerald-400 to-green-500", border: "border-emerald-400", text: "text-emerald-600", glow: "shadow-emerald-400/30" },
  "B": { bg: "from-blue-400 to-indigo-500", border: "border-blue-400", text: "text-blue-600", glow: "shadow-blue-400/30" },
  "C": { bg: "from-amber-400 to-yellow-500", border: "border-amber-400", text: "text-amber-600", glow: "shadow-amber-400/30" },
  "D": { bg: "from-slate-400 to-slate-500", border: "border-slate-400", text: "text-slate-600", glow: "shadow-slate-400/30" },
};

export function CertificatePreview({ certificate }: CertificateProps) {
  const certificateRef = useRef<HTMLDivElement>(null);

  const predikatStyle = PREDIKAT_STYLES[certificate.predikat] || PREDIKAT_STYLES["Madya"];
  const isUKBI = certificate.paket?.type?.includes("UKBI");
  const isTKA = certificate.paket?.type?.includes("TKA");

  const productLabel = isUKBI ? "Latihan UKBI" : isTKA ? "Latihan TKA" : "Latihan UKBI/TKA";

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  };

  const handleDownload = async () => {
    if (!certificateRef.current) return;
    
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
      });
      
      const link = document.createElement("a");
      link.download = `Dokumen-Hasil-${certificate.certificateNo}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Failed to download document:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors shadow-lg shadow-violet-600/20"
        >
          <Download size={18} />
          Simpan Dokumen
        </button>
      </div>

      <div 
        ref={certificateRef}
        className="bg-white rounded-3xl overflow-hidden shadow-2xl"
        style={{ width: "800px", height: "620px", position: "relative" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-purple-50" />
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-200/30 to-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-100 to-teal-100 rounded-full blur-3xl" />

        <div className="absolute inset-4 border-2 border-violet-100 rounded-2xl" />
        <div className="absolute inset-6 border border-violet-50 rounded-xl" />

        <div className="relative z-10 h-full flex flex-col items-center justify-between py-10 px-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <BookOpen size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-wide">Dokumen Hasil Latihan</h1>
                <p className="text-xs text-gray-400 tracking-wider">BAHASACERDAS</p>
              </div>
            </div>
            <div className="w-24 h-1 bg-gradient-to-r from-violet-400 via-purple-400 to-violet-400 mx-auto mt-3 rounded-full" />
          </div>

          {/* Main Content */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Dokumen ini diberikan kepada</p>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-3">
              {certificate.user?.fullName || "Peserta"}
            </h2>
            <p className="text-gray-500 mb-2">yang telah menyelesaikan</p>
            
            {isUKBI && (
              <h3 className="text-xl font-bold text-gray-800 mb-2">Dokumen Hasil Latihan UKBI</h3>
            )}
            {isTKA && (
              <h3 className="text-xl font-bold text-gray-800 mb-2">Dokumen Hasil Latihan TKA</h3>
            )}
            {!isUKBI && !isTKA && (
              <h3 className="text-xl font-bold text-gray-800 mb-2">{certificate.paket?.title || "Simulasi Bahasa Indonesia"}</h3>
            )}

            <p className="text-xs text-gray-400 mb-4">Hasil Simulasi Kemampuan Bahasa Indonesia</p>

            <div className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r ${predikatStyle.bg} shadow-lg ${predikatStyle.glow}`}>
              <Award size={28} className="text-white" />
              <div className="text-white">
                <p className="text-xs font-medium opacity-90">PREDIKAT</p>
                <p className="text-2xl font-black">{certificate.predikat}</p>
              </div>
              <div className="border-l border-white/30 pl-3">
                <p className="text-xs font-medium opacity-90">SKOR</p>
                <p className="text-xl font-bold">{certificate.score}</p>
              </div>
              <div className="border-l border-white/30 pl-3">
                <p className="text-xs font-medium opacity-90">PERSENTASE</p>
                <p className="text-xl font-bold">{certificate.percentage?.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="w-full flex justify-between items-end">
            <div className="text-left">
              <p className="text-xs text-gray-400">Jenis Latihan</p>
              <p className="text-sm font-semibold text-gray-600">{productLabel}</p>
            </div>
            
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-1 shadow-lg shadow-violet-500/30">
                <Award size={20} className="text-white" />
              </div>
              <p className="text-[10px] text-gray-400">No. Dokumen</p>
              <p className="text-[10px] font-mono font-semibold text-gray-600">{certificate.certificateNo}</p>
            </div>

            <div className="flex items-center gap-2 text-gray-400">
              <Calendar size={14} />
              <span className="text-xs">{formatDate(certificate.issuedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-xs text-amber-700 text-center font-medium">
          Dokumen ini adalah hasil latihan/simulasi di BahasaCerdas dan bukan sertifikat resmi UKBI/TKA dari lembaga pemerintah.
        </p>
      </div>
    </div>
  );
}

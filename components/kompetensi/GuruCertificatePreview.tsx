"use client";

import { useRef } from "react";
import html2canvas from "html2canvas";
import { Download, Award, Calendar, BookOpen, User, Star } from "lucide-react";

interface GuruCertificateProps {
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
  "Unggul": { bg: "from-emerald-400 to-teal-500", border: "border-emerald-400", text: "text-emerald-600", glow: "shadow-emerald-400/30" },
  "Madya": { bg: "from-cyan-400 to-blue-500", border: "border-cyan-400", text: "text-cyan-600", glow: "shadow-cyan-400/30" },
  "Semenjana": { bg: "from-slate-400 to-slate-500", border: "border-slate-400", text: "text-slate-600", glow: "shadow-slate-400/30" },
  "A": { bg: "from-emerald-400 to-green-500", border: "border-emerald-400", text: "text-emerald-600", glow: "shadow-emerald-400/30" },
  "B": { bg: "from-blue-400 to-indigo-500", border: "border-blue-400", text: "text-blue-600", glow: "shadow-blue-400/30" },
  "C": { bg: "from-amber-400 to-yellow-500", border: "border-amber-400", text: "text-amber-600", glow: "shadow-amber-400/30" },
  "D": { bg: "from-slate-400 to-slate-500", border: "border-slate-400", text: "text-slate-600", glow: "shadow-slate-400/30" },
};

export function GuruCertificatePreview({ certificate }: GuruCertificateProps) {
  const certificateRef = useRef<HTMLDivElement>(null);

  const predikatStyle = PREDIKAT_STYLES[certificate.predikat] || PREDIKAT_STYLES["Madya"];
  const isUKBI = certificate.paket?.type?.includes("UKBI");
  const isTKA = certificate.paket?.type?.includes("TKA");

  const productLabel = isUKBI ? "UKBI Practice" : isTKA ? "TKA Bahasa Indonesia" : "UKBI/TKA Practice";

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
      link.download = `Dokumen-Hasil-Guru-${certificate.certificateNo}.png`;
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
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
        >
          <Download size={18} />
          Simpan Dokumen
        </button>
      </div>

      <div 
        ref={certificateRef}
        className="bg-white rounded-3xl overflow-hidden"
        style={{ width: "850px", height: "620px", position: "relative" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" />
        
        <div className="absolute top-0 left-0 w-32 h-32 border-l-4 border-t-4 border-emerald-300/50 rounded-tl-3xl" />
        <div className="absolute top-0 right-0 w-32 h-32 border-r-4 border-t-4 border-emerald-300/50 rounded-tr-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 border-l-4 border-b-4 border-emerald-300/50 rounded-bl-3xl" />
        <div className="absolute bottom-0 right-0 w-32 h-32 border-r-4 border-b-4 border-emerald-300/50 rounded-br-3xl" />

        <div className="absolute inset-8 border border-slate-200 rounded-2xl" />
        
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-96 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />

        <div className="relative z-10 h-full flex flex-col items-center justify-between py-10 px-12">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <BookOpen size={28} className="text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-gray-900 tracking-wider">Dokumen Hasil Latihan</h1>
                <p className="text-[10px] text-gray-400 tracking-[0.3em] uppercase">BAHASACERDAS</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="text-center -mt-4">
            <div className="inline-block mb-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <Star size={16} className="fill-emerald-600" />
                <span className="text-xs font-medium tracking-widest uppercase">Hasil Simulasi Kemampuan Bahasa Indonesia</span>
                <Star size={16} className="fill-emerald-600" />
              </div>
            </div>
            
            <p className="text-sm text-gray-500 mb-3 font-medium">Dokumen ini diberikan kepada</p>
            
            <h2 className="text-4xl font-bold text-gray-800 mb-6 tracking-wide">
              {certificate.user?.fullName || "Pendidik"}
            </h2>
            
            <p className="text-gray-500 mb-2">yang telah menyelesaikan</p>
            
            {isUKBI && (
              <h3 className="text-2xl font-semibold text-gray-700 mb-6">Dokumen Hasil Latihan UKBI Practice</h3>
            )}
            {isTKA && (
              <h3 className="text-2xl font-semibold text-gray-700 mb-6">Dokumen Hasil Latihan TKA Bahasa Indonesia</h3>
            )}
            {!isUKBI && !isTKA && (
              <h3 className="text-2xl font-semibold text-gray-700 mb-6">{certificate.paket?.title || "Simulasi Bahasa Indonesia"}</h3>
            )}

            <div className={`inline-flex items-center gap-6 px-10 py-5 rounded-2xl bg-gradient-to-r ${predikatStyle.bg} shadow-lg ${predikatStyle.glow}`}>
              <div className="text-center">
                <p className="text-xs font-medium text-white/80 uppercase tracking-wider">Predikat</p>
                <p className="text-3xl font-black text-white">{certificate.predikat}</p>
              </div>
              <div className="w-px h-12 bg-white/30" />
              <div className="text-center">
                <p className="text-xs font-medium text-white/80 uppercase tracking-wider">Skor</p>
                <p className="text-2xl font-bold text-white">{certificate.score}</p>
              </div>
              <div className="w-px h-12 bg-white/30" />
              <div className="text-center">
                <p className="text-xs font-medium text-white/80 uppercase tracking-wider">Persentase</p>
                <p className="text-2xl font-bold text-white">{certificate.percentage?.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="w-full flex justify-between items-end pt-4">
            <div className="text-left">
              <p className="text-xs text-gray-400">Jenis Latihan</p>
              <p className="text-sm font-semibold text-gray-600">{productLabel}</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/30">
                <Award size={32} className="text-white" />
              </div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">No. Dokumen</p>
              <p className="text-xs font-mono font-bold text-gray-600">{certificate.certificateNo}</p>
            </div>

            <div className="flex items-center gap-2 text-gray-400">
              <Calendar size={16} />
              <span className="text-sm font-medium">{formatDate(certificate.issuedAt)}</span>
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

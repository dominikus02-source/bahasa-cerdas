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
      link.download = `Sertifikat-${certificate.certificateNo}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Failed to download certificate:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Download Button */}
      <div className="flex justify-end">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors shadow-lg shadow-violet-600/20"
        >
          <Download size={18} />
          Simpan Sertifikat
        </button>
      </div>

      {/* Certificate Container */}
      <div 
        ref={certificateRef}
        className="bg-white rounded-3xl overflow-hidden shadow-2xl"
        style={{ width: "800px", height: "600px", position: "relative" }}
      >
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-purple-50" />
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-200/30 to-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-100 to-teal-100 rounded-full blur-3xl" />

        {/* Border Pattern */}
        <div className="absolute inset-4 border-2 border-violet-100 rounded-2xl" />
        <div className="absolute inset-6 border border-violet-50 rounded-xl" />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-between py-12 px-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <BookOpen size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-wide">BC Bahasa Cerdas</h1>
                <p className="text-xs text-gray-400 tracking-widest">CERTIFICATE OF COMPLETION</p>
              </div>
            </div>
            <div className="w-24 h-1 bg-gradient-to-r from-violet-400 via-purple-400 to-violet-400 mx-auto mt-4 rounded-full" />
          </div>

          {/* Main Content */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">This certifies that</p>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-4">
              {certificate.user?.fullName || "Student"}
            </h2>
            <p className="text-gray-500 mb-6">has successfully completed</p>
            
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              {certificate.paket?.title || "UKBI - TKA Assessment"}
            </h3>

            {/* Score Badge */}
            <div className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r ${predikatStyle.bg} shadow-lg ${predikatStyle.glow}`}>
              <Award size={28} className="text-white" />
              <div className="text-white">
                <p className="text-xs font-medium opacity-90">PREDIKAT</p>
                <p className="text-2xl font-black">{certificate.predikat}</p>
              </div>
              <div className="border-l border-white/30 pl-3">
                <p className="text-xs font-medium opacity-90">SCORE</p>
                <p className="text-xl font-bold">{certificate.score}</p>
              </div>
              <div className="border-l border-white/30 pl-3">
                <p className="text-xs font-medium opacity-90">PERCENTAGE</p>
                <p className="text-xl font-bold">{certificate.percentage?.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="w-full flex justify-between items-end">
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar size={16} />
              <span className="text-sm">{formatDate(certificate.issuedAt)}</span>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-violet-500/30">
                <Award size={24} className="text-white" />
              </div>
              <p className="text-xs text-gray-400">Certificate No.</p>
              <p className="text-xs font-mono font-semibold text-gray-600">{certificate.certificateNo}</p>
            </div>

            <div className="text-right">
              <p className="text-xs text-gray-400">Valid for</p>
              <p className="text-sm font-semibold text-gray-600">Lifetime</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <p className="text-xs text-gray-400 text-center">
        Klik "Simpan Sertifikat" untuk mengunduh gambar sertifikat. Anda dapat menyimpannya ke galeri atau berbagi.
      </p>
    </div>
  );
}
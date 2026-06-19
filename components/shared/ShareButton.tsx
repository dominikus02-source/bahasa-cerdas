"use client";

import { useState } from "react";
import { Share2, Check, MessageCircle, Mail, Twitter } from "lucide-react";

interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
}

export default function ShareButton({ url, title, text }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://www.bahasacerdas.com";
  const fullUrl = url.startsWith("http") ? url : `${siteUrl}${url}`;
  const shareText = text || `Lihat ini di BahasaCerdas: ${title}`;

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: fullUrl });
        return;
      } catch {}
    }
    setShowMenu(!showMenu);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowMenu(false);
  };

  const shareWA = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + "\n" + fullUrl)}`, "_blank");
    setShowMenu(false);
  };

  const shareEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareText + "\n" + fullUrl)}`, "_blank");
    setShowMenu(false);
  };

  return (
    <div className="relative">
      <button onClick={handleShare}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors">
        <Share2 size={16} /> Bagikan
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-8 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 min-w-[180px]">
            <button onClick={copyLink} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              {copied ? <Check size={16} className="text-emerald-600" /> : <Share2 size={16} />}
              {copied ? "Tersalin!" : "Salin Link"}
            </button>
            <button onClick={shareWA} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-emerald-50 transition-colors">
              <MessageCircle size={16} className="text-emerald-600" /> WhatsApp
            </button>
            <button onClick={shareEmail} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-blue-50 transition-colors">
              <Mail size={16} className="text-blue-600" /> Email
            </button>
          </div>
        </>
      )}
    </div>
  );
}

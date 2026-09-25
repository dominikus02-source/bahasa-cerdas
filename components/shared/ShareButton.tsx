"use client";

import { useState } from "react";
import { Share2, Check, MessageCircle, Mail, Twitter } from "lucide-react";

interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
  compact?: boolean;
}

export default function ShareButton({ url, title, text, compact = false }: ShareButtonProps) {
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
      <button
        onClick={handleShare}
        aria-label="Bagikan karya"
        title="Bagikan"
        className={compact
          ? "inline-flex items-center justify-center rounded-full px-2 py-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-blue-600 dark:hover:bg-slate-800/70 dark:hover:text-blue-300"
          : "flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-blue-600 dark:text-blue-400"}
      >
        <Share2 size={compact ? 13 : 16} />
        {compact ? null : "Bagikan"}
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-8 z-50 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-2 min-w-[180px]">
            <button onClick={copyLink} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors">
              {copied ? <Check size={16} className="text-emerald-600 dark:text-emerald-400" /> : <Share2 size={16} />}
              {copied ? "Tersalin!" : "Salin Link"}
            </button>
            <button onClick={shareWA} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-emerald-50 dark:bg-emerald-950/40 transition-colors">
              <MessageCircle size={16} className="text-emerald-600 dark:text-emerald-400" /> WhatsApp
            </button>
            <button onClick={shareEmail} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-blue-50 dark:bg-blue-950/40 transition-colors">
              <Mail size={16} className="text-blue-600 dark:text-blue-400" /> Email
            </button>
          </div>
        </>
      )}
    </div>
  );
}

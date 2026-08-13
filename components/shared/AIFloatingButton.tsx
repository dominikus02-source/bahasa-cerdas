"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { gambarKarakter } from "@/lib/arena-junior/karakter";

export default function AIFloatingButton() {
  const [showBubble, setShowBubble] = useState(true);

  // The bubble used to toggle on and off every 5 seconds for as long as the page
  // was open. Besides being distracting, it widens this fixed element by about
  // 140px each time it appears — which is what was covering the send button of
  // the discussion room underneath it, on and off, so a student could not
  // reliably click send. It now greets once and gets out of the way.
  useEffect(() => {
    const timer = setTimeout(() => setShowBubble(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-50 flex items-center gap-3">
      {showBubble && (
        <div className="animate-fade-in pointer-events-none bg-white rounded-2xl shadow-lg border border-slate-100 px-4 py-2.5 relative dark:bg-slate-800 dark:border-slate-700">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Mau tanya apa?</p>
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-b border-r border-slate-100 rotate-45 dark:bg-slate-800 dark:border-slate-700" />
        </div>
      )}
      <Link
        href="/ai-bc"
        aria-label="Tanya AI BC"
        title="Tanya AI BC"
        className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden shadow-xl hover:shadow-2xl hover:scale-110 transition-all border-2 border-violet-300/60 dark:border-violet-500/50 bg-white dark:bg-slate-900"
      >
        <Image
          src={gambarKarakter("zelby", "reading")}
          alt=""
          width={56}
          height={56}
          priority
          className="h-full w-full object-cover"
        />
      </Link>
    </div>
  );
}
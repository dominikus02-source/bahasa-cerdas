"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

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
        <div className="animate-fade-in pointer-events-none bg-white rounded-2xl shadow-lg border border-gray-100 px-4 py-2.5 relative">
          <p className="text-sm font-medium text-gray-700">Mau tanya apa?</p>
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-b border-r border-gray-100 rotate-45" />
        </div>
      )}
      <Link
        href="/ai-bc"
        className="w-14 h-14 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-110 transition-all border-2 border-white/20"
        title="Chat dengan AI"
      >
        <Sparkles size={22} />
      </Link>
    </div>
  );
}
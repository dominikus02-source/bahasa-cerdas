"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AIFloatingButton() {
  return (
    <Link
      href="/ai-bc"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-red-600 to-red-700 text-white flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-110 transition-all border-2 border-white/20"
      title="AI BC - Asisten Bahasa Indonesia"
    >
      <Sparkles size={22} />
    </Link>
  );
}

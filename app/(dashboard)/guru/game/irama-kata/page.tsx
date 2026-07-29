"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import IramaKata from "@/components/game/IramaKata";

export default function GuruIramaKataPage() {
  return (
    <div className="fixed inset-0 z-[60]">
      <Link
        href="/guru/game"
        className="fixed top-3 right-3 z-[80] w-9 h-9 rounded-xl bg-[#161B3A]/10 backdrop-blur-md border border-[#161B3A]/20 shadow-md flex items-center justify-center text-[#161B3A] hover:bg-[#161B3A]/20 active:scale-95 transition-all"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <IramaKata />
    </div>
  );
}

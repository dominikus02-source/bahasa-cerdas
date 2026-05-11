"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function BatikDecoration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Top-left batik pattern */}
      <div className="absolute top-0 left-0 w-64 h-64 md:w-96 md:h-96 opacity-5 md:opacity-10">
        <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="batikTopLeft" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M0 20 Q10 0 20 20 Q30 40 40 20" stroke="currentColor" fill="none" strokeWidth="1.5" className="text-white"/>
              <circle cx="20" cy="20" r="8" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/50"/>
              <path d="M0 0 L40 40 M40 0 L0 40" stroke="currentColor" fill="none" strokeWidth="0.5" className="text-white/30"/>
            </pattern>
          </defs>
          <rect width="200" height="200" fill="url(#batikTopLeft)" className="text-white"/>
          <rect width="200" height="200" fill="url(#batikTopLeft)" transform="translate(50, 50)" className="text-white/50"/>
        </svg>
      </div>

      {/* Bottom-right batik pattern */}
      <div className="absolute bottom-0 right-0 w-64 h-64 md:w-96 md:h-96 opacity-5 md:opacity-10">
        <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="batikBottomRight" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M0 20 Q10 40 20 20 Q30 0 40 20" stroke="currentColor" fill="none" strokeWidth="1.5" className="text-white"/>
              <rect x="10" y="10" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/50" transform="rotate(45 20 20)"/>
              <circle cx="20" cy="20" r="3" fill="currentColor" className="text-white/30"/>
            </pattern>
          </defs>
          <rect width="200" height="200" fill="url(#batikBottomRight)" className="text-white"/>
          <rect width="200" height="200" fill="url(#batikBottomRight)" transform="translate(-50, -50)" className="text-white/50"/>
        </svg>
      </div>

      {/* Center decorative elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.02]">
        <svg viewBox="0 0 400 400" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="1" className="text-white"/>
          <circle cx="200" cy="200" r="100" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/50"/>
          <circle cx="200" cy="200" r="50" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/30"/>
        </svg>
      </div>
    </div>
  );
}

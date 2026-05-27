"use client";

import { useUser } from "@/hooks/useUser";
import { SwRegister } from "@/components/SwRegister";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export function Providers({ children }: { children: React.ReactNode }) {
  useUser();
  return (
    <>
      <SwRegister />
      {children}
      <Analytics />
      <SpeedInsights />
    </>
  );
}

"use client";

import { useUser } from "@/hooks/useUser";
import { SwRegister } from "@/components/SwRegister";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export function Providers({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  useUser();
  return (
    <ThemeProvider nonce={nonce}>
      <SwRegister />
      {children}
      <Analytics />
      <SpeedInsights />
    </ThemeProvider>
  );
}

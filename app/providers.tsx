"use client";

import { useUser } from "@/hooks/useUser";
import { SwRegister } from "@/components/SwRegister";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { HeartbeatProvider } from "@/components/providers/HeartbeatProvider";

export function Providers({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  useUser();
  return (
    <ThemeProvider nonce={nonce}>
      <SwRegister />
      <HeartbeatProvider />
      {children}
    </ThemeProvider>
  );
}

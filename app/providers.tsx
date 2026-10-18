"use client";

import { useUser } from "@/hooks/useUser";
import { SwRegister } from "@/components/SwRegister";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { HeartbeatProvider } from "@/components/providers/HeartbeatProvider";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  useUser();
  return (
    <ThemeProvider nonce={nonce}>
      <SwRegister />
      <HeartbeatProvider />
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

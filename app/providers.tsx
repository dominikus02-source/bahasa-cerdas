"use client";

import { useUser } from "@/hooks/useUser";

export function Providers({ children }: { children: React.ReactNode }) {
  useUser();
  return <>{children}</>;
}
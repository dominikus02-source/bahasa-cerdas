"use client";

import { useUser } from "@/hooks/useUser";
import { SwRegister } from "@/components/SwRegister";

export function Providers({ children }: { children: React.ReactNode }) {
  useUser();
  return (
    <>
      <SwRegister />
      {children}
    </>
  );
}

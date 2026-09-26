"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy route: Arena adalah satu-satunya pusat gim murid. */
export default function GameHubLegacyRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/arena"); }, [router]);
  return <div className="min-h-[50vh] flex items-center justify-center text-sm text-slate-500">Membuka Arena…</div>;
}

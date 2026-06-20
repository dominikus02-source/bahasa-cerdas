"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function PremiumPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get("status") === "success"
      ? "/guru/berlangganan?status=success"
      : "/guru/berlangganan";
    router.replace(target);
  }, [router]);

  return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
    </div>
  );
}

"use client";

import FinanceHub from "@/components/admin/finance/FinanceHub";

export default function Page() {
  return (
    <div className="min-w-0 dark:text-slate-100">
      <FinanceHub initialTab="pembayaran" />
    </div>
  );
}
